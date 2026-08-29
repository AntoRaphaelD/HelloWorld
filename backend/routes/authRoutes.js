const express = require('express');
const crypto = require('crypto');
const { User } = require('../models');
const { writeAuditLog } = require('../services/auditService');

const router = express.Router();

const hashPassword = (password, salt) =>
  crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  mobile_no: user.mobile_no || null
});

const requireUsernameAndPassword = (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    res.status(400).json({ message: 'Username and password are required.' });
    return null;
  }

  if (username.length < 3) {
    res.status(400).json({ message: 'Username must be at least 3 characters.' });
    return null;
  }

  if (password.length < 4) {
    res.status(400).json({ message: 'Password must be at least 4 characters.' });
    return null;
  }

  return { username, password };
};

router.post('/signup', async (req, res) => {
  try {
    const credentials = requireUsernameAndPassword(req, res);
    if (!credentials) return;

    const existing = await User.findOne({ where: { username: credentials.username } });
    if (existing) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const token = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      username: credentials.username,
      mobile_no: req.body.mobile_no ? String(req.body.mobile_no).trim() : null,
      otp_verified_at: new Date(),
      password_salt: salt,
      password_hash: hashPassword(credentials.password, salt),
      session_token: token
    });

    await writeAuditLog(req, {
      user: publicUser(user),
      action: 'SIGNUP',
      entity: 'auth',
      status: 'SUCCESS',
      status_code: 201,
      details: { username: user.username }
    });

    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Unable to create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const credentials = requireUsernameAndPassword(req, res);
    if (!credentials) return;

    const user = await User.findOne({ where: { username: credentials.username } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const attemptedHash = hashPassword(credentials.password, user.password_salt);
    const attemptedBuffer = Buffer.from(attemptedHash, 'hex');
    const savedBuffer = Buffer.from(user.password_hash, 'hex');
    const matches = attemptedBuffer.length === savedBuffer.length
      && crypto.timingSafeEqual(attemptedBuffer, savedBuffer);

    if (!matches) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await user.update({ session_token: token });

    await writeAuditLog(req, {
      user: publicUser(user),
      action: 'LOGIN',
      entity: 'auth',
      status: 'SUCCESS',
      status_code: 200,
      details: { username: user.username }
    });

    res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Unable to login.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ message: 'Login required.' });
    }

    const user = await User.findOne({ where: { session_token: token } });
    if (!user) {
      return res.status(401).json({ message: 'Session expired.' });
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({ message: 'Unable to verify session.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token) {
      const user = await User.findOne({ where: { session_token: token } });
      await User.update({ session_token: null }, { where: { session_token: token } });
      if (user) {
        await writeAuditLog(req, {
          user: publicUser(user),
          action: 'LOGOUT',
          entity: 'auth',
          status: 'SUCCESS',
          status_code: 200,
          details: { username: user.username }
        });
      }
    }

    res.json({ message: 'Logged out.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Unable to logout.' });
  }
});

module.exports = router;
