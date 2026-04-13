// Test route to debug backend issues
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Debug: List all users
router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json({
      message: 'All users in database',
      count: users.length,
      users: users,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: Create test user
router.post('/debug/create-test-user', async (req, res) => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'testadmin' });
    if (existingUser) {
      return res.json({
        message: 'Test user already exists',
        user: {
          username: existingUser.username,
          email: existingUser.email,
        },
        password: 'testadmin123',
      });
    }

    // Create test user
    const testUser = new User({
      username: 'testadmin',
      email: 'test@callaudit.com',
      password: 'testadmin123',
      role: 'admin',
    });

    await testUser.save();

    res.json({
      message: 'Test user created successfully',
      user: {
        username: testUser.username,
        email: testUser.email,
      },
      credentials: {
        username: 'testadmin',
        password: 'testadmin123',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: Database connection
router.get('/debug/db-status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    res.json({
      message: 'Database connection status',
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      dbName: mongoose.connection.name,
      descriptions: {
        '0': 'disconnected',
        '1': 'connected',
        '2': 'connecting',
        '3': 'disconnecting',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
