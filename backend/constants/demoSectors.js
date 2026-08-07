/**
 * Catalog of shared read-only demo shops (try-before-register).
 * Keep in sync with frontend DemoSectorPicker copy where possible.
 */
export const DEMO_SECTORS = [
  {
    id: "groceries",
    label: "Groceries & spaza",
    blurb: "Fast movers, airtime, and daily cash — busy till energy.",
    username: "groceries_demo",
    businessName: "Corner Fresh",
    businessDescription:
      "Neighbourhood spaza — groceries, drinks, airtime, and household basics.",
    pin: "4829",
    lowStockAlert: 12,
    salesPerWeek: [5, 8],
    years: 1,
    catalog: [
      { name: "Bread loaf", price: 1.5, costPrice: 0.9, stock: 80 },
      { name: "2L Cooking oil", price: 4.5, costPrice: 3.2, stock: 40 },
      { name: "Sugar 2kg", price: 2.8, costPrice: 2.0, stock: 50 },
      { name: "Maize meal 5kg", price: 6.5, costPrice: 4.8, stock: 35 },
      { name: "Soap bar", price: 0.8, costPrice: 0.4, stock: 100 },
      { name: "Airtime $2", price: 2.0, costPrice: 1.85, stock: 200 },
      { name: "Coca-Cola 500ml", price: 1.2, costPrice: 0.7, stock: 90 },
      { name: "Eggs (tray)", price: 5.5, costPrice: 4.0, stock: 25 },
      { name: "Rice 2kg", price: 3.5, costPrice: 2.4, stock: 40 },
      { name: "Matches box", price: 0.5, costPrice: 0.25, stock: 120 },
    ],
    expenses: [
      "Restock transport",
      "Fridge electricity",
      "Plastic bags",
      "Shop rent share",
    ],
  },
  {
    id: "clothing",
    label: "Clothing boutique",
    blurb: "Dresses, separates, and accessories — fashion floor feel.",
    username: "boutique_demo",
    businessName: "Luna Atelier",
    businessDescription:
      "Women's clothing boutique — dresses, separates, and accessories.",
    pin: "4829",
    lowStockAlert: 8,
    salesPerWeek: [3, 4],
    years: 2,
    catalog: [
      { name: "Floral Midi Dress", price: 45, costPrice: 22, stock: 40 },
      { name: "Linen Blouse", price: 28, costPrice: 12, stock: 55 },
      { name: "Wide-Leg Trousers", price: 38, costPrice: 18, stock: 35 },
      { name: "Denim Jacket", price: 52, costPrice: 26, stock: 25 },
      { name: "Pleated Skirt", price: 32, costPrice: 14, stock: 40 },
      { name: "Knit Cardigan", price: 36, costPrice: 16, stock: 30 },
      { name: "Silk Scarf", price: 18, costPrice: 7, stock: 60 },
      { name: "Crossbody Bag", price: 55, costPrice: 28, stock: 20 },
      { name: "Block Heels", price: 48, costPrice: 24, stock: 22 },
      { name: "Statement Earrings", price: 15, costPrice: 5, stock: 80 },
      { name: "Wrap Top", price: 26, costPrice: 11, stock: 45 },
      { name: "High-Waist Jeans", price: 42, costPrice: 20, stock: 38 },
    ],
    expenses: [
      "Packaging & tissue",
      "Market table rental",
      "Transport to market",
      "Social media boost",
    ],
  },
  {
    id: "jewellery",
    label: "Jewellery",
    blurb: "High-ticket pieces, careful stock, and credit-friendly clients.",
    username: "jewellery_demo",
    businessName: "Aura Gems",
    businessDescription:
      "Fine and fashion jewellery — gold-plated pieces, stones, and gifts.",
    pin: "4829",
    lowStockAlert: 4,
    salesPerWeek: [2, 3],
    years: 1,
    catalog: [
      { name: "Gold hoop earrings", price: 85, costPrice: 38, stock: 18 },
      { name: "Pearl studs", price: 42, costPrice: 18, stock: 25 },
      { name: "Layered necklace", price: 120, costPrice: 55, stock: 12 },
      { name: "Tennis bracelet", price: 210, costPrice: 95, stock: 8 },
      { name: "Signet ring", price: 95, costPrice: 40, stock: 14 },
      { name: "Anklet chain", price: 35, costPrice: 14, stock: 30 },
      { name: "Gemstone pendant", price: 150, costPrice: 70, stock: 10 },
      { name: "Cufflinks set", price: 68, costPrice: 28, stock: 16 },
    ],
    expenses: [
      "Display cases polish",
      "Insurance share",
      "Gift boxes",
      "Security seal tags",
    ],
  },
  {
    id: "hardware",
    label: "Hardware & building",
    blurb: "Bulk units, tools, and contractor-friendly sales.",
    username: "hardware_demo",
    businessName: "BuildRight Yard",
    businessDescription:
      "Hardware and building supplies — cement, tools, paint, and fittings.",
    pin: "4829",
    lowStockAlert: 10,
    salesPerWeek: [4, 6],
    years: 1,
    catalog: [
      { name: "Cement 50kg", price: 12, costPrice: 9.5, stock: 60 },
      { name: "Paint 5L white", price: 28, costPrice: 18, stock: 30 },
      { name: "Hammer", price: 15, costPrice: 8, stock: 40 },
      { name: "Nails 1kg", price: 4, costPrice: 2.2, stock: 80 },
      { name: "PVC pipe 3m", price: 7, costPrice: 4, stock: 50 },
      { name: "Screwdriver set", price: 22, costPrice: 11, stock: 25 },
      { name: "Padlock", price: 9, costPrice: 4.5, stock: 45 },
      { name: "Tape measure", price: 6, costPrice: 2.8, stock: 55 },
      { name: "Wall plug pack", price: 3.5, costPrice: 1.5, stock: 100 },
      { name: "Brush roller", price: 8, costPrice: 3.5, stock: 40 },
    ],
    expenses: [
      "Yard delivery fuel",
      "Forklift battery",
      "Pallet wrap",
      "Supplier COD fee",
    ],
  },
  {
    id: "salon",
    label: "Salon & beauty",
    blurb: "Services and retail products — appointments and walk-ins.",
    username: "salon_demo",
    businessName: "Glow Studio",
    businessDescription:
      "Hair and beauty salon — cuts, colour, nails, and take-home products.",
    pin: "4829",
    lowStockAlert: 6,
    salesPerWeek: [4, 7],
    years: 1,
    catalog: [
      { name: "Wash & set", price: 18, costPrice: 4, stock: 999 },
      { name: "Haircut", price: 25, costPrice: 5, stock: 999 },
      { name: "Colour treatment", price: 55, costPrice: 18, stock: 999 },
      { name: "Gel nails", price: 30, costPrice: 8, stock: 999 },
      { name: "Braiding session", price: 40, costPrice: 10, stock: 999 },
      { name: "Shampoo bottle", price: 12, costPrice: 6, stock: 35 },
      { name: "Hair oil 100ml", price: 9, costPrice: 4, stock: 40 },
      { name: "Edge control", price: 7, costPrice: 3, stock: 50 },
    ],
    expenses: [
      "Product restock",
      "Towel laundry",
      "Chair rental",
      "Water & power",
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy & wellness",
    blurb: "OTC meds, toiletries, and careful stock counts.",
    username: "pharmacy_demo",
    businessName: "WellPath Chemist",
    businessDescription:
      "Community pharmacy — OTC medicines, vitamins, and personal care.",
    pin: "4829",
    lowStockAlert: 15,
    salesPerWeek: [5, 8],
    years: 1,
    catalog: [
      { name: "Paracetamol pack", price: 2.5, costPrice: 1.2, stock: 120 },
      { name: "Cough syrup", price: 6, costPrice: 3.2, stock: 45 },
      { name: "Vitamin C", price: 8, costPrice: 4, stock: 60 },
      { name: "Bandage roll", price: 1.8, costPrice: 0.7, stock: 80 },
      { name: "Antiseptic 100ml", price: 4.5, costPrice: 2.2, stock: 50 },
      { name: "Toothpaste", price: 3, costPrice: 1.5, stock: 70 },
      { name: "Sanitary pads", price: 3.5, costPrice: 1.8, stock: 65 },
      { name: "Allergy tablets", price: 5.5, costPrice: 2.8, stock: 40 },
      { name: "Thermometer", price: 12, costPrice: 6, stock: 20 },
      { name: "Hand sanitiser", price: 2.2, costPrice: 1.0, stock: 90 },
    ],
    expenses: [
      "Cold-chain delivery",
      "Shelf labels",
      "Licensing share",
      "Counter bags",
    ],
  },
];

export const DEMO_SECTOR_IDS = DEMO_SECTORS.map((s) => s.id);

export function getDemoSector(id) {
  return DEMO_SECTORS.find((s) => s.id === id) || null;
}

export function publicDemoSector(sector, shop, adminUser = null) {
  return {
    id: sector.id,
    label: sector.label,
    blurb: sector.blurb,
    businessName: shop?.businessName || sector.businessName,
    username: adminUser?.username || sector.username,
    available: Boolean(shop),
  };
}
