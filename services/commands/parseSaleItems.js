import Product from "../../models/Product.js";
import { escapeMarkdown } from "../../utils/escapeMarkdown.js";

export async function parseSaleItems(shopId, itemsText) {
  try {
    console.log("[parseSaleItems] Input text:", itemsText);

    const items = [];
    const regex = /(\d+)\s+(?:"([^"]+)"|(\S+))(?:\s+([\d.]+))?(?=\s|$)/g;

    let match;
    while ((match = regex.exec(itemsText)) !== null) {
      console.log("[parseSaleItems] Match found:", match);

      const quantity = parseInt(match[1]);

      if (isNaN(quantity) || quantity <= 0) {
        return `Invalid quantity: "${escapeMarkdown(match[1])}"`;
      }

      let productName = match[2] || match[3];

      if (!productName) {
        return `Missing product name for quantity ${quantity}.`;
      }

      let price = match[4] ? parseFloat(match[4]) : null;

      // Clean product name
      const originalName = productName;
      productName = productName.replace(/^"+|"+$/g, "").trim();
      console.log(
        "[parseSaleItems] Product name cleaned:",
        originalName,
        "->",
        productName
      );

      // Escape regex characters
      const escapedProductName = productName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      console.log("[parseSaleItems] Searching for:", escapedProductName);

      // Find product
      const product = await Product.findOne({
        shopId,
        name: { $regex: new RegExp(`^${escapedProductName}$`, "i") },
        isActive: true,
      });

      console.log("[parseSaleItems] Found product:", product);

      if (!product) {
        // Try a partial match as fallback
        const productPartial = await Product.findOne({
          shopId,
          name: { $regex: productName, $options: "i" },
          isActive: true,
        });

        if (!productPartial) {
          return `Product "${escapeMarkdown(productName)}" not found. Type "list" to see products.`;
        }

        const finalPrice = price !== null ? price : productPartial.price;
        const itemTotal = quantity * finalPrice;

        items.push({
          productId: productPartial._id,
          product: productPartial,
          productName: productPartial.name,
          quantity,
          price: finalPrice,
          standardPrice: productPartial.price,
          isCustomPrice: price !== null,
          total: itemTotal,
        });
      } else {
        const finalPrice = price !== null ? price : product.price;
        const itemTotal = quantity * finalPrice;

        items.push({
          productId: product._id,
          product: product,
          productName: product.name,
          quantity,
          price: finalPrice,
          standardPrice: product.price,
          isCustomPrice: price !== null,
          total: itemTotal,
        });
      }
    }

    if (items.length === 0) {
      return `No valid items found. Please check format.`;
    }

    console.log("[parseSaleItems] Parsed items:", items);
    return items;
  } catch (error) {
    console.error("[parseSaleItems] Error:", error);
    return `Failed to parse items: ${error.message}`;
  }
}

