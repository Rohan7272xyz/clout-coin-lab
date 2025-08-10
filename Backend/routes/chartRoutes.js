const express = require('express');
const router = express.Router();
const pool = require('../database/db');

/**
 * GET /api/chart/:tokenId/:range
 * Returns OHLCV chart data for different time ranges
 * Supports: 1D, 5D, 1M, 3M, 6M, 1Y, ALL
 * Maps to: ohlcv_1m, ohlcv_5m, ohlcv_1h, ohlcv_1d tables
 */
router.get('/:tokenId/:range', async (req, res) => {
  try {
    const { tokenId, range } = req.params;
    
    // Determine table and limit based on range
    const getTableAndLimit = (range) => {
      switch (range.toUpperCase()) {
        case '1D':
          return { table: 'ohlcv_1h', limit: 24 }; // 24 hours
        case '5D':
          return { table: 'ohlcv_1h', limit: 120 }; // 5 days * 24 hours
        case '1M':
          return { table: 'ohlcv_1d', limit: 30 }; // 30 days
        case '3M':
          return { table: 'ohlcv_1d', limit: 90 }; // 90 days
        case '6M':
          return { table: 'ohlcv_1d', limit: 180 }; // 180 days
        case '1Y':
          return { table: 'ohlcv_1d', limit: 365 }; // 365 days
        case 'ALL':
          return { table: 'ohlcv_1d', limit: null }; // No limit
        default:
          return { table: 'ohlcv_1h', limit: 24 }; // Default to 1D
      }
    };
    
    const { table, limit } = getTableAndLimit(range);
    
    // Build query with corrected column names (ts instead of timestamp)
    let chartQuery = `
      SELECT 
        ts,
        open_price,
        high_price,
        low_price,
        close_price,
        volume,
        volume_usd
      FROM ${table}
      WHERE token_id = $1
      ORDER BY ts ASC
    `;
    
    if (limit) {
      chartQuery += ` LIMIT ${limit}`;
    }
    
    const result = await pool.query(chartQuery, [tokenId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No chart data found',
        message: `No ${range} chart data available for token ID ${tokenId}` 
      });
    }
    
    // Format data for frontend chart components
    const chartData = result.rows.map(row => ({
      timestamp: new Date(row.ts).getTime(), // Unix timestamp for charts
      time: row.ts, // ISO string for display
      open: parseFloat(row.open_price),
      high: parseFloat(row.high_price),
      low: parseFloat(row.low_price),
      close: parseFloat(row.close_price),
      volume: parseFloat(row.volume || 0),
      volumeUsd: parseFloat(row.volume_usd || 0)
    }));
    
    // Calculate additional metrics for the range
    const prices = chartData.map(d => d.close);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceChange = lastPrice - firstPrice;
    const priceChangePercent = ((priceChange / firstPrice) * 100);
    
    const response = {
      tokenId: parseInt(tokenId),
      range: range.toUpperCase(),
      dataPoints: chartData.length,
      data: chartData,
      summary: {
        firstPrice,
        lastPrice,
        priceChange: parseFloat(priceChange.toFixed(6)),
        priceChangePercent: parseFloat(priceChangePercent.toFixed(2)),
        high: Math.max(...prices),
        low: Math.min(...prices),
        avgVolume: chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching chart data:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch chart data',
      details: error.message
    });
  }
});

/**
 * GET /api/chart/:tokenId/ranges
 * Returns available time ranges for a token
 */
router.get('/:tokenId/ranges', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Check what data is available across different tables
    const queries = [
      { range: '1H', table: 'ohlcv_1m', description: '1 minute intervals' },
      { range: '1D', table: 'ohlcv_1h', description: '1 hour intervals' },
      { range: '1W', table: 'ohlcv_1h', description: '1 hour intervals' },
      { range: '1M', table: 'ohlcv_1d', description: '1 day intervals' },
      { range: '1Y', table: 'ohlcv_1d', description: '1 day intervals' }
    ];
    
    const availableRanges = [];
    
    for (const { range, table, description } of queries) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${table} WHERE token_id = $1`,
          [tokenId]
        );
        
        if (result.rows[0].count > 0) {
          availableRanges.push({
            range,
            table,
            description,
            dataPoints: parseInt(result.rows[0].count)
          });
        }
      } catch (err) {
        // Table might not exist, skip
        console.log(`Table ${table} not found, skipping...`);
        continue;
      }
    }
    
    res.json({
      tokenId: parseInt(tokenId),
      availableRanges
    });
    
  } catch (error) {
    console.error('Error fetching available ranges:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available ranges',
      details: error.message 
    });
  }
});

module.exports = router;