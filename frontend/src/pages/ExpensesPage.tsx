import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listExpenses,
  createExpense,
  expenseBreakdown,
  getCashAvailable,
} from '@/api/ops';
import {
  getErrorMessage,
  getInsufficientCashError,
  money,
  type InsufficientCashError,
} from '@/api/types';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { toastError, toastSuccess } from '@/lib/toast';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate } from '@/utils/dates';
import { useAuth } from '@/auth';

const PERIODS = ['daily', 'weekly', 'monthly'] as const;
const CATEGORIES = [
  'purchases',
  'restocking',
  'rent',
  'utilities',
  'transport',
  'marketing',
  'packaging',
  'market_fees',
  'other',
];

const CATEGORY_LABELS: Record<string, string> = {
  purchases: 'Purchases',
  restocking: 'Restocking',
  rent: 'Rent',
  utilities: 'Utilities',
  transport: 'Transport',
  marketing: 'Marketing',
  packaging: 'Packaging',
  market_fees: 'Market fees',
  other: 'Other',
};

type ExpenseForm = {
  amount: string;
  description: string;
  kind: 'operating_expense' | 'inventory_fund_transfer';
  category: string;
  paymentMethod: string;
};

const emptyForm: ExpenseForm = {
  amount: '',
  description: '',
  kind: 'operating_expense',
  category: 'other',
  paymentMethod: 'cash',
};

export function ExpensesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const timeZone = useShopTimezone();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('daily');
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [isRestockMode, setIsRestockMode] = useState(false);
  const [overspend, setOverspend] = useState<InsufficientCashError | null>(
    null,
  );

  const listQ = useQuery({
    queryKey: ['expenses', period],
    queryFn: () => listExpenses(period),
  });

  const cashQ = useQuery({
    queryKey: ['expenses', 'cash-available'],
    queryFn: getCashAvailable,
  });

  const breakdownQ = useQuery({
    queryKey: ['expenses', 'breakdown', period],
    queryFn: () => expenseBreakdown(period === 'daily' ? 'monthly' : period),
  });

  const createM = useMutation({
    mutationFn: createExpense,
    onSuccess: (data) => {
      const topUp =
        data.ownerCashIn && data.ownerCashIn > 0
          ? ` Owner cash-in ${money(data.ownerCashIn)} recorded.`
          : '';
      toastSuccess(`Expense recorded.${topUp}`);
      setForm(emptyForm);
      setIsRestockMode(false);
      setOverspend(null);
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (e) => {
      const insufficient = getInsufficientCashError(e);
      if (insufficient) {
        setOverspend(insufficient);
        return;
      }
      toastError(getErrorMessage(e));
    },
  });

  function submitExpense(allowOverspend = false) {
    createM.mutate({
      amount: Number(form.amount),
      description: form.description.trim(),
      kind: form.kind,
      category: form.category,
      paymentMethod: form.paymentMethod,
      ...(allowOverspend ? { allowOverspend: true } : {}),
    });
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    submitExpense(false);
  }

  function useRestockMode() {
    if (!isAdmin) return;
    setIsRestockMode(true);
    setForm((prev) => ({
      ...prev,
      kind: 'inventory_fund_transfer',
      category: 'restocking',
      description: prev.description || 'Stock restock',
    }));
  }

  function useNormalMode() {
    setIsRestockMode(false);
    setForm((prev) => ({
      ...prev,
      kind: 'operating_expense',
      category: prev.category === 'restocking' ? 'other' : prev.category,
      description:
        prev.description === 'Stock restock' ? '' : prev.description,
    }));
  }

  const expenses = listQ.data?.expenses || [];
  const breakdown = (breakdownQ.data?.breakdown || []) as Array<
    [string, { total: number; count: number }]
  >;
  const cashAvailable = cashQ.data?.cashAvailable;
  const operatingTotal = listQ.data?.operatingTotal ?? 0;
  const inventoryTransferTotal = listQ.data?.inventoryTransferTotal ?? 0;

  return (
    <Page>
      <PageTitle>Expenses</PageTitle>
      <PageLead>
        Record spend and review period totals / category mix.
        {cashAvailable != null ? (
          <>
            {' '}
            Cash available in the till: <strong>{money(cashAvailable)}</strong>
            .
          </>
        ) : null}
      </PageLead>

      <Card>
        <form onSubmit={onCreate}>
          <div
            style={{
              border: '1px solid var(--border-color, #e6d9d3)',
              padding: 12,
              marginBottom: 14,
              background: 'var(--surface-muted, #fff7f4)',
            }}
          >
            <p style={{ margin: '0 0 10px 0', fontWeight: 600 }}>
              Quick actions
            </p>
            <p style={{ margin: '0 0 12px 0', fontSize: 13, opacity: 0.8 }}>
              {isAdmin
                ? 'Use Restock for supplier/stock top-ups. Records cash out only — stock levels managed separately in Products.'
                : 'Restock is available to admins only. You can still record normal expenses below.'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isAdmin ? (
                <Button
                  type="button"
                  variant={isRestockMode ? 'filled' : 'light'}
                  onClick={useRestockMode}
                  style={{ minWidth: 210 }}
                >
                  Restock
                </Button>
              ) : null}
              <Button
                type="button"
                variant={!isRestockMode ? 'filled' : 'light'}
                onClick={useNormalMode}
                style={{ minWidth: 210 }}
              >
                Normal expense
              </Button>
            </div>
          </div>
          <Row>
            <Field>
              Amount
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount spent"
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
                placeholder={
                  isRestockMode
                    ? 'What stock are you buying'
                    : 'What was this for'
                }
                required
              />
            </Field>
            {!isRestockMode ? (
              <Field>
                Category
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.filter((c) => c !== 'restocking').map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c] || c}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
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
            <Button type="submit" loading={createM.isPending && !overspend}>
              {createM.isPending && !overspend ? 'Recording…' : 'Record'}
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
              columns={5}
              rows={6}
              widths={['8rem', '9rem', '10rem', '5rem', '4.5rem']}
            />
          </>
        ) : (
          <>
            <p>
              Cash out total: <strong>{money(listQ.data?.total)}</strong> (Operating{' '}
              {money(operatingTotal)} + Restock{' '}
              {money(inventoryTransferTotal)}) {/* D4-A */}
            </p>
            <Table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((ex) => (
                  <tr key={ex.id}>
                    <td>{formatShopDate(ex.date, timeZone)}</td>
                    <td>
                      {ex.kind === 'inventory_fund_transfer'
                        ? 'Restock (cash out)' // D4-A
                        : 'Operating expense'}
                    </td>
                    <td>{ex.description}</td>
                    <td>{CATEGORY_LABELS[ex.category] || ex.category}</td>
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
                  <td>{CATEGORY_LABELS[cat] || cat}</td>
                  <td>{info.count}</td>
                  <td>{money(info.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(overspend)}
        onOpenChange={(open) => {
          if (!open) setOverspend(null);
        }}
        title="Not enough recorded cash"
        description={
          overspend
            ? `This expense is ${money(overspend.amount)}, but the till only shows ${money(overspend.cashAvailable)} recorded cash (shortfall ${money(overspend.shortfall)}). If you paid from your pocket or cash not yet recorded, confirm and we’ll add an owner cash-in for the shortfall.`
            : ''
        }
        confirmLabel="Record with owner cash-in"
        cancelLabel="Cancel"
        tone="filled"
        loading={createM.isPending}
        onConfirm={() => submitExpense(true)}
      />
    </Page>
  );
}
