// Backend/routes/authRoutes.js (UPDATED - Investor as Default)
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');

// --- Environment Config ---
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

// Initialize Firebase Admin SDK if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../backendservice.json')),
  });
}

// --- Helper function to create or update user (INVESTOR DEFAULT) ---
async function createOrUpdateUser(userData) {
  const { wallet_address, email, display_name, profile_picture_url } = userData;
  
  try {
    const result = await db.query(
      `INSERT INTO users (wallet_address, email, display_name, profile_picture_url, status)
       VALUES ($1, $2, $3, $4, 'investor')
       ON CONFLICT (wallet_address) 
       DO UPDATE SET 
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         profile_picture_url = EXCLUDED.profile_picture_url,
         updated_at = CURRENT_TIMESTAMP
         -- NOTE: We do NOT update status on conflict - preserve existing status
       RETURNING *`,
      [wallet_address, email, display_name, profile_picture_url]
    );
    
    const user = result.rows[0];
    console.log(`✅ User synced: ${email} (Status: ${user.status})`);
    
    // Log status for new vs existing users
    if (user.status === 'investor' && !user.updated_at) {
      console.log(`   🆕 New user created with investor status`);
    } else {
      console.log(`   👤 Existing ${user.status} user updated`);
    }
    
    return user;
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

// --- Firebase user sync route (CREATES INVESTOR BY DEFAULT) ---
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
    
    // Create user data object - WILL BE 'investor' by default
    const userData = {
      wallet_address,
      email,
      display_name: req.body.display_name || name || email.split('@')[0],
      profile_picture_url: req.body.profile_picture_url || picture || null
    };

    // Create or update user in database (defaults to 'investor' status)
    const user = await createOrUpdateUser(userData);
    
    // Determine welcome message based on status
    let welcomeMessage = 'Welcome back!';
    switch (user.status) {
      case 'investor':
        welcomeMessage = 'Welcome! You have full investor access to trade and pledge.';
        break;
      case 'influencer':
        welcomeMessage = 'Welcome back! You have influencer access with token management.';
        break;
      case 'admin':
        welcomeMessage = 'Welcome back, admin! You have full platform access.';
        break;
    }
    
    console.log(`✅ Successfully synced user: ${email} (Status: ${user.status})`);
    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        display_name: user.display_name,
        profile_picture_url: user.profile_picture_url,
        status: user.status, // Will be 'investor' for new users
        created_at: user.created_at,
        permissions: getUserPermissions(user.status)
      },
      message: welcomeMessage
    });
  } catch (err) {
    console.error('❌ Firebase token verification failed:', err.message);
    return res.status(403).json({ error: 'Unauthorized' });
  }
});

// --- Helper function to get permissions by status ---
function getUserPermissions(status) {
  const permissions = {
    investor: [
      'view_public_content',
      'view_influencers', 
      'make_investments',
      'view_portfolio',
      'trade_tokens',
      'pledge_to_influencers'
    ],
    influencer: [
      'all_investor_permissions',
      'manage_own_token',
      'view_analytics',
      'access_influencer_dashboard'
    ],
    admin: [
      'all_permissions',
      'manage_users',
      'manage_influencers',
      'view_all_analytics',
      'approve_tokens',
      'manage_platform',
      'access_admin_dashboard'
    ]
  };
  
  return permissions[status] || permissions.investor;
}

// --- Update user profile (CANNOT change status) ---
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
    
    // NOTE: Status is NOT included - only admins can change status via admin scripts
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

// --- Check user status (for frontend to determine UI) ---
router.get('/status/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    
    const result = await db.query(
      'SELECT status, email, display_name FROM users WHERE wallet_address = $1',
      [wallet_address]
    );
    
    if (result.rows.length === 0) {
      // User doesn't have account = browser status
      return res.json({
        status: 'browser',
        hasAccount: false,
        permissions: ['view_public_content', 'browse_influencers']
      });
    }
    
    const user = result.rows[0];
    res.json({
      status: user.status,
      hasAccount: true,
      email: user.email,
      display_name: user.display_name,
      permissions: getUserPermissions(user.status)
    });
    
  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin-only user management ---
router.get('/admin/user-stats', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization token' });

  try {
    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    
    // Check if user is admin
    const userCheck = await db.query(
      'SELECT status FROM users WHERE email = $1',
      [decoded.email]
    );
    
    if (!userCheck.rows[0] || userCheck.rows[0].status !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get user statistics
    const stats = await db.query(`
      SELECT status, COUNT(*) as count
      FROM users 
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'admin' THEN 1
          WHEN 'influencer' THEN 2  
          WHEN 'investor' THEN 3
          ELSE 4
        END
    `);
    
    const totalUsers = stats.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    res.json({
      success: true,
      stats: stats.rows.map(row => ({
        ...row,
        percentage: ((row.count / totalUsers) * 100).toFixed(1)
      })),
      total: totalUsers,
      note: "Browser users are anonymous and not counted here"
    });
    
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Telegram and Discord routes (create investor accounts) ---
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

  // TODO: Create investor user from Telegram data
  console.log('Telegram login successful - would create investor account');
  return res.status(200).json({ success: true });
});

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
    
    // TODO: Create investor user from Discord data
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