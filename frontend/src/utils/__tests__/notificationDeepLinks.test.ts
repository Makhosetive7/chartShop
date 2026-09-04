/**
 * Notification Deep Links Tests
 * 
 * Tests the deep linking utilities for notifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStockAlertDeepLink,
  getCreditDueDeepLink,
  getOrderAlertDeepLink,
  getLaybyeAlertDeepLink,
  getNotificationActionLabel,
  getNotificationPriority,
  getNotificationContextFromUrl,
  clearNotificationContextFromUrl
} from '../notificationDeepLinks';
import type { StockAlertItem } from '@/api/products';
import type { CreditDueItem, LaybyeAlertItem } from '@/api/sales';
import type { OrderAlertItem } from '@/api/ops';

describe('notificationDeepLinks', () => {
  describe('getStockAlertDeepLink', () => {
    it('should generate correct deep link for out of stock item', () => {
      const item: StockAlertItem = {
        id: 'alert-1',
        productId: 'product-123',
        variantId: 'variant-456',
        productName: 'Test Widget',
        variantLabel: 'Large Blue',
        stock: 0,
        lowStockThreshold: 5,
        status: 'out'
      };

      const link = getStockAlertDeepLink(item);
      const url = new URL(link, 'http://localhost');

      expect(url.pathname).toBe('/products');
      expect(url.searchParams.get('alert')).toBe('product-123');
      expect(url.searchParams.get('variant')).toBe('variant-456');
      expect(url.searchParams.get('action')).toBe('restock_urgent');
      expect(url.searchParams.get('source')).toBe('notification');
    });

    it('should generate correct deep link for low stock item', () => {
      const item: StockAlertItem = {
        id: 'alert-2',
        productId: 'product-789',
        variantId: 'variant-101',
        productName: 'Another Widget',
        variantLabel: 'Small Red',
        stock: 2,
        lowStockThreshold: 5,
        status: 'low'
      };

      const link = getStockAlertDeepLink(item);
      const url = new URL(link, 'http://localhost');

      expect(url.pathname).toBe('/products');
      expect(url.searchParams.get('action')).toBe('restock_soon');
    });
  });

  describe('getCreditDueDeepLink', () => {
    it('should generate correct deep link for customer with ID', () => {
      const item: CreditDueItem = {
        id: 'credit-1',
        customerId: 'customer-123',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        totalCredit: 15000,
        dueDate: '2024-01-15',
        status: 'overdue',
        daysOverdue: 5,
        daysUntilDue: -5,
        items: []
      };

      const link = getCreditDueDeepLink(item);
      const url = new URL(link, 'http://localhost');

      expect(url.pathname).toBe('/customers/customer-123');
      expect(url.searchParams.get('tab')).toBe('credit');
      expect(url.searchParams.get('chase')).toBe('true');
      expect(url.searchParams.get('chaseStatus')).toBe('overdue');
      expect(url.searchParams.get('action')).toBe('chase_overdue');
    });

    it('should fallback to customers list when no customer ID', () => {
      const item: CreditDueItem = {
        id: 'credit-2',
        customerId: null,
        customerName: 'Unknown Customer',
        customerPhone: null,
        totalCredit: 5000,
        dueDate: '2024-01-20',
        status: 'due',
        daysOverdue: 0,
        daysUntilDue: 0,
        items: []
      };

      const link = getCreditDueDeepLink(item);
      const url = new URL(link, 'http://localhost');

      expect(url.pathname).toBe('/customers');
      expect(url.searchParams.get('tab')).toBe('credit');
      expect(url.searchParams.get('status')).toBe('due');
    });
  });

  describe('getOrderAlertDeepLink', () => {
    it('should generate correct deep link for order', () => {
      const item: OrderAlertItem = {
        id: 'order-123',
        shortId: 'ORD-001',
        customerId: 'customer-456',
        customerName: 'Jane Smith',
        orderType: 'pickup',
        orderStatus: 'pending',
        total: 25000,
        orderDate: '2024-01-10',
        pickupDate: '2024-01-15',
        status: 'overdue',
        daysOverdue: 3,
        daysUntilPickup: -3,
        daysOpen: 8,
        items: []
      };

      const link = getOrderAlertDeepLink(item);
      const url = new URL(link, 'http://localhost');

      expect(url.pathname).toBe('/orders/order-123');
      expect(url.searchParams.get('status')).toBe('overdue');
      expect(url.searchParams.get('action')).toBe('complete_overdue');
    });
  });

  describe('getLaybyeAlertDeepLink', () => {
    it('should generate correct deep link for laybye', () => {
      const item: LaybyeAlertItem = {
        id: 'laybye-789',
        customerId: 'customer-789',
        customerName: 'Bob Johnson',
        customerPhone: '+9876543210',
        totalAmount: 50000,
        amountPaid: 20000,
        balanceDue: 30000,
        dueDate: '2024-01-25',
        lastPaymentAt: '2024-01-01',
        status: 'overdue',
        daysOverdue: 2,
        daysUntilDue: -2,
        daysQuiet: 0,
        items: []
      };

      const link = getLaybyeAlertDeepLink(item);
      const url = new URL(link, 'http://localhost');

      expect(url.pathname).toBe('/customers/customer-789');
      expect(url.searchParams.get('tab')).toBe('laybyes');
      expect(url.searchParams.get('laybye')).toBe('laybye-789');
      expect(url.searchParams.get('action')).toBe('collect_overdue');
    });
  });

  describe('getNotificationActionLabel', () => {
    it('should return correct action labels', () => {
      expect(getNotificationActionLabel('stock', 'out')).toBe('Restock Now');
      expect(getNotificationActionLabel('stock', 'low')).toBe('Plan Restock');
      expect(getNotificationActionLabel('credit', 'overdue')).toBe('Chase Payment');
      expect(getNotificationActionLabel('credit', 'due')).toBe('Send Reminder');
      expect(getNotificationActionLabel('order', 'overdue')).toBe('Complete Order');
      expect(getNotificationActionLabel('order', 'due')).toBe('Prepare Pickup');
      expect(getNotificationActionLabel('laybye', 'overdue')).toBe('Collect Payment');
      expect(getNotificationActionLabel('laybye', 'quiet')).toBe('Follow Up');
      expect(getNotificationActionLabel('activity')).toBe('View Details');
      expect(getNotificationActionLabel('unknown')).toBe('Take Action');
    });
  });

  describe('getNotificationPriority', () => {
    it('should return correct priority scores', () => {
      // Out of stock should be highest priority
      expect(getNotificationPriority('stock', 'out')).toBe(100);
      
      // Overdue items should be very high priority
      expect(getNotificationPriority('credit', 'overdue')).toBe(95);
      expect(getNotificationPriority('order', 'overdue')).toBe(90);
      expect(getNotificationPriority('laybye', 'overdue')).toBe(85);
      
      // Due items should be high priority
      expect(getNotificationPriority('credit', 'due')).toBe(85);
      expect(getNotificationPriority('stock', 'low')).toBe(80);
      expect(getNotificationPriority('order', 'due')).toBe(75);
      
      // Quiet laybyes should be lower priority
      expect(getNotificationPriority('laybye', 'quiet')).toBe(60);
      
      // Activity should be lowest priority
      expect(getNotificationPriority('activity')).toBe(50);
    });

    it('should sort notifications by priority correctly', () => {
      const notifications = [
        { type: 'activity', status: 'info', priority: getNotificationPriority('activity') },
        { type: 'stock', status: 'out', priority: getNotificationPriority('stock', 'out') },
        { type: 'credit', status: 'overdue', priority: getNotificationPriority('credit', 'overdue') },
        { type: 'laybye', status: 'quiet', priority: getNotificationPriority('laybye', 'quiet') }
      ];

      notifications.sort((a, b) => b.priority - a.priority);

      expect(notifications[0].type).toBe('stock'); // Out of stock (100)
      expect(notifications[1].type).toBe('credit'); // Overdue credit (95)
      expect(notifications[2].type).toBe('laybye'); // Quiet laybye (60)
      expect(notifications[3].type).toBe('activity'); // Activity (50)
    });
  });

  describe('URL context handling', () => {
    beforeEach(() => {
      // Mock window.location
      vi.stubGlobal('location', {
        search: '',
        pathname: '/notifications',
        href: 'http://localhost/notifications'
      });
      
      // Mock window.history
      vi.stubGlobal('history', {
        replaceState: vi.fn()
      });
    });

    it('should detect notification context from URL', () => {
      // Mock URL with notification context
      vi.stubGlobal('location', {
        search: '?source=notification&timestamp=2024-01-15T10:00:00Z&action=restock_urgent',
        pathname: '/products'
      });

      const context = getNotificationContextFromUrl();

      expect(context).toEqual({
        source: 'notification',
        timestamp: '2024-01-15T10:00:00Z',
        action: 'restock_urgent'
      });
    });

    it('should return null when no notification context', () => {
      vi.stubGlobal('location', {
        search: '?tab=inventory&filter=low',
        pathname: '/products'
      });

      const context = getNotificationContextFromUrl();

      expect(context).toBeNull();
    });

    it('should clear notification context from URL', () => {
      vi.stubGlobal('location', {
        search: '?source=notification&timestamp=2024-01-15T10:00:00Z&tab=credit&other=param',
        pathname: '/customers/123'
      });

      clearNotificationContextFromUrl();

      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        '/customers/123?tab=credit&other=param'
      );
    });

    it('should clear notification context and preserve other params', () => {
      vi.stubGlobal('location', {
        search: '?source=notification&action=chase&customerId=123&important=keep',
        pathname: '/customers'
      });

      clearNotificationContextFromUrl();

      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        '/customers?customerId=123&important=keep'
      );
    });
  });
});