// Backend/routes/authRoutes.js
// Updated with proper default status for new users

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    console.log('🔍 Verifying token for project:', admin.app().options.projectId);
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('✅ Token verified successfully for user:', decodedToken.email);
    
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    console.error('Token details:', {
      tokenLength: idToken.length,
      tokenStart: idToken.substring(0, 20),
      expectedProject: admin.app().options.projectId
    });
    return res.status(403).json({ 
      error: 'Invalid token',
      details: error.message 
    });
  }
};

// POST /api/auth/sync - Sync user from Firebase to database
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { wallet_address, email, display_name, profile_picture_url } = req.body;
    const firebaseUid = req.user.uid;
    const userEmail = email || req.user.email;

    console.log('🔄 Syncing user:', { firebaseUid, userEmail, wallet_address });

    // Check if user exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE firebase_uid = $1 OR email = $2',
      [firebaseUid, userEmail]
    );

    let user;
    if (existingUser.rows.length > 0) {
      // Update existing user
      const updateResult = await db.query(`
        UPDATE users 
        SET 
          wallet_address = COALESCE($1, wallet_address),
          email = $2,
          display_name = COALESCE($3, display_name),
          profile_picture_url = COALESCE($4, profile_picture_url),
          firebase_uid = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = $2 OR firebase_uid = $5
        RETURNING *
      `, [wallet_address, userEmail, display_name, profile_picture_url, firebaseUid]);
      
      user = updateResult.rows[0];
      console.log('✅ Updated existing user:', user.email, 'Status:', user.status);
    } else {
      // Create new user with 'investor' status instead of 'browser'
      const insertResult = await db.query(`
        INSERT INTO users (
          firebase_uid, 
          wallet_address, 
          email, 
          display_name, 
          profile_picture_url,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'investor')
        RETURNING *
      `, [firebaseUid, wallet_address, userEmail, display_name, profile_picture_url]);
      
      user = insertResult.rows[0];
      console.log('✅ Created new user:', user.email, 'Status:', user.status);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        display_name: user.display_name,
        profile_picture_url: user.profile_picture_url,
        status: user.status,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// GET /api/auth/user/:uid - Get user by Firebase UID
router.get('/user/:uid', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    console.log('🔍 Fetching user by UID:', uid);
    
    // Ensure user can only access their own data (or admin can access any)
    if (req.user.uid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [uid]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found in database for UID:', uid);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    console.log('✅ Found user:', user.email, 'Status:', user.status);
    
    res.json({
      id: user.id,
      wallet_address: user.wallet_address,
      email: user.email,
      display_name: user.display_name,
      profile_picture_url: user.profile_picture_url,
      status: user.status,
      total_invested: user.total_invested,
      portfolio_value: user.portfolio_value,
      created_at: user.created_at
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/auth/user/:uid - Update user profile
router.put('/user/:uid', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const { display_name, profile_picture_url, wallet_address } = req.body;
    
    // Ensure user can only update their own data
    if (req.user.uid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      UPDATE users 
      SET 
        display_name = COALESCE($1, display_name),
        profile_picture_url = COALESCE($2, profile_picture_url),
        wallet_address = COALESCE($3, wallet_address),
        updated_at = CURRENT_TIMESTAMP
      WHERE firebase_uid = $4
      RETURNING *
    `, [display_name, profile_picture_url, wallet_address, uid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        display_name: user.display_name,
        profile_picture_url: user.profile_picture_url,
        status: user.status,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/auth/upgrade-status - Admin endpoint to upgrade user status
router.post('/upgrade-status', verifyToken, async (req, res) => {
  try {
    // Check if requester is admin
    const requesterResult = await db.query(
      'SELECT status FROM users WHERE firebase_uid = $1 OR email = $2',
      [req.user.uid, req.user.email]
    );

    if (requesterResult.rows.length === 0 || requesterResult.rows[0].status !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { user_id, new_status } = req.body;
    const validStatuses = ['investor', 'influencer', 'admin']; // Removed 'browser'

    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(`
      UPDATE users 
      SET 
        status = $1,
        status_updated_by = $2,
        status_updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [new_status, req.user.email, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: `User status updated to ${new_status}`,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error upgrading user status:', error);
    res.status(500).json({ error: 'Failed to upgrade user status' });
  }
});

module.exports = router;