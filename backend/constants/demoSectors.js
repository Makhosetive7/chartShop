/**
 * Catalog of shared read-only demo shops (try-before-register).
 * Keep in sync with frontend DemoSectorPicker copy where possible.
 *
 * Catalog entries may be:
 * - Flat: { name, price, costPrice, stock, trackStock? } → one implicit variant + Single pack
 * - Rich: { name, trackStock?, variants: [{ label, baseUnit, price, costPrice, stock, packs? }] }
 *   Packs default to Single(1) when omitted. Multi-packs showcase crates/trays/boxes.
 */

/** S/M/L clothing size variants sharing one price/cost. */
function clothingSizes(price, costPrice, stocks) {
  return Object.entries(stocks).map(([label, stock], i) => ({
    label,
    baseUnit: "piece",
    price,
    costPrice,
    stock,
    sortOrder: i,
  }));
}

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
      {
        name: "Cooking oil",
        variants: [
          {
            label: "1L",
            baseUnit: "bottle",
            price: 2.8,
            costPrice: 2.0,
            stock: 45,
          },
          {
            label: "2L",
            baseUnit: "bottle",
            price: 4.5,
            costPrice: 3.2,
            stock: 40,
          },
        ],
      },
      {
        name: "Sugar",
        variants: [
          {
            label: "1kg",
            baseUnit: "bag",
            price: 1.6,
            costPrice: 1.1,
            stock: 55,
          },
          {
            label: "2kg",
            baseUnit: "bag",
            price: 2.8,
            costPrice: 2.0,
            stock: 50,
          },
        ],
      },
      {
        name: "Maize meal",
        variants: [
          {
            label: "2.5kg",
            baseUnit: "bag",
            price: 3.8,
            costPrice: 2.7,
            stock: 40,
          },
          {
            label: "5kg",
            baseUnit: "bag",
            price: 6.5,
            costPrice: 4.8,
            stock: 35,
          },
        ],
      },
      { name: "Soap bar", price: 0.8, costPrice: 0.4, stock: 100 },
      { name: "Airtime $2", price: 2.0, costPrice: 1.85, stock: 200 },
      {
        name: "Coca-Cola",
        variants: [
          {
            label: "500ml",
            baseUnit: "bottle",
            price: 1.2,
            costPrice: 0.7,
            stock: 120,
            packs: [
              {
                label: "Single",
                unitsPerPack: 1,
                price: 1.2,
                costPrice: 0.7,
              },
              {
                label: "Crate",
                unitsPerPack: 24,
                price: 26,
                costPrice: 16.8,
              },
            ],
          },
          {
            label: "2L",
            baseUnit: "bottle",
            price: 2.4,
            costPrice: 1.4,
            stock: 48,
            packs: [
              {
                label: "Single",
                unitsPerPack: 1,
                price: 2.4,
                costPrice: 1.4,
              },
              {
                label: "Case",
                unitsPerPack: 6,
                price: 13.5,
                costPrice: 8.4,
              },
            ],
          },
        ],
      },
      {
        name: "Eggs",
        variants: [
          {
            label: "",
            baseUnit: "egg",
            price: 0.25,
            costPrice: 0.15,
            stock: 750,
            packs: [
              {
                label: "Single",
                unitsPerPack: 1,
                price: 0.25,
                costPrice: 0.15,
              },
              {
                label: "Tray",
                unitsPerPack: 30,
                price: 5.5,
                costPrice: 4.0,
              },
            ],
          },
        ],
      },
      {
        name: "Rice",
        variants: [
          {
            label: "2kg",
            baseUnit: "bag",
            price: 3.5,
            costPrice: 2.4,
            stock: 40,
          },
          {
            label: "5kg",
            baseUnit: "bag",
            price: 7.5,
            costPrice: 5.2,
            stock: 28,
          },
        ],
      },
      { name: "Matches box", price: 0.5, costPrice: 0.25, stock: 120 },
    ],
    expenses: [
      { description: "Restock transport", category: "transport", amount: [18, 40] },
      { description: "Fridge electricity", category: "utilities", amount: [20, 45] },
      { description: "Plastic bags", category: "packaging", amount: [8, 18] },
      { description: "Shop rent share", category: "rent", amount: [80, 120] },
      { description: "Supplier stock top-up", category: "purchases", amount: [40, 90] },
      { description: "Mobile data for till", category: "internet_data", amount: [10, 20] },
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
      {
        name: "Floral Midi Dress",
        variants: clothingSizes(45, 22, { S: 14, M: 16, L: 10 }),
      },
      {
        name: "Linen Blouse",
        variants: clothingSizes(28, 12, { S: 18, M: 22, L: 15 }),
      },
      {
        name: "Wide-Leg Trousers",
        variants: clothingSizes(38, 18, { S: 10, M: 14, L: 11 }),
      },
      {
        name: "Denim Jacket",
        variants: clothingSizes(52, 26, { S: 8, M: 10, L: 7 }),
      },
      {
        name: "Pleated Skirt",
        variants: clothingSizes(32, 14, { S: 12, M: 16, L: 12 }),
      },
      {
        name: "Knit Cardigan",
        variants: clothingSizes(36, 16, { S: 9, M: 12, L: 9 }),
      },
      { name: "Silk Scarf", price: 18, costPrice: 7, stock: 60 },
      { name: "Crossbody Bag", price: 55, costPrice: 28, stock: 20 },
      {
        name: "Block Heels",
        variants: [
          {
            label: "36",
            baseUnit: "pair",
            price: 48,
            costPrice: 24,
            stock: 5,
          },
          {
            label: "37",
            baseUnit: "pair",
            price: 48,
            costPrice: 24,
            stock: 6,
          },
          {
            label: "38",
            baseUnit: "pair",
            price: 48,
            costPrice: 24,
            stock: 6,
          },
          {
            label: "39",
            baseUnit: "pair",
            price: 48,
            costPrice: 24,
            stock: 5,
          },
        ],
      },
      { name: "Statement Earrings", price: 15, costPrice: 5, stock: 80 },
      {
        name: "Wrap Top",
        variants: clothingSizes(26, 11, { S: 15, M: 18, L: 12 }),
      },
      {
        name: "High-Waist Jeans",
        variants: [
          {
            label: "28",
            baseUnit: "pair",
            price: 42,
            costPrice: 20,
            stock: 10,
          },
          {
            label: "30",
            baseUnit: "pair",
            price: 42,
            costPrice: 20,
            stock: 14,
          },
          {
            label: "32",
            baseUnit: "pair",
            price: 42,
            costPrice: 20,
            stock: 14,
          },
        ],
      },
    ],
    expenses: [
      { description: "Packaging & tissue", category: "packaging", amount: [12, 28] },
      { description: "Market table rental", category: "table_rental", amount: [25, 50] },
      { description: "Transport to market", category: "transport", amount: [15, 35] },
      { description: "Social media boost", category: "marketing", amount: [10, 30] },
      { description: "Boutique rent share", category: "rent", amount: [100, 160] },
      { description: "Garment steamer service", category: "maintenance", amount: [15, 40] },
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
      {
        name: "Signet ring",
        variants: [
          {
            label: "Size 6",
            baseUnit: "piece",
            price: 95,
            costPrice: 40,
            stock: 4,
          },
          {
            label: "Size 7",
            baseUnit: "piece",
            price: 95,
            costPrice: 40,
            stock: 5,
          },
          {
            label: "Size 8",
            baseUnit: "piece",
            price: 95,
            costPrice: 40,
            stock: 5,
          },
        ],
      },
      { name: "Anklet chain", price: 35, costPrice: 14, stock: 30 },
      { name: "Gemstone pendant", price: 150, costPrice: 70, stock: 10 },
      { name: "Cufflinks set", price: 68, costPrice: 28, stock: 16 },
    ],
    expenses: [
      { description: "Display cases polish", category: "cleaning", amount: [15, 30] },
      { description: "Insurance share", category: "insurance", amount: [40, 80] },
      { description: "Gift boxes", category: "packaging", amount: [12, 28] },
      { description: "Security seal tags", category: "security", amount: [8, 20] },
      { description: "Showroom rent share", category: "rent", amount: [90, 140] },
      { description: "Stone setting tools", category: "equipment", amount: [20, 55] },
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
      {
        name: "Cement",
        variants: [
          {
            label: "25kg",
            baseUnit: "bag",
            price: 7,
            costPrice: 5.5,
            stock: 40,
          },
          {
            label: "50kg",
            baseUnit: "bag",
            price: 12,
            costPrice: 9.5,
            stock: 60,
          },
        ],
      },
      {
        name: "Paint white",
        variants: [
          {
            label: "5L",
            baseUnit: "tin",
            price: 28,
            costPrice: 18,
            stock: 30,
          },
          {
            label: "20L",
            baseUnit: "tin",
            price: 95,
            costPrice: 68,
            stock: 12,
          },
        ],
      },
      { name: "Hammer", price: 15, costPrice: 8, stock: 40 },
      {
        name: "Nails",
        variants: [
          {
            label: "500g",
            baseUnit: "pack",
            price: 2.2,
            costPrice: 1.2,
            stock: 60,
          },
          {
            label: "1kg",
            baseUnit: "pack",
            price: 4,
            costPrice: 2.2,
            stock: 80,
          },
        ],
      },
      { name: "PVC pipe 3m", price: 7, costPrice: 4, stock: 50 },
      { name: "Screwdriver set", price: 22, costPrice: 11, stock: 25 },
      { name: "Padlock", price: 9, costPrice: 4.5, stock: 45 },
      { name: "Tape measure", price: 6, costPrice: 2.8, stock: 55 },
      {
        name: "Wall plugs",
        variants: [
          {
            label: "",
            baseUnit: "piece",
            price: 0.05,
            costPrice: 0.02,
            stock: 500,
            packs: [
              {
                label: "Single",
                unitsPerPack: 1,
                price: 0.05,
                costPrice: 0.02,
              },
              {
                label: "Box",
                unitsPerPack: 100,
                price: 3.5,
                costPrice: 1.5,
              },
            ],
          },
        ],
      },
      { name: "Brush roller", price: 8, costPrice: 3.5, stock: 40 },
    ],
    expenses: [
      { description: "Yard delivery fuel", category: "transport", amount: [25, 55] },
      { description: "Forklift battery", category: "equipment", amount: [30, 70] },
      { description: "Pallet wrap", category: "packaging", amount: [12, 25] },
      { description: "Supplier COD fee", category: "bank_fees", amount: [8, 20] },
      { description: "Yard rent share", category: "rent", amount: [110, 180] },
      { description: "Cement pallet restock", category: "purchases", amount: [80, 150] },
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
      {
        name: "Wash & set",
        price: 18,
        costPrice: 4,
        stock: 0,
        trackStock: false,
      },
      {
        name: "Haircut",
        price: 25,
        costPrice: 5,
        stock: 0,
        trackStock: false,
      },
      {
        name: "Colour treatment",
        price: 55,
        costPrice: 18,
        stock: 0,
        trackStock: false,
      },
      {
        name: "Gel nails",
        price: 30,
        costPrice: 8,
        stock: 0,
        trackStock: false,
      },
      {
        name: "Braiding session",
        price: 40,
        costPrice: 10,
        stock: 0,
        trackStock: false,
      },
      {
        name: "Shampoo",
        variants: [
          {
            label: "250ml",
            baseUnit: "bottle",
            price: 8,
            costPrice: 4,
            stock: 28,
          },
          {
            label: "500ml",
            baseUnit: "bottle",
            price: 12,
            costPrice: 6,
            stock: 35,
          },
        ],
      },
      {
        name: "Hair oil",
        variants: [
          {
            label: "50ml",
            baseUnit: "bottle",
            price: 6,
            costPrice: 2.5,
            stock: 30,
          },
          {
            label: "100ml",
            baseUnit: "bottle",
            price: 9,
            costPrice: 4,
            stock: 40,
          },
        ],
      },
      { name: "Edge control", price: 7, costPrice: 3, stock: 50 },
    ],
    expenses: [
      { description: "Product restock", category: "purchases", amount: [30, 70] },
      { description: "Towel laundry", category: "cleaning", amount: [12, 25] },
      { description: "Chair rental", category: "rent", amount: [40, 80] },
      { description: "Water & power", category: "utilities", amount: [25, 50] },
      { description: "Stylist wages", category: "salary_wages", amount: [60, 120] },
      { description: "Instagram promo", category: "marketing", amount: [10, 25] },
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
      {
        name: "Paracetamol",
        variants: [
          {
            label: "500mg",
            baseUnit: "tablet",
            price: 0.25,
            costPrice: 0.12,
            stock: 1200,
            packs: [
              {
                label: "Blister",
                unitsPerPack: 10,
                price: 2.5,
                costPrice: 1.2,
              },
              {
                label: "Box",
                unitsPerPack: 100,
                price: 22,
                costPrice: 12,
              },
            ],
          },
        ],
      },
      {
        name: "Cough syrup",
        variants: [
          {
            label: "100ml",
            baseUnit: "bottle",
            price: 6,
            costPrice: 3.2,
            stock: 45,
          },
          {
            label: "200ml",
            baseUnit: "bottle",
            price: 10,
            costPrice: 5.5,
            stock: 28,
          },
        ],
      },
      {
        name: "Vitamin C",
        variants: [
          {
            label: "30 tabs",
            baseUnit: "bottle",
            price: 8,
            costPrice: 4,
            stock: 40,
          },
          {
            label: "60 tabs",
            baseUnit: "bottle",
            price: 14,
            costPrice: 7,
            stock: 30,
          },
        ],
      },
      { name: "Bandage roll", price: 1.8, costPrice: 0.7, stock: 80 },
      { name: "Antiseptic 100ml", price: 4.5, costPrice: 2.2, stock: 50 },
      { name: "Toothpaste", price: 3, costPrice: 1.5, stock: 70 },
      { name: "Sanitary pads", price: 3.5, costPrice: 1.8, stock: 65 },
      {
        name: "Allergy tablets",
        variants: [
          {
            label: "10mg",
            baseUnit: "tablet",
            price: 0.55,
            costPrice: 0.28,
            stock: 400,
            packs: [
              {
                label: "Blister",
                unitsPerPack: 10,
                price: 5.5,
                costPrice: 2.8,
              },
            ],
          },
        ],
      },
      { name: "Thermometer", price: 12, costPrice: 6, stock: 20 },
      { name: "Hand sanitiser", price: 2.2, costPrice: 1.0, stock: 90 },
    ],
    expenses: [
      { description: "Cold-chain delivery", category: "transport", amount: [20, 45] },
      { description: "Shelf labels", category: "packaging", amount: [8, 18] },
      { description: "Licensing share", category: "licenses", amount: [30, 60] },
      { description: "Counter bags", category: "packaging", amount: [10, 22] },
      { description: "Pharmacy rent share", category: "rent", amount: [100, 160] },
      { description: "OTC stock purchase", category: "purchases", amount: [50, 110] },
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
