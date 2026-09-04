/**
 * Notification Deep Links Utility
 * 
 * Generates contextual deep links from notifications to specific action surfaces.
 * Each notification type routes to the most relevant page with context preserved.
 */

import type { StockAlertItem } from '@/api/products';
import type { CreditDueItem, LaybyeAlertItem } from '@/api/sales';
import type { OrderAlertItem } from '@/api/ops';
import type { ActivityItem } from '@/api/chat';

export type NotificationContext = {
  source: 'notification';
  timestamp: string;
  action?: string;
};

/**
 * Generate deep link for stock alerts
 * Routes to Products page with specific product highlighted
 */
export function getStockAlertDeepLink(item: StockAlertItem): string {
  const params = new URLSearchParams({
    // Target the specific product and variant
    alert: item.productId,
    variant: item.variantId,
    
    // Notification context
    source: 'notification',
    action: item.status === 'out' ? 'restock_urgent' : 'restock_soon',
    timestamp: new Date().toISOString()
  });
  
  return `/products?${params.toString()}`;
}

/**
 * Generate deep link for credit due alerts
 * Routes to Customer detail with credit tab focused
 */
export function getCreditDueDeepLink(item: CreditDueItem): string {
  if (!item.customerId) {
    // Fall back to customers list with filter
    const params = new URLSearchParams({
      tab: 'credit',
      status: item.status,
      source: 'notification',
      timestamp: new Date().toISOString()
    });
    return `/customers?${params.toString()}`;
  }
  
  const params = new URLSearchParams({
    // Focus credit tab
    tab: 'credit',
    
    // Chase action context
    chase: 'true',
    chaseStatus: item.status,
    
    // Notification context
    source: 'notification',
    action: item.status === 'overdue' ? 'chase_overdue' : 'chase_due',
    timestamp: new Date().toISOString()
  });
  
  return `/customers/${item.customerId}?${params.toString()}`;
}

/**
 * Generate deep link for order alerts
 * Routes directly to Order detail page
 */
export function getOrderAlertDeepLink(item: OrderAlertItem): string {
  const params = new URLSearchParams({
    // Order context
    status: item.status,
    
    // Action suggestions
    action: item.status === 'overdue' ? 'complete_overdue' : 'prepare_pickup',
    
    // Notification context  
    source: 'notification',
    timestamp: new Date().toISOString()
  });
  
  return `/orders/${item.id}?${params.toString()}`;
}

/**
 * Generate deep link for laybye alerts
 * Routes to Customer detail with laybyes tab focused
 */
export function getLaybyeAlertDeepLink(item: LaybyeAlertItem): string {
  if (!item.customerId) {
    // Fall back to customers list with laybye filter
    const params = new URLSearchParams({
      tab: 'laybyes',
      status: item.status,
      source: 'notification',
      timestamp: new Date().toISOString()
    });
    return `/customers?${params.toString()}`;
  }
  
  const params = new URLSearchParams({
    // Focus laybyes tab
    tab: 'laybyes',
    
    // Specific laybye
    laybye: item.id,
    
    // Action context
    action: item.status === 'overdue' ? 'collect_overdue' : 
            item.status === 'quiet' ? 'follow_up_quiet' : 'collect_payment',
    
    // Notification context
    source: 'notification',
    timestamp: new Date().toISOString()
  });
  
  return `/customers/${item.customerId}?${params.toString()}`;
}

/**
 * Generate deep link for activity alerts
 * Routes to appropriate page based on activity action
 */
export function getActivityAlertDeepLink(item: ActivityItem): string {
  // Activity items have different actions, route accordingly
  const params = new URLSearchParams({
    source: 'notification',
    timestamp: new Date().toISOString()
  });
  
  // Route based on activity action (using the actual ActivityItem structure)
  if (item.action.includes('sale')) {
    return `/sales?${params.toString()}`;
  } else if (item.action.includes('order')) {
    return `/orders?${params.toString()}`;
  } else if (item.action.includes('product')) {
    return `/products?${params.toString()}`;
  } else {
    // Default to activity/dashboard
    return `/dashboard?${params.toString()}`;
  }
}

/**
 * Get action label for notification type
 * Returns human-readable action text for buttons/links
 */
export function getNotificationActionLabel(type: string, status?: string): string {
  switch (type) {
    case 'stock':
      return status === 'out' ? 'Restock Now' : 'Plan Restock';
    
    case 'credit':
      return status === 'overdue' ? 'Chase Payment' : 'Send Reminder';
    
    case 'order':
      return status === 'overdue' ? 'Complete Order' : 'Prepare Pickup';
    
    case 'laybye':
      return status === 'overdue' ? 'Collect Payment' : 
             status === 'quiet' ? 'Follow Up' : 'Collect Payment';
    
    case 'activity':
      return 'View Details';
    
    default:
      return 'Take Action';
  }
}

/**
 * Get notification priority for sorting
 * Higher numbers = higher priority
 */
export function getNotificationPriority(type: string, status?: string): number {
  // Priority scoring: urgent issues first
  switch (type) {
    case 'stock':
      return status === 'out' ? 100 : 80; // Out of stock is highest priority
    
    case 'credit':
      return status === 'overdue' ? 95 : 
             status === 'due' ? 85 : 70; // Overdue > due today > due tomorrow
    
    case 'order':
      return status === 'overdue' ? 90 : 75; // Overdue orders are high priority
    
    case 'laybye':
      return status === 'overdue' ? 85 :
             status === 'quiet' ? 60 : 75; // Quiet laybyes are lower priority
    
    case 'activity':
      return 50; // General activity is lowest priority
    
    default:
      return 0;
  }
}

/**
 * Check if notification context exists in URL
 * Returns notification context if present
 */
export function getNotificationContextFromUrl(): NotificationContext | null {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('source') === 'notification') {
    return {
      source: 'notification',
      timestamp: params.get('timestamp') || new Date().toISOString(),
      action: params.get('action') || undefined
    };
  }
  
  return null;
}

/**
 * Clear notification context from URL
 * Removes notification params while preserving other query params
 */
export function clearNotificationContextFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  
  // Remove notification-specific params
  params.delete('source');
  params.delete('timestamp'); 
  params.delete('action');
  
  // Update URL without page reload
  const newUrl = params.toString() ? 
    `${window.location.pathname}?${params.toString()}` : 
    window.location.pathname;
    
  window.history.replaceState({}, '', newUrl);
}

/**
 * Universal notification deep link generator
 * Routes any notification type to appropriate action surface
 */
export function getNotificationDeepLink(notification: {
  kind: string;
  stock?: StockAlertItem;
  chase?: CreditDueItem;
  order?: OrderAlertItem;
  laybye?: LaybyeAlertItem;
  alert?: ActivityItem;
}): string {
  switch (notification.kind) {
    case 'stock':
      return notification.stock ? getStockAlertDeepLink(notification.stock) : '/products';
    
    case 'chase':
      return notification.chase ? getCreditDueDeepLink(notification.chase) : '/customers';
    
    case 'order':
      return notification.order ? getOrderAlertDeepLink(notification.order) : '/orders';
    
    case 'laybye':
      return notification.laybye ? getLaybyeAlertDeepLink(notification.laybye) : '/customers';
    
    case 'alert':
      return notification.alert ? getActivityAlertDeepLink(notification.alert) : '/dashboard';
    
    default:
      return '/dashboard';
  }
}