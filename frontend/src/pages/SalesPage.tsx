import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { listProducts } from '@/api/products';
import { listCustomers } from '@/api/customers';
import {
  createCashSale,
  createCreditSale,
  sellToCustomer,
  listRecentSales,
  cancelSale,
  cancelLastSale,
  fetchRefunds,
  type RefundSale,
} from '@/api/sales';
import { getErrorMessage, money, type SaleItemInput } from '@/api/types';
import {
  Page,
  PageTitle,
  PageLead,
  Card,
  Row,
  Field,
  Input,
  Select,
  Button,
  Table,
  Badge,
  Tabs,
  Tab,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toastError, toastSuccess } from '@/lib/toast';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate, formatShopDateTime } from '@/utils/dates';

type Line = { productId: string; quantity: string; price: string };
const emptyLine = (): Line => ({ productId: '', quantity: '1', price: '' });

const REFUND_PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const;

const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

const SectionCopy = styled.div`
  min-width: 0;
  flex: 1 1 220px;

  h2 {
    margin: 0 0 4px;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
    line-height: 1.45;
    max-width: 36rem;
  }
`;

const StatStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Stat = styled.div`
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.cream};
  border: 1px solid ${({ theme }) => theme.colors.border};
  min-width: 0;

  span {
    display: block;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    margin-bottom: 4px;
  }

  strong {
    display: block;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.maroon};
    overflow-wrap: anywhere;
  }
`;

const PeriodTabs = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  padding: 4px;
  background: ${({ theme }) => theme.colors.peachSoft};
  flex: 0 0 auto;
`;

const PeriodTab = styled.button<{ $active?: boolean }>`
  border: none;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surface : 'transparent'};
  color: ${({ theme }) => theme.colors.maroon};
  padding: 8px 12px;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.card : 'none')};
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const EmptyState = styled.div`
  padding: 28px 12px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin-bottom: 6px;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }
`;

const ItemsCell = styled.div`
  white-space: normal;
  max-width: 16rem;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.86rem;
`;

const ReasonCell = styled.div`
  white-space: normal;
  max-width: 14rem;
  line-height: 1.4;
`;

