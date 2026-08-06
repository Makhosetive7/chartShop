import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProducts } from '@/api/products';
import { listCustomers } from '@/api/customers';
import {
  createLaybye,
  payLaybye,
  completeLaybye,
  listLaybyes,
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
} from '@/components/ui/primitives';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toastError, toastSuccess } from '@/lib/toast';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate } from '@/utils/dates';

type Line = { productId: string; quantity: string; price: string };
const emptyLine = (): Line => ({ productId: '', quantity: '1', price: '' });

export function LaybyesPage() {
  const qc = useQueryClient();
  const timeZone = useShopTimezone();
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [customer, setCustomer] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [laybyePay, setLaybyePay] = useState({ customer: '', amount: '' });
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const productsQ = useQuery({
    queryKey: ['products', 'all'],
    queryFn: listProducts,
  });
  const customersQ = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers('all'),
  });
  const laybyesQ = useQuery({
    queryKey: ['laybyes', 'active'],
    queryFn: () => listLaybyes('active'),
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
    void qc.invalidateQueries({ queryKey: ['laybyes'] });
    void qc.invalidateQueries({ queryKey: ['sales'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['customers'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  }

  const createM = useMutation({
    mutationFn: async () => {
      if (!customer.trim()) throw new Error('Customer is required.');
      if (!items.length) throw new Error('Add at least one item.');
      return createLaybye({
        customer: customer.trim(),
        items,
        deposit: Number(deposit) || 0,
      });
    },
    onSuccess: (result) => {
      const total =
        result.laybye && typeof result.laybye === 'object'
          ? money(Number(result.laybye.totalAmount))
          : '';
      toastSuccess(
        result.completed
          ? `Laybye completed${total ? ` · ${total}` : ''}.`
          : 'Laybye created.',
      );
      setLines([emptyLine()]);
      setCustomer('');
      setDeposit('0');
      invalidate();
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createM.mutate();
  }

  return (
    <Page>
      <PageTitle>Laybyes</PageTitle>
      <PageLead>
        Create agreements, take deposits and installments, and complete when
        paid in full.
      </PageLead>

      <Card>
        <h2 style={{ marginTop: 0 }}>New laybye</h2>
        <form onSubmit={onCreate}>
          <Row>
            <Field>
              Customer (name / phone)
              <Input
                list="laybye-customer-list"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              />
              <datalist id="laybye-customer-list">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </Field>
            <Field>
              Deposit
              <Input
                type="number"
                min="0"
                step="0.01"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
            </Field>
          </Row>

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
            <Button
              type="button"
              $variant="ghost"
              onClick={() => setLines([...lines, emptyLine()])}
            >
              + Line
            </Button>
            <Button type="submit" loading={createM.isPending}>
              {createM.isPending ? 'Creating…' : 'Create laybye'}
            </Button>
          </Row>
        </form>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>Active laybyes</h2>
        {laybyesQ.isLoading ? (
          <TableSkeleton
            columns={5}
            rows={4}
            widths={['8rem', '5rem', '5rem', '6rem', '7rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(laybyesQ.data || []).map((lb) => {
                const key = lb.id;
                const canComplete = Number(lb.balanceDue) <= 0;
                return (
                  <tr key={key}>
                    <td>{lb.customerName}</td>
                    <td>
                      {money(lb.amountPaid)} / {money(lb.totalAmount)}
                    </td>
                    <td>{money(lb.balanceDue)}</td>
                    <td>
                      {lb.dueDate ? formatShopDate(lb.dueDate, timeZone) : '—'}
                    </td>
                    <td>
                      <Row style={{ gap: 8, margin: 0 }}>
                        {!canComplete ? (
                          <Button
                            type="button"
                            $variant="ghost"
                            onClick={() =>
                              setLaybyePay({
                                customer: lb.customerName,
                                amount: String(lb.balanceDue),
                              })
                            }
                          >
                            Pay
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          disabled={!canComplete}
                          loading={busyKey === `complete-${key}`}
                          onClick={async () => {
                            try {
                              setBusyKey(`complete-${key}`);
                              await completeLaybye(lb.customerName);
                              toastSuccess(
                                `Laybye completed for ${lb.customerName}.`,
                              );
                              invalidate();
                            } catch (err) {
                              toastError(getErrorMessage(err));
                            } finally {
                              setBusyKey(null);
                            }
                          }}
                        >
                          {busyKey === `complete-${key}` ? '…' : 'Complete'}
                        </Button>
                      </Row>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {!laybyesQ.isLoading && !(laybyesQ.data || []).length ? (
          <p>No active laybyes.</p>
        ) : null}
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>Record payment</h2>
        <Row>
          <Field>
            Customer
            <Input
              list="laybye-pay-customers"
              value={laybyePay.customer}
              onChange={(e) =>
                setLaybyePay({ ...laybyePay, customer: e.target.value })
              }
            />
            <datalist id="laybye-pay-customers">
              {(laybyesQ.data || []).map((lb) => (
                <option key={lb.id} value={lb.customerName} />
              ))}
            </datalist>
          </Field>
          <Field>
            Amount
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={laybyePay.amount}
              onChange={(e) =>
                setLaybyePay({ ...laybyePay, amount: e.target.value })
              }
            />
          </Field>
          <Button
            type="button"
            loading={busyKey === 'laybye'}
            onClick={async () => {
              try {
                setBusyKey('laybye');
                const res = await payLaybye(
                  laybyePay.customer.trim(),
                  Number(laybyePay.amount),
                );
                toastSuccess(
                  res.completed
                    ? 'Laybye completed.'
                    : 'Laybye payment recorded.',
                );
                setLaybyePay({ customer: '', amount: '' });
                invalidate();
              } catch (err) {
                toastError(getErrorMessage(err));
              } finally {
                setBusyKey(null);
              }
            }}
          >
            {busyKey === 'laybye' ? 'Paying…' : 'Pay laybye'}
          </Button>
        </Row>
      </Card>
    </Page>
  );
}
