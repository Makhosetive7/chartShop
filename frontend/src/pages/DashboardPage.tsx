import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  fetchInventoryStats,
  fetchSalesStats,
  fetchStatsOverview,
} from '@/api/stats';
import { money } from '@/api/types';
import { useAuth } from '@/auth';
import {
  DonutChart,
  HorizontalBars,
  SimpleBarChart,
} from '@/components/charts/SimpleCharts';
import { ErrorBanner, Table } from '@/components/ui/primitives';
import { DashboardSkeleton } from '@/components/skeletons/PageSkeletons';

const DAYS_OPTIONS = [7, 30, 90] as const;

const TYPE_COLORS = ['#8B1E3A', '#C43B5A', '#E85A4F', '#F5A07A', '#F59E0B'];

const Shell = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
`;

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space[5]};
  min-width: 0;
`;

const Title = styled.h1`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-size: clamp(1.45rem, 6vw, 2.3rem);
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: -0.035em;
  color: ${({ theme }) => theme.colors.maroon};
  overflow-wrap: anywhere;
`;

const Lead = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 40rem;
  font-size: 0.92rem;
  line-height: 1.5;
`;

const PeriodTabs = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  gap: 4px;
  padding: 5px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.peachSoft};
`;

const PeriodBtn = styled.button<{ $active?: boolean }>`
  border: none;
  border-radius: 0;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.85rem;
  font-family: inherit;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surface : 'transparent'};
  color: ${({ theme }) => theme.colors.maroon};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.card : 'none')};

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.surface : 'rgba(255, 255, 255, 0.45)'};
  }
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[5]};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 960px) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
`;

const Kpi = styled(motion.div)`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 14px;
  min-width: 0;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[4]};
  }
`;

const KpiLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.82rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 8px;

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const KpiValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(1.05rem, 4.2vw, 1.45rem);
  color: ${({ theme }) => theme.colors.maroon};
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
  line-height: 1.15;
`;

const KpiHint = styled.div`
  margin-top: 4px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  }
`;

const PanelsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Panel = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[5]};
  }

  h2 {
    margin: 0 0 4px;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    font-size: 1.05rem;
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

const PanelLead = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.85rem;
`;

const HighlightStrip = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Highlight = styled.div`
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.peachSoft},
    ${({ theme }) => theme.colors.primaryTint}
  );
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: ${({ theme }) => theme.space[4]};
  min-width: 0;

  span {
    display: block;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.maroon};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    margin-bottom: 6px;
  }

  strong {
    display: block;
    font-size: 1rem;
    color: ${({ theme }) => theme.colors.maroon};
    font-family: ${({ theme }) => theme.fonts.heading};
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }

  em {
    display: block;
    margin-top: 4px;
    font-style: normal;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    overflow-wrap: anywhere;
  }
`;

const EmptyNote = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;

function hourLabel(hour: number) {
  const h = hour % 24;
  const suffix = h < 12 ? 'a' : 'p';
  const base = h % 12 || 12;
  return `${base}${suffix}`;
}