const Truncate = styled.span`
  display: block;
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

function saleTypeLabel(type: string) {
  return type.replace(/_/g, ' ');
}

function itemsSummary(sale: RefundSale) {
  const items = sale.items || [];
  if (!items.length) return '—';
  const preview = items
    .slice(0, 2)
    .map((item) => `${item.quantity}× ${item.productName}`)
    .join(', ');
  if (items.length > 2) return `${preview} +${items.length - 2} more`;
  return preview;
}

export function SalesPage() {
  const qc = useQueryClient();
  const timeZone = useShopTimezone();
  const [mode, setMode] = useState<'cash' | 'credit' | 'customer'>('cash');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [customer, setCustomer] = useState('');
  const [refundDays, setRefundDays] = useState(30);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<
    null | { kind: 'last' } | { kind: 'sale'; id: string; label: string }
  >(null);

  const productsQ = useQuery({ queryKey: ['products', 'all'], queryFn: listProducts });
  const customersQ = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers('all'),
  });
  const recentQ = useQuery({
    queryKey: ['sales', 'recent'],
    queryFn: () => listRecentSales(15),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const refundsQ = useQuery({
    queryKey: ['sales', 'refunds', refundDays],
    queryFn: () => fetchRefunds(refundDays),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const products = productsQ.data || [];
  const customers = customersQ.data || [];

  const items: SaleItemInput[] = useMemo(
    () =>
      lines
        .filter((l) => l.productId && Number(l.quantity) > 0)
        .map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          ...(l.price !== '' ? { price: Number(l.price) } : {}),
        })),
    [lines],
  );

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ['sales'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['customers'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  }

  const sellM = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error('Add at least one item.');
      if (mode === 'cash') return createCashSale(items);
      if (!customer.trim()) throw new Error('Customer is required.');
      if (mode === 'credit') return createCreditSale(customer.trim(), items);
      return sellToCustomer(customer.trim(), items);
    },
    onSuccess: (result) => {
      let total = '';
      if (result && typeof result === 'object') {
        if ('sale' in result && result.sale && typeof result.sale === 'object') {
          total = money(Number((result.sale as { total?: number }).total));
        } else if ('total' in result) {
          total = money(Number((result as { total: number }).total));
        }
      }
      toastSuccess(`Sale recorded${total ? ` · ${total}` : ''}.`);
      setLines([emptyLine()]);
      invalidate();
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    sellM.mutate();
  }

  async function runCancelConfirmed() {
    if (!cancelConfirm) return;
    try {
      if (cancelConfirm.kind === 'last') {
        setBusyKey('cancel-last');
        await cancelLastSale('Cancelled from web');
        toastSuccess('Sale cancelled.');
      } else {
        setBusyKey(`cancel-${cancelConfirm.id}`);
        await cancelSale(cancelConfirm.id, 'Cancelled from web');
        toastSuccess('Sale cancelled.');
      }
      setCancelConfirm(null);
      invalidate();
      void recentQ.refetch();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Page>
      <PageTitle>Sales</PageTitle>
      <PageLead>Cash, credit, customer sales, and cancellations.</PageLead>

      <Tabs>
        {(
          [
            ['cash', 'Cash'],
            ['credit', 'Credit'],
            ['customer', 'Sell to customer'],
          ] as const
        ).map(([key, label]) => (
          <Tab
            key={key}
            type="button"
            $active={mode === key}
            onClick={() => setMode(key)}
          >
            {label}
          </Tab>
        ))}
      </Tabs>

      <Card>
        <form onSubmit={onSubmit}>
          {mode !== 'cash' ? (
            <Row>
              <Field>
                Customer (name / phone)
                <Input
                  list="customer-list"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  required
                />
                <datalist id="customer-list">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </Field>
            </Row>
          ) : null}

          {lines.map((line, idx) => (
            <Row key={idx}>
              <Field>
                Product
                <Select
                  value={line.productId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, productId: e.target.value };
                    setLines(next);
                  }}
                  required
                >
                  <option value="">Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.price)} · stock {p.stock}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Qty
                <Input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, quantity: e.target.value };
                    setLines(next);
                  }}
                  required
                />
              </Field>
              <Field>
                Custom price (optional)
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.price}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, price: e.target.value };
                    setLines(next);
                  }}
                />
              </Field>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  $variant="ghost"
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              ) : null}
            </Row>
          ))}

          <Row style={{ marginTop: 20, paddingTop: 4 }}>
            <Button type="button" $variant="ghost" onClick={() => setLines([...lines, emptyLine()])}>
              + Line
            </Button>
            <Button type="submit" loading={sellM.isPending}>
              {sellM.isPending ? 'Processing…' : 'Complete sale'}
            </Button>
          </Row>
        </form>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Recent sales</h2>
          <Button
            type="button"
            $variant="danger"
            loading={busyKey === 'cancel-last'}
            onClick={() => setCancelConfirm({ kind: 'last' })}
          >
            Cancel last
          </Button>
        </Row>
        {recentQ.isLoading ? (
          <TableSkeleton
            columns={5}
            rows={6}
            widths={['8rem', '4rem', '4.5rem', '7rem', '4rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Total</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(recentQ.data || []).map((s) => {
                const saleId = s.id || String((s as { _id?: string })._id || '');
                const customerName =
                  s.customerName || (s.type === 'cash' ? 'Walk-in' : '—');
                return (
                  <tr key={saleId || `${s.date}-${s.total}`}>
                    <td>
                      <Truncate title={customerName}>{customerName}</Truncate>
                    </td>
                    <td>{s.type}</td>
                    <td>{money(s.total)}</td>
                    <td>{formatShopDate(s.date, timeZone)}</td>
                    <td>
                      <Button
                        type="button"
                        $variant="ghost"
                        $size="sm"
                        disabled={!saleId}
                        loading={busyKey === `cancel-${saleId}`}
                        onClick={() => {
                          if (!saleId) return;
                          setCancelConfirm({
                            kind: 'sale',
                            id: saleId,
                            label: `${s.type} · ${money(s.total)}${
                              s.customerName ? ` · ${s.customerName}` : ''
                            }`,
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {!recentQ.isLoading && !(recentQ.data || []).length ? (
          <p>No recent sales.</p>
        ) : null}
      </Card>

      <Card>
        <SectionHead>
          <SectionCopy>
            <h2>Refunds / cancellations</h2>
            <p>
              Cancelled sales in the selected window. Stock and credit are
              already reversed when a sale is cancelled above.
            </p>
          </SectionCopy>
          <PeriodTabs>
            {REFUND_PERIODS.map(({ days, label }) => (
              <PeriodTab
                key={days}
                type="button"
                $active={refundDays === days}
                onClick={() => setRefundDays(days)}
              >
                {label}
              </PeriodTab>
            ))}
          </PeriodTabs>
        </SectionHead>

        {refundsQ.isError ? (
          <p style={{ color: 'inherit', marginTop: 0 }}>
            {getErrorMessage(refundsQ.error, 'Could not load refunds.')}
          </p>
        ) : null}

        {!refundsQ.isLoading && !refundsQ.isError ? (
          <StatStrip>
            <Stat>
              <span>Total refunded</span>
              <strong>{money(refundsQ.data?.totalRefundAmount)}</strong>
            </Stat>
            <Stat>
              <span>Cancellations</span>
              <strong>{(refundsQ.data?.sales || []).length}</strong>
            </Stat>
            <Stat>
              <span>Period</span>
              <strong>Last {refundDays} days</strong>
            </Stat>
          </StatStrip>
        ) : null}

        {refundsQ.isLoading ? (
          <TableSkeleton
            columns={5}
            rows={4}
            widths={['8rem', '5rem', '10rem', '5rem', '8rem']}
          />
        ) : null}

        {!refundsQ.isLoading && !refundsQ.isError && (refundsQ.data?.sales || []).length ? (
          <Table>
            <thead>
              <tr>
                <th>Cancelled</th>
                <th>Type</th>
                <th>Items</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {(refundsQ.data?.sales || []).map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.cancelledAt
                      ? formatShopDateTime(s.cancelledAt, timeZone)
                      : '—'}
                  </td>
                  <td>
                    <Badge $tone="danger">{saleTypeLabel(s.type)}</Badge>
                  </td>
                  <td>
                    <ItemsCell>{itemsSummary(s)}</ItemsCell>
                  </td>
                  <td>{s.customerName || (s.type === 'cash' ? 'Walk-in' : '—')}</td>
                  <td>{money(s.total)}</td>
                  <td>
                    <ReasonCell>{s.cancellationReason || '—'}</ReasonCell>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}

        {!refundsQ.isLoading &&
        !refundsQ.isError &&
        !(refundsQ.data?.sales || []).length ? (
          <EmptyState>
            <strong>No cancellations in the last {refundDays} days</strong>
            <p>
              When you cancel a sale from Recent sales, it will show up here
              with the amount and reason.
            </p>
          </EmptyState>
        ) : null}
      </Card>

      <ConfirmDialog
        open={Boolean(cancelConfirm)}
        onOpenChange={(open) => {
          if (!open) setCancelConfirm(null);
        }}
        title={
          cancelConfirm?.kind === 'last'
            ? 'Cancel last sale?'
            : 'Cancel this sale?'
        }
        description={
          cancelConfirm?.kind === 'last'
            ? 'This reverses the most recent sale and returns items to stock. This cannot be undone from the till.'
            : `This reverses ${cancelConfirm?.label || 'the sale'} and returns items to stock. This cannot be undone from the till.`
        }
        confirmLabel="Cancel sale"
        cancelLabel="Keep sale"
        tone="danger"
        loading={
          cancelConfirm?.kind === 'last'
            ? busyKey === 'cancel-last'
            : Boolean(
                cancelConfirm?.kind === 'sale' &&
                  busyKey === `cancel-${cancelConfirm.id}`,
              )
        }
        onConfirm={runCancelConfirmed}
      />
    </Page>
  );
}
