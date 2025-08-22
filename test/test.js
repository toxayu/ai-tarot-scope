const assert = require('assert');
const {deck, drawCards} = require('../tarot');

// Deck should contain 22 major arcana cards
assert.strictEqual(deck.length, 22, 'Deck should have 22 cards');

// drawCards should return unique cards
const drawn = drawCards(3);
assert.strictEqual(drawn.length, 3, 'Should draw three cards');
const names = new Set(drawn.map(c => c.name));
assert.strictEqual(names.size, 3, 'Cards should be unique');

console.log('All tests passed');
