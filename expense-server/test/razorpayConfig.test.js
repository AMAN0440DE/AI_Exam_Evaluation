const test = require('node:test');
const assert = require('node:assert/strict');
const { getRazorpayCredentials } = require('../src/services/razorpayConfig');

test('accepts a complete Razorpay test credential pair', () => {
    const credentials = getRazorpayCredentials({
        RAZORPAY_KEY_ID: 'rzp_test_key',
        RAZORPAY_KEY_SECRET: 'test-secret',
    });

    assert.deepEqual(credentials, {
        keyId: 'rzp_test_key',
        keySecret: 'test-secret',
    });
});

test('rejects live Razorpay keys', () => {
    assert.equal(
        getRazorpayCredentials({
            RAZORPAY_KEY_ID: 'rzp_live_key',
            RAZORPAY_KEY_SECRET: 'live-secret',
        }),
        null
    );
});

test('rejects incomplete Razorpay credentials', () => {
    assert.equal(
        getRazorpayCredentials({
            RAZORPAY_KEY_ID: 'rzp_test_key',
            RAZORPAY_KEY_SECRET: '',
        }),
        null
    );
});
