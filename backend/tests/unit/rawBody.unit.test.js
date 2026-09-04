import { strict as assert } from 'assert';
import { test } from 'node:test';
import { captureRawBody } from '../../middleware/rawBody.js';

test('should capture raw body and parse JSON for webhook paths', (t, done) => {
      const middleware = captureRawBody();
      
      // Mock request
      const testBody = JSON.stringify({ hello: 'world', number: 42 });
      const req = {
        path: '/webhook/whatsapp',
        get: (header) => header === 'content-type' ? 'application/json' : null,
        on: function(event, callback) {
          if (event === 'data') {
            // Simulate data chunks
            callback(Buffer.from(testBody));
          } else if (event === 'end') {
            callback();
          }
        }
      };
      
      const res = {};
      const next = (error) => {
        if (error) {
          done(error);
          return;
        }
        
        try {
          // Verify raw body was captured
          assert(req.rawBody instanceof Buffer, 'rawBody should be a Buffer');
          assert.strictEqual(req.rawBody.toString(), testBody, 'rawBody content should match');
          
          // Verify JSON was parsed to req.body
          assert(req.body, 'req.body should be set');
          assert.strictEqual(req.body.hello, 'world', 'parsed JSON should be correct');
          assert.strictEqual(req.body.number, 42, 'parsed numbers should be correct');
          
          done();
        } catch (assertError) {
          done(assertError);
        }
      };
      
      middleware(req, res, next);
    });

test('should skip processing for non-webhook paths', (t, done) => {
      const middleware = captureRawBody();
      
      const req = {
        path: '/api/orders',
        get: () => null
      };
      
      const res = {};
      const next = (error) => {
        if (error) {
          done(error);
          return;
        }
        
        try {
          // Should not have processed the body
          assert.strictEqual(req.rawBody, undefined, 'rawBody should not be set for non-webhook paths');
          done();
        } catch (assertError) {
          done(assertError);
        }
      };
      
      middleware(req, res, next);
    });

test('should handle malformed JSON gracefully', (t, done) => {
      const middleware = captureRawBody();
      
      const invalidJson = '{"hello": world}'; // Missing quotes
      const req = {
        path: '/webhook/whatsapp',
        get: (header) => header === 'content-type' ? 'application/json' : null,
        on: function(event, callback) {
          if (event === 'data') {
            callback(Buffer.from(invalidJson));
          } else if (event === 'end') {
            callback();
          }
        }
      };
      
      const res = {};
      const next = (error) => {
        if (error) {
          done(error);
          return;
        }
        
        try {
          // Raw body should still be captured
          assert(req.rawBody instanceof Buffer, 'rawBody should be captured even for invalid JSON');
          assert.strictEqual(req.rawBody.toString(), invalidJson, 'rawBody content should match');
          
          // req.body should be undefined due to parse failure
          assert.strictEqual(req.body, undefined, 'req.body should be undefined for malformed JSON');
          
          done();
        } catch (assertError) {
          done(assertError);
        }
      };
      
      middleware(req, res, next);
    });