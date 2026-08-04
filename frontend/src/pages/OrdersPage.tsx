import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProducts } from '@/api/products';
import { listCustomers } from '@/api/customers';
import { listOrders, createOrder, updateOrderStatus } from '@/api/ops';
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
  ErrorBanner,
  SuccessBanner,
  Tabs,
  Tab,
} from '@/components/ui/primitives';

const STATUSES = ['all', 'pending', 'confirmed', 'ready', 'completed', 'cancelled'] as const;

export function OrdersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all');
  const [customer, setCustomer] = useState('');
  const [orderType, setOrderType] = useState('pickup');
  const [notes, setNotes] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const productsQ = useQuery({ queryKey: ['products', 'all'], queryFn: listProducts });
  const customersQ = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers('all'),
  });
  const ordersQ = useQuery({
    queryKey: ['orders', status],
    queryFn: () => listOrders(status, 40),
  });

  const createM = useMutation({
    mutationFn: () => {
      const items: SaleItemInput[] = [
        { productId, quantity: Number(qty) },
      ];
      return createOrder({
        customer: customer.trim(),
        items,
        orderType,
        notes,
      });
    },
    onSuccess: () => {
      setOk('Order placed.');
      setProductId('');
      setQty('1');
      setNotes('');
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const products = productsQ.data || [];
  const customers = customersQ.data || [];
  const orders = ordersQ.data || [];

  const nextActions = useMemo(
    () =>
      ({
        pending: ['confirmed', 'cancelled'],
        confirmed: ['ready', 'cancelled'],
        ready: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      }) as Record<string, string[]>,
    [],
  );

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createM.mutate();
  }

  function tone(s: string) {
    if (s === 'completed') return 'success' as const;
    if (s === 'cancelled') return 'danger' as const;
    if (s === 'ready') return 'info' as const;
    return 'warning' as const;
  }

  return (
    <Page>
      <PageTitle>Orders</PageTitle>
      <PageLead>Pickup / delivery orders and status workflow.</PageLead>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {ok ? <SuccessBanner>{ok}</SuccessBanner> : null}

      <Card>
        <h2 style={{ marginTop: 0 }}>New order</h2>
        <form onSubmit={onCreate}>
          <Row>
            <Field>
              Customer
              <Input
                list="order-customers"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              />
              <datalist id="order-customers">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </Field>
            <Field>
              Type
              <Select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
                <option value="reservation">Reservation</option>
              </Select>
            </Field>
            <Field>
              Product
              <Select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Qty
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Field>
            <Field>
              Notes
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button type="submit" disabled={createM.isPending}>
              Place order
            </Button>
          </Row>
        </form>
      </Card>

      <Tabs>
        {STATUSES.map((s) => (
          <Tab
            key={s}
            type="button"
            $active={status === s}
            onClick={() => setStatus(s)}
          >
            {s}
          </Tab>
        ))}
      </Tabs>

      <Card>
        <Table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>When</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.shortId || o.id.slice(-4)}</td>
                <td>{o.customerName}</td>
                <td>{money(o.total)}</td>
                <td>
                  <Badge $tone={tone(o.status)}>{o.status}</Badge>
                </td>
                <td>
                  {o.orderDate
                    ? new Date(o.orderDate).toLocaleString()
                    : '—'}
                </td>
                <td>
                  <Row>
                    {(nextActions[o.status] || []).map((ns) => (
                      <Button
                        key={ns}
                        type="button"
                        $variant="ghost"
                        onClick={async () => {
                          try {
                            await updateOrderStatus(o.id, ns);
                            setOk(`Order → ${ns}`);
                            void qc.invalidateQueries({ queryKey: ['orders'] });
                          } catch (err) {
                            setError(getErrorMessage(err));
                          }
                        }}
                      >
                        {ns}
                      </Button>
                    ))}
                  </Row>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!ordersQ.isLoading && orders.length === 0 ? <p>No orders.</p> : null}
      </Card>
    </Page>
  );
}
