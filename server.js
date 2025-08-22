const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const {deck, drawCards} = require('./tarot');

const models = ['anthropic/claude-sonnet-4', 'openai/chatgpt-4o-latest'];
const ratings = {};

async function getInterpretation(model, question, cards, onChunk) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    onChunk(
      `Missing OPENROUTER_API_KEY. Would ask ${model} about ${cards
        .map(c => c.name)
        .join(', ')}`
    );
    return;
  }
  const messages = [
    {role: 'system', content: 'You are a tarot expert.'},
    {
      role: 'user',
      content: `Question: ${question}. Cards: ${cards
        .map(c => `${c.name} (${c.meaning})`)
        .join(', ')}`
    }
  ];
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({model, messages, stream: true})
  });

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream: true});
      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch (_) {
            // ignore malformed JSON
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }
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
    await Promise.all(
      models.map(async model => {
        await getInterpretation(model, question, cards, chunk => {
          res.write(
            `event: interpretation\ndata: ${JSON.stringify({model, text: chunk})}\n\n`
          );
        });
        res.write(
          `event: interpretation\ndata: ${JSON.stringify({model, done: true})}\n\n`
        );
      })
    );
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
