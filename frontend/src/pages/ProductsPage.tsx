import { useMemo, useState, Fragment } from 'react';
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
  addVariant,
  addPack,
  deleteVariant,
  deletePack,
} from '@/api/products';
import { getErrorMessage, money, type Product, type ProductVariant } from '@/api/types';
import { useAuth } from '@/auth';
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
  Tabs,
  Tab,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useGuardDemoWrite } from '@/components/demo/DemoUpgradeProvider';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ProductsSummarySkeleton } from '@/components/skeletons/PageSkeletons';
import { toastError, toastSuccess } from '@/lib/toast';
import { productHasOptions } from '@/utils/productCatalog';

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
  width: 4.5rem;
  min-height: 0;
  height: 32px;
  padding: 0 8px;
  font-size: 0.88rem;
`;

const AdjustGroup = styled.div`
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: stretch;
  height: 32px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.cream};
`;

const QtyInput = styled.input`
  width: 2.6rem;
  min-width: 0;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  padding: 0 6px;
  font: inherit;
  font-size: 0.88rem;
  text-align: center;
  color: inherit;

  &:focus {
    outline: none;
    background: ${({ theme }) => theme.colors.surface};
  }

  &:disabled {
    opacity: 0.5;
  }

  /* Hide number spinners — we have explicit +/- */
  appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    appearance: none;
    margin: 0;
  }
`;

const StepBtn = styled.button`
  flex: 0 0 30px;
  width: 30px;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.maroon};
  font: inherit;
  font-size: 1rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1;
  cursor: pointer;
  padding: 0;

  &:last-child {
    border-right: none;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.peachSoft};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Truncate = styled.span`
  display: block;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NameCell = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;

  > *:not(${Truncate}) {
    flex-shrink: 0;
  }
`;

function stockStatus(p: Product): 'ok' | 'low' | 'out' | 'off' {
  if (!p.trackStock) return 'off';
  if (p.stock <= 0) return 'out';
  if (p.stock <= p.lowStockThreshold) return 'low';
  return 'ok';
}

