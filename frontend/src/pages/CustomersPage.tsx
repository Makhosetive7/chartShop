import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCustomers,
  createCustomer,
  getCustomerHistory,
  getCreditHistory,
  recordPayment,
} from '@/api/customers';
import { getErrorMessage, money } from '@/api/types';
import {
  Page,
  PageTitle,
  PageLead,
  Card,
  Row,
  Field,
  Input,
  Button,
  Table,
  Badge,
  ErrorBanner,
  SuccessBanner,
  Tabs,
  Tab,
} from '@/components/ui/primitives';

export function CustomersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['customers', filter],
    queryFn: () => listCustomers(filter),
  });

  const historyQ = useQuery({
    queryKey: ['customers', selectedId, 'history'],
    queryFn: () => getCustomerHistory(selectedId!),
    enabled: Boolean(selectedId),
  });

  const creditQ = useQuery({
    queryKey: ['customers', selectedId, 'credit'],
    queryFn: () => getCreditHistory(selectedId!),
    enabled: Boolean(selectedId),
  });

  const createM = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      setOk('Customer added.');
      setForm({ name: '', phone: '', email: '' });
      void qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createM.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
    });
  }

  const customers = listQ.data || [];

  return (
    <Page>
      <PageTitle>Customers</PageTitle>
      <PageLead>Profiles, credit balances, payments, and purchase history.</PageLead>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {ok ? <SuccessBanner>{ok}</SuccessBanner> : null}

      <Card>
        <h2 style={{ marginTop: 0 }}>Add customer</h2>
        <form onSubmit={onCreate}>
          <Row>
            <Field>
              Name
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field>
              Phone
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </Field>
            <Field>
              Email
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Button type="submit" disabled={createM.isPending}>
              Add
            </Button>
          </Row>
        </form>
      </Card>

      <Tabs>
        <Tab $active={filter === 'all'} type="button" onClick={() => setFilter('all')}>
          All
        </Tab>
        <Tab
          $active={filter === 'active'}
          type="button"
          onClick={() => setFilter('active')}
        >
          Active (30d)
        </Tab>
      </Tabs>

      <Card>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Spent</th>
              <th>Balance</th>
              <th>Visits</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{money(c.totalSpent)}</td>
                <td>
                  {c.currentBalance > 0 ? (
                    <Badge $tone="warning">{money(c.currentBalance)}</Badge>
                  ) : (
                    money(0)
                  )}
                </td>
                <td>{c.totalVisits}</td>
                <td>
                  <Button
                    type="button"
                    $variant="ghost"
                    $size="sm"
                    onClick={() => setSelectedId(c.id)}
                  >
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {selectedId && historyQ.data ? (
        <Card>
          <h2 style={{ marginTop: 0 }}>
            {historyQ.data.customer.name}
          </h2>
          <p>
            Balance owed:{' '}
            <strong>{money(historyQ.data.customer.currentBalance)}</strong>
          </p>

          <Row>
            <Field>
              Record payment
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              onClick={async () => {
                try {
                  await recordPayment(selectedId, Number(payAmount));
                  setOk('Payment recorded.');
                  setPayAmount('');
                  void qc.invalidateQueries({ queryKey: ['customers'] });
                  void historyQ.refetch();
                  void creditQ.refetch();
                } catch (err) {
                  setError(getErrorMessage(err));
                }
              }}
            >
              Apply payment
            </Button>
          </Row>

          <h3>Recent sales</h3>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(historyQ.data.sales || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.date ? new Date(s.date).toLocaleString() : '—'}</td>
                  <td>{s.type}</td>
                  <td>{money(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h3>Credit ledger</h3>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {((creditQ.data?.transactions as Array<{
                date?: string;
                type?: string;
                amount?: number;
                description?: string;
              }>) || []).map((t, i) => (
                <tr key={i}>
                  <td>{t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
                  <td>{t.type}</td>
                  <td>{money(t.amount)}</td>
                  <td>{t.description}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
    </Page>
  );
}
