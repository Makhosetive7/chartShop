import { describe, expect, it } from 'vitest';
import { getChatActivityPath } from './chatActivityLinks';
import type { ChatBubble } from '@/api/chat';

function activity(partial: Partial<ChatBubble>): ChatBubble {
  return {
    role: 'assistant',
    text: 'Sale to Jane $2.00',
    type: 'activity',
    ...partial,
  };
}

describe('getChatActivityPath', () => {
  it('returns null for non-activity bubbles', () => {
    expect(
      getChatActivityPath({ role: 'user', text: 'help' }),
    ).toBeNull();
  });

  it('routes sales to /app/sales with sale and customer ids', () => {
    expect(
      getChatActivityPath(
        activity({
          action: 'sale.to_customer',
          entityType: 'sale',
          entityId: 'sale1',
          customerId: 'cust1',
        }),
      ),
    ).toBe('/app/sales?sale=sale1&customer=cust1');
  });

  it('routes credit sales to /app/sales', () => {
    expect(
      getChatActivityPath(
        activity({
          action: 'sale.credit',
          entityType: 'sale',
          entityId: 's2',
        }),
      ),
    ).toBe('/app/sales?sale=s2');
  });

  it('routes customers to /app/customers', () => {
    expect(
      getChatActivityPath(
        activity({
          action: 'customer.create',
          entityType: 'customer',
          entityId: 'c1',
        }),
      ),
    ).toBe('/app/customers?customer=c1');
  });

  it('routes products, orders, expenses, laybyes', () => {
    expect(
      getChatActivityPath(
        activity({ action: 'product.stock', entityType: 'product', entityId: 'p1' }),
      ),
    ).toBe('/app/products?product=p1');
    expect(
      getChatActivityPath(
        activity({ action: 'order.create', entityType: 'order', entityId: 'o1' }),
      ),
    ).toBe('/app/orders?order=o1');
    expect(
      getChatActivityPath(
        activity({ action: 'expense.recorded', entityType: 'expense' }),
      ),
    ).toBe('/app/expenses');
    expect(
      getChatActivityPath(
        activity({ action: 'laybye.created', entityType: 'laybye', entityId: 'l1' }),
      ),
    ).toBe('/app/laybyes?laybye=l1');
  });

  it('falls back to activity for unknown actions', () => {
    expect(
      getChatActivityPath(activity({ action: 'settings.update' })),
    ).toBe('/app/activity');
  });
});
