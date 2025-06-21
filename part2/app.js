const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// MySQL connection options
const dbOptions = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'DogWalkService'
};

// Session setup
app.use(session({
  secret: 'dog-walking-service-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 86400000 }
}));

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, 'public')));

// --- Login handler ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing credentials' });

  try {
    const db = await mysql.createConnection(dbOptions);
    const [users] = await db.execute('SELECT user_id, username, password_hash, role FROM Users WHERE username = ?', [username]);
    await db.end();

    if (!users.length || users[0].password_hash !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({ success: true, username: user.username, role: user.role });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// --- Logout handler ---
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.json({ success: true });
  });
});

// --- Session auth helpers ---
const authRequired = (req, res, next) => req.session.userId ? next() : res.status(401).json({ message: 'Login required' });
const ownerOnly = (req, res, next) => req.session.role === 'owner' ? next() : res.status(403).json({ message: 'Owner only' });
const walkerOnly = (req, res, next) => req.session.role === 'walker' ? next() : res.status(403).json({ message: 'Walker only' });

// --- User status API ---
app.get('/api/auth/check', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Not authenticated' });
  res.json({ userId: req.session.userId, username: req.session.username, role: req.session.role });
});

// --- Dog APIs ---
app.get('/api/dogs', authRequired, async (req, res) => {
  try {
    const db = await mysql.createConnection(dbOptions);
    const [dogs] = await db.execute('SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?', [req.session.userId]);
    await db.end();
    res.json(dogs);
  } catch (err) {
    console.error('Owner dog fetch error:', err);
    res.status(500).json({ message: 'Error retrieving dogs' });
  }
});

app.get('/api/users/me', authRequired, (req, res) => {
  res.json({ userId: req.session.userId, username: req.session.username, role: req.session.role });
});

app.get('/api/dogs/all', async (_req, res) => {
  try {
    const db = await mysql.createConnection(dbOptions);
    const [allDogs] = await db.execute(
      'SELECT d.dog_id, d.name, d.size, u.username AS owner_username FROM Dogs d JOIN Users u ON d.owner_id = u.user_id'
    );
    await db.end();
    res.json(allDogs);
  } catch (err) {
    console.error('All dog list fetch failed:', err);
    res.status(500).json({ message: 'Unable to fetch dogs' });
  }
});

// --- Modular routes ---
const walkEndpoints = require('./routes/walkRoutes');
const userEndpoints = require('./routes/userRoutes');

app.use('/api/walks', walkEndpoints);
app.use('/api/users', userEndpoints);

module.exports = app;
