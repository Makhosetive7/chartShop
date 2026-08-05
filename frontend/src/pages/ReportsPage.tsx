import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Download, FileText } from 'lucide-react';
import {
  downloadReportPdf,
  fetchBestSellers,
  fetchDailyReport,
  fetchMonthlyReport,
  fetchProfit,
  fetchWeeklyReport,
  type CashFlowData,
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
  SuccessBanner,
  Select,
  Field,
  Button,
} from '@/components/ui/primitives';
import { ReportsBodySkeleton } from '@/components/skeletons/PageSkeletons';

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
  justify-content: center;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  width: 100%;
  min-width: 0;
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Kpi = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 14px;
  text-align: center;
  min-width: 0;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[4]};
  }
`;

const KpiLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.8rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 6px;
`;

const KpiValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(1rem, 4vw, 1.25rem);
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.maroon};
  overflow-wrap: anywhere;
  line-height: 1.2;
`;

const ReportBody = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-family: ${({ theme }) => theme.fonts.body};
  line-height: 1.55;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: ${({ theme }) => theme.space[3]};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.cream};
  max-width: 100%;
  overflow-x: auto;

  @media (min-width: 720px) {
    font-size: 0.95rem;
    padding: ${({ theme }) => theme.space[4]};
  }
`;

const Hint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
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

function cashKpis(data?: CashFlowData) {
  if (!data) return [];
  return [
    { label: 'Revenue', value: money(data.revenue?.total || 0) },
    { label: 'Cash in', value: money(data.cashFlow?.inflows?.total || 0) },
    { label: 'Cash out', value: money(data.cashFlow?.outflows?.total || 0) },
    { label: 'Net cash', value: money(data.cashFlow?.net || 0) },
    {
      label: 'Operating result',
      value: money(
        data.profitability?.operatingResult ??
          data.profitability?.netProfit ??
          0,
      ),
    },
    {
      label: 'Sales',
      value: String(data.transactions?.totalSales || 0),
    },
  ];
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('daily');
  const [bestDays, setBestDays] = useState(7);
  const [profitPeriod, setProfitPeriod] = useState('daily');
  const [month, setMonth] = useState('');
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const reportText =
    tab === 'profit' ? report?.message : report?.report;

  const kpis = useMemo(() => {
    if (tab === 'best' && report) {
      return [
        { label: 'Products', value: String(report.products?.length || 0) },
        { label: 'Units sold', value: String(report.totalQuantity || 0) },
        { label: 'Revenue', value: money(report.totalRevenue || 0) },
      ];
    }
    if (tab === 'daily' || tab === 'weekly' || tab === 'monthly') {
      return cashKpis(report?.data);
    }
    return [];
  }, [tab, report]);

  const canExportPdf =
    tab === 'daily' || tab === 'weekly' || tab === 'monthly';

  const pdfM = useMutation({
    mutationFn: async () => {
      if (!canExportPdf) throw new Error('PDF export is for daily, weekly, or monthly.');
      return downloadReportPdf(tab, month || undefined);
    },
    onSuccess: (fileName) => {
      setError(null);
      setOk(`Downloaded ${fileName}`);
      window.setTimeout(() => setOk(null), 3500);
    },
    onError: (err) => {
      setOk(null);
      setError(getErrorMessage(err, 'PDF download failed.'));
    },
  });

  return (
    <Page data-tour="page-reports">
      <Header>
        <PageTitle style={{ marginBottom: 8 }}>Reports</PageTitle>
        <PageLead style={{ marginBottom: 0 }}>
          Cash-flow, bestsellers, and profit — same figures as chat. Download
          PDF like Telegram/WhatsApp export.
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
                setError(null);
              }}
            >
              {label}
            </Tab>
          ))}
        </Tabs>
      </TabsRow>

      {canExportPdf ? (
        <Hint>
          Same PDF engine as chat commands: <code>export daily</code>,{' '}
          <code>export weekly</code>, <code>export monthly</code>
        </Hint>
      ) : null}

      <Toolbar>
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
              <option value="daily">daily</option>
              <option value="yesterday">yesterday</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </Select>
          </Field>
        ) : null}

        {tab === 'monthly' ? (
          <Field style={{ minWidth: 160 }}>
            Month (optional)
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

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {ok ? <SuccessBanner>{ok}</SuccessBanner> : null}
      {active.isError ? <ErrorBanner>Failed to load report.</ErrorBanner> : null}
      {active.isLoading ? (
        <ReportsBodySkeleton
          variant={
            tab === 'best' ? 'best' : tab === 'profit' ? 'profit' : 'kpis'
          }
        />
      ) : null}

      {!active.isLoading && kpis.length ? (
        <KpiGrid>
          {kpis.map((item) => (
            <Kpi key={item.label}>
              <KpiLabel>{item.label}</KpiLabel>
              <KpiValue>{item.value}</KpiValue>
            </Kpi>
          ))}
        </KpiGrid>
      ) : null}

      {tab === 'best' && report?.products ? (
        <Card>
          <CardHead>
            <h2>Best sellers · last {bestDays} days</h2>
          </CardHead>
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
          {!report.products.length ? <p>No sales in this period.</p> : null}
        </Card>
      ) : null}

      {reportText ? (
        <Card>
          <CardHead>
            <h2>
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <FileText size={18} />
                {tab === 'profit'
                  ? 'Profit summary'
                  : tab === 'monthly' && report?.monthInfo?.label
                    ? `${report.monthInfo.label} ${report.monthInfo.year || ''}`.trim()
                    : `${tab[0].toUpperCase()}${tab.slice(1)} summary`}
              </span>
            </h2>
            {canExportPdf ? (
              <Button
                type="button"
                $variant="ghost"
                onClick={() => pdfM.mutate()}
                loading={pdfM.isPending}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Download size={15} />
                  {pdfM.isPending ? 'PDF…' : 'PDF'}
                </span>
              </Button>
            ) : null}
          </CardHead>
          <ReportBody>{reportText}</ReportBody>
        </Card>
      ) : null}
    </Page>
  );
}
