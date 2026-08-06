type DemoUpgradePayload = {
  action?: string;
  message?: string;
};

type Listener = (payload: DemoUpgradePayload) => void;

let listener: Listener | null = null;

export type { DemoUpgradePayload };

export function setDemoUpgradeListener(next: Listener | null) {
  listener = next;
}

export function openDemoUpgrade(payload: DemoUpgradePayload = {}) {
  listener?.(payload);
}

export function actionLabelFromRequestUrl(url?: string): string {
  const path = String(url || '').toLowerCase();
  if (path.includes('/chat')) return 'use chat commands';
  if (path.includes('/products')) return 'change products';
  if (path.includes('/laybye')) return 'manage laybyes';
  if (path.includes('/sales')) return 'record sales';
  if (path.includes('/customers')) return 'manage customers';
  if (path.includes('/orders')) return 'manage orders';
  if (path.includes('/expenses')) return 'log expenses';
  if (path.includes('/auth/profile')) return 'edit shop settings';
  return 'save changes';
}

export function isDemoReadOnlyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const response = (
    error as { response?: { status?: number; data?: { code?: string } } }
  ).response;
  return (
    response?.status === 403 && response?.data?.code === 'DEMO_READ_ONLY'
  );
}
