import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initDb, lookupOrCreate, closeDb } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3007;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

initDb();

const app = express();
app.use(express.json({ limit: '1mb' }));

// Authly middleware — read forward-auth headers, lookup-or-create user
app.use((req, res, next) => {
  const username = req.headers['remote-user'];
  if (!username) {
    // Static files don't need auth check — Caddy handles it.
    // But API routes will check req.user explicitly.
    req.user = null;
    return next();
  }

  const displayName = req.headers['remote-name'] || username;
  const email = req.headers['remote-email'] || '';
  req.remoteGroups = (req.headers['remote-groups'] || '').split(',').map(g => g.trim()).filter(Boolean);
  req.user = lookupOrCreate(username, displayName, email);
  next();
});

// Serve static files
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// Auth guard for API routes
function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// GET /api/me
app.get('/api/me', requireUser, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    display_name: req.user.display_name,
    email: req.user.email
  });
});

// POST /api/tts — proxy to OpenAI TTS
app.post('/api/tts', requireUser, async (req, res) => {
  const { text, model, voice } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini-tts',
        input: text,
        voice: voice || 'onyx',
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`[TTS error] user: ${req.user.username} | status: ${response.status} | ${error.error?.message}`);
      return res.status(response.status).json(error);
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error(`[TTS error] user: ${req.user.username} | ${err.message}`);
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/cleanup — proxy article cleanup to OpenAI chat completions
app.post('/api/cleanup', requireUser, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract only the article body text from the following raw page content. Return the article text exactly as written — do not summarize, rephrase, or alter the wording. Remove all of the following: navigation menus, page headers/footers, ads, cookie notices, sidebar content, related article links, subscription prompts, image captions, illustration credits, chart/graph labels and data points, diagram descriptions, source attributions for charts, "This article appeared in..." notes, and any other non-prose content. Keep only the flowing article paragraphs and their subheadings.'
          },
          { role: 'user', content: text }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`[Cleanup error] user: ${req.user.username} | status: ${response.status} | ${error.error?.message}`);
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    const cleanedText = data.choices[0].message.content.trim();
    res.json({ cleaned_text: cleanedText });
  } catch (err) {
    console.error(`[Cleanup error] user: ${req.user.username} | ${err.message}`);
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/title — proxy title generation to OpenAI chat completions
app.post('/api/title', requireUser, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates a concise descriptive title for a given article.' },
          { role: 'user', content: `Please provide a concise title (5 words or fewer) for the following article:\n\n${text}` }
        ],
        max_tokens: 10,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`[Title error] user: ${req.user.username} | status: ${response.status} | ${error.error?.message}`);
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || 'article-audio';
    title = title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'article-audio';
    title = title.toLowerCase().replace(/\s+/g, '-');
    res.json({ title });
  } catch (err) {
    console.error(`[Title error] user: ${req.user.username} | ${err.message}`);
    res.status(500).json({ error: { message: err.message } });
  }
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`article-2-audio listening on http://127.0.0.1:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  closeDb();
  server.close(() => process.exit(0));
});
