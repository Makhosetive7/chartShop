/**
 * Chat helpers: match product / variant / pack from free-text tokens.
 */
import {
  activePacks,
  activeVariants,
  ensureVariants,
  findPack,
  getPrimaryVariant,
  resolveSellUnit,
} from "../../utils/productVariants.js";

export function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function labelsEqual(a, b) {
  return normalizeLabel(a) === normalizeLabel(b);
}

/** Score how well query matches product name (higher = better). */
export function productNameScore(productName, query) {
  const name = normalizeLabel(productName).replace(/-/g, " ");
  const q = normalizeLabel(query).replace(/-/g, " ");
  if (!q || !name) return 0;
  if (name === q) return 100;
  // Query is a prefix of the product name ("cavela" → "cavela shoes")
  if (name.startsWith(q + " ") || name.startsWith(q)) return 85;
  // Do NOT score highly when query is product name + extra words
  // ("coke crate" must not beat "coke")
  if (q.startsWith(name + " ")) return 25;
  if (name.includes(q)) return 60;
  const nameParts = name.split(" ").filter(Boolean);
  const qParts = q.split(" ").filter(Boolean);
  if (
    qParts.length &&
    qParts.every((p) =>
      nameParts.some((n) => n === p || n.startsWith(p) || p.startsWith(n))
    )
  ) {
    return 70;
  }
  if (
    qParts.some((p) =>
      nameParts.some((n) => n.startsWith(p) || p.startsWith(n))
    )
  ) {
    return 45;
  }
  return 0;
}

/**
 * Greedy match: consume as many tokens as possible for a product name.
 * Quoted token = exact/fuzzy single segment.
 * @returns {{ product, consumed } | null}
 */
export function matchProductTokens(products, tokens, start) {
  if (start >= tokens.length) return null;
  const first = tokens[start];
  if (first.quoted) {
    const product = pickProduct(products, first.value);
    if (!product) return null;
    return { product, consumed: 1 };
  }

  const maxLen = Math.min(6, tokens.length - start);
  let best = null;
  for (let len = 1; len <= maxLen; len += 1) {
    const slice = tokens.slice(start, start + len);
    // Don't include bare numbers in a product name span
    if (
      slice.some(
        (t, idx) => idx > 0 && !t.quoted && /^\d+(\.\d+)?$/.test(t.value)
      )
    ) {
      break;
    }
    const query = slice.map((t) => t.value).join(" ");
    const product = pickProduct(products, query);
    if (!product) continue;
    const score = productNameScore(product.name, query);
    // Prefer higher score; for equal score prefer longer name span
    if (
      !best ||
      score > best.score ||
      (score === best.score && len > best.consumed)
    ) {
      best = { product, consumed: len, score };
    }
  }
  if (!best || best.score < 40) return null;
  return { product: best.product, consumed: best.consumed };
}

/**
 * Find best product for a query string among candidates.
 */
export function pickProduct(products, query) {
  let best = null;
  let bestScore = 0;
  for (const product of products) {
    const score = productNameScore(product.name, query);
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }
  if (bestScore < 40) return null;
  return best;
}

function matchLabelTokens(labels, tokens, start) {
  const available = (labels || [])
    .map((l) => String(l || "").trim())
    .filter(Boolean);
  if (!available.length || start >= tokens.length) return null;

  const maxLen = Math.min(4, tokens.length - start);
  let best = null;
  for (let len = maxLen; len >= 1; len -= 1) {
    const slice = tokens.slice(start, start + len);
    // Skip a lone numeric token (qty/price), but allow labels like "Size 2"
    if (
      slice.length === 1 &&
      !slice[0].quoted &&
      /^\d+(\.\d+)?$/.test(slice[0].value)
    ) {
      continue;
    }
    const query = slice.map((t) => t.value).join(" ");
    const hit = available.find((label) => labelsEqual(label, query));
    if (hit) {
      if (!best || len > best.consumed) {
        best = { label: hit, consumed: len };
      }
    }
  }
  return best;
}

/**
 * After product is known, consume optional variant and/or pack tokens.
 * @returns {{ variant, pack, consumed, error? }}
 */
export function matchVariantAndPack(product, tokens, start) {
  ensureVariants(product);
  const variants = activeVariants(product);
  let i = start;
  let variant = null;
  let pack = null;

  // 1) Try variant label
  const variantMatch = matchLabelTokens(
    variants.map((v) => v.label),
    tokens,
    i
  );
  if (variantMatch) {
    variant = variants.find((v) => labelsEqual(v.label, variantMatch.label));
    i += variantMatch.consumed;
  }

  // 2) Try pack on chosen variant, or uniquely across variants
  if (variant) {
    const packMatch = matchLabelTokens(
      activePacks(variant).map((p) => p.label),
      tokens,
      i
    );
    if (packMatch) {
      pack = activePacks(variant).find((p) =>
        labelsEqual(p.label, packMatch.label)
      );
      i += packMatch.consumed;
    }
  } else {
    // Pack-only: e.g. "coke crate" — find unique pack label across variants
    const allPackLabels = [];
    for (const v of variants) {
      for (const p of activePacks(v)) {
        if (p.label && !labelsEqual(p.label, "Single")) {
          allPackLabels.push({ variant: v, pack: p, label: p.label });
        }
      }
    }
    const packMatch = matchLabelTokens(
      allPackLabels.map((x) => x.label),
      tokens,
      i
    );
    if (packMatch) {
      const hits = allPackLabels.filter((x) =>
        labelsEqual(x.label, packMatch.label)
      );
      if (hits.length === 1) {
        variant = hits[0].variant;
        pack = hits[0].pack;
        i += packMatch.consumed;
      } else if (hits.length > 1) {
        return {
          variant: null,
          pack: null,
          consumed: 0,
          error: `Pack "${packMatch.label}" exists on multiple sizes. Specify the size, e.g. 500ml ${packMatch.label}.`,
        };
      }
    }

    // Variant-only still possible if we didn't match pack (e.g. size 2)
    if (!variant) {
      const vm = matchLabelTokens(
        variants.map((v) => v.label),
        tokens,
        i
      );
      if (vm) {
        variant = variants.find((v) => labelsEqual(v.label, vm.label));
        i += vm.consumed;
      }
    }
  }

  if (!variant) variant = getPrimaryVariant(product);
  if (!pack) pack = findPack(variant, null);

  return {
    variant,
    pack,
    consumed: i - start,
  };
}

/**
 * Resolve one sale line's product/variant/pack from tokens starting at `start`
 * (token at start should be quantity — caller handles that).
 * After qty, tokens are product + optional variant/pack + optional price.
 */
export function resolveLineFromTokens(products, tokens, startAfterQty, quantity) {
  const matched = matchProductTokens(products, tokens, startAfterQty);
  if (!matched) {
    const hint = tokens[startAfterQty]?.value || "";
    return {
      error: `Product "${hint}" not found. Type "list" to see products.`,
      consumed: 0,
    };
  }

  let i = startAfterQty + matched.consumed;
  const qp = matchVariantAndPack(matched.product, tokens, i);
  if (qp.error) {
    return { error: qp.error, consumed: matched.consumed };
  }
  i += qp.consumed;

  const sell = resolveSellUnit(matched.product, {
    variantId: qp.variant?._id,
    packId: qp.pack?._id,
    quantity,
  });
  if (sell.error) {
    return { error: sell.error, consumed: i - startAfterQty };
  }

  return {
    product: matched.product,
    variant: sell.variant,
    pack: sell.pack,
    sell,
    consumed: i - startAfterQty,
  };
}
