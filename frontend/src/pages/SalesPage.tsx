import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProducts } from '@/api/products';
import { listCustomers } from '@/api/customers';
import {
  createCashSale,
  createCreditSale,
  sellToCustomer,
  listRecentSales,
  cancelSale,
  cancelLastSale,
  createLaybye,
  payLaybye,
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
  ErrorBanner,
  SuccessBanner,
  Tabs,
  Tab,
} from '@/components/ui/primitives';

type Line = { productId: string; quantity: string; price: string };

const emptyLine = (): Line => ({ productId: '', quantity: '1', price: '' });

export function SalesPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'cash' | 'credit' | 'customer' | 'laybye'>(
    'cash',
  );
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [customer, setCustomer] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [laybyePay, setLaybyePay] = useState({ customer: '', amount: '' });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const productsQ = useQuery({ queryKey: ['products', 'all'], queryFn: listProducts });
  const customersQ = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers('all'),
  });
  const recentQ = useQuery({
    queryKey: ['sales', 'recent'],
    queryFn: () => listRecentSales(15),
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
      if (mode === 'customer') return sellToCustomer(customer.trim(), items);
      return createLaybye({
        customer: customer.trim(),
        items,
        deposit: Number(deposit) || 0,
      });
    },
    onSuccess: (result) => {
      setError(null);
      let total = '';
      if (result && typeof result === 'object') {
        if ('sale' in result && result.sale && typeof result.sale === 'object') {
          total = money(Number((result.sale as { total?: number }).total));
        } else if ('total' in result) {
          total = money(Number((result as { total: number }).total));
        }
      }
      setOk(
        mode === 'laybye'
          ? 'Laybye created.'
          : `Sale recorded${total ? ` · ${total}` : ''}.`,
      );
      setLines([emptyLine()]);
      invalidate();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    sellM.mutate();
  }

  return (
    <Page>
      <PageTitle>Sales</PageTitle>
      <PageLead>Cash, credit, customer sales, laybye, and cancellations.</PageLead>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {ok ? <SuccessBanner>{ok}</SuccessBanner> : null}

      <Tabs>
        {(
          [
            ['cash', 'Cash'],
            ['credit', 'Credit'],
            ['customer', 'Sell to customer'],
            ['laybye', 'Laybye'],
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
              {mode === 'laybye' ? (
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
              ) : null}
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

          <Row>
            <Button type="button" $variant="ghost" onClick={() => setLines([...lines, emptyLine()])}>
              + Line
            </Button>
            <Button type="submit" disabled={sellM.isPending}>
              {sellM.isPending ? 'Processing…' : 'Complete sale'}
            </Button>
          </Row>
        </form>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>Laybye payment</h2>
        <Row>
          <Field>
            Customer
            <Input
              value={laybyePay.customer}
              onChange={(e) =>
                setLaybyePay({ ...laybyePay, customer: e.target.value })
              }
            />
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
            onClick={async () => {
              try {
                setError(null);
                const res = await payLaybye(
                  laybyePay.customer.trim(),
                  Number(laybyePay.amount),
                );
                setOk(
                  res.completed
                    ? 'Laybye completed.'
                    : 'Laybye payment recorded.',
                );
                setLaybyePay({ customer: '', amount: '' });
                invalidate();
              } catch (err) {
                setError(getErrorMessage(err));
              }
            }}
          >
            Pay laybye
          </Button>
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Recent sales</h2>
          <Button
            type="button"
            $variant="danger"
            onClick={async () => {
              if (!confirm('Cancel the last sale?')) return;
              try {
                const res = await cancelLastSale('Cancelled from web');
                setOk(res.message || 'Last sale cancelled.');
                invalidate();
                void recentQ.refetch();
              } catch (err) {
                setError(getErrorMessage(err));
              }
            }}
          >
            Cancel last
          </Button>
        </Row>
        <Table>
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Customer</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(recentQ.data || []).map((s) => (
              <tr key={s.id}>
                <td>
                  {s.date ? new Date(s.date).toLocaleString() : '—'}
                </td>
                <td>{s.type}</td>
                <td>{s.customerName || '—'}</td>
                <td>{money(s.total)}</td>
                <td>
                  <Button
                    type="button"
                    $variant="ghost"
                    onClick={async () => {
                      if (!confirm('Cancel this sale?')) return;
                      try {
                        const res = await cancelSale(s.id, 'Cancelled from web');
                        setOk(res.message || 'Sale cancelled.');
                        invalidate();
                        void recentQ.refetch();
                      } catch (err) {
                        setError(getErrorMessage(err));
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!recentQ.isLoading && !(recentQ.data || []).length ? (
          <p>No recent sales.</p>
        ) : null}
      </Card>
    </Page>
  );
}
