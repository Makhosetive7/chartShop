import Product from "../../models/Product.js";
import { escapeMarkdown } from "../../utils/escapeMarkdown.js";
import { resolveLineFromTokens } from "./chatProductResolve.js";

function tokenize(itemsText) {
  const tokens = [];
  const re = /"([^"]+)"|(\S+)/g;
  let match;
  while ((match = re.exec(itemsText)) !== null) {
    tokens.push({
      value: (match[1] ?? match[2]).trim(),
      quoted: match[1] != null,
    });
  }
  return tokens;
}

function isNumberToken(token) {
  return Boolean(token && !token.quoted && /^\d+(\.\d+)?$/.test(token.value));
}

function isIntegerToken(token) {
  return Boolean(token && !token.quoted && /^\d+$/.test(token.value));
}

function hasDecimal(token) {
  return Boolean(token && /^\d+\.\d+$/.test(token.value));
}

/**
 * True when tokens[i] (integer) + tokens[i+1] look like the start of another
 * sale line: `<qty> <product>` rather than a bare custom price.
 */
function looksLikeNextItemStart(tokens, i) {
  if (!isIntegerToken(tokens[i])) return false;
  if (i + 1 >= tokens.length) return false;
  const nameTok = tokens[i + 1];
  if (nameTok.quoted) return true;
  if (isNumberToken(nameTok)) return false;
  return Boolean(nameTok?.value);
}

/**
 * Parse sale items from text.
 * Supports:
 * - `2 bread`, `2 "brown bread"`, `1 bread 2.50`, `2 milk 1 bread`
 * - `1 coke crate`, `1 coke 500ml`, `1 coke 500ml crate`
 * - `2 cavela size 2`, `1 "cavela shoes" "Size 3"`
 */
export async function parseSaleItems(shopId, itemsText) {
  try {
    const tokens = tokenize(itemsText || "");
    if (tokens.length === 0) {
      return `No valid items found. Please check format.`;
    }

    const products = await Product.find({ shopId, isActive: true });
    if (!products.length) {
      return `No products yet. Add one with: add bread 2.50 stock 50`;
    }

    const items = [];
    let i = 0;

    while (i < tokens.length) {
      const qtyTok = tokens[i];
      if (!isIntegerToken(qtyTok)) {
        return `Invalid quantity: "${escapeMarkdown(qtyTok?.value || "")}"`;
      }

      const quantity = parseInt(qtyTok.value, 10);
      if (quantity <= 0) {
        return `Invalid quantity: "${escapeMarkdown(qtyTok.value)}"`;
      }

      i += 1;
      if (i >= tokens.length) {
        return `Missing product name for quantity ${quantity}.`;
      }

      const resolved = resolveLineFromTokens(products, tokens, i, quantity);
      if (resolved.error) {
        return resolved.error;
      }

      i += resolved.consumed;

      let price = null;
      if (i < tokens.length && isNumberToken(tokens[i])) {
        const candidate = tokens[i];
        if (hasDecimal(candidate) || !looksLikeNextItemStart(tokens, i)) {
          price = parseFloat(candidate.value);
          i += 1;
        }
      }

      const { product, sell } = resolved;
      const finalPrice = price !== null ? price : sell.pack.price;
      const itemTotal = quantity * finalPrice;

      items.push({
        productId: product._id,
        product,
        productName: sell.displayName,
        variantId: sell.variant._id,
        variantLabel: sell.variant.label || "",
        packId: sell.pack._id,
        packLabel: sell.pack.label || "",
        unitsPerPack: sell.unitsPerPack,
        baseUnitsDeducted: sell.baseUnits,
        quantity,
        price: finalPrice,
        standardPrice: sell.pack.price,
        isCustomPrice: price !== null,
        costPrice: sell.packCost,
        costTotal: sell.packCost !== null ? sell.packCost * quantity : null,
        total: itemTotal,
      });
    }

    if (items.length === 0) {
      return `No valid items found. Please check format.`;
    }

    return items;
  } catch (error) {
    console.error("[parseSaleItems] Error:", error);
    return `Failed to parse items: ${error.message}`;
  }
}