export function DashboardPage() {
  const { shop } = useAuth();
  const [days, setDays] = useState<(typeof DAYS_OPTIONS)[number]>(30);

  const overviewQ = useQuery({
    queryKey: ['stats', 'overview', days],
    queryFn: () => fetchStatsOverview(days, 8),
  });
  const salesQ = useQuery({
    queryKey: ['stats', 'sales', days],
    queryFn: () => fetchSalesStats(days),
  });
  const inventoryQ = useQuery({
    queryKey: ['stats', 'inventory'],
    queryFn: fetchInventoryStats,
  });

  const overview = overviewQ.data;
  const sales = salesQ.data;
  const inventory = inventoryQ.data;

  const weekdayChart = useMemo(
    () =>
      (sales?.byWeekday || []).map((d) => ({
        label: d.label || String(d.day),
        value: Math.round((d.revenue || 0) * 100) / 100,
      })),
    [sales],
  );

  const hourChart = useMemo(() => {
    const hours = sales?.byHour || [];
    if (!hours.length) return [];
    return hours.slice(7, 22).map((h) => ({
      label: hourLabel(h.hour ?? 0),
      value: Math.round((h.revenue || 0) * 100) / 100,
    }));
  }, [sales]);

  const typeChart = useMemo(
    () =>
      (sales?.byType || []).map((t, i) => ({
        label: (t.type || 'other').replace(/^./, (c) => c.toUpperCase()),
        value: t.revenue || 0,
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      })),
    [sales],
  );

  const topProducts = overview?.products.topByRevenue || [];
  const bestClients = overview?.customers.bestClients || [];
  const loading = overviewQ.isLoading || salesQ.isLoading;
  const error = overviewQ.error || salesQ.error || inventoryQ.error;

  return (
    <Shell>
      <Header>
        <div>
          <Title>{shop?.businessName || 'Dashboard'}</Title>
          <Lead>
            Sales pulse, product performance, and your best clients — live from
            the same numbers as chat.
          </Lead>
        </div>
        <PeriodTabs>
          {DAYS_OPTIONS.map((option) => (
            <PeriodBtn
              key={option}
              type="button"
              $active={days === option}
              onClick={() => setDays(option)}
            >
              {option}d
            </PeriodBtn>
          ))}
        </PeriodTabs>
      </Header>

      {error ? (
        <ErrorBanner>
          Could not load dashboard stats. Is the API running?
        </ErrorBanner>
      ) : null}

      {loading && !overview ? <DashboardSkeleton /> : null}

      {overview ? (
        <>
          <KpiGrid>
            {[
              {
                label: 'Today',
                value: money(overview.snapshots.today.revenue),
                hint: `${overview.snapshots.today.count} sales`,
                icon: TrendingUp,
              },
              {
                label: 'This week',
                value: money(overview.snapshots.week.revenue),
                hint: `${overview.snapshots.week.count} sales`,
                icon: ShoppingCart,
              },
              {
                label: `${days}-day revenue`,
                value: money(overview.sales.revenue),
                hint: `${overview.sales.salesCount} sales`,
                icon: Wallet,
              },
              {
                label: 'Avg ticket',
                value: money(overview.highlights.averageTicket || 0),
                hint: overview.highlights.peakDay
                  ? `Peak day ${overview.highlights.peakDay.label}`
                  : 'Across period',
                icon: TrendingUp,
              },
              {
                label: 'Customers',
                value: String(overview.customers.totals.customers),
                hint: `${overview.customers.totals.activeInPeriod} active in period`,
                icon: Users,
              },
              {
                label: 'Inventory value',
                value: money(overview.inventory.inventoryRetailValue),
                hint: `${overview.inventory.lowStock} low · ${overview.inventory.outOfStock} out`,
                icon: Package,
              },
            ].map((item, index) => (
              <Kpi
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <KpiLabel>
                  <item.icon size={15} />
                  {item.label}
                </KpiLabel>
                <KpiValue>{item.value}</KpiValue>
                <KpiHint>{item.hint}</KpiHint>
              </Kpi>
            ))}
          </KpiGrid>

          <HighlightStrip>
            <Highlight>
              <span>Top product</span>
              <strong>
                {overview.highlights.mostPurchased?.productName || '—'}
              </strong>
              <em>
                {overview.highlights.mostPurchased
                  ? `${overview.highlights.mostPurchased.quantity} units · ${money(overview.highlights.mostPurchased.revenue)}`
                  : 'No sales yet'}
              </em>
            </Highlight>
            <Highlight>
              <span>Best client</span>
              <strong>{overview.highlights.bestClient?.name || '—'}</strong>
              <em>
                {overview.highlights.bestClient
                  ? money(overview.highlights.bestClient.totalSpent || 0)
                  : 'No customer sales yet'}
              </em>
            </Highlight>
            <Highlight>
              <span>Watch list</span>
              <strong>
                {overview.highlights.topDebtor?.name ||
                  overview.highlights.slowest?.productName ||
                  'All clear'}
              </strong>
              <em>
                {overview.highlights.topDebtor
                  ? `Owes ${money(overview.highlights.topDebtor.currentBalance || 0)}`
                  : overview.highlights.slowest
                    ? `Slow mover · ${overview.highlights.slowest.quantity} sold`
                    : `${overview.snapshots.openOrders} open orders`}
              </em>
            </Highlight>
          </HighlightStrip>

          <ChartsGrid>
            <Panel>
              <h2>Revenue by weekday</h2>
              <PanelLead>Last {days} days · shop timezone</PanelLead>
              <SimpleBarChart data={weekdayChart} formatValue={money} />
            </Panel>
            <Panel>
              <h2>Sales mix</h2>
              <PanelLead>Cash, credit, laybye and more</PanelLead>
              <DonutChart
                data={typeChart}
                centerLabel="revenue"
                centerValue={money(overview.sales.revenue)}
              />
            </Panel>
          </ChartsGrid>

          <Panel style={{ marginBottom: 16 }}>
            <h2>Busy hours</h2>
            <PanelLead>
              {overview.highlights.peakHour
                ? `Peak around ${hourLabel(overview.highlights.peakHour.hour || 0)} (${overview.highlights.peakHour.count} sales)`
                : `Hourly revenue · last ${days} days`}
            </PanelLead>
            <SimpleBarChart data={hourChart} formatValue={money} height={200} />
          </Panel>

          <PanelsGrid>
            <Panel>
              <h2>Product performance</h2>
              <PanelLead>Top sellers by revenue</PanelLead>
              {topProducts.length ? (
                <>
                  <HorizontalBars
                    data={topProducts.slice(0, 6).map((p) => ({
                      label: p.productName,
                      value: p.revenue,
                    }))}
                    formatValue={money}
                  />
                  <Table style={{ marginTop: 18 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p) => (
                        <tr key={`${p.productId || p.productName}`}>
                          <td>{p.productName}</td>
                          <td>{p.quantity}</td>
                          <td>{money(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              ) : (
                <EmptyNote>No product sales in this period.</EmptyNote>
              )}
            </Panel>

            <Panel>
              <h2>Best clients</h2>
              <PanelLead>Highest lifetime spend</PanelLead>
              {bestClients.length ? (
                <>
                  <HorizontalBars
                    data={bestClients.slice(0, 6).map((c) => ({
                      label: c.name,
                      value: c.totalSpent || 0,
                    }))}
                    color="#8B1E3A"
                    formatValue={money}
                  />
                  <Table style={{ marginTop: 18 }}>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Visits</th>
                        <th>Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bestClients.map((c) => (
                        <tr key={c.customerId || c.name}>
                          <td>{c.name}</td>
                          <td>{c.totalVisits ?? '—'}</td>
                          <td>{money(c.totalSpent || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              ) : (
                <EmptyNote>No customer history yet.</EmptyNote>
              )}
            </Panel>
          </PanelsGrid>

          <PanelsGrid>
            <Panel>
              <h2>Most frequent shoppers</h2>
              <PanelLead>By visit count</PanelLead>
              {(overview.customers.mostFrequent || []).length ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Visits</th>
                      <th>Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.customers.mostFrequent.map((c) => (
                      <tr key={`freq-${c.customerId || c.name}`}>
                        <td>{c.name}</td>
                        <td>{c.totalVisits ?? 0}</td>
                        <td>{money(c.totalSpent || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyNote>No frequent shoppers yet.</EmptyNote>
              )}
            </Panel>

            <Panel>
              <h2>Balances & stock alerts</h2>
              <PanelLead>
                <AlertTriangle
                  size={14}
                  style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }}
                />
                Debtors and inventory warnings
              </PanelLead>
              {(overview.customers.debtors || []).length ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Debtor</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.customers.debtors.map((c) => (
                      <tr key={`debt-${c.customerId || c.name}`}>
                        <td>{c.name}</td>
                        <td>{money(c.currentBalance || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyNote>No outstanding balances.</EmptyNote>
              )}
              {(inventory?.lowStock?.length || inventory?.outOfStock?.length) ? (
                <Table style={{ marginTop: 16 }}>
                  <thead>
                    <tr>
                      <th>Stock alert</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...(inventory?.outOfStock || []).map((p) => ({
                        ...p,
                        stock: 0,
                      })),
                      ...(inventory?.lowStock || []),
                    ]
                      .slice(0, 8)
                      .map((p) => (
                        <tr key={`stock-${p.productId || p.productName}`}>
                          <td>{p.productName}</td>
                          <td>{p.stock ?? 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyNote>Stock levels look healthy.</EmptyNote>
              )}
            </Panel>
          </PanelsGrid>

          {(overview.products.slowest || []).length ? (
            <Panel>
              <h2>Slow movers</h2>
              <PanelLead>Lowest units sold in the last {days} days</PanelLead>
              <Table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.products.slowest.map((p) => (
                    <tr key={`slow-${p.productId || p.productName}`}>
                      <td>{p.productName}</td>
                      <td>{p.quantity}</td>
                      <td>{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}
