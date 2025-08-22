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
  cardsDiv.innerHTML = '<h2>Cards</h2>' + data.cards.map(c => `<p><strong>${c.name}</strong>: ${c.meaning}</p>`).join('');
  container.appendChild(cardsDiv);
  const interpretationsDiv = document.createElement('div');
  interpretationsDiv.innerHTML = '<h2>Interpretations</h2>';
  for (const model in data.interpretations) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h3>${model}</h3><p>${data.interpretations[model]}</p>`;
    const ratingDiv = document.createElement('div');
    ratingDiv.innerHTML = 'Rate: ' + [1,2,3,4,5].map(n => `<button data-model="${model}" data-rating="${n}">${n}</button>`).join(' ');
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
      alert(`${model} average rating: ${result.average.toFixed(2)}`);
    });
  });
}

document.getElementById('read').addEventListener('click', getReading);
