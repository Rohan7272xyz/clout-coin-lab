const express = require('express');
const router = express.Router();
const pool = require('../database/db');

/**
 * GET /api/quotes/:tokenId
 * Returns real-time quote data for CoinDetail header
 * Maps to: mv_coin_overview materialized view
 */
router.get('/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Updated query to match actual column names from your materialized view
    const quoteQuery = `
      SELECT 
        token_id,
        ticker,
        name,
        current_price,
        day_high,
        day_low,
        prev_close,
        price_change_pct_24h,
        market_cap_usd,
        volume_24h_usd,
        circ_supply,
        total_supply,
        quote_time
      FROM mv_coin_overview 
      WHERE token_id = $1
    `;
    
    const result = await pool.query(quoteQuery, [tokenId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Token not found',
        message: `No quote data available for token ID ${tokenId}` 
      });
    }
    
    const quote = result.rows[0];
    
    // Calculate 24h price change from current price and previous close
    const currentPrice = parseFloat(quote.current_price || 0);
    const prevClose = parseFloat(quote.prev_close || 0);
    const priceChange24h = currentPrice - prevClose;
    
    // Format response for frontend consumption
    const response = {
      tokenId: quote.token_id,
      symbol: quote.ticker,  // Using ticker column
      name: quote.name,
      price: currentPrice,
      change24h: priceChange24h,
      changePercent24h: parseFloat(quote.price_change_pct_24h || 0),
      dayHigh: parseFloat(quote.day_high || 0),
      dayLow: parseFloat(quote.day_low || 0),
      prevClose: parseFloat(quote.prev_close || 0),
      marketCap: parseFloat(quote.market_cap_usd || 0),
      volume24h: parseFloat(quote.volume_24h_usd || 0),
      circulatingSupply: parseFloat(quote.circ_supply || 0),
      totalSupply: parseFloat(quote.total_supply || 0),
      lastUpdated: quote.quote_time,
      // Additional calculated fields for frontend
      priceDirection: quote.price_change_pct_24h > 0 ? 'up' : 
                     quote.price_change_pct_24h < 0 ? 'down' : 'neutral'
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching quote:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch quote data',
      details: error.message
    });
  }
});

/**
 * GET /api/quotes/:tokenId/mini
 * Returns minimal quote data for quick updates
 * Used for real-time price tickers
 */
router.get('/:tokenId/mini', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Check if quotes_realtime table exists, fallback to mv_coin_overview
    const miniQuery = `
      SELECT 
        current_price,
        price_change_pct_24h,
        quote_time
      FROM mv_coin_overview 
      WHERE token_id = $1
    `;
    
    const result = await pool.query(miniQuery, [tokenId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    const quote = result.rows[0];
    
    res.json({
      price: parseFloat(quote.current_price),
      changePercent: parseFloat(quote.price_change_pct_24h || 0),
      lastUpdated: quote.quote_time
    });
    
  } catch (error) {
    console.error('Error fetching mini quote:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mini quote',
      details: error.message 
    });
  }
});

module.exports = router;