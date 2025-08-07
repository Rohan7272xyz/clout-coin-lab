// Backend/routes/influencerRoutes.js - Updated to work with new influencers table
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');

// Middleware to verify admin access for certain operations
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    
    // Check if user is admin in database
    const userCheck = await db.query(
      'SELECT status FROM users WHERE email = $1',
      [decoded.email]
    );
    
    if (!userCheck.rows[0] || userCheck.rows[0].status !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Admin verification failed:', err);
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

// GET /api/influencer - Get all influencers with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      category, 
      verified, 
      live_only, 
      pledging_only,
      limit = 50, 
      offset = 0,
      sort_by = 'followers_count',
      sort_order = 'DESC'
    } = req.query;
    
    let query = 'SELECT * FROM influencers_display WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;
    
    // Add filters
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }
    
    if (category) {
      paramCount++;
      query += ` AND category ILIKE $${paramCount}`;
      queryParams.push(`%${category}%`);
    }
    
    if (verified === 'true') {
      query += ` AND verified = true`;
    }
    
    if (live_only === 'true') {
      query += ` AND is_live = true`;
    }
    
    if (pledging_only === 'true') {
      query += ` AND status = 'pledging'`;
    }
    
    // Add sorting
    const validSortFields = [
      'followers_count', 'market_cap', 'volume_24h', 'price_change_24h', 
      'created_at', 'total_pledged_eth', 'pledge_count', 'name'
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'followers_count';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection}`;
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    const result = await db.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM influencers WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (category) {
      countParamCount++;
      countQuery += ` AND category ILIKE $${countParamCount}`;
      countParams.push(`%${category}%`);
    }
    
    if (verified === 'true') {
      countQuery += ` AND verified = true`;
    }
    
    if (live_only === 'true') {
      countQuery += ` AND launched_at IS NOT NULL`;
    }
    
    if (pledging_only === 'true') {
      countQuery += ` AND status = 'pledging'`;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + result.rows.length < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencers',
      details: error.message 
    });
  }
});

// GET /api/influencer/:id - Get specific influencer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM influencers_display WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencer',
      details: error.message 
    });
  }
});

// GET /api/influencer/handle/:handle - Get influencer by handle
router.get('/handle/:handle', async (req, res) => {
  try {
    let { handle } = req.params;
    
    // Ensure handle starts with @
    if (!handle.startsWith('@')) {
      handle = '@' + handle;
    }
    
    const result = await db.query(
      'SELECT * FROM influencers_display WHERE handle = $1',
      [handle]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching influencer by handle:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencer',
      details: error.message 
    });
  }
});

// GET /api/influencer/address/:address - Get influencer by wallet address
router.get('/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const result = await db.query(
      'SELECT * FROM influencers_display WHERE wallet_address = $1',
      [address]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching influencer by address:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencer',
      details: error.message 
    });
  }
});

// POST /api/influencer - Create new influencer (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      handle,
      email,
      wallet_address,
      followers_count = 0,
      category,
      description,
      avatar_url,
      verified = false,
      status = 'pending',
      pledge_threshold_eth = 0,
      pledge_threshold_usdc = 0,
      token_name,
      token_symbol,
      notes
    } = req.body;
    
    // Validation
    if (!name || !handle || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, handle, and email are required' 
      });
    }
    
    // Ensure handle starts with @
    const formattedHandle = handle.startsWith('@') ? handle : '@' + handle;
    
    const result = await db.query(`
      INSERT INTO influencers (
        name, handle, email, wallet_address, followers_count, category, 
        description, avatar_url, verified, status, pledge_threshold_eth, 
        pledge_threshold_usdc, token_name, token_symbol, created_by, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      name, formattedHandle, email, wallet_address, followers_count, category,
      description, avatar_url, verified, status, pledge_threshold_eth,
      pledge_threshold_usdc, token_name, token_symbol, req.user.uid, notes
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Influencer created successfully'
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      const detail = error.detail || '';
      if (detail.includes('handle')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Handle already exists' 
        });
      } else if (detail.includes('email')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists' 
        });
      } else if (detail.includes('wallet_address')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Wallet address already exists' 
        });
      }
    }
    
    console.error('Error creating influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create influencer',
      details: error.message 
    });
  }
});

// PUT /api/influencer/:id - Update influencer (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    delete updates.updated_at;
    
    // If handle is being updated, ensure it starts with @
    if (updates.handle && !updates.handle.startsWith('@')) {
      updates.handle = '@' + updates.handle;
    }
    
    // Build dynamic UPDATE query
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    if (!setClause) {
      return res.status(400).json({ 
        success: false, 
        error: 'No updates provided' 
      });
    }
    
    const values = [id, ...Object.values(updates)];
    
    const result = await db.query(
      `UPDATE influencers SET ${setClause} WHERE id = $1 RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Influencer updated successfully'
    });
  } catch (error) {
    console.error('Error updating influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update influencer',
      details: error.message 
    });
  }
});

// PUT /api/influencer/:id/token - Update token information (Admin only)
router.put('/:id/token', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      token_address,
      token_name,
      token_symbol,
      token_total_supply,
      liquidity_pool_address,
      current_price,
      market_cap,
      launched_at
    } = req.body;
    
    const result = await db.query(`
      UPDATE influencers 
      SET 
        token_address = COALESCE($2, token_address),
        token_name = COALESCE($3, token_name),
        token_symbol = COALESCE($4, token_symbol),
        token_total_supply = COALESCE($5, token_total_supply),
        liquidity_pool_address = COALESCE($6, liquidity_pool_address),
        current_price = COALESCE($7, current_price),
        market_cap = COALESCE($8, market_cap),
        launched_at = COALESCE($9, launched_at),
        status = CASE WHEN $9 IS NOT NULL THEN 'live' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [
      id, token_address, token_name, token_symbol, token_total_supply,
      liquidity_pool_address, current_price, market_cap, launched_at
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Token information updated successfully'
    });
  } catch (error) {
    console.error('Error updating token info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update token information',
      details: error.message 
    });
  }
});

// DELETE /api/influencer/:id - Delete influencer (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM influencers WHERE id = $1 RETURNING id, name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Influencer deleted successfully', 
      data: { id: result.rows[0].id, name: result.rows[0].name }
    });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete influencer',
      details: error.message 
    });
  }
});

// GET /api/influencer/stats/overview - Get platform statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_influencers,
        COUNT(CASE WHEN status = 'live' THEN 1 END) as live_tokens,
        COUNT(CASE WHEN status = 'pledging' THEN 1 END) as pledging_tokens,
        COUNT(CASE WHEN verified = true THEN 1 END) as verified_influencers,
        SUM(followers_count) as total_followers,
        AVG(followers_count) as avg_followers,
        SUM(market_cap) as total_market_cap,
        SUM(volume_24h) as total_volume_24h,
        SUM(total_pledged_eth) as total_pledged_eth,
        SUM(total_pledged_usdc) as total_pledged_usdc,
        SUM(pledge_count) as total_pledgers
      FROM influencers
    `);
    
    const categories = await db.query(`
      SELECT category, COUNT(*) as count
      FROM influencers 
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);
    
    res.json({
      success: true,
      data: {
        overview: result.rows[0],
        categories: categories.rows
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

module.exports = router;