import { useMemo, useState } from 'react';
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
  Select,
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
import { activeVariants, productHasOptions } from '@/utils/productCatalog';

const VariantsPanel = styled.div`
  margin-top: ${({ theme }) => theme.space[4]};
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const PanelHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.1rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.maroon};
`;

const PanelLead = styled.p`
  margin: 4px 0 0;
  max-width: 36rem;
  font-size: 0.9rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const SizeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const SizeRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]};
  background: ${({ theme }) => theme.colors.cream};
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 720px) {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
`;

const SizeMeta = styled.div`
  min-width: 0;
`;

const SizeName = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 1rem;
`;

const SizeDetails = styled.div`
  margin-top: 4px;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
`;

const SizeStock = styled.span`
  display: inline-block;
  margin-top: 6px;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.maroon};
`;

const SizeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
`;

const StockLabel = styled.span`
  font-size: 0.78rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  width: 100%;

  @media (min-width: 720px) {
    width: auto;
    margin-right: 4px;
  }
`;

const SecondaryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const AddSection = styled.div`
  margin-top: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]};
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
`;

const AddSectionTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.maroon};
`;

const AddSectionLead = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
`;

const FieldHint = styled.span<{ $error?: boolean }>`
  font-size: 0.75rem;
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  color: ${({ theme, $error }) =>
    $error ? theme.colors.danger : theme.colors.textMuted};
`;

type CreateRowErrors = {
  label?: string;
  price?: string;
  stock?: string;
};

