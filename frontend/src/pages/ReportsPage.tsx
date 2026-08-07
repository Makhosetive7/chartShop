import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Download } from 'lucide-react';
import {
  downloadReportPdf,
  fetchBestSellers,
  fetchDailyReport,
  fetchMonthlyReport,
  fetchProfit,
  fetchWeeklyReport,
  type CashFlowData,
  type ProfitData,
  type ReportResponse,
} from '@/api/reports';
import { getErrorMessage, money } from '@/api/types';
import {
  Page,
  PageTitle,
  PageLead,
  Card,
  Tabs,
  Tab,
  Table,
  ErrorBanner,
  Select,
  Field,
  Button,
} from '@/components/ui/primitives';
import { ReportsBodySkeleton } from '@/components/skeletons/PageSkeletons';
import { toastError, toastSuccess } from '@/lib/toast';

type ReportTab = 'daily' | 'weekly' | 'monthly' | 'best' | 'profit';

const Header = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.space[5]};
  min-width: 0;
`;

const TabsRow = styled.div`
  display: flex;
  margin-bottom: ${({ theme }) => theme.space[4]};
  width: 100%;
  max-width: 100%;
  min-width: 0;

  > * {
    width: 100%;
    max-width: 100%;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  width: 100%;
  min-width: 0;
`;

const ToolbarFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: ${({ theme }) => theme.space[3]};
`;

const Hero = styled.div`
  background: ${({ theme }) => theme.colors.primaryTint};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};
  min-width: 0;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[5]};
  }
`;

const HeroLabel = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.82rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 6px;
`;

const HeroValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(1.6rem, 5vw, 2.2rem);
  letter-spacing: -0.04em;
  color: ${({ theme }) => theme.colors.primaryDark};
  line-height: 1.1;
  overflow-wrap: anywhere;
`;

const HeroNote = styled.div`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.85rem;
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 720px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Kpi = styled.div`
  background: ${({ theme }) => theme.colors.cream};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 14px;
  min-width: 0;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[4]};
  }
`;

const KpiLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 6px;
`;

const KpiValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(1rem, 3.5vw, 1.2rem);
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.textPrimary};
  overflow-wrap: anywhere;
  line-height: 1.2;
