import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Search } from 'lucide-react';
import {
  listProducts,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
} from '@/api/products';
import { getErrorMessage, money, type Product } from '@/api/types';
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
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ProductsSummarySkeleton } from '@/components/skeletons/PageSkeletons';

type FilterTab = 'all' | 'low' | 'out';

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;

  strong {
    color: ${({ theme }) => theme.colors.maroon};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};
  width: 100%;
  min-width: 0;

  > * {
    max-width: 100%;
  }
`;

const HeaderBlock = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.space[5]};
  min-width: 0;
`;
const SearchField = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 180px;
  min-width: 0;
  max-width: 100%;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.cream};

  svg {
    color: ${({ theme }) => theme.colors.textMuted};
    flex-shrink: 0;
  }

  input {
    border: none;
    outline: none;
    width: 100%;
    background: transparent;
    font: inherit;
  }
`;

const CompactInput = styled(Input)`
  width: 88px;
  padding: 8px 10px;
`;

const QtyInput = styled(Input)`
  width: 72px;
  padding: 8px 10px;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  max-width: 220px;

  @media (min-width: 720px) {
    max-width: none;
  }
`;

const NameCell = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

function stockStatus(p: Product): 'ok' | 'low' | 'out' | 'off' {
  if (!p.trackStock) return 'off';
  if (p.stock <= 0) return 'out';
  if (p.stock <= p.lowStockThreshold) return 'low';
  return 'ok';
}

export function ProductsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    costPrice: '',
    stock: '0',
    lowStockThreshold: '5',
  });
  const [stockEdit, setStockEdit] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const productsQ = useQuery({
    queryKey: ['products', 'all'],
    queryFn: listProducts,
  });

  const products = productsQ.data || [];

  useEffect(() => {
    if (!ok && !error) return;
    const t = window.setTimeout(() => {
      setOk(null);
      setError(null);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [ok, error]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const createM = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      setOk('Product added.');
      setError(null);
      setForm({
        name: '',
        price: '',
        costPrice: '',
        stock: '0',
        lowStockThreshold: '5',
      });
      invalidate();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const counts = useMemo(() => {
    const low = products.filter((p) => stockStatus(p) === 'low').length;
    const out = products.filter((p) => stockStatus(p) === 'out').length;
    const value = products
      .filter((p) => p.trackStock)
      .reduce((s, p) => s + p.stock * p.price, 0);
    return { total: products.length, low, out, value };
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      const status = stockStatus(p);
      if (tab === 'low') return status === 'low';
      if (tab === 'out') return status === 'out';
      return true;
    });
  }, [products, query, tab]);

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    createM.mutate({
      name: form.name.trim(),
      price: Number(form.price),
      costPrice: form.costPrice === '' ? null : Number(form.costPrice),
      stock: Number(form.stock) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 5,
    });
  }

  async function savePrice(p: Product, raw: string) {
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0 || price === p.price) return;
    try {
      await updateProduct(p.id, { price });
      setOk(`Updated price for ${p.name}`);
      invalidate();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function saveCost(p: Product, raw: string) {
    const costPrice = raw === '' ? null : Number(raw);
    if (costPrice != null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      return;
    }
    if (costPrice === p.costPrice) return;
    try {
      await updateProduct(p.id, { costPrice });
      setOk(`Updated cost for ${p.name}`);
      invalidate();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function adjustStock(p: Product, op: '+' | '-') {
    const quantity = Number(stockEdit[p.id]);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const key = `${p.id}:${op}`;
    try {
      setRowBusy(key);
      await updateStock(p.id, { op, quantity });
      setStockEdit((prev) => ({ ...prev, [p.id]: '' }));
      setOk(op === '+' ? `Added stock to ${p.name}` : `Reduced stock for ${p.name}`);
      invalidate();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  async function removeProduct(p: Product) {
    if (!confirm(`Delete ${p.name}?`)) return;
    try {
      setRowBusy(`del:${p.id}`);
      await deleteProduct(p.id, true);
      setOk(`Deleted ${p.name}`);
      invalidate();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <Page>
      <HeaderBlock>
        <PageTitle style={{ marginBottom: 8 }}>Products</PageTitle>
        <PageLead style={{ marginBottom: 0 }}>
          Catalogue, stock levels, pricing, and low-stock alerts.
        </PageLead>
      </HeaderBlock>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {ok ? <SuccessBanner>{ok}</SuccessBanner> : null}

      {productsQ.isLoading ? (
        <ProductsSummarySkeleton />
      ) : (
        <Summary>
          <span>
            Products <strong>{counts.total}</strong>
          </span>
          <span>
            Stock value <strong>{money(counts.value)}</strong>
          </span>
          <span>
            Low <strong>{counts.low}</strong>
          </span>
          <span>
            Out <strong>{counts.out}</strong>
          </span>
        </Summary>
      )}

      <Card>
        <h2 style={{ marginTop: 0 }}>Add product</h2>
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
              Price
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </Field>
            <Field>
              Cost
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </Field>
            <Field>
              Stock
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </Field>
            <Field>
              Low threshold
              <Input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm({ ...form, lowStockThreshold: e.target.value })
                }
              />
            </Field>
            <Button type="submit" loading={createM.isPending}>
              {createM.isPending ? 'Adding…' : 'Add'}
            </Button>
          </Row>
        </form>
      </Card>

      <Toolbar>
        <Tabs style={{ marginBottom: 0 }}>
          <Tab type="button" $active={tab === 'all'} onClick={() => setTab('all')}>
            All
          </Tab>
          <Tab type="button" $active={tab === 'low'} onClick={() => setTab('low')}>
            Low stock ({counts.low})
          </Tab>
          <Tab type="button" $active={tab === 'out'} onClick={() => setTab('out')}>
            Out ({counts.out})
          </Tab>
        </Tabs>
        <SearchField>
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search products"
          />
        </SearchField>
      </Toolbar>

      <Card>
        {productsQ.isLoading ? (
          <TableSkeleton
            columns={6}
            rows={8}
            widths={['9rem', '5rem', '5rem', '3.5rem', '7rem', '4rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Stock</th>
                <th>Adjust</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = stockStatus(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <NameCell>
                        {p.name}
                        {status === 'out' ? (
                          <Badge $tone="danger">Out</Badge>
                        ) : null}
                        {status === 'low' ? (
                          <Badge $tone="warning">Low</Badge>
                        ) : null}
                      </NameCell>
                    </td>
                    <td>
                      <CompactInput
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={p.price}
                        key={`price-${p.id}-${p.price}`}
                        onBlur={(e) => void savePrice(p, e.target.value)}
                      />
                    </td>
                    <td>
                      <CompactInput
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={p.costPrice ?? ''}
                        key={`cost-${p.id}-${p.costPrice ?? 'x'}`}
                        placeholder="—"
                        onBlur={(e) => void saveCost(p, e.target.value)}
                      />
                    </td>
                    <td>
                      {p.trackStock ? p.stock : '—'}
                    </td>
                    <td>
                      <Actions>
                        <QtyInput
                          type="number"
                          min="1"
                          placeholder="qty"
                          value={stockEdit[p.id] || ''}
                          disabled={!p.trackStock}
                          onChange={(e) =>
                            setStockEdit({ ...stockEdit, [p.id]: e.target.value })
                          }
                        />
                        <Button
                          type="button"
                          $variant="ghost"
                          $size="sm"
                          disabled={!p.trackStock}
                          loading={rowBusy === `${p.id}:+`}
                          onClick={() => void adjustStock(p, '+')}
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          $variant="ghost"
                          $size="sm"
                          disabled={!p.trackStock}
                          loading={rowBusy === `${p.id}:-`}
                          onClick={() => void adjustStock(p, '-')}
                        >
                          −
                        </Button>
                      </Actions>
                    </td>
                    <td>
                      <Button
                        type="button"
                        $variant="danger"
                        $size="sm"
                        loading={rowBusy === `del:${p.id}`}
                        onClick={() => void removeProduct(p)}
                      >
                        {rowBusy === `del:${p.id}` ? '…' : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {!productsQ.isLoading && filtered.length === 0 ? (
          <p style={{ marginBottom: 0 }}>
            {products.length === 0 ? 'No products yet.' : 'No matching products.'}
          </p>
        ) : null}
      </Card>
    </Page>
  );
}
