import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  connectTestDb,
  disconnectTestDb,
  wipeShopData,
} from "./helpers/mongo.js";
import {
  createTestShop,
  createTestProduct,
  createTestCustomer,
} from "./helpers/fixtures.js";
import InventoryService from "../services/InventoryService.js";
import CancellationService from "../services/CancellationService.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";

describe("credit sale + cancel restores balance", () => {
  let shop;
  let username;
  let product;
  let customer;

  before(async () => {
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    const created = await createTestShop();
    shop = created.shop;
    username = created.username;
    product = await createTestProduct(shop._id, {
      name: "p4credit",
      price: 2.5,
      stock: 10,
    });
    customer = await createTestCustomer(shop._id, {
      name: "Credit Cust",
      currentBalance: 0,
    });
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("restores stock and customer balance when credit sale is cancelled", async () => {
    const qty = 2;
    const total = qty * product.price;

    const stockResult = await InventoryService.deductSaleItems([
      { product, quantity: qty },
    ]);
    assert.equal(stockResult.success, true);

    const sale = await Sale.create({
      shopId: shop._id,
      type: "credit",
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [
        {
          productId: product._id,
          productName: product.name,
          quantity: qty,
          price: product.price,
          total,
        },
      ],
      total,
      amountPaid: 0,
      balanceDue: total,
      status: "completed",
    });

    customer.currentBalance += total;
    customer.creditTransactions.push({
      type: "credit",
      amount: total,
      description: "Credit sale test",
      date: new Date(),
      balanceBefore: 0,
      balanceAfter: total,
      items: [
        {
          productName: product.name,
          quantity: qty,
          price: product.price,
          total,
        },
      ],
    });
    await customer.save();

    let freshProduct = await Product.findById(product._id);
    let freshCustomer = await Customer.findById(customer._id);
    assert.equal(freshProduct.stock, 8);
    assert.equal(freshCustomer.currentBalance, 5);

    const cancel = await CancellationService.cancelLastSale(
      shop._id,
      "phase4 credit reverse"
    );
    assert.equal(cancel.success, true, cancel.message);

    freshProduct = await Product.findById(product._id);
    freshCustomer = await Customer.findById(customer._id);
    const freshSale = await Sale.findById(sale._id);

    assert.equal(freshProduct.stock, 10);
    assert.equal(freshCustomer.currentBalance, 0);
    assert.equal(freshSale.isCancelled, true);
  });
});