`;

const KpiSub = styled.div`
  margin-top: 6px;
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Sections = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Section = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
  min-width: 0;

  h2 {
    margin: 0 0 ${({ theme }) => theme.space[3]};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.02rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const RowList = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div<{ $accent?: boolean; $total?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: baseline;
  padding: 10px 0;
  border-top: 1px solid
    ${({ theme, $total }) =>
      $total ? theme.colors.textPrimary : theme.colors.border};
  color: ${({ theme, $accent }) =>
    $accent ? theme.colors.primary : theme.colors.textPrimary};
  font-weight: ${({ theme, $total }) =>
    $total ? theme.fontWeights.bold : theme.fontWeights.regular};
  font-size: 0.9rem;

  &:first-of-type {
    border-top: ${({ $total, theme }) =>
      $total ? `1px solid ${theme.colors.textPrimary}` : 'none'};
    padding-top: ${({ $total }) => ($total ? '10px' : '0')};
  }

  span:nth-child(2),
  span:nth-child(3) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  span:nth-child(3) {
    min-width: 2.2rem;
    color: ${({ theme, $accent, $total }) =>
      $accent || $total
        ? 'inherit'
        : theme.colors.textSecondary};
  }
`;

const EmptyBox = styled.div`
  background: ${({ theme }) => theme.colors.cream};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.space[5]};
  text-align: center;

  strong {
    display: block;
    margin-bottom: 6px;
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${({ theme }) => theme.colors.primaryTint};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.75rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const CardHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.1rem;
  }
`;

const PeriodMeta = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.88rem;
`;

const SummaryTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.02em;
`;

const SummaryHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

function isCashFlowData(
  data: CashFlowData | ProfitData | undefined,
): data is CashFlowData {
  return Boolean(data && 'cashFlow' in data);
}

function isProfitData(
  data: CashFlowData | ProfitData | undefined,
): data is ProfitData {
  return Boolean(data && 'profit' in data && !('cashFlow' in data));
}

function activityCount(data: CashFlowData) {
  return (
    (data.transactions?.totalSales || 0) +
    (data.transactions?.expenses || 0) +
    (data.transactions?.refunds || 0) +
    (data.cashFlow?.inflows?.debtPayments?.count || 0) +
    (data.cashFlow?.inflows?.laybyePayments?.count || 0)
  );
}

function CashFlowSummary({
  data,
  title,
  subtitle,
  badge,
}: {
  data: CashFlowData;
  title: string;
  subtitle?: string;
  badge?: string | null;
}) {
  const cf = data.cashFlow;
  const rev = data.revenue;
  const out = data.outstanding;
  const inflowTx =
    (cf?.inflows?.cashSales?.count || 0) +
    (cf?.inflows?.debtPayments?.count || 0) +
    (cf?.inflows?.laybyePayments?.count || 0);
  const outflowItems =
    (cf?.outflows?.expenses?.count || 0) + (cf?.outflows?.refunds?.count || 0);
  const revenueTx =
    (rev?.cash?.count || 0) +
    (rev?.credit?.count || 0) +
    (rev?.completedLaybyes?.count || 0);
  const outstandingAccounts =
    (out?.creditDue?.customers || 0) + (out?.laybyeDue?.count || 0);
  const net = cf?.net || 0;
  const tx = activityCount(data);

  return (
    <>
      <SummaryHead>
        <div>
          <SummaryTitle>{title}</SummaryTitle>
          {subtitle ? (
            <PeriodMeta style={{ marginBottom: 0 }}>{subtitle}</PeriodMeta>
          ) : null}
        </div>
        {badge ? <Badge>{badge}</Badge> : null}
      </SummaryHead>

      <Hero>
        <HeroLabel>Net cash flow</HeroLabel>
        <HeroValue>{money(net)}</HeroValue>
        <HeroNote>
          {net >= 0 ? 'Positive flow' : 'Negative flow'} · {tx} transaction
          {tx === 1 ? '' : 's'} recorded
        </HeroNote>
      </Hero>

      <KpiGrid>
        <Kpi>
          <KpiLabel>Cash in</KpiLabel>
          <KpiValue>{money(cf?.inflows?.total || 0)}</KpiValue>
          <KpiSub>
            {inflowTx} transaction{inflowTx === 1 ? '' : 's'}
          </KpiSub>
        </Kpi>
        <Kpi>
          <KpiLabel>Cash out</KpiLabel>
          <KpiValue>{money(cf?.outflows?.total || 0)}</KpiValue>
          <KpiSub>
            {outflowItems} item{outflowItems === 1 ? '' : 's'}
          </KpiSub>
        </Kpi>
        <Kpi>
          <KpiLabel>Total revenue</KpiLabel>
          <KpiValue>{money(rev?.total || 0)}</KpiValue>
          <KpiSub>
            {revenueTx} transaction{revenueTx === 1 ? '' : 's'}
          </KpiSub>
        </Kpi>
        <Kpi>
          <KpiLabel>Outstanding debt</KpiLabel>
          <KpiValue>{money(out?.total || 0)}</KpiValue>
          <KpiSub>
            {outstandingAccounts} account{outstandingAccounts === 1 ? '' : 's'}
          </KpiSub>
        </Kpi>
      </KpiGrid>

      <Sections>
        <Section>
          <h2>Cash flow by source</h2>
          <RowList>
            <Row>
              <span>Cash sales</span>
              <span>{money(cf?.inflows?.cashSales?.amount || 0)}</span>
              <span>{cf?.inflows?.cashSales?.count || 0}</span>
            </Row>
            <Row>
              <span>Debt payments</span>
              <span>{money(cf?.inflows?.debtPayments?.amount || 0)}</span>
              <span>{cf?.inflows?.debtPayments?.count || 0}</span>
            </Row>
            <Row>
              <span>Laybye payments</span>
              <span>{money(cf?.inflows?.laybyePayments?.amount || 0)}</span>
              <span>{cf?.inflows?.laybyePayments?.count || 0}</span>
            </Row>
            <Row $accent>
              <span>Expenses</span>
              <span>({money(cf?.outflows?.expenses?.amount || 0)})</span>
              <span>{cf?.outflows?.expenses?.count || 0}</span>
            </Row>
            <Row $accent>
              <span>Refunds</span>
              <span>({money(cf?.outflows?.refunds?.amount || 0)})</span>
              <span>{cf?.outflows?.refunds?.count || 0}</span>
            </Row>
            <Row $total>
              <span>Net cash flow</span>
              <span>{money(net)}</span>
              <span />
            </Row>
          </RowList>
        </Section>

        <Section>
          <h2>Revenue & expense summary</h2>
          <RowList>
            <Row>
              <span>Cash sales</span>
              <span>{money(rev?.cash?.amount || 0)}</span>
              <span>{rev?.cash?.count || 0}</span>
            </Row>
            <Row>
              <span>Credit sales</span>
              <span>{money(rev?.credit?.amount || 0)}</span>
              <span>{rev?.credit?.count || 0}</span>
            </Row>
            <Row>
              <span>Completed laybyes</span>
              <span>{money(rev?.completedLaybyes?.amount || 0)}</span>
              <span>{rev?.completedLaybyes?.count || 0}</span>
            </Row>
            <Row $accent>
              <span>Total expenses</span>
              <span>({money(cf?.outflows?.expenses?.amount || 0)})</span>
              <span>{cf?.outflows?.expenses?.count || 0}</span>
            </Row>
            <Row $total>
              <span>Total revenue</span>
              <span>{money(rev?.total || 0)}</span>
              <span />
            </Row>
          </RowList>
        </Section>
      </Sections>

      {(data.profitability || out) && (
        <Sections>
          <Section>
            <h2>Operating result</h2>
            <RowList>
              <Row>
                <span>Revenue</span>
                <span>{money(rev?.total || 0)}</span>
                <span />
              </Row>
              <Row $accent>
                <span>Expenses</span>
                <span>({money(data.profitability?.expenses || 0)})</span>
                <span />
              </Row>
              <Row $total>
                <span>Operating result</span>
                <span>
                  {money(
                    data.profitability?.operatingResult ??
                      data.profitability?.netProfit ??
                      0,
                  )}
                </span>
                <span />
              </Row>
              <Row>
                <span>Margin</span>
                <span>
                  {(data.profitability?.profitMargin || 0).toFixed(1)}%
                </span>
                <span />
              </Row>
              {data.profitability?.hasProductCosts ? (
                <>
                  <Row>
                    <span>Gross profit</span>
                    <span>{money(data.profitability.grossProfit || 0)}</span>
                    <span />
                  </Row>
                  <Row>
                    <span>Gross margin</span>
                    <span>
                      {(data.profitability.grossMarginPct || 0).toFixed(1)}%
                    </span>
                    <span />
                  </Row>
                </>
              ) : null}
            </RowList>
          </Section>

          <Section>
            <h2>Outstanding balances</h2>
            {(out?.total || 0) > 0 ? (
              <RowList>
                <Row>
                  <span>Customer credit</span>
                  <span>{money(out?.creditDue?.amount || 0)}</span>
                  <span>{out?.creditDue?.customers || 0}</span>
                </Row>
                <Row>
                  <span>Active laybyes</span>
                  <span>{money(out?.laybyeDue?.amount || 0)}</span>
                  <span>{out?.laybyeDue?.count || 0}</span>
                </Row>
                <Row $total>
                  <span>Total owed to shop</span>
                  <span>{money(out?.total || 0)}</span>
                  <span />
                </Row>
              </RowList>
            ) : (
              <EmptyBox>
                <strong>Nothing outstanding</strong>
                <span>No credit or laybye balances due right now.</span>
              </EmptyBox>
            )}
          </Section>
        </Sections>
      )}
    </>
  );
}

function ProfitSummary({ data, period }: { data: ProfitData; period: string }) {
  const profit = data.profit || 0;
  const revenue = data.revenue || 0;
  const expenses = data.expenses || 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const expenseRatio = revenue > 0 ? (expenses / revenue) * 100 : 0;
  const periodLabel =
    period === 'daily'
      ? 'Today'
      : period === 'yesterday'
        ? 'Yesterday'
        : period === 'weekly'
          ? 'This week'
          : period === 'monthly'
            ? 'This month'
            : period;

  return (
    <>
      <SummaryHead>
        <div>
          <SummaryTitle>Profit summary · {periodLabel}</SummaryTitle>
          {data.startDate && data.endDate ? (
            <PeriodMeta style={{ marginBottom: 0 }}>
              {new Date(data.startDate).toLocaleDateString()} –{' '}
              {new Date(data.endDate).toLocaleDateString()}
            </PeriodMeta>
          ) : null}
        </div>
      </SummaryHead>

      <Hero>
        <HeroLabel>{profit >= 0 ? 'Profit' : 'Loss'}</HeroLabel>
        <HeroValue>{money(Math.abs(profit))}</HeroValue>
        <HeroNote>
          {profit >= 0 ? 'In the black' : 'In the red'} ·{' '}
          {margin.toFixed(1)}% margin
        </HeroNote>
      </Hero>

      <KpiGrid>
        <Kpi>
          <KpiLabel>Revenue</KpiLabel>
          <KpiValue>{money(revenue)}</KpiValue>
          <KpiSub>
            {data.salesCount || 0} sale{(data.salesCount || 0) === 1 ? '' : 's'}
          </KpiSub>
        </Kpi>
        <Kpi>
          <KpiLabel>Expenses</KpiLabel>
          <KpiValue>{money(expenses)}</KpiValue>
          <KpiSub>
            {data.expensesCount || 0} item
            {(data.expensesCount || 0) === 1 ? '' : 's'}
          </KpiSub>
        </Kpi>
        <Kpi>
          <KpiLabel>Profit margin</KpiLabel>
          <KpiValue>{margin.toFixed(1)}%</KpiValue>
          <KpiSub>of revenue</KpiSub>
        </Kpi>
        <Kpi>
          <KpiLabel>Expense ratio</KpiLabel>
          <KpiValue>{expenseRatio.toFixed(1)}%</KpiValue>
          <KpiSub>of revenue</KpiSub>
        </Kpi>
      </KpiGrid>

      <Section>
        <h2>Profit & loss</h2>
        <RowList>
          <Row>
            <span>Total sales</span>
            <span>{money(revenue)}</span>
            <span>{data.salesCount || 0}</span>
          </Row>
          <Row $accent>
            <span>Total expenses</span>
            <span>({money(expenses)})</span>
            <span>{data.expensesCount || 0}</span>
          </Row>
          <Row $total>
            <span>{profit >= 0 ? 'Profit' : 'Loss'}</span>
            <span>{money(Math.abs(profit))}</span>
            <span />
          </Row>
          <Row>
            <span>Net per transaction</span>
            <span>
              {money(profit / Math.max(data.salesCount || 1, 1))}
            </span>
            <span />
          </Row>
        </RowList>
      </Section>
    </>
  );
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('daily');
  const [bestDays, setBestDays] = useState(7);
  const [profitPeriod, setProfitPeriod] = useState('daily');
  const [month, setMonth] = useState('');

  const dailyQ = useQuery({
    queryKey: ['reports', 'daily'],
    queryFn: fetchDailyReport,
    enabled: tab === 'daily',
  });
  const weeklyQ = useQuery({
    queryKey: ['reports', 'weekly'],
    queryFn: fetchWeeklyReport,
    enabled: tab === 'weekly',
  });
  const monthlyQ = useQuery({
    queryKey: ['reports', 'monthly', month],
    queryFn: () => fetchMonthlyReport(month || undefined),
    enabled: tab === 'monthly',
  });
  const bestQ = useQuery({
    queryKey: ['reports', 'best', bestDays],
    queryFn: () => fetchBestSellers(bestDays),
    enabled: tab === 'best',
  });
  const profitQ = useQuery({
    queryKey: ['reports', 'profit', profitPeriod],
    queryFn: () => fetchProfit(profitPeriod),
    enabled: tab === 'profit',
  });

  const active =
    tab === 'daily'
      ? dailyQ
      : tab === 'weekly'
        ? weeklyQ
        : tab === 'monthly'
          ? monthlyQ
          : tab === 'best'
            ? bestQ
            : profitQ;

  const report = active.data as ReportResponse | undefined;

  const cashData = useMemo(() => {
    if (
      (tab === 'daily' || tab === 'weekly' || tab === 'monthly') &&
      isCashFlowData(report?.data)
    ) {
      return report.data;
    }
    return undefined;
  }, [tab, report]);

  const profitData = useMemo(() => {
    if (tab === 'profit' && isProfitData(report?.data)) {
      return report.data;
    }
    return undefined;
  }, [tab, report]);

  const canExportPdf =
    tab === 'daily' || tab === 'weekly' || tab === 'monthly';

  const pdfM = useMutation({
    mutationFn: async () => {
      if (!canExportPdf) {
        throw new Error('PDF export is for daily, weekly, or monthly.');
      }
      return downloadReportPdf(tab, month || undefined);
    },
    onSuccess: (fileName) => {
      toastSuccess(`Downloaded ${fileName}`);
    },
    onError: (err) => {
      toastError(getErrorMessage(err, 'PDF download failed.'));
    },
  });

  const cashTitle =
    tab === 'monthly' && report?.monthInfo?.label
      ? `${report.monthInfo.label} ${report.monthInfo.year || ''}`.trim()
      : tab === 'daily'
        ? 'Daily financial report'
        : tab === 'weekly'
          ? 'Weekly financial report'
          : 'Monthly financial report';

  const cashSubtitle =
    tab === 'monthly' && report?.monthInfo
      ? report.monthInfo.isCurrentMonth
        ? `${report.monthInfo.daysElapsed} of ${report.monthInfo.daysInMonth} days`
        : 'Complete month'
      : undefined;

  const cashBadge =
    cashData && activityCount(cashData) === 0
      ? tab === 'daily'
        ? 'No activity today'
        : tab === 'weekly'
          ? 'No activity this week'
          : 'No activity this month'
      : null;

  return (
    <Page data-tour="page-reports">
      <Header data-tour="reports-heading">
        <PageTitle style={{ marginBottom: 8 }}>Reports</PageTitle>
        <PageLead style={{ marginBottom: 0 }}>
          Cash flow, bestsellers, and profit — same figures as chat.
        </PageLead>
      </Header>

      <TabsRow>
        <Tabs style={{ marginBottom: 0 }}>
          {(
            [
              ['daily', 'Daily'],
              ['weekly', 'Weekly'],
              ['monthly', 'Monthly'],
              ['best', 'Best sellers'],
              ['profit', 'Profit'],
            ] as const
          ).map(([key, label]) => (
            <Tab
              key={key}
              type="button"
              $active={tab === key}
              onClick={() => {
                setTab(key);
              }}
            >
              {label}
            </Tab>
          ))}
        </Tabs>
      </TabsRow>

      <Toolbar>
        <ToolbarFilters>
          {tab === 'best' ? (
            <Field style={{ minWidth: 120 }}>
              Days
              <Select
                value={bestDays}
                onChange={(e) => setBestDays(Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={7}>7</option>
                <option value={30}>30</option>
              </Select>
            </Field>
          ) : null}

          {tab === 'profit' ? (
            <Field style={{ minWidth: 140 }}>
              Period
              <Select
                value={profitPeriod}
                onChange={(e) => setProfitPeriod(e.target.value)}
              >
                <option value="daily">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="weekly">This week</option>
                <option value="monthly">This month</option>
              </Select>
            </Field>
          ) : null}

          {tab === 'monthly' ? (
            <Field style={{ minWidth: 160 }}>
              Month
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Current month</option>
                {[
                  'january',
                  'february',
                  'march',
                  'april',
                  'may',
                  'june',
                  'july',
                  'august',
                  'september',
                  'october',
                  'november',
                  'december',
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </ToolbarFilters>

        {canExportPdf ? (
          <Button
            type="button"
            onClick={() => pdfM.mutate()}
            loading={pdfM.isPending}
            disabled={active.isLoading}
          >
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={16} />
              {pdfM.isPending ? 'Generating PDF…' : 'Download PDF'}
            </span>
          </Button>
        ) : null}
      </Toolbar>

      {active.isError ? <ErrorBanner>Failed to load report.</ErrorBanner> : null}
      {active.isLoading ? (
        <ReportsBodySkeleton
          variant={
            tab === 'best' ? 'best' : tab === 'profit' ? 'profit' : 'kpis'
          }
        />
      ) : null}

      {!active.isLoading && cashData ? (
        <CashFlowSummary
          data={cashData}
          title={cashTitle}
          subtitle={cashSubtitle}
          badge={cashBadge}
        />
      ) : null}

      {!active.isLoading && profitData ? (
        <ProfitSummary data={profitData} period={profitPeriod} />
      ) : null}

      {!active.isLoading && tab === 'best' && report?.products ? (
        <Card>
          <CardHead>
            <h2>Best sellers · last {bestDays} days</h2>
          </CardHead>
          {report.products.length ? (
            <>
              <KpiGrid style={{ marginBottom: 16 }}>
                <Kpi>
                  <KpiLabel>Products</KpiLabel>
                  <KpiValue>{report.products.length}</KpiValue>
                </Kpi>
                <Kpi>
                  <KpiLabel>Units sold</KpiLabel>
                  <KpiValue>{report.totalQuantity || 0}</KpiValue>
                </Kpi>
                <Kpi>
                  <KpiLabel>Revenue</KpiLabel>
                  <KpiValue>{money(report.totalRevenue || 0)}</KpiValue>
                </Kpi>
                <Kpi>
                  <KpiLabel>Top product</KpiLabel>
                  <KpiValue style={{ fontSize: '0.95rem' }}>
                    {report.products[0]?.productName || '—'}
                  </KpiValue>
                </Kpi>
              </KpiGrid>
              <Table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.map((p) => (
                    <tr key={p.productName}>
                      <td>{p.productName}</td>
                      <td>{p.quantity}</td>
                      <td>{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          ) : (
            <EmptyBox>
              <strong>No sales in this period</strong>
              <span>Best sellers will appear once sales are recorded.</span>
            </EmptyBox>
          )}
        </Card>
      ) : null}
    </Page>
  );
}
