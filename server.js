const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const {deck, drawCards} = require('./tarot');

const models = ['anthropic/claude-sonnet-4', 'openai/chatgpt-4o-latest'];
const ratings = {};

async function getInterpretation(model, question, cards) {
  // const apiKey = process.env.OPENAI_API_KEY;
  const apiKey = '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'
  if (!apiKey) {
    return `Missing OPENAI_API_KEY. Would ask ${model} about ${cards.map(c => c.name).join(', ')}`;
  }
  const messages = [
    {role: 'system', content: 'You are a tarot expert.'},
    {role: 'user', content: `Question: ${question}. Cards: ${cards.map(c => `${c.name} (${c.meaning})`).join(', ')}`}
  ];
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
  const {query} = url.parse(req.url, true);
  const question = query.question || '';
  const cards = drawCards();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write(`event: cards\ndata: ${JSON.stringify(cards)}\n\n`);
  (async () => {
    for (const model of models) {
      const text = await getInterpretation(model, question, cards);
      res.write(`event: interpretation\ndata: ${JSON.stringify({model, text})}\n\n`);
    }
    res.write('event: end\ndata: done\n\n');
    res.end();
  })().catch(err => {
    res.write(`event: error\ndata: ${JSON.stringify({error: err.message})}\n\n`);
    res.end();
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
  if (req.method === 'GET' && req.url.startsWith('/reading')) return handleReading(req, res);
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
