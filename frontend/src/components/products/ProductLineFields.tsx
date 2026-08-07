import type { Product } from '@/api/types';
import { money } from '@/api/types';
import { Field, Input, Select, Button, Row } from '@/components/ui/primitives';
import {
  activePacks,
  activeVariants,
  pickDefaultIds,
  showPackPicker,
  showVariantPicker,
  type CatalogLine,
} from '@/utils/productCatalog';

type Props = {
  line: CatalogLine;
  products: Product[];
  onChange: (next: CatalogLine) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  /** Compact single-row layout without custom price (orders). */
  hidePrice?: boolean;
};

export function ProductLineFields({
  line,
  products,
  onChange,
  onRemove,
  showRemove = false,
  hidePrice = false,
}: Props) {
  const product = products.find((p) => p.id === line.productId);
  const variants = activeVariants(product);
  const packs = activePacks(product, line.variantId);
  const selectedPack = packs.find((pk) => pk.id === line.packId);
  const selectedVariant = variants.find((v) => v.id === line.variantId);
  const needVariant = showVariantPicker(product);
  const needPack = showPackPicker(product, line.variantId);

  return (
    <Row>
      <Field>
        Product
        <Select
          value={line.productId}
          onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value);
            const defaults = pickDefaultIds(p);
            onChange({
              ...line,
              productId: e.target.value,
              variantId: defaults.variantId,
              packId: defaults.packId,
              price: '',
            });
          }}
          required
        >
          <option value="">Select…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {money(p.price)}
              {p.trackStock ? ` · stock ${p.stock}` : ''}
            </option>
          ))}
        </Select>
      </Field>

      {needVariant ? (
        <Field style={{ flex: '1.4 1 180px' }}>
          Option
          <Select
            key={`variant-${line.productId}`}
            value={line.variantId}
            onChange={(e) => {
              const packsFor = activePacks(product, e.target.value);
              const pack = packsFor.find((pk) => pk.unitsPerPack === 1) || packsFor[0];
              onChange({
                ...line,
                variantId: e.target.value,
                packId: pack?.id || '',
                price: '',
              });
            }}
            required
          >
            {variants.length === 0 ? (
              <option value="">No options</option>
            ) : (
              variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label?.trim() || 'Standard'}
                  {v.trackStock ? ` · stock ${v.stock}` : ''}
                  {` · ${money(v.price)}`}
                </option>
              ))
            )}
          </Select>
        </Field>
      ) : null}

      {needPack ? (
        <Field>
          Pack
          <Select
            key={`pack-${line.productId}-${line.variantId}`}
            value={line.packId}
            onChange={(e) =>
              onChange({
                ...line,
                packId: e.target.value,
                price: '',
              })
            }
            required
          >
            {packs.map((pk) => (
              <option key={pk.id} value={pk.id}>
                {pk.label} ({pk.unitsPerPack}) · {money(pk.price)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field>
        Qty
        <Input
          type="number"
          min="1"
          value={line.quantity}
          onChange={(e) => onChange({ ...line, quantity: e.target.value })}
          required
        />
      </Field>

      {!hidePrice ? (
        <Field>
          Custom price (optional)
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={
              selectedPack
                ? String(selectedPack.price)
                : selectedVariant
                  ? String(selectedVariant.price)
                  : undefined
            }
            value={line.price}
            onChange={(e) => onChange({ ...line, price: e.target.value })}
          />
        </Field>
      ) : null}

      {showRemove && onRemove ? (
        <Button type="button" $variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      ) : null}
    </Row>
  );
}
