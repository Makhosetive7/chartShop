/**
 * Comprehensive E2E Tests for ChartShop Issues 1-3
 * 
 * This test suite validates the complete integration of:
 * - Issue 1: Money Model (till calculation, cash refunds)
 * - Issue 2: Reliability (transactions, idempotency, rate limiting)  
 * - Issue 3: Security (authentication, sessions, webhooks)
 */

import { strict as assert } from 'assert';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, wipeShopData } from './helpers/mongo.js';
import { createTestShop } from './helpers/fixtures.js';

// Services
import FinancialService from '../services/FinancialService.js';
import OrderService from '../services/OrderService.js';
import AuthService from '../services/AuthService.js';
import SessionSecurityService from '../services/SessionSecurityService.js';
import { withIdempotency, withOptionalTransaction } from '../utils/transactions.js';
import PDFService from '../services/PDFService.js';

// Models
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Expense from '../models/Expense.js';
import User from '../models/User.js';
import IdempotencyRecord from '../models/IdempotencyRecord.js';

let testShop, testUser, testProduct;

test('Setup: Connect to test database', async () => {
  await connectTestDb();
  console.log('✅ Connected to test database');
});

test('Setup: Create test data', async () => {
  // Create test shop with owner
  testShop = await createTestShop();
  testUser = testShop.owner;
  
  // Create a test product
  testProduct = new Product({
    shop: testShop._id,
    name: 'Test Widget',
    price: 1000, // 10.00 in cents
    stock: 50,
    category: 'electronics'
  });
  await testProduct.save();
  
  console.log('✅ Test data created');
});

test('Issue 1: Money Model - Till Calculation with Cash Refunds', async () => {
  // Create some test orders and expenses to build up till history
  
  // 1. Create a cash sale
  const cashOrder = new Order({
    shop: testShop._id,
    items: [{
      product: testProduct._id,
      quantity: 2,
      price: testProduct.price
    }],
    total: 2000, // 20.00
    paymentMethod: 'cash',
    status: 'completed'
  });
  await cashOrder.save();
  
  // Process the order through OrderService to trigger proper flows
  await OrderService.updateOrderStatus(cashOrder._id, 'completed', testShop._id);
  
  // 2. Create a cash expense
  const expense = new Expense({
    shop: testShop._id,
    amount: 500, // 5.00
    description: 'Office supplies',
    paymentMethod: 'cash',
    category: 'operational'
  });
  await expense.save();
  
  // 3. Create a cash refund
  const refundOrder = new Order({
    shop: testShop._id,
    items: [{
      product: testProduct._id,
      quantity: 1,
      price: testProduct.price
    }],
    total: 1000, // 10.00
    paymentMethod: 'cash',
    status: 'refunded'
  });
  await refundOrder.save();
  
  // 4. Get financial summary - this should use the new money model
  const summary = await FinancialService.getFinancialSummary(testShop._id, {
    period: 'daily',
    date: new Date()
  });
  
  // Verify new money model calculations
  assert(summary.cashFlow, 'Cash flow should be present');
  assert(summary.cashFlow.inflows, 'Cash inflows should be present');
  assert(summary.cashFlow.outflows, 'Cash outflows should be present');
  
  // Check that cash refunds are tracked separately (Issue 1 change)
  assert(summary.cashFlow.outflows.cashRefunds, 'Cash refunds should be tracked separately');
  assert.strictEqual(summary.cashFlow.outflows.cashRefunds.amount, 1000, 'Cash refund amount should be correct');
  
  // Verify till calculation accounts for cash refunds properly
  const expectedTillChange = 2000 - 500 - 1000; // sales - expenses - refunds
  assert.strictEqual(summary.cashFlow.netCash, expectedTillChange, 'Net cash should account for refunds');
  
  console.log('✅ Issue 1: Money model till calculation works correctly');
});

test('Issue 2: Reliability - Order Processing with Transactions and Idempotency', async () => {
  // Test that order completion is atomic and idempotent
  
  const testOrder = new Order({
    shop: testShop._id,
    items: [{
      product: testProduct._id,
      quantity: 5,
      price: testProduct.price
    }],
    total: 5000,
    paymentMethod: 'cash',
    status: 'pending'
  });
  await testOrder.save();
  
  const initialStock = testProduct.stock;
  const idempotencyKey = `order-complete-${testOrder._id}-${Date.now()}`;
  
  // First completion - should succeed
  const result1 = await withIdempotency(idempotencyKey, async () => {
    return await OrderService.updateOrderStatus(testOrder._id, 'completed', testShop._id);
  });
  
  // Verify the order was completed and stock was deducted
  const updatedOrder = await Order.findById(testOrder._id);
  const updatedProduct = await Product.findById(testProduct._id);
  
  assert.strictEqual(updatedOrder.status, 'completed', 'Order should be completed');
  assert.strictEqual(updatedProduct.stock, initialStock - 5, 'Stock should be deducted');
  
  // Second completion with same idempotency key - should be ignored
  const result2 = await withIdempotency(idempotencyKey, async () => {
    return await OrderService.updateOrderStatus(testOrder._id, 'completed', testShop._id);
  });
  
  // Verify stock wasn't double-deducted
  const finalProduct = await Product.findById(testProduct._id);
  assert.strictEqual(finalProduct.stock, initialStock - 5, 'Stock should not be double-deducted');
  
  // Verify idempotency record was created
  const idempotencyRecord = await IdempotencyRecord.findOne({ key: idempotencyKey });
  assert(idempotencyRecord, 'Idempotency record should exist');
  assert.strictEqual(idempotencyRecord.completed, true, 'Idempotency record should be marked complete');
  
  console.log('✅ Issue 2: Reliability - transactions and idempotency work correctly');
});

