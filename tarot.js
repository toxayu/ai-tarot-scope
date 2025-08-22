const fs = require('fs');
const path = require('path');

const deck = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tarot.json'), 'utf8'));

function drawCards(count = 3) {
  const cards = [...deck];
  const selection = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * cards.length);
    selection.push(cards.splice(idx, 1)[0]);
  }
  return selection;
}

module.exports = {deck, drawCards};