type PanelMode = 'list' | 'add-option' | 'add-pack';

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
  >([{ label: '', price: '', costPrice: '', stock: '' }]);
  const [createErrors, setCreateErrors] = useState<CreateRowErrors[]>([]);
  const [stockEdit, setStockEdit] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('list');
  const [editName, setEditName] = useState('');
  const [variantForm, setVariantForm] = useState({
    label: '',
    price: '',
    stock: '',
  });
  const [packForm, setPackForm] = useState({
    variantId: '',
    label: '',
    unitsPerPack: '24',
    price: '',
  });

  function openEditPanel(p: Product) {
    const variants = activeVariants(p);
    setExpandedId(p.id);
    setPanelMode('list');
    setEditName(p.name);
    setVariantForm({ label: '', price: '', stock: '' });
    setPackForm({
      variantId: variants[0]?.id || '',
      label: '',
      unitsPerPack: '24',
      price: '',
    });
  }

  function closeEditPanel() {
    setExpandedId(null);
    setPanelMode('list');
    setEditName('');
  }

  async function saveProductName(p: Product) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === p.name) return;
    if (guardDemoWrite('change products')) {
      setEditName(p.name);
      return;
    }
    try {
      await updateProduct(p.id, { name: trimmed });
      toastSuccess('Product name updated.');
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
      setEditName(p.name);
    }
  }

  const productsQ = useQuery({
    queryKey: ['products', 'all'],
    queryFn: listProducts,
  });

  const products = useMemo(() => productsQ.data || [], [productsQ.data]);

  const expandedProduct = useMemo(
    () => (expandedId ? products.find((p) => p.id === expandedId) || null : null),
    [expandedId, products],
  );

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
      setCreateOptions([{ label: '', price: '', costPrice: '', stock: '' }]);
      setCreateErrors([]);
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
    const multi = createOptions.length > 1;

    const rowErrors: CreateRowErrors[] = createOptions.map((row) => {
      const errs: CreateRowErrors = {};
      const price = Number(row.price);
      const stock = Number(row.stock);
      if (multi && !row.label.trim()) {
        errs.label = 'Label required';
      }
      if (!Number.isFinite(price) || price <= 0) {
        errs.price = 'Price required';
      }
      if (!Number.isFinite(stock) || stock <= 0) {
        errs.stock = 'Stock must be > 0';
      }
      return errs;
    });

    const hasErrors = rowErrors.some((e) => e.label || e.price || e.stock);
    setCreateErrors(rowErrors);
    if (hasErrors) {
      const missingPrice = rowErrors.some((e) => e.price);
      const missingStock = rowErrors.some((e) => e.stock);
      if (missingPrice && missingStock) {
        toastError('Each option needs a price and stock greater than 0.');
      } else if (missingPrice) {
        toastError('Each option needs a price.');
      } else if (missingStock) {
        toastError('Each option needs stock greater than 0.');
      } else {
        toastError('Name each option when adding more than one.');
      }
      return;
    }

    const variants = createOptions.map((row) => {
      const costRaw = row.costPrice.trim();
      const costPrice = costRaw === '' ? null : Number(costRaw);
      return {
        label: row.label.trim(),
        price: Number(row.price),
        costPrice:
          costPrice != null && Number.isFinite(costPrice) && costPrice >= 0
            ? costPrice
            : null,
        stock: Number(row.stock),
        lowStockThreshold: threshold,
      };
    });

    createM.mutate({
      name,
      variants,
    });
  }

  function patchCreateRow(
    idx: number,
    patch: Partial<{ label: string; price: string; costPrice: string; stock: string }>,
  ) {
    setCreateOptions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
    setCreateErrors((prev) => {
      if (!prev[idx]) return prev;
      const next = [...prev];
      const cleared = { ...next[idx] };
      if (patch.label !== undefined) delete cleared.label;
      if (patch.price !== undefined) delete cleared.price;
      if (patch.stock !== undefined) delete cleared.stock;
      next[idx] = cleared;
      return next;
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
    const stock = Number(variantForm.stock);
    if (!Number.isFinite(price) || price <= 0) {
      toastError('Option price must be greater than 0.');
      return;
    }
    if (!Number.isFinite(stock) || stock <= 0) {
      toastError('Option stock must be greater than 0.');
      return;
    }
    try {
      setRowBusy(`var:${p.id}`);
      await addVariant(p.id, {
        label: variantForm.label.trim(),
        price,
        stock,
      });
      setVariantForm({ label: '', price: '', stock: '' });
      setPanelMode('list');
      toastSuccess(`Added option to ${p.name}`);
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
      toastError('Choose which option the pack belongs to.');
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
      setPanelMode('list');
      toastSuccess(`Added pack to ${p.name}`);
      invalidate();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  function variantsOf(p: Product): ProductVariant[] {
    return activeVariants(p);
  }

  async function adjustVariantStock(p: Product, variantId: string, op: '+' | '-') {
    const key = `${variantId}`;
    const raw = String(stockEdit[key] ?? '').trim();
    const quantity = raw === '' ? 1 : Number(raw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toastError('Enter how many to add or take out.');
      return;
    }
    if (guardDemoWrite('change products')) return;
    const busy = `${p.id}:${variantId}:${op}`;
    try {
      setRowBusy(busy);
      await updateStock(p.id, { op, quantity, variantId });
      setStockEdit((prev) => ({ ...prev, [key]: '' }));
      toastSuccess(
        op === '+' ? `Added ${quantity} to stock.` : `Took out ${quantity} from stock.`,
      );
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
          Add simple products, or products with options (500ml / 2L, Size 2, Red…) and
          packs (crate, tray). Stock is counted per option.
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

          {createOptions.map((row, idx) => {
            const errs = createErrors[idx] || {};
            return (
              <Row key={idx}>
                <Field>
                  Option name
                  <Input
                    placeholder="Optional — 500ml, Size 2, Red…"
                    value={row.label}
                    $invalid={Boolean(errs.label)}
                    aria-invalid={Boolean(errs.label)}
                    onChange={(e) => patchCreateRow(idx, { label: e.target.value })}
                  />
                  {errs.label ? <FieldHint $error>{errs.label}</FieldHint> : null}
                </Field>
                <Field>
                  Price
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    $invalid={Boolean(errs.price)}
                    aria-invalid={Boolean(errs.price)}
                    onChange={(e) => patchCreateRow(idx, { price: e.target.value })}
                    required
                  />
                  {errs.price ? <FieldHint $error>{errs.price}</FieldHint> : null}
                </Field>
                <Field>
                  Cost
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.costPrice}
                    onChange={(e) => patchCreateRow(idx, { costPrice: e.target.value })}
                  />
                </Field>
                <Field>
                  Stock
                  <Input
                    type="number"
                    min="1"
                    value={row.stock}
                    $invalid={Boolean(errs.stock)}
                    aria-invalid={Boolean(errs.stock)}
                    onChange={(e) => patchCreateRow(idx, { stock: e.target.value })}
                    required
                  />
                  {errs.stock ? <FieldHint $error>{errs.stock}</FieldHint> : null}
                </Field>
                {createOptions.length > 1 ? (
                  <Button
                    type="button"
                    $variant="ghost"
                    onClick={() => {
                      setCreateOptions(createOptions.filter((_, i) => i !== idx));
                      setCreateErrors((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </Row>
            );
          })}

          <Row style={{ marginTop: 4 }}>
            <Button
              type="button"
              $variant="ghost"
              onClick={() => {
                setCreateOptions([
                  ...createOptions,
                  { label: '', price: '', costPrice: '', stock: '' },
                ]);
                setCreateErrors([]);
              }}
            >
              + Add option
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
            columns={5}
            rows={8}
            widths={['9rem', '3.5rem', '4.5rem', '4.5rem', '5rem']}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Cost</th>
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
                  <tr key={p.id}>
                    <td>
                      <NameCell>
                        <Truncate title={p.name}>{p.name}</Truncate>
                        {multi ? (
                          <Badge $tone="info">
                            {variants.length} option{variants.length === 1 ? '' : 's'}
                          </Badge>
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
                      <Row style={{ gap: 6, margin: 0, flexWrap: 'nowrap' }}>
                        <Button
                          type="button"
                          $variant="ghost"
                          $size="sm"
                          onClick={() => {
                            if (expanded) closeEditPanel();
                            else openEditPanel(p);
                          }}
                        >
                          {expanded ? 'Close' : 'Edit'}
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

        {expandedProduct ? (
          <VariantsPanel>
            <PanelHeader>
              <div>
                <PanelTitle>Edit {expandedProduct.name}</PanelTitle>
                <PanelLead>
                  Change the name, update stock here, or add another option (size, colour,
                  flavour…). Packs are optional.
                </PanelLead>
              </div>
              <Button type="button" $variant="ghost" $size="sm" onClick={closeEditPanel}>
                Done
              </Button>
            </PanelHeader>

            <Row style={{ alignItems: 'flex-end', marginBottom: 16 }}>
              <Field>
                Product name
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => void saveProductName(expandedProduct)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveProductName(expandedProduct);
                    }
                  }}
                />
              </Field>
            </Row>

            <SizeList>
              {variantsOf(expandedProduct).map((v) => {
                const packs = (v.packs || []).filter((pk) => pk.isActive !== false);
                const variants = variantsOf(expandedProduct);
                const packSummary = packs
                  .map((pk) =>
                    pk.unitsPerPack === 1
                      ? `Single ${money(pk.price)}`
                      : `${pk.label} of ${pk.unitsPerPack} · ${money(pk.price)}`,
                  )
                  .join(' · ');
                return (
                  <SizeRow key={v.id}>
                    <SizeMeta>
                      <SizeName>{v.label?.trim() || 'Standard'}</SizeName>
                      <SizeDetails>
                        Sell price {money(v.price)}
                        {packSummary ? ` · ${packSummary}` : ''}
                      </SizeDetails>
                      <SizeStock>
                        {v.trackStock ? `${v.stock} in stock` : 'Stock tracking off'}
                      </SizeStock>
                    </SizeMeta>
                    <SizeActions>
                      {v.trackStock ? (
                        <>
                          <StockLabel>Change stock</StockLabel>
                          <AdjustGroup>
                            <QtyInput
                              type="number"
                              min="1"
                              placeholder="1"
                              aria-label={`How many to change for ${v.label || expandedProduct.name}`}
                              value={stockEdit[v.id] || ''}
                              onChange={(e) =>
                                setStockEdit({
                                  ...stockEdit,
                                  [v.id]: e.target.value,
                                })
                              }
                            />
                            <StepBtn
                              type="button"
                              title="Add stock"
                              aria-label="Add stock"
                              disabled={rowBusy === `${expandedProduct.id}:${v.id}:+`}
                              onClick={() =>
                                void adjustVariantStock(expandedProduct, v.id, '+')
                              }
                            >
                              +
                            </StepBtn>
                            <StepBtn
                              type="button"
                              title="Take out stock"
                              aria-label="Take out stock"
                              disabled={rowBusy === `${expandedProduct.id}:${v.id}:-`}
                              onClick={() =>
                                void adjustVariantStock(expandedProduct, v.id, '-')
                              }
                            >
                              −
                            </StepBtn>
                          </AdjustGroup>
                        </>
                      ) : null}
                      {variants.length > 1 ? (
                        <Button
                          type="button"
                          $variant="ghost"
                          $size="sm"
                          onClick={() => {
                            if (guardDemoWrite('change products')) return;
                            const label = v.label?.trim() || 'this option';
                            if (
                              !window.confirm(
                                `Remove ${label} from ${expandedProduct.name}?`,
                              )
                            ) {
                              return;
                            }
                            void deleteVariant(expandedProduct.id, v.id)
                              .then(() => {
                                toastSuccess('Option removed.');
                                invalidate();
                              })
                              .catch((err) => toastError(getErrorMessage(err)));
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                      {packs.length > 1
                        ? packs
                            .filter((pk) => pk.unitsPerPack !== 1)
                            .map((pk) => (
                              <Button
                                key={pk.id}
                                type="button"
                                $variant="ghost"
                                $size="sm"
                                onClick={() => {
                                  if (guardDemoWrite('change products')) return;
                                  if (
                                    !window.confirm(
                                      `Stop selling ${pk.label} for ${v.label?.trim() || expandedProduct.name}?`,
                                    )
                                  ) {
                                    return;
                                  }
                                  void deletePack(expandedProduct.id, v.id, pk.id)
                                    .then(() => {
                                      toastSuccess('Pack removed.');
                                      invalidate();
                                    })
                                    .catch((err) => toastError(getErrorMessage(err)));
                                }}
                              >
                                Remove {pk.label}
                              </Button>
                            ))
                        : null}
                    </SizeActions>
                  </SizeRow>
                );
              })}
            </SizeList>

            {panelMode === 'list' ? (
              <SecondaryActions>
                <Button
                  type="button"
                  $variant="ghost"
                  onClick={() => setPanelMode('add-option')}
                >
                  + Add option
                </Button>
                <Button
                  type="button"
                  $variant="ghost"
                  onClick={() => {
                    const first = variantsOf(expandedProduct)[0];
                    setPackForm((prev) => ({
                      ...prev,
                      variantId: prev.variantId || first?.id || '',
                    }));
                    setPanelMode('add-pack');
                  }}
                >
                  + Sell in packs (crate, tray…)
                </Button>
              </SecondaryActions>
            ) : null}

            {panelMode === 'add-option' ? (
              <AddSection>
                <AddSectionTitle>Add option</AddSectionTitle>
                <AddSectionLead>
                  Examples: 500ml, Size 2, Red, 1kg. Needs its own price and starting
                  stock.
                </AddSectionLead>
                <Row style={{ alignItems: 'flex-end' }}>
                  <Field>
                    Option name
                    <Input
                      placeholder="e.g. 500ml / Size 2 / Red"
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
                    Starting stock
                    <Input
                      type="number"
                      min="1"
                      placeholder="Required"
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
                    loading={rowBusy === `var:${expandedProduct.id}`}
                    onClick={() => void onAddVariant(expandedProduct)}
                  >
                    Save option
                  </Button>
                  <Button
                    type="button"
                    $variant="ghost"
                    onClick={() => {
                      setPanelMode('list');
                      setVariantForm({ label: '', price: '', stock: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </Row>
              </AddSection>
            ) : null}

            {panelMode === 'add-pack' ? (
              <AddSection>
                <AddSectionTitle>Sell in packs</AddSectionTitle>
                <AddSectionLead>
                  Same stock, sold as a group — e.g. a crate of 24. Pick which option the
                  pack belongs to.
                </AddSectionLead>
                <Row style={{ alignItems: 'flex-end' }}>
                  <Field style={{ flex: '1.4 1 180px' }}>
                    Which option?
                    <Select
                      key={`pack-variant-${expandedProduct.id}-${variantsOf(
                        expandedProduct,
                      )
                        .map((v) => v.id)
                        .join('-')}`}
                      value={packForm.variantId}
                      onChange={(e) =>
                        setPackForm({
                          ...packForm,
                          variantId: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose…</option>
                      {variantsOf(expandedProduct).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label?.trim() || 'Standard'}
                          {v.trackStock ? ` (${v.stock} in stock)` : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    Pack name
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
                    How many inside?
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
                    loading={rowBusy === `pack:${expandedProduct.id}`}
                    onClick={() => void onAddPack(expandedProduct)}
                  >
                    Save pack
                  </Button>
                  <Button
                    type="button"
                    $variant="ghost"
                    onClick={() => {
                      setPanelMode('list');
                      setPackForm((prev) => ({
                        ...prev,
                        label: '',
                        unitsPerPack: '24',
                        price: '',
                      }));
                    }}
                  >
                    Cancel
                  </Button>
                </Row>
              </AddSection>
            ) : null}
          </VariantsPanel>
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