export function ProductsPage() {
  const qc = useQueryClient();
  const { shop } = useAuth();
  const guardDemoWrite = useGuardDemoWrite();
  const defaultThreshold = String(
    (shop?.settings as { lowStockAlert?: number } | undefined)?.lowStockAlert ?? 10,
  );
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    name: '',
    lowStockThreshold: defaultThreshold,
  });
  const [createOptions, setCreateOptions] = useState<
    Array<{ label: string; price: string; costPrice: string; stock: string }>
  >([{ label: '', price: '', costPrice: '', stock: '0' }]);
  const [stockEdit, setStockEdit] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({
    label: '',
    price: '',
    stock: '0',
  });
  const [packForm, setPackForm] = useState({
    variantId: '',
    label: '',
    unitsPerPack: '24',
    price: '',
  });

  const productsQ = useQuery({
    queryKey: ['products', 'all'],
    queryFn: listProducts,
  });

  const products = useMemo(() => productsQ.data || [], [productsQ.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const createM = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toastSuccess('Product added.');
      setForm({
        name: '',
        lowStockThreshold: defaultThreshold,
      });
      setCreateOptions([{ label: '', price: '', costPrice: '', stock: '0' }]);
      invalidate();
    },
    onError: (e) => toastError(getErrorMessage(e)),
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
    if (guardDemoWrite('change products')) return;

    const name = form.name.trim();
    if (!name) {
      toastError('Product name is required.');
      return;
    }

    const threshold = Number(form.lowStockThreshold) || Number(defaultThreshold) || 10;

    const variants = createOptions
      .map((row) => {
        const price = Number(row.price);
        const costRaw = row.costPrice.trim();
        const costPrice = costRaw === '' ? null : Number(costRaw);
        return {
          label: row.label.trim(),
          price,
          costPrice:
            costPrice != null && Number.isFinite(costPrice) && costPrice >= 0
              ? costPrice
              : null,
          stock: Number(row.stock) || 0,
          lowStockThreshold: threshold,
        };
      })
      .filter((row) => Number.isFinite(row.price) && row.price > 0);

    if (variants.length === 0) {
      toastError('Add a price on at least one row.');
      return;
    }

    if (variants.length > 1 && variants.some((v) => !v.label)) {
      toastError('Label each variant when adding more than one.');
      return;
    }

    createM.mutate({
      name,
      variants,
    });
  }

  async function savePrice(p: Product, raw: string) {
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0 || price === p.price) return;
    if (guardDemoWrite('change products')) return;
    try {
      await updateProduct(p.id, { price });
      toastSuccess(`Updated price for ${p.name}`);
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  }

  async function saveCost(p: Product, raw: string) {
    const costPrice = raw === '' ? null : Number(raw);
    if (costPrice != null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      return;
    }
    if (costPrice === p.costPrice) return;
    if (guardDemoWrite('change products')) return;
    try {
      await updateProduct(p.id, { costPrice });
      toastSuccess(`Updated cost for ${p.name}`);
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  }

  async function adjustStock(p: Product, op: '+' | '-') {
    const quantity = Number(stockEdit[p.id]);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    if (guardDemoWrite('change products')) return;
    const key = `${p.id}:${op}`;
    try {
      setRowBusy(key);
      await updateStock(p.id, { op, quantity });
      setStockEdit((prev) => ({ ...prev, [p.id]: '' }));
      toastSuccess(
        op === '+' ? `Added stock to ${p.name}` : `Reduced stock for ${p.name}`,
      );
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (guardDemoWrite('change products')) {
      setDeleteTarget(null);
      return;
    }
    try {
      setRowBusy(`del:${deleteTarget.id}`);
      await deleteProduct(deleteTarget.id, true);
      toastSuccess(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  async function onAddVariant(p: Product) {
    if (guardDemoWrite('change products')) return;
    const price = Number(variantForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      toastError('Variant price must be greater than 0.');
      return;
    }
    try {
      setRowBusy(`var:${p.id}`);
      await addVariant(p.id, {
        label: variantForm.label.trim(),
        price,
        stock: Number(variantForm.stock) || 0,
      });
      setVariantForm({ label: '', price: '', stock: '0' });
      toastSuccess(`Added variant to ${p.name}`);
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  async function onAddPack(p: Product) {
    if (guardDemoWrite('change products')) return;
    const units = Number(packForm.unitsPerPack);
    const price = Number(packForm.price);
    if (!packForm.variantId) {
      toastError('Choose which variant the pack belongs to.');
      return;
    }
    if (!packForm.label.trim()) {
      toastError('Pack label is required.');
      return;
    }
    if (!Number.isFinite(units) || units < 1) {
      toastError('Units per pack must be at least 1.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toastError('Pack price is required.');
      return;
    }
    try {
      setRowBusy(`pack:${p.id}`);
      await addPack(p.id, packForm.variantId, {
        label: packForm.label.trim(),
        unitsPerPack: units,
        price,
      });
      setPackForm({ variantId: '', label: '', unitsPerPack: '24', price: '' });
      toastSuccess(`Added pack to ${p.name}`);
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  function variantsOf(p: Product): ProductVariant[] {
    return (p.variants || []).filter((v) => v.isActive !== false);
  }

  async function adjustVariantStock(p: Product, variantId: string, op: '+' | '-') {
    const key = `${variantId}`;
    const quantity = Number(stockEdit[key]);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    if (guardDemoWrite('change products')) return;
    const busy = `${p.id}:${variantId}:${op}`;
    try {
      setRowBusy(busy);
      await updateStock(p.id, { op, quantity, variantId });
      setStockEdit((prev) => ({ ...prev, [key]: '' }));
      toastSuccess(op === '+' ? 'Stock added.' : 'Stock reduced.');
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <Page>
      <HeaderBlock>
        <PageTitle style={{ marginBottom: 8 }}>Products</PageTitle>
        <PageLead style={{ marginBottom: 0 }}>
          Catalogue with variants (sizes, packs) and optional pack pricing. Stock
          is tracked per variant; packs sell multiples of the same stock.
        </PageLead>
      </HeaderBlock>

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
                placeholder="e.g. Bread, Coca-Cola, Cavela shoes"
              />
            </Field>
            <Field>
              Low threshold
              <Input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
              />
            </Field>
          </Row>

          {createOptions.map((row, idx) => (
            <Row key={idx}>
              <Field>
                Variants (size, packs)
                <Input
                  placeholder="Optional — Size 2, 500ml, 1kg…"
                  value={row.label}
                  onChange={(e) => {
                    const next = [...createOptions];
                    next[idx] = { ...row, label: e.target.value };
                    setCreateOptions(next);
                  }}
                />
              </Field>
              <Field>
                Price
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(e) => {
                    const next = [...createOptions];
                    next[idx] = { ...row, price: e.target.value };
                    setCreateOptions(next);
                  }}
                  required={idx === 0}
                />
              </Field>
              <Field>
                Cost
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.costPrice}
                  onChange={(e) => {
                    const next = [...createOptions];
                    next[idx] = { ...row, costPrice: e.target.value };
                    setCreateOptions(next);
                  }}
                />
              </Field>
              <Field>
                Stock
                <Input
                  type="number"
                  min="0"
                  value={row.stock}
                  onChange={(e) => {
                    const next = [...createOptions];
                    next[idx] = { ...row, stock: e.target.value };
                    setCreateOptions(next);
                  }}
                />
              </Field>
              {createOptions.length > 1 ? (
                <Button
                  type="button"
                  $variant="ghost"
                  onClick={() =>
                    setCreateOptions(createOptions.filter((_, i) => i !== idx))
                  }
                >
                  Remove
                </Button>
              ) : null}
            </Row>
          ))}

          <Row style={{ marginTop: 4 }}>
            <Button
              type="button"
              $variant="ghost"
              onClick={() =>
                setCreateOptions([
                  ...createOptions,
                  { label: '', price: '', costPrice: '', stock: '0' },
                ])
              }
            >
              + Variant
            </Button>
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
            widths={['9rem', '3.5rem', '4.5rem', '4.5rem', '6.5rem', '3.5rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Adjust</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = stockStatus(p);
                const variants = variantsOf(p);
                const multi = productHasOptions(p);
                const expanded = expandedId === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <NameCell>
                          <Truncate title={p.name}>{p.name}</Truncate>
                          {multi ? (
                            <Badge $tone="info">{variants.length} opt</Badge>
                          ) : null}
                          {status === 'out' ? <Badge $tone="danger">Out</Badge> : null}
                          {status === 'low' ? <Badge $tone="warning">Low</Badge> : null}
                        </NameCell>
                      </td>
                      <td>{p.trackStock ? p.stock : '—'}</td>
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
                        <AdjustGroup>
                          <QtyInput
                            type="number"
                            min="1"
                            placeholder="1"
                            aria-label={`Adjust quantity for ${p.name}`}
                            value={stockEdit[p.id] || ''}
                            disabled={!p.trackStock || multi}
                            onChange={(e) =>
                              setStockEdit({
                                ...stockEdit,
                                [p.id]: e.target.value,
                              })
                            }
                          />
                          <StepBtn
                            type="button"
                            aria-label={`Add stock for ${p.name}`}
                            disabled={!p.trackStock || multi || rowBusy === `${p.id}:+`}
                            onClick={() => void adjustStock(p, '+')}
                          >
                            {rowBusy === `${p.id}:+` ? '…' : '+'}
                          </StepBtn>
                          <StepBtn
                            type="button"
                            aria-label={`Remove stock for ${p.name}`}
                            disabled={!p.trackStock || multi || rowBusy === `${p.id}:-`}
                            onClick={() => void adjustStock(p, '-')}
                          >
                            {rowBusy === `${p.id}:-` ? '…' : '−'}
                          </StepBtn>
                        </AdjustGroup>
                      </td>
                      <td>
                        <Row style={{ gap: 6, margin: 0, flexWrap: 'nowrap' }}>
                          <Button
                            type="button"
                            $variant="ghost"
                            $size="sm"
                            onClick={() => {
                              setExpandedId(expanded ? null : p.id);
                              const first = variants[0];
                              if (first) {
                                setPackForm((prev) => ({
                                  ...prev,
                                  variantId: first.id,
                                }));
                              }
                            }}
                          >
                            {expanded ? 'Hide' : 'Variants'}
                          </Button>
                          <Button
                            type="button"
                            $variant="danger"
                            $size="sm"
                            loading={rowBusy === `del:${p.id}`}
                            onClick={() => setDeleteTarget(p)}
                          >
                            {rowBusy === `del:${p.id}` ? '…' : 'Delete'}
                          </Button>
                        </Row>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={6}>
                          <div style={{ padding: '8px 0 12px' }}>
                            {variants.map((v) => {
                              const packs = (v.packs || []).filter(
                                (pk) => pk.isActive !== false,
                              );
                              return (
                                <div
                                  key={v.id}
                                  style={{
                                    marginBottom: 12,
                                    paddingBottom: 8,
                                    borderBottom: '1px solid var(--border, #ddd)',
                                  }}
                                >
                                  <Row
                                    style={{
                                      alignItems: 'center',
                                      marginBottom: 6,
                                    }}
                                  >
                                    <strong>{v.label?.trim() || 'Default'}</strong>
                                    <span>
                                      {v.trackStock ? `Stock ${v.stock}` : 'Stock off'} ·{' '}
                                      {money(v.price)}
                                    </span>
                                    <AdjustGroup>
                                      <QtyInput
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={stockEdit[v.id] || ''}
                                        disabled={!v.trackStock}
                                        onChange={(e) =>
                                          setStockEdit({
                                            ...stockEdit,
                                            [v.id]: e.target.value,
                                          })
                                        }
                                      />
                                      <StepBtn
                                        type="button"
                                        disabled={
                                          !v.trackStock || rowBusy === `${p.id}:${v.id}:+`
                                        }
                                        onClick={() =>
                                          void adjustVariantStock(p, v.id, '+')
                                        }
                                      >
                                        +
                                      </StepBtn>
                                      <StepBtn
                                        type="button"
                                        disabled={
                                          !v.trackStock || rowBusy === `${p.id}:${v.id}:-`
                                        }
                                        onClick={() =>
                                          void adjustVariantStock(p, v.id, '-')
                                        }
                                      >
                                        −
                                      </StepBtn>
                                    </AdjustGroup>
                                    {variants.length > 1 ? (
                                      <Button
                                        type="button"
                                        $variant="ghost"
                                        $size="sm"
                                        onClick={() => {
                                          if (guardDemoWrite('change products')) return;
                                          void deleteVariant(p.id, v.id)
                                            .then(() => {
                                              toastSuccess('Variant removed.');
                                              invalidate();
                                            })
                                            .catch((err) =>
                                              toastError(getErrorMessage(err)),
                                            );
                                        }}
                                      >
                                        Remove variant
                                      </Button>
                                    ) : null}
                                  </Row>
                                  <div
                                    style={{
                                      fontSize: '0.88rem',
                                      color: 'inherit',
                                      opacity: 0.85,
                                    }}
                                  >
                                    Packs:{' '}
                                    {packs
                                      .map(
                                        (pk) =>
                                          `${pk.label} (${pk.unitsPerPack}) ${money(pk.price)}`,
                                      )
                                      .join(' · ')}
                                  </div>
                                  {packs.length > 1
                                    ? packs
                                        .filter((pk) => pk.unitsPerPack !== 1)
                                        .map((pk) => (
                                          <Button
                                            key={pk.id}
                                            type="button"
                                            $variant="ghost"
                                            $size="sm"
                                            style={{ marginTop: 4 }}
                                            onClick={() => {
                                              if (guardDemoWrite('change products'))
                                                return;
                                              void deletePack(p.id, v.id, pk.id)
                                                .then(() => {
                                                  toastSuccess('Pack removed.');
                                                  invalidate();
                                                })
                                                .catch((err) =>
                                                  toastError(getErrorMessage(err)),
                                                );
                                            }}
                                          >
                                            Remove {pk.label}
                                          </Button>
                                        ))
                                    : null}
                                </div>
                              );
                            })}

                            <Row style={{ alignItems: 'flex-end' }}>
                              <Field>
                                Variant label
                                <Input
                                  placeholder="e.g. Size 2 / 1kg"
                                  value={variantForm.label}
                                  onChange={(e) =>
                                    setVariantForm({
                                      ...variantForm,
                                      label: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field>
                                Price
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variantForm.price}
                                  onChange={(e) =>
                                    setVariantForm({
                                      ...variantForm,
                                      price: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field>
                                Stock
                                <Input
                                  type="number"
                                  min="0"
                                  value={variantForm.stock}
                                  onChange={(e) =>
                                    setVariantForm({
                                      ...variantForm,
                                      stock: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Button
                                type="button"
                                loading={rowBusy === `var:${p.id}`}
                                onClick={() => void onAddVariant(p)}
                              >
                                Add variant
                              </Button>
                            </Row>

                            <Row style={{ alignItems: 'flex-end' }}>
                              <Field>
                                Pack for variant
                                <select
                                  value={packForm.variantId}
                                  onChange={(e) =>
                                    setPackForm({
                                      ...packForm,
                                      variantId: e.target.value,
                                    })
                                  }
                                  style={{
                                    width: '100%',
                                    minHeight: 40,
                                    padding: '0 8px',
                                  }}
                                >
                                  <option value="">Select…</option>
                                  {variants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.label?.trim() || 'Default'}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field>
                                Pack label
                                <Input
                                  placeholder="e.g. Crate"
                                  value={packForm.label}
                                  onChange={(e) =>
                                    setPackForm({
                                      ...packForm,
                                      label: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field>
                                Units / pack
                                <Input
                                  type="number"
                                  min="1"
                                  value={packForm.unitsPerPack}
                                  onChange={(e) =>
                                    setPackForm({
                                      ...packForm,
                                      unitsPerPack: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field>
                                Pack price
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={packForm.price}
                                  onChange={(e) =>
                                    setPackForm({
                                      ...packForm,
                                      price: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Button
                                type="button"
                                loading={rowBusy === `pack:${p.id}`}
                                onClick={() => void onAddPack(p)}
                              >
                                Add pack
                              </Button>
                            </Row>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete product?"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.name} from the catalogue. This cannot be undone.`
            : 'Remove this product from the catalogue.'
        }
        confirmLabel="Delete"
        cancelLabel="Keep"
        tone="danger"
        loading={Boolean(deleteTarget && rowBusy === `del:${deleteTarget.id}`)}
        onConfirm={confirmDelete}
      />
    </Page>
  );
}
