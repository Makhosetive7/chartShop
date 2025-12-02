import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import CustomerService from './CustomerService.js';

class OrderService {
  /**
   * Place a new order
   */
  async placeOrder(shopId, customerIdentifier, itemsText, orderType = 'pickup', notes = '') {
    try {
      // Find or create customer
      let customer = await CustomerService.findCustomer(shopId, customerIdentifier);
      
      if (!customer) {
        return { 
          success: false, 
          message: `Customer "${customerIdentifier}" not found.\n\nPlease add customer first:\ncustomer add "${customerIdentifier}" [phone]` 
        };
      }

      // Parse order items
      const itemsResult = await this.parseOrderItems(shopId, itemsText);
      if (!itemsResult.success) {
        return itemsResult;
      }

      const { items, total } = itemsResult;

      // Create order
      const order = await Order.create({
        shopId,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items,
        total,
        orderType,
        notes: notes.trim(),
        orderDate: new Date()
      });

      return {
        success: true,
        message: this.generateOrderConfirmation(order),
        order
      };
    } catch (error) {
      console.error('Place order error:', error);
      return { 
        success: false, 
        message: 'Failed to place order. Please try again.' 
      };
    }
  }

  /**
   * Parse order items from text
   */
  async parseOrderItems(shopId, itemsText) {
    try {
      const parts = itemsText.trim().split(' ');
      const items = [];
      let total = 0;

      let i = 0;
      while (i < parts.length) {
        const quantity = parseInt(parts[i]);
        
        if (isNaN(quantity) || quantity <= 0) {
          return { 
            success: false, 
            message: `Invalid quantity: "${parts[i]}"\n\nPlease use positive numbers only.` 
          };
        }

        const productName = parts[i + 1];
        if (!productName) {
          return { 
            success: false, 
            message: "Missing product name after quantity." 
          };
        }

        // Find product
        const product = await Product.findOne({
          shopId,
          name: new RegExp(`^${productName}$`, 'i'),
          isActive: true,
        });

        if (!product) {
          return { 
            success: false, 
            message: `Product "${productName}" not found.\n\nUse "list" to see available products.` 
          };
        }

        // Check stock availability for immediate items
        if (product.trackStock && product.stock < quantity) {
          return { 
            success: false, 
            message: `Insufficient stock for ${product.name}.\n\nRequested: ${quantity}\nAvailable: ${product.stock}\n\nUse "stock ${product.name} [quantity]" to restock.` 
          };
        }

        const itemTotal = quantity * product.price;
        
        items.push({
          productId: product._id,
          productName: product.name,
          quantity,
          price: product.price,
          total: itemTotal,
        });

        total += itemTotal;
        i += 2; // Move to next item pair
      }

      return {
        success: true,
        items,
        total
      };
    } catch (error) {
      console.error('Parse order items error:', error);
      return { 
        success: false, 
        message: 'Failed to parse order items. Please check the format.' 
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(shopId, orderIdentifier, newStatus, notes = '') {
    try {
      const order = await this.findOrder(shopId, orderIdentifier);
      
      if (!order) {
        return { 
          success: false, 
          message: `Order "${orderIdentifier}" not found.` 
        };
      }

      // Validate status transition
      if (!this.isValidStatusTransition(order.status, newStatus)) {
        return { 
          success: false, 
          message: `Cannot change order status from "${order.status}" to "${newStatus}".` 
        };
      }

      // Update status and timestamps
      order.status = newStatus;
      
      switch (newStatus) {
        case 'confirmed':
          order.confirmedAt = new Date();
          break;
        case 'ready':
          order.readyAt = new Date();
          break;
        case 'completed':
          order.completedAt = new Date();
          // Deduct stock when order is completed
          await this.deductOrderStock(order);
          break;
        case 'cancelled':
          order.cancelledAt = new Date();
          break;
      }

      if (notes) {
        order.notes = notes;
      }

      await order.save();

      return {
        success: true,
        message: this.generateStatusUpdateMessage(order, newStatus),
        order
      };
    } catch (error) {
      console.error('Update order status error:', error);
      return { 
        success: false, 
        message: 'Failed to update order status. Please try again.' 
      };
    }
  }

  /**
   * Deduct stock when order is completed
   */
  async deductOrderStock(order) {
    try {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product && product.trackStock) {
          product.stock -= item.quantity;
          await product.save();
        }
      }
    } catch (error) {
      console.error('Deduct order stock error:', error);
      throw error;
    }
  }

  /**
   * Find order by ID or reference number
   */
  async findOrder(shopId, orderIdentifier) {
    try {
      // Check if it's a MongoDB ID
      if (orderIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
        return await Order.findOne({
          _id: orderIdentifier,
          shopId
        });
      }

      // Check if it's an order number (last 4 chars of ID)
      if (orderIdentifier.length === 4) {
        const orders = await Order.find({ shopId })
          .sort({ orderDate: -1 })
          .limit(100);
        
        return orders.find(order => 
          order._id.toString().slice(-4).toLowerCase() === orderIdentifier.toLowerCase()
        );
      }

      return null;
    } catch (error) {
      console.error('Find order error:', error);
      return null;
    }
  }

  /**
   * List orders with filtering
   */
  async listOrders(shopId, status = 'all', limit = 10) {
    try {
      let query = { shopId };
      
      if (status !== 'all') {
        query.status = status;
      }

      const orders = await Order.find(query)
        .sort({ orderDate: -1 })
        .limit(limit)
        .populate('customerId', 'name phone');

      if (orders.length === 0) {
        return { 
          success: false, 
          message: `No ${status === 'all' ? '' : status + ' '}orders found.` 
        };
      }

      return {
        success: true,
        message: this.generateOrdersListMessage(orders, status),
        orders
      };
    } catch (error) {
      console.error('List orders error:', error);
      return { 
        success: false, 
        message: 'Failed to fetch orders. Please try again.' 
      };
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(shopId, orderIdentifier) {
    try {
      const order = await this.findOrder(shopId, orderIdentifier);
      
      if (!order) {
        return { 
          success: false, 
          message: `Order "${orderIdentifier}" not found.\n\nUse "orders" to see all orders.` 
        };
      }

      await order.populate('customerId', 'name phone totalSpent totalVisits');

      return {
        success: true,
        message: this.generateOrderDetailsMessage(order),
        order
      };
    } catch (error) {
      console.error('Get order details error:', error);
      return { 
        success: false, 
        message: 'Failed to get order details. Please try again.' 
      };
    }
  }

  /**
   * Validate status transitions
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['ready', 'cancelled'],
      ready: ['completed', 'cancelled'],
      completed: [], 
      cancelled: [] 
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Generate order confirmation message
   */
  generateOrderConfirmation(order) {
    const orderId = order._id.toString().slice(-4).toUpperCase();
    
    let message = `*NEW ORDER RECEIVED!* (#${orderId})\n\n`;
    message += `Customer: ${order.customerName}\n`;
    message += `Phone: ${order.customerPhone}\n`;
    message += `Order Date: ${order.orderDate.toLocaleString()}\n`;
    message += `Type: ${order.orderType.toUpperCase()}\n\n`;
    
    message += `*ORDER ITEMS:*\n`;
    order.items.forEach(item => {
      message += `• ${item.quantity}x ${item.productName} - $${item.price.toFixed(2)} each\n`;
    });
    
    message += `\n*Total: $${order.total.toFixed(2)}*\n`;
    message += `Status: ${order.status.toUpperCase()}\n`;
    
    if (order.notes) {
      message += ` Notes: ${order.notes}\n`;
    }
    
    message += `\n *Quick Actions:*\n`;
    message += `• confirm order ${orderId} - Confirm order\n`;
    message += `• ready order ${orderId} - Mark as ready\n`;
    message += `• complete order ${orderId} - Complete order\n`;
    message += `• cancel order ${orderId} - Cancel order`;

    return message;
  }

  /**
   * Generate status update message
   */
  generateStatusUpdateMessage(order, newStatus) {
    const orderId = order._id.toString().slice(-4).toUpperCase();
    const statusIcons = {
      confirmed: 'confirmed',
      ready: 'ready', 
      completed: 'completed',
      cancelled: 'cancelled'
    };

    let message = `${statusIcons[newStatus]} *ORDER ${newStatus.toUpperCase()}* (#${orderId})\n\n`;
    message += `Customer: ${order.customerName}\n`;
    message += `Order Total: $${order.total.toFixed(2)}\n`;
    message += `Updated: ${new Date().toLocaleString()}\n`;
    
    if (newStatus === 'completed') {
      message += `\nStock has been deducted for completed order.`;
    } else if (newStatus === 'cancelled') {
      message += `\nReason: ${order.notes || 'No reason provided'}`;
    }

    return message;
  }

  /**
   * Generate orders list message
   */
  generateOrdersListMessage(orders, status) {
    let message = ` *ORDERS`;
    
    if (status !== 'all') {
      message += ` - ${status.toUpperCase()}`;
    }
    
    message += `*\n\n`;

    orders.forEach((order, index) => {
      const orderId = order._id.toString().slice(-4).toUpperCase();
      const statusIcons = {
        pending: 'pending',
        confirmed: 'confirmed',
        ready: 'ready',
        completed: 'completed',
        cancelled: 'cancelled'
      };

      const topItems = order.items.slice(0, 2)
        .map(item => `${item.quantity}x ${item.productName}`)
        .join(', ');
      
      const moreItems = order.items.length > 2 ? ` +${order.items.length - 2} more` : '';

      message += `${index + 1}. ${statusIcons[order.status]} #${orderId}\n`;
      message += `   ${order.customerName}\n`;
      message += `   $${order.total.toFixed(2)}\n`;
      message += `   ${topItems}${moreItems}\n`;
      message += `   ${order.orderDate.toLocaleDateString()}\n\n`;
    });

    message += `*Order Commands:*\n`;
    message += `order [customer] [items] - Place new order\n`;
    message += `orders pending - Pending orders only\n`;
    message += `order details [id] - View order details\n`;
    message += `confirm order [id] - Confirm order`;

    return message;
  }

  /**
   * Generate order details message
   */
  generateOrderDetailsMessage(order) {
    const orderId = order._id.toString().slice(-4).toUpperCase();
    const statusIcons = {
      pending: 'pending',
      confirmed: 'confirmed',
      ready: 'ready',
      completed: 'completed',
      cancelled: 'cancelled'
    };

    let message = `*ORDER #${orderId} - DETAILS*\n\n`;
    message += `Customer: ${order.customerName}\n`;
    message += `Phone: ${order.customerPhone}\n`;
    message += `${statusIcons[order.status]} Status: ${order.status.toUpperCase()}\n`;
    message += `Type: ${order.orderType.toUpperCase()}\n`;
    message += `Total: $${order.total.toFixed(2)}\n\n`;

    message += `*ITEMS:*\n`;
    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item.quantity}x ${item.productName}\n`;
      message += `   Price: $${item.price.toFixed(2)} each\n`;
      message += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    // Timestamps
    message += `*TIMELINE:*\n`;
    message += `Ordered: ${order.orderDate.toLocaleString()}\n`;
    if (order.confirmedAt) {
      message += `Confirmed: ${order.confirmedAt.toLocaleString()}\n`;
    }
    if (order.readyAt) {
      message += `Ready: ${order.readyAt.toLocaleString()}\n`;
    }
    if (order.completedAt) {
      message += `Completed: ${order.completedAt.toLocaleString()}\n`;
    }
    if (order.cancelledAt) {
      message += `Cancelled: ${order.cancelledAt.toLocaleString()}\n`;
    }

    if (order.notes) {
      message += `\nNotes: ${order.notes}\n`;
    }

    // Customer info if populated
    if (order.customerId && typeof order.customerId === 'object') {
      message += `\n*CUSTOMER INFO:*\n`;
      message += `Total Spent: $${order.customerId.totalSpent.toFixed(2)}\n`;
      message += `Total Visits: ${order.customerId.totalVisits}\n`;
    }

    // Action buttons based on status
    message += `\ *ACTIONS:*\n`;
    switch (order.status) {
      case 'pending':
        message += `confirm order ${orderId}\n`;
        message += `cancel order ${orderId} [reason]\n`;
        break;
      case 'confirmed':
        message += `ready order ${orderId}\n`;
        message += `cancel order ${orderId} [reason]\n`;
        break;
      case 'ready':
        message += `complete order ${orderId}\n`;
        message += `cancel order ${orderId} [reason]\n`;
        break;
    }

    return message;
  }
}

export default new OrderService();