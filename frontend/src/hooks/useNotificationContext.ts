/**
 * Notification Context Hook
 * 
 * Detects when a page was accessed via notification deep link and provides
 * context for highlighting relevant items and suggesting actions.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearNotificationContextFromUrl, getNotificationContextFromUrl } from '@/utils/notificationDeepLinks';

export type NotificationContext = {
  source: 'notification';
  timestamp: string;
  action?: string;
};

export type NotificationPageContext = {
  // Basic context
  isFromNotification: boolean;
  context: NotificationContext | null;
  
  // Specific context types
  productAlert?: {
    productId: string;
    variantId?: string;
    action: 'restock_urgent' | 'restock_soon';
  };
  
  creditChase?: {
    customerId?: string;
    status: 'overdue' | 'due' | 'tomorrow';
    action: 'chase_overdue' | 'chase_due';
  };
  
  orderAction?: {
    orderId?: string;
    status: 'overdue' | 'due' | 'stale';
    action: 'complete_overdue' | 'prepare_pickup';
  };
  
  laybyeAction?: {
    customerId?: string;
    laybyeId?: string;
    action: 'collect_overdue' | 'collect_payment' | 'follow_up_quiet';
  };
  
  // Actions
  clearContext: () => void;
  acknowledge: () => void;
};

export function useNotificationContext(): NotificationPageContext {
  const [searchParams] = useSearchParams();
  const [acknowledged, setAcknowledged] = useState(false);
  
  // Parse notification context from URL
  const context = useMemo(() => {
    if (acknowledged) return null;
    return getNotificationContextFromUrl();
  }, [searchParams, acknowledged]);
  
  const isFromNotification = Boolean(context && !acknowledged);
  
  // Parse specific context types
  const productAlert = useMemo(() => {
    if (!isFromNotification) return undefined;
    
    const productId = searchParams.get('alert');
    const variantId = searchParams.get('variant');
    const action = searchParams.get('action');
    
    if (productId && (action === 'restock_urgent' || action === 'restock_soon')) {
      return {
        productId,
        variantId: variantId || undefined,
        action: action as 'restock_urgent' | 'restock_soon'
      };
    }
    
    return undefined;
  }, [isFromNotification, searchParams]);
  
  const creditChase = useMemo(() => {
    if (!isFromNotification) return undefined;
    
    const chase = searchParams.get('chase');
    const status = searchParams.get('chaseStatus') || searchParams.get('status');
    const action = searchParams.get('action');
    
    if (chase === 'true' && status && (action === 'chase_overdue' || action === 'chase_due')) {
      return {
        status: status as 'overdue' | 'due' | 'tomorrow',
        action: action as 'chase_overdue' | 'chase_due'
      };
    }
    
    return undefined;
  }, [isFromNotification, searchParams]);
  
  const orderAction = useMemo(() => {
    if (!isFromNotification) return undefined;
    
    const status = searchParams.get('status');
    const action = searchParams.get('action');
    
    if (status && (action === 'complete_overdue' || action === 'prepare_pickup')) {
      return {
        status: status as 'overdue' | 'due' | 'stale',
        action: action as 'complete_overdue' | 'prepare_pickup'
      };
    }
    
    return undefined;
  }, [isFromNotification, searchParams]);
  
  const laybyeAction = useMemo(() => {
    if (!isFromNotification) return undefined;
    
    const laybyeId = searchParams.get('laybye');
    const action = searchParams.get('action');
    
    if (action && ['collect_overdue', 'collect_payment', 'follow_up_quiet'].includes(action)) {
      return {
        laybyeId: laybyeId || undefined,
        action: action as 'collect_overdue' | 'collect_payment' | 'follow_up_quiet'
      };
    }
    
    return undefined;
  }, [isFromNotification, searchParams]);
  
  // Clear context from URL
  const clearContext = () => {
    clearNotificationContextFromUrl();
    setAcknowledged(true);
  };
  
  // Acknowledge context (mark as handled)
  const acknowledge = () => {
    setAcknowledged(true);
  };
  
  // Auto-clear context after timeout to prevent stale state
  useEffect(() => {
    if (!isFromNotification) return;
    
    const timeout = setTimeout(() => {
      console.log('[notifications] Auto-clearing notification context after 5 minutes');
      clearContext();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearTimeout(timeout);
  }, [isFromNotification]);
  
  return {
    isFromNotification,
    context,
    productAlert,
    creditChase,
    orderAction,
    laybyeAction,
    clearContext,
    acknowledge
  };
}

/**
 * Hook for highlighting items based on notification context
 */
export function useNotificationHighlight(itemId: string, type: 'product' | 'customer' | 'order' | 'laybye') {
  const { isFromNotification, productAlert, orderAction, laybyeAction } = useNotificationContext();
  
  const isHighlighted = useMemo(() => {
    if (!isFromNotification) return false;
    
    switch (type) {
      case 'product':
        return productAlert?.productId === itemId;
      
      case 'order':
        return Boolean(orderAction); // Order pages show single order
      
      case 'laybye':
        return laybyeAction?.laybyeId === itemId;
      
      case 'customer':
        // Customer highlighting is more complex, handled per-component
        return false;
      
      default:
        return false;
    }
  }, [isFromNotification, itemId, type, productAlert, orderAction, laybyeAction]);
  
  return isHighlighted;
}

/**
 * Hook for showing notification-context action buttons
 */
export function useNotificationActions() {
  const context = useNotificationContext();
  
  const actions = useMemo(() => {
    if (!context.isFromNotification) return [];
    
    const actions: Array<{
      type: string;
      label: string;
      variant: 'primary' | 'secondary';
      action: string;
    }> = [];
    
    if (context.productAlert) {
      actions.push({
        type: 'restock',
        label: context.productAlert.action === 'restock_urgent' ? 'Restock Now' : 'Plan Restock',
        variant: context.productAlert.action === 'restock_urgent' ? 'primary' : 'secondary',
        action: context.productAlert.action
      });
    }
    
    if (context.creditChase) {
      actions.push({
        type: 'chase',
        label: context.creditChase.action === 'chase_overdue' ? 'Chase Payment' : 'Send Reminder',
        variant: context.creditChase.action === 'chase_overdue' ? 'primary' : 'secondary',
        action: context.creditChase.action
      });
    }
    
    if (context.orderAction) {
      actions.push({
        type: 'order',
        label: context.orderAction.action === 'complete_overdue' ? 'Complete Order' : 'Prepare Pickup',
        variant: context.orderAction.action === 'complete_overdue' ? 'primary' : 'secondary',
        action: context.orderAction.action
      });
    }
    
    if (context.laybyeAction) {
      actions.push({
        type: 'laybye',
        label: context.laybyeAction.action === 'collect_overdue' ? 'Collect Payment' : 
               context.laybyeAction.action === 'follow_up_quiet' ? 'Follow Up' : 'Collect Payment',
        variant: context.laybyeAction.action === 'collect_overdue' ? 'primary' : 'secondary',
        action: context.laybyeAction.action
      });
    }
    
    return actions;
  }, [context]);
  
  return {
    actions,
    hasActions: actions.length > 0,
    clearContext: context.clearContext,
    acknowledge: context.acknowledge
  };
}