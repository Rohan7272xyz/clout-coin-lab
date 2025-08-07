// Backend/routes/influencerRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/influencer - Get all influencers
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        i.*,
        COALESCE(i.pledge_count, 0) as pledge_count,
        COALESCE(i.total_pledged_eth, 0) as total_pledged_eth,
        COALESCE(i.total_pledged_usdc, 0) as total_pledged_usdc
      FROM influencers i
      ORDER BY i.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({ error: 'Failed to fetch influencers' });
  }
});

// GET /api/influencer/:id - Get specific influencer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM influencers WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Influencer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching influencer:', error);
    res.status(500).json({ error: 'Failed to fetch influencer' });
  }
});

// GET /api/influencer/address/:address - Get influencer by wallet address
router.get('/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const result = await db.query(
      'SELECT * FROM influencers WHERE wallet_address = $1',
      [address]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Influencer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching influencer by address:', error);
    res.status(500).json({ error: 'Failed to fetch influencer' });
  }
});

// POST /api/influencer - Create new influencer
router.post('/', async (req, res) => {
  try {
    const {
      name,
      handle,
      email,
      wallet_address,
      followers_count,
      category,
      description,
      avatar_url
    } = req.body;
    
    // Validation
    if (!name || !handle || !email) {
      return res.status(400).json({ 
        error: 'Name, handle, and email are required' 
      });
    }
    
    const result = await db.query(`
      INSERT INTO influencers (
        name, handle, email, wallet_address, 
        followers_count, category, description, avatar_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, handle, email, wallet_address, followers_count, category, description, avatar_url]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Handle or email already exists' });
    } else {
      console.error('Error creating influencer:', error);
      res.status(500).json({ error: 'Failed to create influencer' });
    }
  }
});

// PUT /api/influencer/:id - Update influencer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic UPDATE query
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    if (!setClause) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const values = [id, ...Object.values(updates)];
    
    const result = await db.query(
      `UPDATE influencers SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Influencer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating influencer:', error);
    res.status(500).json({ error: 'Failed to update influencer' });
  }
});

// DELETE /api/influencer/:id - Delete influencer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM influencers WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Influencer not found' });
    }
    
    res.json({ message: 'Influencer deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    res.status(500).json({ error: 'Failed to delete influencer' });
  }
});

module.exports = router;