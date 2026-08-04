import Product from "../../models/Product.js";
import { escapeMarkdown } from "../../utils/escapeMarkdown.js";

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

async function resolveProduct(shopId, productName) {
  const escapedProductName = productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let product = await Product.findOne({
    shopId,
    name: { $regex: new RegExp(`^${escapedProductName}$`, "i") },
    isActive: true,
  });

  if (!product) {
    product = await Product.findOne({
      shopId,
      name: { $regex: productName, $options: "i" },
      isActive: true,
    });
  }

  return product;
}

/**
 * Parse sale items from text.
 * Supports: `2 bread`, `2 "brown bread"`, `1 bread 2.50`, `2 milk 1 bread`
 */
export async function parseSaleItems(shopId, itemsText) {
  try {
    const tokens = tokenize(itemsText || "");
    if (tokens.length === 0) {
      return `No valid items found. Please check format.`;
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

      const nameTok = tokens[i];
      if (isNumberToken(nameTok) && !nameTok.quoted) {
        return `Missing product name for quantity ${quantity}.`;
      }

      const productName = nameTok.value.replace(/^"+|"+$/g, "").trim();
      if (!productName) {
        return `Missing product name for quantity ${quantity}.`;
      }

      i += 1;

      let price = null;
      if (i < tokens.length && isNumberToken(tokens[i])) {
        const candidate = tokens[i];
        if (hasDecimal(candidate) || !looksLikeNextItemStart(tokens, i)) {
          price = parseFloat(candidate.value);
          i += 1;
        }
      }

      const product = await resolveProduct(shopId, productName);
      if (!product) {
        return `Product "${escapeMarkdown(productName)}" not found. Type "list" to see products.`;
      }

      const finalPrice = price !== null ? price : product.price;
      const itemTotal = quantity * finalPrice;
      const unitCost =
        typeof product.costPrice === "number" && product.costPrice >= 0
          ? product.costPrice
          : null;

      items.push({
        productId: product._id,
        product: product,
        productName: product.name,
        quantity,
        price: finalPrice,
        standardPrice: product.price,
        isCustomPrice: price !== null,
        costPrice: unitCost,
        costTotal: unitCost !== null ? unitCost * quantity : null,
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
