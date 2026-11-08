const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildGroupBalances,
    getSettlementLimit,
} = require('../src/services/groupBalances');

test('group balances account for expenses, shares, and prior settlements in paise', () => {
    const balances = buildGroupBalances(
        ['alex@example.com', 'blair@example.com', 'casey@example.com'],
        [
            {
                paidBy: 'Alex@Example.com',
                amount: 120.01,
                shares: [
                    { email: 'alex@example.com', amount: 40 },
                    { email: 'blair@example.com', amount: 40 },
                    { email: 'casey@example.com', amount: 40.01 },
                ],
            },
        ],
        [
            {
                fromEmail: 'blair@example.com',
                toEmail: 'alex@example.com',
                amount: 10,
            },
        ]
    );

    assert.deepEqual([...balances], [
        ['alex@example.com', 7001],
        ['blair@example.com', -3000],
        ['casey@example.com', -4001],
    ]);
});

test('settlement capacity is limited by both the payer debt and recipient credit', () => {
    const balances = new Map([
        ['payer@example.com', -3250],
        ['recipient@example.com', 2100],
        ['settled@example.com', 0],
    ]);

    assert.equal(
        getSettlementLimit(balances, 'payer@example.com', 'recipient@example.com'),
        2100
    );
    assert.equal(
        getSettlementLimit(balances, 'payer@example.com', 'settled@example.com'),
        0
    );
});
