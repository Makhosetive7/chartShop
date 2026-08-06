import { useAuth } from '@/auth';
import { resolveShopTimezone } from '@/utils/dates';

/** Shop settings timezone, falling back to Africa/Harare. */
export function useShopTimezone(): string {
  const { shop } = useAuth();
  return resolveShopTimezone(shop?.settings);
}
