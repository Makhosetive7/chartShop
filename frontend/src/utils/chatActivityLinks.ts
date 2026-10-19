import type { ChatBubble } from '@/api/chat';

/**
 * Map a Chat activity bubble to an in-app route.
 * Prefer entityType/entityId; fall back to action prefix.
 */
export function getChatActivityPath(msg: ChatBubble): string | null {
  if (msg.type !== 'activity') return null;

  const action = String(msg.action || '');
  const entityType = String(msg.entityType || '').toLowerCase();
  const entityId = msg.entityId ? String(msg.entityId) : '';
  const customerId =
    msg.customerId != null && String(msg.customerId).trim()
      ? String(msg.customerId)
      : '';

  if (entityType === 'sale' || action.startsWith('sale.')) {
    const params = new URLSearchParams();
    if (entityId) params.set('sale', entityId);
    if (customerId) params.set('customer', customerId);
    const qs = params.toString();
    return qs ? `/app/sales?${qs}` : '/app/sales';
  }

  if (entityType === 'customer' || action.startsWith('customer.')) {
    const params = new URLSearchParams();
    const id = entityId || customerId;
    if (id) params.set('customer', id);
    const qs = params.toString();
    return qs ? `/app/customers?${qs}` : '/app/customers';
  }

  if (entityType === 'product' || action.startsWith('product.')) {
    const params = new URLSearchParams();
    if (entityId) params.set('product', entityId);
    const qs = params.toString();
    return qs ? `/app/products?${qs}` : '/app/products';
  }

  if (entityType === 'order' || action.startsWith('order.')) {
    const params = new URLSearchParams();
    if (entityId) params.set('order', entityId);
    const qs = params.toString();
    return qs ? `/app/orders?${qs}` : '/app/orders';
  }

  if (entityType === 'expense' || action.startsWith('expense.')) {
    return '/app/expenses';
  }

  if (entityType === 'laybye' || action.startsWith('laybye.')) {
    const params = new URLSearchParams();
    if (entityId) params.set('laybye', entityId);
    if (customerId) params.set('customer', customerId);
    const qs = params.toString();
    return qs ? `/app/laybyes?${qs}` : '/app/laybyes';
  }

  return '/app/activity';
}
