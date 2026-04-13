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
  console.error('ERROR: MONGODB_URI is not set in .env file');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set in .env file');
  process.exit(1);
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

// Start server after DB connection
const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5001;
    
    // Connect to database (may fail, will continue in offline mode)
    await connectDB();
    
    // Initialize database with default user if needed (wrapped in try-catch)
    try {
      if (process.env.DB_MODE !== 'offline') {
        await initializeDatabase();
      } else {
        console.log('⚠️  Database Mode: OFFLINE - using local file storage for data persistence');
      }
    } catch (seedErr) {
      console.warn('⚠️  Seed initialization skipped:', seedErr.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.DB_MODE === 'offline') {
        console.log(`⚠️  Database Mode: OFFLINE (using local file storage)`);
        console.log(`💾 Local data file: ./data/calls.json`);
      } else {
        console.log(`📦 Database Mode: ONLINE (MongoDB)`);
      }
      console.log(`🔗 API: http://localhost:${PORT}/api\n`);
    });

    server.timeout = 600000; // 10 minutes for large uploads
    
    // Handle server errors
    server.on('error', (err) => {
      console.error('Server error:', err);
    });
    
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('Stack:', err.stack);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - keep server running
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✋ Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n✋ Server shutting down (SIGTERM)...');
  process.exit(0);
});

module.exports = app;
