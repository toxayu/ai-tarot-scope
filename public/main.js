function getReading() {
  const question = document.getElementById('question').value;
  const container = document.getElementById('results');
  container.innerHTML = '';

  const cardsDiv = document.createElement('div');
  cardsDiv.className = 'cards';
  container.appendChild(cardsDiv);

  const interpretationsDiv = document.createElement('div');
  interpretationsDiv.className = 'interpretations';
  container.appendChild(interpretationsDiv);

  const es = new EventSource(`/reading?question=${encodeURIComponent(question)}`);

  es.addEventListener('cards', e => {
    const cards = JSON.parse(e.data);
    cardsDiv.innerHTML = '<h2>Cards</h2>' + cards.map(c => `
      <div class="card">
        <img src="https://placehold.co/200x300?text=${encodeURIComponent(c.name)}" alt="${c.name}">
        <p><strong>${c.name}</strong>: ${c.meaning}</p>
      </div>`).join('');
  });

  es.addEventListener('interpretation', e => {
    const {model, text, done} = JSON.parse(e.data);
    let wrap = interpretationsDiv.querySelector(`.interpretation[data-model="${model}"]`);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'interpretation';
      wrap.setAttribute('data-model', model);
      wrap.innerHTML = `<h3>${model}</h3><p class="text"></p>`;
      interpretationsDiv.appendChild(wrap);
    }
    const p = wrap.querySelector('p.text');
    if (text) p.textContent += text;
    if (done && !wrap.querySelector('.rating')) {
      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'rating';
      ratingDiv.innerHTML = 'Rate: ' + ['good','bad']
        .map(label => `<button class="rating-btn ${label}" data-model="${model}" data-rating="${label}">${label.charAt(0).toUpperCase() + label.slice(1)}</button>`)
        .join(' ');
      wrap.appendChild(ratingDiv);
      wrap.querySelectorAll('button[data-model]').forEach(btn => {
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
  });

  es.addEventListener('end', () => {
    es.close();
  });
}

document.getElementById('read').addEventListener('click', getReading);
