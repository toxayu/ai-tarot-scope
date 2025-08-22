const http = require('http');
const fs = require('fs');
const path = require('path');
const {deck, drawCards} = require('./tarot');

const models = ['gpt-3.5-turbo', 'gpt-4o-mini'];
const ratings = {};

async function getInterpretation(model, question, cards) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `Missing OPENAI_API_KEY. Would ask ${model} about ${cards.map(c => c.name).join(', ')}`;
  }
  const messages = [
    {role: 'system', content: 'You are a tarot expert.'},
    {role: 'user', content: `Question: ${question}. Cards: ${cards.map(c => `${c.name} (${c.meaning})`).join(', ')}`}
  ];
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({model, messages})
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No interpretation available';
}

function handleReading(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const {question} = JSON.parse(body || '{}');
      const cards = drawCards();
      const interpretations = {};
      for (const model of models) {
        interpretations[model] = await getInterpretation(model, question, cards);
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({cards, interpretations}));
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: err.message}));
    }
  });
}

function handleRating(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const {model, rating} = JSON.parse(body || '{}');
      if (!ratings[model]) ratings[model] = {good: 0, bad: 0};
      if (rating === 'good') ratings[model].good += 1;
      if (rating === 'bad') ratings[model].bad += 1;
      const total = ratings[model].good + ratings[model].bad;
      const avg = total ? ratings[model].good / total : 0;
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({average: avg}));
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: err.message}));
    }
  });
}

function serveStatic(filePath, res) {
  fs.readFile(path.join(__dirname, 'public', filePath), (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      const ext = path.extname(filePath);
      const contentType = ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'text/html';
      res.writeHead(200, {'Content-Type': contentType});
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/reading') return handleReading(req, res);
  if (req.method === 'POST' && req.url === '/rating') return handleRating(req, res);
  // serve static files
  if (req.method === 'GET') {
    const filePath = req.url === '/' ? 'index.html' : req.url.slice(1);
    return serveStatic(filePath, res);
  }
  res.writeHead(404);
  res.end('Not found');
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server listening on ${port}`));
