import OrderService from "../../OrderService.js";

export async function handleOrderCommands(shopId, text, actorUserId = null) {
  try {
    const parts = text
      .replace("order", "")
      .replace("orders", "")
      .trim()
      .split(" ");
    const command = parts[0]?.toLowerCase();

    if (!command) {
      // Show all orders
      const result = await OrderService.listOrders(shopId);
      return result.message;
    }

    if (command === "place" || command === "new") {
      // Format: order place John 2 bread 1 milk
      const remainingText = text
        .replace("place", "")
        .replace("new", "")
        .trim();
      return await processNewOrder(shopId, remainingText, actorUserId);
    }

    if (
      command === "pending" ||
      command === "confirmed" ||
      command === "ready" ||
      command === "completed" ||
      command === "cancelled"
    ) {
      const result = await OrderService.listOrders(shopId, command);
      return result.message;
    }

    if (command === "details") {
      const orderIdentifier = parts[1];
      if (!orderIdentifier) {
        return "Please specify order ID.\n\nUse: order details [order-id]\nExample: order details A1B2";
      }
      const result = await OrderService.getOrderDetails(
        shopId,
        orderIdentifier
      );
      return result.message;
    }

    // If no specific command, treat as new order
    return await processNewOrder(
      shopId,
      text.replace("order", "").trim(),
      actorUserId
    );
  } catch (error) {
    console.error("Order command error:", error);
    return "Failed to process order command. Please try again.";
  }
}

export async function processNewOrder(shopId, orderText, actorUserId = null) {
  try {
    console.log("[processNewOrder] Input:", orderText);

    // Regex to match: customer (quoted or unquoted) items type? notes?
    // Example: "John Doe" 2 bread 1 milk delivery "Leave at door"
    const match = orderText.match(
      /^(?:"([^"]+)"|(\S+))\s+(.+?)(?:\s+(pickup|delivery|reservation)\s+(?:"([^"]+)"|(.+))?)?$/i
    );

    if (!match) {
      return 'Please specify customer and items.\n\nUse: order [customer] [items] [type?] [notes?]\n\nExamples:\n• order John 2 bread 1 milk\n• order "Jane Doe" 2 "mince meat" 1 milk delivery\n• order 1234567890 3 eggs 1 sugar pickup "Need by 5pm"\n• order John 2 "carex condoms" 1 bread pickup';
    }

    const customerIdentifier = match[1] || match[2]; // Quoted or unquoted customer name
    let itemsText = match[3].trim();
    const orderType = match[4] ? match[4].toLowerCase() : "pickup";
    let notes = match[5] || match[6] || ""; // Quoted or unquoted notes

    console.log("[processNewOrder] Parsed:", {
      customerIdentifier,
      itemsText,
      orderType,
      notes,
    });

    if (!itemsText) {
      return 'Please specify items for the order.\n\nUse: order [customer] [items]\nExamples:\n• order John 2 bread 1 milk\n• order "John Doe" 2 "mince meat" 1 milk';
    }

    const result = await OrderService.placeOrder(
      shopId,
      customerIdentifier,
      itemsText,
      orderType,
      notes,
      { createdByUserId: actorUserId }
    );
    return result.message;
  } catch (error) {
    console.error("Process new order error:", error);
    return `Failed to place order: ${error.message}`;
  }
}

export async function handleOrderStatusUpdate(shopId, text, actorUserId = null) {
  try {
    const parts = text.trim().split(" ");
    const action = parts[0].toLowerCase();
    const command = parts[1]?.toLowerCase();
    const orderIdentifier = parts[2];
    const notes = parts.slice(3).join(" ");

    if (!["complete", "cancel"].includes(action)) {
      return "Invalid order action. Use: complete or cancel.";
    }

    if (command !== "order") {
      return "Invalid format. Use: [action] order [order-id]\nExample: complete order A1B2";
    }

    if (!orderIdentifier) {
      return "Please specify order ID.\n\nUse: [action] order [order-id]\nExample: complete order A1B2";
    }

    let newStatus;
    switch (action) {
      case "complete":
        newStatus = "completed";
        break;
      case "cancel":
        newStatus = "cancelled";
        break;
    }

    const result = await OrderService.updateOrderStatus(
      shopId,
      orderIdentifier,
      newStatus,
      notes
    );
    return result.message;
  } catch (error) {
    console.error("Order status update error:", error);
    return "Failed to update order status. Please try again.";
  }
}

