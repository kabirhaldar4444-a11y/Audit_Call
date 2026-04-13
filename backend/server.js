const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const initializeDatabase = require('./config/seed');

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set! API calls will fail.');
}

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set! Auth will fail.');
}

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/calls', require('./routes/callRoutes'));
app.use('/api/audits', require('./routes/auditRoutes'));

// Debug routes (development only)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/debug', require('./routes/debugRoutes'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
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

// Connect DB asynchronously for serverless
connectDB().then(() => {
  if (process.env.DB_MODE !== 'offline') {
    initializeDatabase().catch(err => console.warn('⚠️  Seed skipped:', err.message));
  }
}).catch(err => console.error('❌ Failed to connect to DB:', err.message));

// Only bind port in local development
if (require.main === module || process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
  });
  server.timeout = 600000;
}

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

module.exports = app;
