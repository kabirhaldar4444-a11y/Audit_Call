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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    const PORT = process.env.PORT || 5000;
    
    // Connect to database
    await connectDB();
    
    // Initialize database with default user if needed
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

