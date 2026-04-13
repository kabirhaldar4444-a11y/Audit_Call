const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Local data storage path
const userStorePath = path.join(__dirname, '../data/users.json');
const dataDir = path.dirname(userStorePath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Initialize with default admin user if file is empty
 */
function initializeUsers() {
  try {
    if (!fs.existsSync(userStorePath)) {
      const defaultUser = {
        _id: 'admin-' + Date.now(),
        username: 'admin',
        email: 'admin@callaudit.com',
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(userStorePath, JSON.stringify([defaultUser], null, 2));
      console.log('✅ Default admin user created in local storage');
      console.log('   Username: admin');
      console.log('   Password: admin123\n');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
}

/**
 * Find user by username or email
 */
function findUserByUsernameOrEmail(username, email) {
  try {
    if (!fs.existsSync(userStorePath)) {
      return null;
    }
    
    const content = fs.readFileSync(userStorePath, 'utf8');
    const users = JSON.parse(content || '[]');
    
    return users.find(u => 
      u.username === username || u.email === email || u.username === email
    ) || null;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

/**
 * Find user by ID
 */
function findUserById(id) {
  try {
    if (!fs.existsSync(userStorePath)) {
      return null;
    }
    
    const content = fs.readFileSync(userStorePath, 'utf8');
    const users = JSON.parse(content || '[]');
    
    return users.find(u => u._id === id) || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    return null;
  }
}

/**
 * Save new user
 */
function saveUser(userData) {
  try {
    let users = [];
    
    if (fs.existsSync(userStorePath)) {
      const content = fs.readFileSync(userStorePath, 'utf8');
      users = JSON.parse(content || '[]');
    }
    
    // Check if user already exists
    if (users.find(u => u.username === userData.username || u.email === userData.email)) {
      return { success: false, error: 'User already exists' };
    }
    
    // Hash password
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    
    const newUser = {
      _id: 'user-' + Date.now(),
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    fs.writeFileSync(userStorePath, JSON.stringify(users, null, 2));
    
    return { success: true, user: { ...newUser, password: undefined } };
  } catch (error) {
    console.error('Error saving user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify password
 */
function verifyPassword(hashedPassword, plainPassword) {
  try {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Get all users (for admin)
 */
function getAllUsers() {
  try {
    if (!fs.existsSync(userStorePath)) {
      return [];
    }
    
    const content = fs.readFileSync(userStorePath, 'utf8');
    const users = JSON.parse(content || '[]');
    
    // Remove passwords from response
    return users.map(u => ({ ...u, password: undefined }));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

module.exports = {
  initializeUsers,
  findUserByUsernameOrEmail,
  findUserById,
  saveUser,
  verifyPassword,
  getAllUsers,
  getUserStorePath: () => userStorePath
};
