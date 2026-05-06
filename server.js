import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// API key check
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY niet ingesteld — AI-analyse zal falen.');
  console.warn('    Stel deze in via Railway > Variables > ANTHROPIC_API_KEY');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(compression());
app.use(express.json({ limit: '10mb' })); // foto's kunnen base64 zijn

// === API endpoint: AI-analyse ===
app.post('/api/analyze', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API_KEY_MISSING', message: 'Server is niet geconfigureerd: ANTHROPIC_API_KEY ontbreekt.' });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Geen prompt meegegeven.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    res.json({ text });
  } catch (err) {
    console.error('Anthropic API error:', err);
    const status = err.status || 500;
    if (status === 429) {
      return res.status(429).json({ error: 'RATE_LIMIT', message: 'Anthropic rate limit bereikt. Wacht even en probeer opnieuw.' });
    }
    if (status === 529 || status === 503) {
      return res.status(503).json({ error: 'OVERLOADED', message: 'Anthropic-servers tijdelijk overbelast.' });
    }
    res.status(status).json({ error: 'API_ERROR', message: err.message || 'AI-call mislukt.' });
  }
});

// === Healthcheck (handig voor Railway) ===
app.get('/api/health', (_, res) => {
  res.json({ ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY });
});

// === Static frontend ===
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback — alle non-API routes naar index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Lapento Scan running on http://localhost:${PORT}`);
  console.log(`   API key configured: ${!!process.env.ANTHROPIC_API_KEY ? '✅' : '❌ (set ANTHROPIC_API_KEY in env)'}`);
});
