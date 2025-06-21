const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'DogWalkService'
};

// Session middleware configuration
app.use(session({
  secret: 'dog-walking-service-secret-key', // In production, use environment variable
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added to handle form data
app.use(express.static(path.join(__dirname, '/public')));

// Login route
app.post('/login', async (req, res) => {
  console.log('Login request received:', req.body); // Debug log
  const { username, password } = req.body;
  
  // Validate input parameters
  if (!username || !password) {
    console.log('Missing username or password:', { username, password });
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // Connect to database
    const connection = await mysql.createConnection(dbConfig);
    
    // Query user from database
    const [rows] = await connection.execute(
      'SELECT user_id, username, password_hash, role FROM Users WHERE username = ?',
      [username]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const user = rows[0];
    
    // For now, we'll do simple string comparison since the sample data uses plain text
    // In production, you should use bcrypt.compare() for hashed passwords
    if (password !== user.password_hash) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Store user information in session
    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    // Return success response with user role
    res.json({ 
      success: true, 
      role: user.role,
      username: user.username 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.json({ success: true });
  });
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Middleware to check if user is owner
const requireOwner = (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'owner') {
    return res.status(403).json({ message: 'Owner access required' });
  }
  next();
};

// Middleware to check if user is walker
const requireWalker = (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'walker') {
    return res.status(403).json({ message: 'Walker access required' });
  }
  next();
};

// Authentication check route
app.get('/api/auth/check', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  res.json({
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.role
  });
});

// API endpoint to fetch owner's dogs
app.get('/api/dogs', requireAuth, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Query dogs owned by the logged-in user
    const [rows] = await connection.execute(
      'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?',
      [req.session.userId]
    );
    
    await connection.end();
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ message: 'Failed to fetch dogs' });
  }
});

// API endpoint to get current user information
app.get('/api/users/me', requireAuth, (req, res) => {
  res.json({
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.role
  });
});

// API endpoint to fetch all dogs (public endpoint for homepage)
app.get('/api/dogs/all', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Query all dogs with owner information
    const [rows] = await connection.execute(
      'SELECT d.dog_id, d.name, d.size, u.username AS owner_username FROM Dogs d JOIN Users u ON d.owner_id = u.user_id'
    );
    
    await connection.end();
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all dogs:', error);
    res.status(500).json({ message: 'Failed to fetch dogs' });
  }
});

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;