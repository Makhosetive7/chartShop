/**
 * Transaction Utilities Unit Tests
 * 
 * Tests the transaction utilities without requiring MongoDB.
 * Focuses on the logic flow and error handling patterns.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

// We'll mock mongoose for testing
const mockMongoose = {
  startSession: mock.fn(),
};

// Create a test version of our utilities with mocked mongoose
function createTransactionUtilsWithMock(mongoose) {
  return {
    async withOptionalTransaction(work) {
      let session = null;
      
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        
        const result = await work(session);
        await session.commitTransaction();
        return result;
        
      } catch (error) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch (_) {
            // Ignore abort errors
          }
        }

        // Check if this is a "standalone MongoDB" error
        const needsFallback = /replica set|transactions? (are|is) not supported|Transaction numbers/i.test(
          error.message || ""
        );

        if (needsFallback) {
          console.warn('MongoDB transactions not supported, falling back to sequential writes');
          return await work(null);
        }

        throw error;
        
      } finally {
        if (session) {
          session.endSession();
        }
      }
    },

    async withRetry(work, options = {}) {
      const { maxRetries = 3, delayMs = 100, backoff = 2 } = options;
      
      let lastError;
      let delay = delayMs;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await work();
        } catch (error) {
          lastError = error;
          
          // Don't retry on final attempt
          if (attempt === maxRetries) {
            break;
          }
          
          // Don't retry certain types of errors
          if (error.name === 'ValidationError' || error.code === 11000) {
            throw error;
          }
          
          // Wait before retry
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= backoff;
          }
        }
      }
      
      throw lastError;
    }
  };
}

describe('Transaction Utilities Unit Tests', () => {

  describe('withOptionalTransaction', () => {

    it('should successfully run work with transaction when session is available', async () => {
      // Mock successful session
      const mockSession = {
        startTransaction: mock.fn(),
        commitTransaction: mock.fn(),
        abortTransaction: mock.fn(),
        endSession: mock.fn()
      };

      mockMongoose.startSession.mock.mockImplementation(async () => mockSession);

      const utils = createTransactionUtilsWithMock(mockMongoose);

      let receivedSession = null;
      const result = await utils.withOptionalTransaction(async (session) => {
        receivedSession = session;
        return 'success';
      });

      assert.strictEqual(result, 'success');
      assert.strictEqual(receivedSession, mockSession);
      assert.strictEqual(mockSession.startTransaction.mock.callCount(), 1);
      assert.strictEqual(mockSession.commitTransaction.mock.callCount(), 1);
      assert.strictEqual(mockSession.endSession.mock.callCount(), 1);
    });

    it('should fallback to no-session when replica set is not supported', async () => {
      const mockSession = {
        startTransaction: mock.fn(),
        commitTransaction: mock.fn(),
        abortTransaction: mock.fn(),
        endSession: mock.fn()
      };

      mockMongoose.startSession.mock.mockImplementation(async () => mockSession);

      // Mock startTransaction to throw replica set error
      mockSession.startTransaction.mock.mockImplementation(() => {
        throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
      });

      const utils = createTransactionUtilsWithMock(mockMongoose);

      let sessionAttempts = [];
      const result = await utils.withOptionalTransaction(async (session) => {
        sessionAttempts.push(session);
        return 'fallback-success';
      });

      assert.strictEqual(result, 'fallback-success');
      assert.strictEqual(sessionAttempts.length, 1); // Only fallback call with null session
      assert.strictEqual(sessionAttempts[0], null); // Fallback with null session
      assert.strictEqual(mockSession.abortTransaction.mock.callCount(), 1);
      assert.strictEqual(mockSession.endSession.mock.callCount(), 1);
    });

    it('should abort transaction and rethrow non-fallback errors', async () => {
      const mockSession = {
        startTransaction: mock.fn(),
        commitTransaction: mock.fn(),
        abortTransaction: mock.fn(),
        endSession: mock.fn()
      };

      mockMongoose.startSession.mock.mockImplementation(async () => mockSession);

      const utils = createTransactionUtilsWithMock(mockMongoose);

      const customError = new Error('Custom business logic error');

      await assert.rejects(
        async () => {
          await utils.withOptionalTransaction(async (session) => {
            throw customError;
          });
        },
        { message: 'Custom business logic error' }
      );

      assert.strictEqual(mockSession.startTransaction.mock.callCount(), 1);
      assert.strictEqual(mockSession.abortTransaction.mock.callCount(), 1);
      assert.strictEqual(mockSession.endSession.mock.callCount(), 1);
      assert.strictEqual(mockSession.commitTransaction.mock.callCount(), 0);
    });

  });

  describe('withRetry', () => {

    it('should succeed on first attempt', async () => {
      const utils = createTransactionUtilsWithMock(mockMongoose);

      let attempts = 0;
      const result = await utils.withRetry(async () => {
        attempts++;
        return 'success';
      });

      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 1);
    });

    it('should retry transient failures up to maxRetries', async () => {
      const utils = createTransactionUtilsWithMock(mockMongoose);

      let attempts = 0;
      const result = await utils.withRetry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient failure');
        }
        return 'eventual-success';
      }, { maxRetries: 3, delayMs: 1 }); // Use minimal delay for test speed

      assert.strictEqual(result, 'eventual-success');
      assert.strictEqual(attempts, 3);
    });

    it('should throw final error when max retries exceeded', async () => {
      const utils = createTransactionUtilsWithMock(mockMongoose);

      let attempts = 0;
      await assert.rejects(
        async () => {
          await utils.withRetry(async () => {
            attempts++;
            throw new Error('Persistent failure');
          }, { maxRetries: 2, delayMs: 1 });
        },
        { message: 'Persistent failure' }
      );

      assert.strictEqual(attempts, 3); // Initial + 2 retries
    });

    it('should not retry validation errors', async () => {
      const utils = createTransactionUtilsWithMock(mockMongoose);

      let attempts = 0;
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      await assert.rejects(
        async () => {
          await utils.withRetry(async () => {
            attempts++;
            throw validationError;
          }, { maxRetries: 3 });
        },
        { name: 'ValidationError' }
      );

      assert.strictEqual(attempts, 1); // Should not retry
    });

    it('should not retry duplicate key errors', async () => {
      const utils = createTransactionUtilsWithMock(mockMongoose);

      let attempts = 0;
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;

      await assert.rejects(
        async () => {
          await utils.withRetry(async () => {
            attempts++;
            throw duplicateError;
          }, { maxRetries: 3 });
        },
        { code: 11000 }
      );

      assert.strictEqual(attempts, 1); // Should not retry
    });

  });

  describe('Error Pattern Recognition', () => {

    it('should correctly identify replica set errors', () => {
      const replicaSetErrors = [
        'Transaction numbers are only allowed on a replica set member or mongos',
        'transactions are not supported',
        'transaction is not supported',
        'replica set member required'
      ];

      const pattern = /replica set|transactions? (are|is) not supported|Transaction numbers/i;

      replicaSetErrors.forEach(errorMessage => {
        assert.ok(pattern.test(errorMessage), `Should match: ${errorMessage}`);
      });

      // Test non-matching errors
      const nonReplicaErrors = [
        'Validation error',
        'Network timeout',
        'Duplicate key error',
        'Custom business error'
      ];

      nonReplicaErrors.forEach(errorMessage => {
        assert.ok(!pattern.test(errorMessage), `Should not match: ${errorMessage}`);
      });
    });

  });

});

describe('Integration Patterns', () => {

  it('should demonstrate proper transaction usage pattern', async () => {
    const utils = createTransactionUtilsWithMock(mockMongoose);

    // Mock session for demonstration
    const mockSession = {
      startTransaction: mock.fn(),
      commitTransaction: mock.fn(),
      abortTransaction: mock.fn(),
      endSession: mock.fn()
    };

    mockMongoose.startSession.mock.mockImplementation(async () => mockSession);

    // Simulate a multi-step operation like order completion
    const result = await utils.withOptionalTransaction(async (session) => {
      // Step 1: Update order status
      const orderUpdate = { orderId: 'test-123', status: 'completed' };
      
      // Step 2: Deduct stock
      const stockUpdate = { productId: 'prod-456', stock: -2 };
      
      // Step 3: Create sale
      const sale = { saleId: 'sale-789', total: 50.00 };
      
      // All operations would use the session in real scenario
      return {
        order: orderUpdate,
        stock: stockUpdate,
        sale: sale
      };
    });

    assert.ok(result.order);
    assert.ok(result.stock);  
    assert.ok(result.sale);
    assert.strictEqual(mockSession.commitTransaction.mock.callCount(), 1);
  });

});