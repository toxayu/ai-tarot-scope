async function getReading() {
  const question = document.getElementById('question').value;
  const res = await fetch('/reading', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({question})
  });
  const data = await res.json();
  const container = document.getElementById('results');
  container.innerHTML = '';
  const cardsDiv = document.createElement('div');
  cardsDiv.className = 'cards';
  cardsDiv.innerHTML = '<h2>Cards</h2>' + data.cards.map(c => `<p><strong>${c.name}</strong>: ${c.meaning}</p>`).join('');
  container.appendChild(cardsDiv);

  const interpretationsDiv = document.createElement('div');
  interpretationsDiv.className = 'interpretations';
  interpretationsDiv.innerHTML = '<h2>Interpretations</h2>';

  for (const model in data.interpretations) {
    const wrap = document.createElement('div');
    wrap.className = 'interpretation';
    wrap.innerHTML = `<h3>${model}</h3><p>${data.interpretations[model]}</p>`;

    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'rating';
    ratingDiv.innerHTML = 'Rate: ' + ['good', 'bad']
      .map(label => `<button class="rating-btn ${label}" data-model="${model}" data-rating="${label}">${label.charAt(0).toUpperCase() + label.slice(1)}</button>`)
      .join(' ');
    wrap.appendChild(ratingDiv);
    interpretationsDiv.appendChild(wrap);
  }
  container.appendChild(interpretationsDiv);

  container.querySelectorAll('button[data-model]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const model = btn.getAttribute('data-model');
      const rating = btn.getAttribute('data-rating');
      const res = await fetch('/rating', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model, rating})
      });
      const result = await res.json();
      alert(`${model} positive feedback: ${(result.average * 100).toFixed(1)}% good`);
    });
  });
}

document.getElementById('read').addEventListener('click', getReading);
