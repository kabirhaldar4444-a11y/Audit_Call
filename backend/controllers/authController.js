const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { findUserByUsernameOrEmail, saveUser, verifyPassword } = require('../utils/userPersistence');

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Try to register in MongoDB if connected
    if (process.env.DB_MODE !== 'offline') {
      // Check if user exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        console.log(`❌ Registration: User already exists - ${username}`);
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const user = new User({ username, email, password, role: 'admin' });
      await user.save();

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log(`✅ User registered: ${username}`);
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    } else {
      // Use offline storage
      const result = saveUser({ username, email, password, role: 'admin' });
      
      if (!result.success) {
        console.log(`❌ Registration: ${result.error} - ${username}`);
        return res.status(400).json({ message: result.error });
      }

      const token = jwt.sign(
        { userId: result.user._id, role: result.user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log(`✅ User registered (offline): ${username}`);
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: { id: result.user._id, username: result.user.username, email: result.user.email, role: result.user.role },
      });
    }
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Try to login using MongoDB if connected
    if (process.env.DB_MODE !== 'offline') {
      // Find user
      let user = await User.findOne({ $or: [{ username }, { email: username }] });
      
      // FOOLPROOF FIX: If no users exist at all and someone tries to login as admin, create it now!
      const totalUsers = await User.countDocuments();
      if (totalUsers === 0 && username === 'admin') {
        console.log('⚡ Empty database detected. Auto-creating initial admin user...');
        user = new User({
          username: 'admin',
          email: 'admin@callaudit.com',
          password: 'admin123',
          role: 'admin'
        });
        await user.save();
      }

      if (!user) {
        console.log(`❌ Login attempt: User not found - ${username}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Compare passwords
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        console.log(`❌ Login attempt: Invalid password for user - ${username}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log(`✅ Login successful: ${username}`);
      res.status(200).json({
        message: 'Login successful',
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    } else {
      // Use offline storage
      const user = findUserByUsernameOrEmail(username, username);
      
      if (!user) {
        console.log(`❌ Login attempt (offline): User not found - ${username}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      if (!verifyPassword(user.password, password)) {
        console.log(`❌ Login attempt (offline): Invalid password for user - ${username}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log(`✅ Login successful (offline): ${username}`);
      res.status(200).json({
        message: 'Login successful',
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

module.exports = { register, login };
