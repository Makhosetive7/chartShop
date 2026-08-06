import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listExpenses, createExpense, expenseBreakdown } from '@/api/ops';
import { getErrorMessage, money } from '@/api/types';
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
  Tabs,
  Tab,
} from '@/components/ui/primitives';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { toastError, toastSuccess } from '@/lib/toast';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate } from '@/utils/dates';

const PERIODS = ['daily', 'weekly', 'monthly'] as const;
const CATEGORIES = [
  'purchases',
  'rent',
  'utilities',
  'transport',
  'marketing',
  'packaging',
  'market_fees',
  'other',
];

export function ExpensesPage() {
  const qc = useQueryClient();
  const timeZone = useShopTimezone();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('daily');
  const [form, setForm] = useState({
    amount: '',
    description: '',
    category: 'other',
    paymentMethod: 'cash',
  });

  const listQ = useQuery({
    queryKey: ['expenses', period],
    queryFn: () => listExpenses(period),
  });

  const breakdownQ = useQuery({
    queryKey: ['expenses', 'breakdown', period],
    queryFn: () => expenseBreakdown(period === 'daily' ? 'monthly' : period),
  });

  const createM = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      toastSuccess('Expense recorded.');
      setForm({
        amount: '',
        description: '',
        category: 'other',
        paymentMethod: 'cash',
      });
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createM.mutate({
      amount: Number(form.amount),
      description: form.description.trim(),
      category: form.category,
      paymentMethod: form.paymentMethod,
    });
  }

  const expenses = listQ.data?.expenses || [];
  const breakdown = (breakdownQ.data?.breakdown || []) as Array<
    [string, { total: number; count: number }]
  >;

  return (
    <Page>
      <PageTitle>Expenses</PageTitle>
      <PageLead>Record spend and review period totals / category mix.</PageLead>


      <Card>
        <form onSubmit={onCreate}>
          <Row>
            <Field>
              Amount
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </Field>
            <Field>
              Description
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
            </Field>
            <Field>
              Category
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Method
              <Select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
              >
                <option value="cash">cash</option>
                <option value="bank">bank</option>
                <option value="mobile">mobile</option>
                <option value="other">other</option>
              </Select>
            </Field>
            <Button type="submit" loading={createM.isPending}>
              {createM.isPending ? 'Recording…' : 'Record'}
            </Button>
          </Row>
        </form>
      </Card>

      <Tabs>
        {PERIODS.map((p) => (
          <Tab
            key={p}
            type="button"
            $active={period === p}
            onClick={() => setPeriod(p)}
          >
            {p}
          </Tab>
        ))}
      </Tabs>

      <Card>
        {listQ.isLoading ? (
          <>
            <Skeleton $w="10rem" $h="1rem" $mb="16px" />
            <TableSkeleton
              columns={4}
              rows={6}
              widths={['8rem', '10rem', '5rem', '4.5rem']}
            />
          </>
        ) : (
          <>
            <p>
              Period total:{' '}
              <strong>{money(listQ.data?.total)}</strong>
            </p>
            <Table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((ex) => (
                  <tr key={ex.id}>
                    <td>{formatShopDate(ex.date, timeZone)}</td>
                    <td>{ex.description}</td>
                    <td>{ex.category}</td>
                    <td>{money(ex.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>Breakdown</h2>
        {breakdownQ.isLoading ? (
          <TableSkeleton
            columns={3}
            rows={5}
            widths={['7rem', '3.5rem', '5rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map(([cat, info]) => (
                <tr key={cat}>
                  <td>{cat}</td>
                  <td>{info.count}</td>
                  <td>{money(info.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </Page>
  );
}
