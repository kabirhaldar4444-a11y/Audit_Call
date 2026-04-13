const User = require('../models/User');
const { initializeUsers } = require('../utils/userPersistence');

const initializeDatabase = async () => {
  try {
    // If in offline mode, initialize local users storage
    if (process.env.DB_MODE === 'offline') {
      initializeUsers();
      return;
    }

    // Check if any users exist
    const userCount = await User.countDocuments();

    if (userCount === 0) {
      console.log('📦 Initializing database with default user...');

      // Create default admin user
      const defaultUser = new User({
        username: 'admin',
        email: 'admin@callaudit.com',
        password: 'admin123',
        role: 'admin',
        isActive: true,
      });

      await defaultUser.save();

      console.log('✅ Default admin user created!');
      console.log('📋 Login Credentials:');
      console.log('   Username: admin');
      console.log('   Email: admin@callaudit.com');
      console.log('   Password: admin123');
      console.log('');
    } else {
      console.log(`📊 Database already initialized with ${userCount} user(s)`);
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

module.exports = initializeDatabase;
