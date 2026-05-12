const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const supabase = require('./config/supabase');

// Load environment variables
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set! Using fallback for safety.');
}

// Initialize app
const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const callRoutes = require('./routes/callRoutes');
const auditRoutes = require('./routes/auditRoutes');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/audits', auditRoutes);

// Fallback routes
app.use('/auth', authRoutes);
app.use('/calls', callRoutes);
app.use('/audits', auditRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Call Audit API (Supabase Edition) is live!',
    healthCheck: '/api/health',
    version: 'v4.0 (Supabase Migration)'
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('calls').select('id').limit(1);
    const dbStatus = error ? 'error' : 'connected';
    
    res.status(200).json({ 
      status: 'ok', 
      version: 'v4.0 (Supabase Migration)',
      database: dbStatus, 
      provider: 'supabase',
      error: error ? error.message : null
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('calls').select('id').limit(1);
    const dbStatus = error ? 'error' : 'connected';
    
    res.status(200).json({ 
      status: 'ok', 
      version: 'v4.0 (Supabase Migration)',
      database: dbStatus, 
      provider: 'supabase',
      error: error ? error.message : null
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Only bind port in local development
if (require.main === module || process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => {
    console.log(`\n✅ Supabase Server running on port ${PORT}`);
  });
  server.timeout = 900000; 
}

module.exports = app;
