const express = require('express');
const cors = require('cors');
const z = require('zod');
const jwt = require('jsonwebtoken');
const db = require('./database');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-formify';

app.use(cors());
app.use(express.json());

// Enable serving the widget script statically
app.use('/widget', express.static(path.join(__dirname, '../widget/dist')));

// ----------------------------------------
// Middleware: Error Handler
// ----------------------------------------
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Server Error: ', err);
  res.status(500).json({ error: 'Internal Server Error' });
};

// ----------------------------------------
// Middleware: Authentication
// ----------------------------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid Token' });
  }
};

// ----------------------------------------
// Routes: Auth
// ----------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.getAsync('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: 'Username already exists' });
    
    await db.runAsync('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    
    const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------
// Routes: Forms Management (Authenticated)
// ----------------------------------------

const fieldSchema = z.object({
  type: z.enum(['text', 'dropdown', 'checkbox', 'rating', 'nps']),
  label: z.string().min(1),
  is_required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  min_length: z.number().optional(),
  max_length: z.number().optional()
});

const formSettingsSchema = z.object({
  title: z.string().min(1),
  theme_color: z.string(),
  widget_position: z.string(),
  webhook_url: z.string().url().optional().or(z.literal('')),
  fields: z.array(fieldSchema).min(1)
});

// Get all forms for user
app.get('/api/forms', authMiddleware, async (req, res) => {
  try {
    const forms = await db.allAsync('SELECT * FROM forms WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    // Fetch stats for each form (submission count, average rating/nps)
    const result = await Promise.all(forms.map(async f => {
      const stats = await db.getAsync('SELECT count(*) as count FROM submissions WHERE form_id = ?', [f.id]);
      return { ...f, submissions_count: stats.count };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Form
app.post('/api/forms', authMiddleware, async (req, res) => {
  try {
    const data = formSettingsSchema.parse(req.body);
    
    // Insert Form
    const result = await db.runAsync(
      'INSERT INTO forms (user_id, title, theme_color, widget_position, webhook_url) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, data.title, data.theme_color, data.widget_position, data.webhook_url || null]
    );
    
    const formId = result.lastID;

    // Insert Fields
    for (let i = 0; i < data.fields.length; i++) {
      const field = data.fields[i];
      await db.runAsync(
        'INSERT INTO form_fields (form_id, type, label, is_required, options, order_index, min_length, max_length) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          formId,
          field.type,
          field.label,
          field.is_required ? 1 : 0,
          field.options ? JSON.stringify(field.options) : null,
          i,
          field.min_length || null,
          field.max_length || null
        ]
      );
    }
    
    res.json({ success: true, formId });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// Get Form fully assembled (for frontend details)
app.get('/api/forms/:id', authMiddleware, async (req, res) => {
  try {
    const form = await db.getAsync('SELECT * FROM forms WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!form) return res.status(404).json({ error: 'Not found' });
    
    const fields = await db.allAsync('SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index ASC', [form.id]);
    res.json({ form, fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Submissions for Form
app.get('/api/forms/:id/submissions', authMiddleware, async (req, res) => {
  try {
    const form = await db.getAsync('SELECT * FROM forms WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!form) return res.status(404).json({ error: 'Not found' });

    const submissions = await db.allAsync('SELECT * FROM submissions WHERE form_id = ? ORDER BY submitted_at DESC', [form.id]);
    
    res.json(submissions.map(s => ({
      ...s,
      data: JSON.parse(s.data)
    })));
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Export CSV
app.get('/api/forms/:id/export', authMiddleware, async (req, res) => {
  try {
    const form = await db.getAsync('SELECT * FROM forms WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!form) return res.status(404).json({ error: 'Not found' });
    
    const submissions = await db.allAsync('SELECT * FROM submissions WHERE form_id = ? ORDER BY submitted_at DESC', [form.id]);
    const fields = await db.allAsync('SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index', [form.id]);

    const header = ['IP', 'Submitted At', ...fields.map(f => f.label.replace(/,/g, ''))];
    const rows = submissions.map(s => {
      const data = JSON.parse(s.data);
      const rowData = fields.map(f => {
        const val = data[f.label] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      return [s.ip_address, s.submitted_at, ...rowData].join(',');
    });

    const csvStr = [header.join(','), ...rows].join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`submissions_form_${form.id}.csv`);
    res.send(csvStr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------
// Routes: Public Endpoints (For Widget)
// ----------------------------------------

// Fetch Form Config
app.get('/api/widget/:id/config', async (req, res) => {
  try {
    const form = await db.getAsync('SELECT id, title, theme_color, widget_position FROM forms WHERE id = ?', [req.params.id]);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    
    // Convert arrays back
    const fields = await db.allAsync('SELECT id, type, label, is_required, options, min_length, max_length FROM form_fields WHERE form_id = ? ORDER BY order_index', [form.id]);
    
    const processedFields = fields.map(f => ({
      ...f,
      options: f.options ? JSON.parse(f.options) : [],
      is_required: f.is_required === 1
    }));

    res.json({ form, fields: processedFields });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit Form
// Improvement: Basic Rate limiting & IP check
const submissionRateLimits = new Map();

app.post('/api/widget/:id/submit', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const formId = req.params.id;

  // Rate Limiting (1 submission per form per IP per minute)
  const limitKey = `${ip}_${formId}`;
  if (submissionRateLimits.has(limitKey)) {
    const lastSubmit = submissionRateLimits.get(limitKey);
    if (Date.now() - lastSubmit < 60000) {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }
  }

  try {
    const body = req.body;
    // We should ideally strictly validate against the DB schema here. 
    // Example: ensuring required fields exist.
    const fields = await db.allAsync('SELECT * FROM form_fields WHERE form_id = ?', [formId]);
    for (let f of fields) {
      if (f.is_required === 1 && !body[f.label]) {
        return res.status(400).json({ error: `Field '${f.label}' is required.` });
      }
    }

    // Insert
    await db.runAsync('INSERT INTO submissions (form_id, ip_address, data) VALUES (?, ?, ?)', [formId, ip, JSON.stringify(body)]);
    
    submissionRateLimits.set(limitKey, Date.now());

    // Basic Webhook trigger (intentionally lightweight, no retries)
    const form = await db.getAsync('SELECT webhook_url FROM forms WHERE id = ?', [formId]);
    if (form && form.webhook_url) {
      try {
        fetch(form.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formId, event: 'submission', data: body, timestamp: new Date().toISOString() })
        }).catch(()=>null); // Ignore errors
      } catch(e) {}
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
});
