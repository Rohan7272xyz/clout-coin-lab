// File: routes/tokens.js
// Place this in your backend routes folder

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// GET /api/influencers - Get all influencers
router.get('/influencers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                i.*,
                t.contract_address,
                t.symbol,
                t.status as token_status,
                t.liquidity_pool_address
            FROM influencers i
            LEFT JOIN tokens t ON i.id = t.influencer_id
            ORDER BY i.created_at DESC
        `);
        
        // Format the response to match your frontend expectations
        const influencers = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            handle: row.handle,
            followers: formatFollowers(row.followers_count),
            category: row.category,
            avatar: row.avatar_url,
            price: "$0.00", // Will be updated with real price data later
            change: "+0%",
            description: row.description,
            verified: row.verified,
            comingSoon: row.token_status !== 'live',
            contractAddress: row.contract_address,
            poolAddress: row.liquidity_pool_address
        }));
        
        res.json(influencers);
    } catch (error) {
        console.error('Error fetching influencers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/influencers/:id - Get specific influencer
router.get('/influencers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT i.*, t.*
            FROM influencers i
            LEFT JOIN tokens t ON i.id = t.influencer_id
            WHERE i.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Influencer not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching influencer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/waitlist - Add email to waitlist
router.post('/waitlist', async (req, res) => {
    try {
        const { email, wallet_address } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const result = await pool.query(`
            INSERT INTO waitlist (email, wallet_address)
            VALUES ($1, $2)
            ON CONFLICT (email) DO NOTHING
            RETURNING *
        `, [email, wallet_address || null]);
        
        res.status(201).json({
            message: 'Added to waitlist successfully',
            data: result.rows[0] || { email, wallet_address }
        });
    } catch (error) {
        console.error('Error adding to waitlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/influencers - Create new influencer (admin only)
router.post('/influencers', async (req, res) => {
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
        
        // Basic validation
        if (!name || !handle || !email) {
            return res.status(400).json({ error: 'Name, handle, and email are required' });
        }
        
        const result = await pool.query(`
            INSERT INTO influencers (name, handle, email, wallet_address, followers_count, category, description, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [name, handle, email, wallet_address, followers_count, category, description, avatar_url]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({ error: 'Handle or email already exists' });
        } else {
            console.error('Error creating influencer:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// GET /api/portfolio/:userId - Get user's investments (placeholder for now)
router.get('/portfolio/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                i.name as influencer_name,
                i.handle,
                i.avatar_url,
                t.name as token_name,
                t.symbol,
                t.contract_address,
                inv.amount_invested_eth,
                inv.tokens_received,
                inv.purchase_price,
                inv.created_at as purchase_date
            FROM investments inv
            JOIN tokens t ON inv.token_id = t.id
            JOIN influencers i ON t.influencer_id = i.id
            WHERE inv.user_id = $1
            ORDER BY inv.created_at DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to format follower counts
function formatFollowers(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

module.exports = router;