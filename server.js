import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY niet ingesteld — AI-analyse zal falen.');
}
if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY niet ingesteld — automatisch mailen werkt niet.');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.use(compression());
app.use(express.json({ limit: '20mb' }));

// === AI-analyse ===
app.post('/api/analyze', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API_KEY_MISSING' });
  }
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'BAD_REQUEST' });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    res.json({ text });
  } catch (err) {
    console.error('Anthropic error:', err);
    const status = err.status || 500;
    if (status === 429) return res.status(429).json({ error: 'RATE_LIMIT', message: err.message });
    if (status === 529 || status === 503) return res.status(503).json({ error: 'OVERLOADED', message: err.message });
    res.status(status).json({ error: 'API_ERROR', message: err.message });
  }
});

// === Mail-rapport automatisch versturen ===
app.post('/api/mail-report', async (req, res) => {
  if (!resend) {
    return res.status(500).json({ error: 'MAIL_NOT_CONFIGURED', message: 'RESEND_API_KEY ontbreekt op server.' });
  }
  const { html, filename, subject, body, to } = req.body || {};
  if (!html || !filename) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'html en filename zijn verplicht.' });
  }
  try {
    const wordContent = '\ufeff' + html;
    const buffer = Buffer.from(wordContent, 'utf8');
    const result = await resend.emails.send({
      from: 'Lapento Scan <onboarding@resend.dev>',
      to: to || 'thijs@lapento.nl',
      subject: subject || 'Concept-rapport Lapento Scan',
      text: body || 'Zie bijlage voor het rapport.',
      attachments: [{ filename, content: buffer.toString('base64') }],
    });
    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(500).json({ error: 'SEND_FAILED', message: result.error.message });
    }
    res.json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ error: 'SEND_FAILED', message: err.message });
  }
});

app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasResendKey: !!process.env.RESEND_API_KEY,
  });
});

const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Lapento Scan running on port ${PORT}`);
  console.log(`   Anthropic: ${!!process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
  console.log(`   Resend:    ${!!process.env.RESEND_API_KEY ? '✅' : '❌'}`);
});
