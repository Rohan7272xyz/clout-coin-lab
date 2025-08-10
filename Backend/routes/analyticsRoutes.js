const express = require('express');
const router = express.Router();
const pool = require('../database/db');

/**
 * GET /api/analytics/:tokenId/performance
 * Returns performance data for different time horizons
 * Maps to: mv_coin_performance materialized view
 */
router.get('/:tokenId/performance', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Updated query to match actual mv_coin_performance columns
    const performanceQuery = `
      SELECT 
        token_id,
        return_1d,
        return_5d,
        return_1m,
        return_3m,
        return_6m,
        return_ytd,
        return_1y,
        return_3y,
        return_5y,
        return_max
      FROM mv_coin_performance 
      WHERE token_id = $1
    `;
    
    const result = await pool.query(performanceQuery, [tokenId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No performance data found',
        message: `No performance data available for token ID ${tokenId}` 
      });
    }
    
    const perf = result.rows[0];
    
    const response = {
      tokenId: parseInt(tokenId),
      returns: {
        '1D': parseFloat(perf.return_1d || 0),
        '5D': parseFloat(perf.return_5d || 0),
        '1M': parseFloat(perf.return_1m || 0),
        '3M': parseFloat(perf.return_3m || 0),
        '6M': parseFloat(perf.return_6m || 0),
        'YTD': parseFloat(perf.return_ytd || 0),
        '1Y': parseFloat(perf.return_1y || 0),
        '3Y': parseFloat(perf.return_3y || 0),
        '5Y': parseFloat(perf.return_5y || 0),
        'MAX': parseFloat(perf.return_max || 0)
      },
      // Risk metrics not available in this view, set to defaults
      riskMetrics: {
        volatility30d: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      },
      lastUpdated: new Date().toISOString() // Use current time since not in view
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching performance data:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch performance data',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/:tokenId/statistics
 * Returns market statistics for the statistics grid
 * Maps to: token_stats_daily table
 */
router.get('/:tokenId/statistics', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Updated query to match actual token_stats_daily columns
    const statsQuery = `
      SELECT 
        token_id,
        date,
        avg_volume_10d,
        avg_volume_30d,
        week_52_high,
        week_52_low,
        all_time_high,
        all_time_high_date,
        all_time_low,
        all_time_low_date,
        volatility_30d,
        volatility_90d,
        sharpe_30d
      FROM token_stats_daily 
      WHERE token_id = $1
      ORDER BY date DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(statsQuery, [tokenId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No statistics found',
        message: `No statistics data available for token ID ${tokenId}` 
      });
    }
    
    const stats = result.rows[0];
    
    const response = {
      tokenId: parseInt(tokenId),
      marketData: {
        avgVolume10d: parseFloat(stats.avg_volume_10d || 0),
        avgVolume30d: parseFloat(stats.avg_volume_30d || 0)
      },
      priceData: {
        high52w: parseFloat(stats.week_52_high || 0),
        low52w: parseFloat(stats.week_52_low || 0),
        allTimeHigh: parseFloat(stats.all_time_high || 0),
        allTimeHighDate: stats.all_time_high_date,
        allTimeLow: parseFloat(stats.all_time_low || 0),
        allTimeLowDate: stats.all_time_low_date
      },
      riskMetrics: {
        volatility30d: parseFloat(stats.volatility_30d || 0),
        volatility90d: parseFloat(stats.volatility_90d || 0),
        sharpe30d: parseFloat(stats.sharpe_30d || 0)
      },
      lastUpdated: stats.date
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch statistics data',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/:tokenId/news
 * Returns news articles for the news feed
 * Maps to: token_news table
 */
router.get('/:tokenId/news', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    // Updated query to match actual token_news columns
    const newsQuery = `
      SELECT 
        id,
        token_id,
        published_at,
        source,
        title,
        url,
        summary,
        content,
        thumbnail_url,
        news_type,
        sentiment_score,
        importance_score,
        created_at
      FROM token_news 
      WHERE token_id = $1
      ORDER BY published_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(newsQuery, [tokenId, limit, offset]);
    
    const articles = result.rows.map(article => ({
      id: article.id,
      tokenId: article.token_id,
      headline: article.title,  // Using title column
      summary: article.summary,
      content: article.content,
      source: article.source,
      author: null, // Not available in this table
      publishedAt: article.published_at,
      url: article.url,
      imageUrl: article.thumbnail_url,  // Using thumbnail_url
      newsType: article.news_type,
      sentiment: parseFloat(article.sentiment_score || 0),
      importance: parseInt(article.importance_score || 1),
      createdAt: article.created_at,
      // Calculate time ago for display
      timeAgo: getTimeAgo(article.published_at)
    }));
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM token_news WHERE token_id = $1`;
    const countResult = await pool.query(countQuery, [tokenId]);
    const totalArticles = parseInt(countResult.rows[0].total);
    
    const response = {
      tokenId: parseInt(tokenId),
      articles,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalArticles,
        hasMore: (parseInt(offset) + parseInt(limit)) < totalArticles
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching news:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch news data',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/:tokenId/profile
 * Returns token profile/company overview data
 * Maps to: token_reference table
 */
router.get('/:tokenId/profile', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Updated query to match actual token_reference columns
    const profileQuery = `
      SELECT 
        token_id,
        name,
        ticker,
        contract_address,
        chain_id,
        launch_date,
        status,
        description,
        website_url,
        whitepaper_url,
        logo_url,
        category,
        headquarters
      FROM token_reference 
      WHERE token_id = $1
    `;
    
    const result = await pool.query(profileQuery, [tokenId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Token profile not found',
        message: `No profile data available for token ID ${tokenId}` 
      });
    }
    
    const profile = result.rows[0];
    
    const response = {
      tokenId: profile.token_id,
      basic: {
        symbol: profile.ticker,  // Using ticker column
        name: profile.name,
        description: profile.description,
        category: profile.category,
        logoUrl: profile.logo_url,
        headquarters: profile.headquarters,
        status: profile.status
      },
      links: {
        website: profile.website_url,
        whitepaper: profile.whitepaper_url,
        // Social links not available in this table
        github: null,
        twitter: null,
        discord: null,
        telegram: null
      },
      technical: {
        blockchain: profile.chain_id === 1 ? 'Ethereum' : `Chain ID ${profile.chain_id}`,
        contractAddress: profile.contract_address,
        launchDate: profile.launch_date,
        chainId: profile.chain_id
      },
      timestamps: {
        launchDate: profile.launch_date
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch profile data',
      details: error.message
    });
  }
});

/**
 * Utility function to calculate time ago
 */
function getTimeAgo(timestamp) {
  const now = new Date();
  const published = new Date(timestamp);
  const diffMs = now - published;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

module.exports = router;