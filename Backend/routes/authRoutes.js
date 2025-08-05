// backend/routes/authRoutes.js

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/db');
const admin = require('firebase-admin');

// --- Environment Config ---
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

// Initialize Firebase Admin SDK if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./tokenfactory-backendserviceacc.json')),
  });
}

// --- Helper function to create or update user ---
async function createOrUpdateUser(userData) {
  const { wallet_address, email, display_name, profile_picture_url } = userData;
  
  try {
    const result = await db.query(
      `INSERT INTO users (wallet_address, email, display_name, profile_picture_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wallet_address) 
       DO UPDATE SET 
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         profile_picture_url = EXCLUDED.profile_picture_url,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [wallet_address, email, display_name, profile_picture_url]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createOrUpdateUser:', error);
    throw error;
  }
}

// --- Get user by wallet address ---
router.get('/user/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const result = await db.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [wallet_address]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Firebase user sync route (Enhanced) ---
router.post('/sync', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization token' });

  const idToken = authHeader.split('Bearer ')[1];
  try {
    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { email, uid, name, picture } = decoded;

    // Get wallet address from request body or use UID as fallback
    const wallet_address = req.body.wallet_address || uid;
    
    // Create user data object
    const userData = {
      wallet_address,
      email,
      display_name: req.body.display_name || name || email.split('@')[0],
      profile_picture_url: req.body.profile_picture_url || picture || null
    };

    // Create or update user in database
    const user = await createOrUpdateUser(userData);
    
    console.log(`✅ Successfully synced user: ${email}`);
    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        display_name: user.display_name,
        profile_picture_url: user.profile_picture_url,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('❌ Firebase token verification failed:', err.message);
    return res.status(403).json({ error: 'Unauthorized' });
  }
});

// --- Update user profile ---
router.put('/user/:wallet_address', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization token' });

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { wallet_address } = req.params;
    
    // Verify user can only update their own profile
    if (decoded.uid !== wallet_address && !req.body.wallet_address !== wallet_address) {
      return res.status(403).json({ error: 'Unauthorized to update this profile' });
    }

    const { display_name, profile_picture_url } = req.body;
    
    const result = await db.query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           profile_picture_url = COALESCE($2, profile_picture_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE wallet_address = $3
       RETURNING *`,
      [display_name, profile_picture_url, wallet_address]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Telegram login callback ---
router.post('/telegram', async (req, res) => {
  console.log('Received Telegram login callback');
  const data = req.body;
  const { hash, ...authData } = data;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('Telegram bot token not set');
    return res.status(500).send('Telegram bot token not set');
  }

  const sortedKeys = Object.keys(authData).sort();
  const checkString = sortedKeys.map(key => `${key}=${authData[key]}`).join('\n');
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');

  if (hmac !== hash) {
    console.error('HMAC verification failed');
    return res.status(403).send('Unauthorized');
  }

  // TODO: Create user from Telegram data
  console.log('Telegram login successful');
  return res.status(200).json({ success: true });
});

// --- Discord OAuth login ---
router.get('/discord', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing code');
  }
  
  try {
    const params = new URLSearchParams();
    params.append('client_id', DISCORD_CLIENT_ID);
    params.append('client_secret', DISCORD_CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', DISCORD_REDIRECT_URI);
    params.append('scope', 'identify email');

    const tokenRes = await axios.post(
      'https://discord.com/api/oauth2/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;
    if (!access_token) {
      return res.status(400).json({ error: 'No access token received' });
    }

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userRes.data;
    
    // TODO: Create user from Discord data and handle authentication
    // For now, just redirect to dashboard
    return res.redirect(302, 'http://localhost:8080/dashboard');
  } catch (err) {
    console.error('Discord OAuth error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Discord OAuth failed',
      details: err.response?.data || err.message
    });
  }
});

module.exports = router;