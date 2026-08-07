# Design: Product → Variant → Pack

Branch: `design/product-pack-sizes`  
## Status: **implemented (v1)** — embedded variants/packs on Product

See `backend/utils/productVariants.js` and product API routes under `/products/:id/variants`.

## Problem

Shops need two different inventory behaviours:

1. **Variants** — independently stocked SKUs under one display name  
   (shoe sizes, sealed sugar bags, Coke 500ml vs 2L)
2. **Packs** — sell the *same* stock pool in multiples  
   (bottle vs crate, egg vs tray, tablet vs blister)

Treating these as alternatives fails as soon as a product needs both  
(e.g. Coca-Cola 500ml sold single *and* by the crate, alongside a 2L variant).

## Locked model: three levels

```
Product          display name ("Coca-Cola", "Cavela Shoes", "Sugar")
  └── Variant[]  independently stocked SKU (size / weight / flavour / colour)
        └── Pack[]  optional sell multiples of *this* variant's stock
```

### Rules

1. **Every product has at least one Variant** (may be implicit / unlabeled for simple items).
2. **Packs always belong to a Variant** — never hang directly off Product.
3. **Stock lives on the Variant** (always in that variant’s `baseUnit`).
4. Selling a pack deducts `quantity × unitsPerPack` from the variant’s stock.
5. Simple products collapse to: one implicit Variant + one implicit Pack (`unitsPerPack: 1`).

One traversal path everywhere: **Product → Variant → Pack**.  
No dual schema shapes in sales, stock, chat, or reports.

## Field sketch

```text
Product {
  shopId
  name                 // "Coca-Cola"
  isActive
  createdAt
  // …attribution fields as today
}

Variant {
  productId
  shopId               // denormalised for tenant queries
  label                // "500ml" | "" for implicit single variant
  baseUnit             // free text: "bottle" | "egg" | "tablet" | "piece"
  price                // default / single-unit sell price
  costPrice?           // optional unit cost in baseUnit
  stock                // integer, always in baseUnit
  lowStockThreshold
  trackStock
  barcode?
  isActive
  sortOrder?
}

Pack {
  variantId
  shopId
  label                // "Single" | "Crate" | "Tray"
  unitsPerPack         // positive int; Single = 1
  price                // sell price for one pack
  costPrice?           // optional; else derive from variant.costPrice × unitsPerPack
  barcode?
  isActive
  sortOrder?
}
```

### Implicit defaults (no UX burden)

When a shop adds “Bread loaf” the way they do today:

| Level   | Created automatically                         |
|---------|-----------------------------------------------|
| Product | name = "Bread loaf"                           |
| Variant | label = "" (or same as product), baseUnit = "piece", price/stock from form |
| Pack    | label = "Single" (or hidden), unitsPerPack = 1, price = variant.price |

UI can hide Variant/Pack until the user adds a second variant or a non‑1 pack.

## Sector walkthrough

| Product     | Variant (own stock)     | Packs                         |
|-------------|-------------------------|-------------------------------|
| Coca-Cola   | 500ml (bottles)         | Single (1), Crate (24)        |
| Coca-Cola   | 2L (bottles)            | Single (1), Case (6)          |
| Cavela Shoes| Size 1, 2, 3            | — (implicit Single only)      |
| Sugar       | 200g / 1kg / 2kg bags   | — (unless they break bulk)    |
| Eggs        | Egg                     | Single (1), Tray (30)         |
| Paracetamol | 500mg (tablets)         | Blister (10), Box (100)       |
| Bread loaf  | (implicit)              | Single (1)                    |
| Hammer      | (implicit)              | Single (1)                    |
| Haircut     | (implicit, trackStock off) | Single (1)                 |

### Demo catalogs (current → how they map)

**Groceries** — names like `Sugar 2kg` become Product `Sugar` + Variant `2kg`, or stay flat as one Product with one Variant labeled `2kg` until they add more sizes. `Eggs (tray)` becomes Product `Eggs` + packs. `Coca-Cola 500ml` is Product + Variant; crate added later without restructuring.

**Clothing** — each style is a Product; sizes are Variants; packs unused.

**Jewellery** — mostly Product + single Variant; ring sizes as Variants when needed.

**Hardware** — `Cement 50kg` = Product `Cement` + Variant `50kg`; tools stay single Variant. Wall plugs can later add Pack `Box (100)` on a piece-stocked Variant.

**Salon** — services = Product + Variant, `trackStock: false`. Retail bottle sizes = Variants.

**Pharmacy** — pack count often = Packs on a tablet Variant; sealed “pack of 20” as only sell unit can be Variant with single Pack of 1 until they break boxes.

## Sale / order line shape

```text
{
  productId,
  variantId,           // required
  packId?,             // omit or Single → unitsPerPack = 1
  quantity,            // number of packs sold
  // snapshots for history:
  productName,
  variantLabel,
  packLabel,
  unitsPerPack,
  unitPrice,           // pack price
  total,               // quantity × pack price
  baseUnitsDeducted    // quantity × unitsPerPack
}
```

Stock mutation: `variant.stock -= baseUnitsDeducted` (same restore path on cancel).

## Why not binary “options vs packs” toggle

Sugar often starts as sealed bag Variants only. Months later the shop buys bulk sacks and sells loose — they add Packs (or a new bulk Variant) **without** migrating the product into a different model. Packs are always available on any Variant; unused levels stay implicit.

## Open decisions (implementation, not model)

1. **Storage:** nested subdocs on Product vs separate `Variant` / `Pack` collections.  
   Lean: separate collections (cleaner stock atomic updates + indexes); Product remains the list/group card.
2. **Backward compatibility:** migrate each existing Product → 1 Variant + 1 Pack(1); keep API accepting legacy `{ name, price, stock }` create payloads.
3. **Chat:** phase after web; resolve `sell 1 coke crate` via pack label / alias on the matched variant.
4. **Fractional stock** (kg sold as 0.5): out of scope for v1; keep integer `stock` and `unitsPerPack`.
5. **Cost on packs:** explicit `pack.costPrice` vs always `variant.costPrice × unitsPerPack`.

## Non-goals (v1)

- Clothing colour × size matrix UI (Variants are a flat list; multi-attribute matrix later)
- Multi-level logistics (case → pallet) beyond one Pack level on a Variant
- Sector-specific schemas or enums for `baseUnit`

## Acceptance for first implementation slice

- [ ] Existing products migrate to Product + 1 Variant + Pack(1)
- [ ] Create simple product via current fields still works
- [ ] Add second Variant (e.g. Sugar 1kg + 2kg) with independent stock
- [ ] Add Pack on a Variant (Crate 24) and sell deducts 24 base units
- [ ] Sale/order/laybye lines store variant + pack snapshots
- [ ] InventoryService (and order complete path) deduct via variant stock
