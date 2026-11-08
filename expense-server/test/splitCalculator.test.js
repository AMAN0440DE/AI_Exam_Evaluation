const test = require('node:test');
const assert = require('node:assert/strict');
const { allocateSplit, toPaise } = require('../src/services/splitCalculator');

const members = ['a@example.com', 'b@example.com', 'c@example.com'];

test('converts money to integer paise', () => {
    assert.equal(toPaise(12.34), 1234);
    assert.equal(toPaise('0.01'), 1);
    assert.throws(() => toPaise(0), /greater than zero/);
});

test('equal split distributes remainder deterministically', () => {
    const split = allocateSplit({
        amount: 10,
        splitType: 'equal',
        participants: members.map((email) => ({ email })),
        members,
    });

    assert.deepEqual(split, [
        { email: 'a@example.com', amount: 3.34 },
        { email: 'b@example.com', amount: 3.33 },
        { email: 'c@example.com', amount: 3.33 },
    ]);
    assert.equal(
        split.reduce((sum, participant) => sum + toPaise(participant.amount), 0),
        1000
    );
});

test('custom exact shares must match total to the cent', () => {
    const split = allocateSplit({
        amount: 10.01,
        splitType: 'exact',
        participants: [
            { email: 'a@example.com', amount: 3.33 },
            { email: 'b@example.com', amount: 6.68 },
        ],
        members,
    });
    assert.equal(split.reduce((sum, share) => sum + toPaise(share.amount), 0), 1001);
    assert.throws(
        () =>
            allocateSplit({
                amount: 10,
                splitType: 'exact',
                participants: [
                    { email: 'a@example.com', amount: 4 },
                    { email: 'b@example.com', amount: 5 },
                ],
                members,
            }),
        /add up/
    );
});

test('weighted shares use largest remainder rounding without losing paise', () => {
    const split = allocateSplit({
        amount: 10.01,
        splitType: 'shares',
        participants: [
            { email: 'a@example.com', shares: 1 },
            { email: 'b@example.com', shares: 2 },
        ],
        members,
    });
    assert.deepEqual(split, [
        { email: 'a@example.com', amount: 3.34 },
        { email: 'b@example.com', amount: 6.67 },
    ]);
});

test('rejects duplicate and non-member participants', () => {
    assert.throws(
        () =>
            allocateSplit({
                amount: 1,
                splitType: 'equal',
                participants: [
                    { email: 'a@example.com' },
                    { email: 'A@example.com' },
                ],
                members,
            }),
        /unique/
    );
    assert.throws(
        () =>
            allocateSplit({
                amount: 1,
                splitType: 'equal',
                participants: [{ email: 'outsider@example.com' }],
                members,
            }),
        /members/
    );
});
