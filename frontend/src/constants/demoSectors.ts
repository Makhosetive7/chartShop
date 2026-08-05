/**
 * Client-side demo catalog (mirrors backend/constants/demoSectors.js ids).
 * Used when the API has not been redeployed with /auth/demos yet.
 */
export const DEMO_SECTOR_FALLBACK = [
  {
    id: 'groceries',
    label: 'Groceries & spaza',
    blurb: 'Fast movers, airtime, and daily cash — busy till energy.',
    businessName: 'Corner Fresh',
    username: 'groceries_demo',
    available: true,
  },
  {
    id: 'clothing',
    label: 'Clothing boutique',
    blurb: 'Dresses, separates, and accessories — fashion floor feel.',
    businessName: 'Luna Atelier',
    username: 'boutique_demo',
    available: true,
  },
  {
    id: 'jewellery',
    label: 'Jewellery',
    blurb: 'Pieces with presence — browse, sell, and track stock.',
    businessName: 'Aura Gems',
    username: 'jewellery_demo',
    available: true,
  },
  {
    id: 'hardware',
    label: 'Hardware',
    blurb: 'Yard staples and project essentials.',
    businessName: 'BuildRight Yard',
    username: 'hardware_demo',
    available: true,
  },
  {
    id: 'salon',
    label: 'Salon & beauty',
    blurb: 'Services and products — chair-side till energy.',
    businessName: 'Glow Studio',
    username: 'salon_demo',
    available: true,
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    blurb: 'OTC and essentials with careful stock habits.',
    businessName: 'WellPath Chemist',
    username: 'pharmacy_demo',
    available: true,
  },
] as const;

/** Shared PIN for all seeded demo shops. */
export const DEMO_PIN = '4829';

export function demoUsernameForSector(sectorId?: string): string {
  const id = String(sectorId || 'clothing').toLowerCase();
  const match = DEMO_SECTOR_FALLBACK.find((s) => s.id === id);
  return match?.username || 'boutique_demo';
}

export function isKnownDemoUsername(username?: string | null): boolean {
  const u = String(username || '').toLowerCase();
  if (!u) return false;
  if (u.endsWith('_demo')) return true;
  return DEMO_SECTOR_FALLBACK.some((s) => s.username === u);
}