test('Issue 2: Reliability - PDF Generation After Money Model Changes', async () => {
  // Test that PDF generation works with the new money model field names
  
  try {
    // Generate a financial report PDF
    const reportData = await FinancialService.getFinancialSummary(testShop._id, {
      period: 'daily',
      date: new Date()
    });
    
    // This should not crash due to field reference issues
    const pdfBuffer = await PDFService.generateFinancialReport(testShop._id, reportData, {
      period: 'daily',
      date: new Date()
    });
    
    assert(pdfBuffer instanceof Buffer, 'PDF should be generated as Buffer');
    assert(pdfBuffer.length > 0, 'PDF should have content');
    
    console.log('✅ Issue 2: PDF generation works with new money model');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
});

test('Issue 3: Security - Authentication and Session Management', async () => {
  // Test authentication flow and session security features
  
  const testCredentials = {
    username: 'testuser',
    pin: '123456'
  };
  
  // 1. Test user registration/setup
  await AuthService.setupPin(testShop._id, testUser._id, testCredentials);
  
  // 2. Test login (should create session)
  const loginResult = await AuthService.loginUser(testShop._id, testCredentials.username, testCredentials.pin);
  assert(loginResult.success, 'Login should succeed');
  assert(loginResult.token, 'Login should return token');
  
  // 3. Test session listing
  const sessions = await SessionSecurityService.listUserSessions(testShop._id, {
    userId: testUser._id
  });
  assert(sessions.sessions.length > 0, 'Should have at least one active session');
  
  // 4. Test session security summary
  const securitySummary = await SessionSecurityService.getSessionSecuritySummary(testShop._id);
  assert(securitySummary.totalSessions >= 1, 'Should have session count');
  assert(Array.isArray(securitySummary.recentSessions), 'Should have recent sessions list');
  
  // 5. Test session revocation
  const sessionToRevoke = sessions.sessions[0];
  const revokeResult = await SessionSecurityService.revokeSessions(testShop._id, [sessionToRevoke.id]);
  assert(revokeResult.revokedCount >= 1, 'Should revoke at least one session');
  
  console.log('✅ Issue 3: Authentication and session management work correctly');
});

test('Issue 3: Security - Webhook Signature Verification Setup', async () => {
  // Test that webhook components are properly configured
  
  // Import the WhatsApp adapter to test signature verification
  const { verifyWhatsAppSignature } = await import('../adapters/whatsapp.js');
  
  // Test signature verification with a known payload and secret
  const testPayload = JSON.stringify({ test: 'data' });
  const testSecret = 'test-secret-key';
  
  // Create a valid signature
  const crypto = await import('crypto');
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', testSecret).update(testPayload, 'utf8').digest('hex');
  
  // Test valid signature
  const validResult = verifyWhatsAppSignature(testPayload, expectedSignature, testSecret);
  assert.strictEqual(validResult, true, 'Valid signature should verify');
  
  // Test invalid signature
  const invalidResult = verifyWhatsAppSignature(testPayload, 'sha256=invalid', testSecret);
  assert.strictEqual(invalidResult, false, 'Invalid signature should fail');
  
  console.log('✅ Issue 3: Webhook signature verification works correctly');
});

test('Integration: Complete Order Flow with All Issues Combined', async () => {
  // Test the complete flow: auth → order → payment → reporting
  
  // 1. Setup authenticated session
  const credentials = { username: 'flowtest', pin: '654321' };
  await AuthService.setupPin(testShop._id, testUser._id, credentials);
  const authResult = await AuthService.loginUser(testShop._id, credentials.username, credentials.pin);
  assert(authResult.success, 'Authentication should work');
  
  // 2. Create and process order with idempotency
  const integrationOrder = new Order({
    shop: testShop._id,
    items: [{
      product: testProduct._id,
      quantity: 3,
      price: testProduct.price
    }],
    total: 3000,
    paymentMethod: 'cash',
    status: 'pending'
  });
  await integrationOrder.save();
  
  const flowIdempotencyKey = `integration-flow-${integrationOrder._id}`;
  
  // Process with transaction and idempotency (Issue 2)
  await withIdempotency(flowIdempotencyKey, async () => {
    return await withOptionalTransaction(async (session) => {
      return await OrderService.updateOrderStatus(integrationOrder._id, 'completed', testShop._id, session);
    });
  });
  
  // 3. Generate financial summary (Issue 1 money model)
  const flowSummary = await FinancialService.getFinancialSummary(testShop._id, {
    period: 'daily',
    date: new Date()
  });
  
  // 4. Generate PDF report (should work with fixed field references)
  const flowPDF = await PDFService.generateFinancialReport(testShop._id, flowSummary, {
    period: 'daily',
    date: new Date()
  });
  
  // 5. Check session security (Issue 3)
  const flowSessions = await SessionSecurityService.listUserSessions(testShop._id);
  
  // Verify everything worked together
  assert(flowSummary.cashFlow, 'Financial summary should be generated');
  assert(flowPDF.length > 0, 'PDF report should be generated');
  assert(flowSessions.sessions.length > 0, 'Sessions should be tracked');
  
  console.log('✅ Integration: Complete flow works with all issues combined');
});

test('Cleanup: Remove test data', async () => {
  if (testShop?._id) {
    await wipeShopData({ shopId: testShop._id });
    console.log('✅ Test data cleaned up');
  }
});

test('Cleanup: Disconnect from database', async () => {
  await disconnectTestDb();
  console.log('✅ Disconnected from test database');
});