import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listCustomers, createCustomer } from '@/api/customers';
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
  HighlightRow,
  Badge,
  Tabs,
  Tab,
} from '@/components/ui/primitives';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toastError, toastSuccess } from '@/lib/toast';
import { useDeepLinkHighlight } from '@/hooks/useDeepLinkHighlight';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate } from '@/utils/dates';

export function CustomersPage() {
  const qc = useQueryClient();
  const timeZone = useShopTimezone();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    if (searchParams.get('customer')) setFilter('all');
  }, [searchParams]);

  const listQ = useQuery({
    queryKey: ['customers', filter],
    queryFn: () => listCustomers(filter),
  });

  const createM = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      toastSuccess('Customer added.');
      setForm({ name: '', phone: '', email: '' });
      void qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createM.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
    });
  }

  const customers = listQ.data || [];
  const highlightCustomerId = useDeepLinkHighlight(
    'customer',
    useMemo(() => customers.map((c) => c.id), [customers]),
  );

  return (
    <Page>
      <PageTitle>Customers</PageTitle>
      <PageLead>Customer profiles and balances for this shop.</PageLead>

      <Card>
        <h2 style={{ marginTop: 0 }}>Add customer</h2>
        <form onSubmit={onCreate}>
          <Row>
            <Field>
              Name
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Customer name"
                required
              />
            </Field>
            <Field>
              Phone
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
                required
              />
            </Field>
            <Field>
              Email
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email address"
              />
            </Field>
            <Button type="submit" loading={createM.isPending}>
              {createM.isPending ? 'Adding…' : 'Add'}
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
        {listQ.isLoading ? (
          <TableSkeleton
            columns={7}
            rows={7}
            widths={['8rem', '6rem', '7rem', '5rem', '5rem', '3.5rem', '6rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Spent</th>
                <th>Balance</th>
                <th>Visits</th>
                <th>Last purchase</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <HighlightRow
                  key={c.id}
                  $active={highlightCustomerId === c.id}
                  data-hl={c.id}
                >
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email || '—'}</td>
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
                    {c.lastPurchaseDate
                      ? formatShopDate(c.lastPurchaseDate, timeZone)
                      : '—'}
                  </td>
                </HighlightRow>
              ))}
            </tbody>
          </Table>
        )}
        {!listQ.isLoading && customers.length === 0 ? (
          <p>No customers.</p>
        ) : null}
      </Card>
    </Page>
  );
}
