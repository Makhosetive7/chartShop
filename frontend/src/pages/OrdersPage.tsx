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
  Tabs,
  Tab,
} from '@/components/ui/primitives';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProductLineFields } from '@/components/products/ProductLineFields';
import { toastError, toastSuccess } from '@/lib/toast';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate } from '@/utils/dates';
import {
  emptyCatalogLine,
  formatSaleItemLabel,
  lineToSaleItem,
  pickDefaultIds,
  type CatalogLine,
} from '@/utils/productCatalog';

const STATUSES = ['all', 'pending', 'completed', 'cancelled'] as const;

export function OrdersPage() {
  const qc = useQueryClient();
  const timeZone = useShopTimezone();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all');
  const [customer, setCustomer] = useState('');
  const [orderType, setOrderType] = useState('pickup');
  const [notes, setNotes] = useState('');
  const [line, setLine] = useState<CatalogLine>(emptyCatalogLine());
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const productsQ = useQuery({
    queryKey: ['products', 'all'],
    queryFn: listProducts,
  });
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
      const item = lineToSaleItem(line);
      if (!item) throw new Error('Choose a product and quantity.');
      const items: SaleItemInput[] = [item];
      return createOrder({
        customer: customer.trim(),
        items,
        orderType,
        notes,
      });
    },
    onSuccess: () => {
      toastSuccess('Order placed.');
      setLine(emptyCatalogLine());
      setNotes('');
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const products = productsQ.data || [];
  const customers = customersQ.data || [];
  const orders = ordersQ.data || [];

  const nextActions = useMemo(
    () =>
      ({
        pending: ['completed', 'cancelled'],
        confirmed: ['completed', 'cancelled'],
        ready: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      }) as Record<string, string[]>,
    [],
  );

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createM.mutate();
  }

  function tone(s: string) {
    if (s === 'completed') return 'success' as const;
    if (s === 'cancelled') return 'danger' as const;
    return 'warning' as const;
  }

  function orderItemsLabel(items: unknown): string {
    if (!Array.isArray(items) || !items.length) return '—';
    return items
      .slice(0, 2)
      .map((raw) => {
        const item = raw as {
          productName?: string;
          variantLabel?: string;
          packLabel?: string;
          quantity?: number;
        };
        return formatSaleItemLabel(item);
      })
      .join(', ');
  }

  async function applyStatus(orderId: string, nextStatus: string) {
    try {
      setStatusBusy(`${orderId}:${nextStatus}`);
      await updateOrderStatus(orderId, nextStatus);
      toastSuccess(
        nextStatus === 'cancelled' ? 'Order cancelled.' : `Order → ${nextStatus}`,
      );
      setCancelOrder(null);
      void qc.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setStatusBusy(null);
    }
  }

  return (
    <Page>
      <PageTitle>Orders</PageTitle>
      <PageLead>
        Pickup / delivery orders — pending until completed or cancelled. Choose option/pack
        when the product has options.
      </PageLead>

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
              Notes
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </Row>

          <ProductLineFields
            line={line}
            products={products}
            hidePrice
            onChange={(next) => {
              // Keep defaults if product picked without variant yet
              if (next.productId && !next.variantId) {
                const p = products.find((x) => x.id === next.productId);
                const defaults = pickDefaultIds(p);
                setLine({ ...next, ...defaults });
                return;
              }
              setLine(next);
            }}
          />

          <Row style={{ marginTop: 12 }}>
            <Button type="submit" loading={createM.isPending}>
              {createM.isPending ? 'Placing…' : 'Place order'}
            </Button>
          </Row>
        </form>
      </Card>

      <Tabs>
        {STATUSES.map((s) => (
          <Tab key={s} type="button" $active={status === s} onClick={() => setStatus(s)}>
            {s}
          </Tab>
        ))}
      </Tabs>

      <Card>
        {ordersQ.isLoading ? (
          <TableSkeleton
            columns={7}
            rows={7}
            widths={['3.5rem', '7rem', '8rem', '4.5rem', '5rem', '8rem', '5rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Customer</th>
                <th>Items</th>
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
                  <td>{orderItemsLabel(o.items)}</td>
                  <td>{money(o.total)}</td>
                  <td>
                    <Badge $tone={tone(o.status)}>{o.status}</Badge>
                  </td>
                  <td>{formatShopDate(o.orderDate, timeZone)}</td>
                  <td>
                    <Row>
                      {(nextActions[o.status] || []).map((ns) => (
                        <Button
                          key={ns}
                          type="button"
                          $variant="ghost"
                          $size="sm"
                          loading={statusBusy === `${o.id}:${ns}`}
                          onClick={() => {
                            if (ns === 'cancelled') {
                              setCancelOrder({
                                id: o.id,
                                label: o.customerName || o.shortId || o.id,
                              });
                              return;
                            }
                            void applyStatus(o.id, ns);
                          }}
                        >
                          {statusBusy === `${o.id}:${ns}`
                            ? '…'
                            : ns === 'completed'
                              ? 'complete'
                              : ns === 'cancelled'
                                ? 'cancel'
                                : ns}
                        </Button>
                      ))}
                    </Row>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {!ordersQ.isLoading && orders.length === 0 ? <p>No orders.</p> : null}
      </Card>

      <ConfirmDialog
        open={Boolean(cancelOrder)}
        onOpenChange={(open) => {
          if (!open) setCancelOrder(null);
        }}
        title="Cancel this order?"
        description={
          cancelOrder
            ? `Cancel order for ${cancelOrder.label}. You can still view it under cancelled orders.`
            : 'Cancel this order?'
        }
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        tone="danger"
        loading={Boolean(cancelOrder && statusBusy === `${cancelOrder.id}:cancelled`)}
        onConfirm={() => {
          if (!cancelOrder) return;
          void applyStatus(cancelOrder.id, 'cancelled');
        }}
      />
    </Page>
  );
}
