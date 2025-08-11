// Backend/services/tokenCreationService.js
// Service to handle Token Factory → Database integration (Fixed - No Ethers)

const db = require('../database/db');

class TokenCreationService {
  constructor() {
    this.TOKEN_FACTORY_ADDRESS = "0x18594f5d4761b9DBEA625dDeD86356F6D346A09a";
  }

  /**
   * Handle token creation and sync with database
   * Called after successful smart contract deployment
   */
  async handleTokenCreation({
    influencerId,
    tokenAddress,
    txHash,
    tokenName,
    tokenSymbol,
    influencerName,
    influencerWallet,
    totalSupply,
    createdBy
  }) {
    try {
      console.log('🚀 Processing token creation for influencer:', influencerId);
      
      // Start database transaction
      await db.query('BEGIN');

      // 1. Update influencer record with token details
      const updateInfluencerResult = await db.query(`
        UPDATE influencers 
        SET 
          token_address = $2,
          token_name = $3,
          token_symbol = $4,
          token_total_supply = $5,
          status = 'live',
          launched_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [influencerId, tokenAddress, tokenName, tokenSymbol, totalSupply]);

      if (updateInfluencerResult.rows.length === 0) {
        throw new Error('Influencer not found');
      }

      const influencer = updateInfluencerResult.rows[0];

      // 2. Create token entry in tokens table
      const tokenResult = await db.query(`
        INSERT INTO tokens (
          influencer_id, name, ticker, status, contract_address, 
          chain_id, launched_at, total_supply, decimals
        )
        VALUES ($1, $2, $3, 'live', $4, 84532, CURRENT_TIMESTAMP, $5, 18)
        RETURNING id
      `, [influencerId, tokenName, tokenSymbol, tokenAddress, totalSupply]);

      const tokenId = tokenResult.rows[0].id;

      // 3. Create initial analytics entries
      await this.createInitialAnalyticsData(tokenId, influencer, tokenAddress);

      // 4. Log creation event
      await db.query(`
        INSERT INTO pledge_events (
          event_type, influencer_address, event_data, created_at
        )
        VALUES ('launched', $1, $2, CURRENT_TIMESTAMP)
      `, [
        influencerWallet,
        JSON.stringify({
          token_address: tokenAddress,
          token_name: tokenName,
          token_symbol: tokenSymbol,
          tx_hash: txHash,
          created_by: createdBy,
          launched_at: new Date().toISOString()
        })
      ]);

      await db.query('COMMIT');

      console.log('✅ Token creation processed successfully');
      
      return {
        success: true,
        tokenId,
        tokenAddress,
        influencer: updateInfluencerResult.rows[0]
      };

    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Error processing token creation:', error);
      throw error;
    }
  }

  /**
   * Create initial analytics data for new token
   */
  async createInitialAnalyticsData(tokenId, influencer, tokenAddress) {
    // Set initial price (could be calculated based on pledge amounts)
    const initialPrice = this.calculateInitialPrice(influencer);
    
    // 1. Token reference data
    await db.query(`
      INSERT INTO token_reference (
        token_id, name, ticker, contract_address, chain_id, 
        launch_date, description, category
      )
      VALUES ($1, $2, $3, $4, 84532, CURRENT_TIMESTAMP, $5, $6)
      ON CONFLICT (token_id) DO UPDATE SET
        contract_address = EXCLUDED.contract_address,
        launch_date = EXCLUDED.launch_date
    `, [
      tokenId, 
      influencer.token_name, 
      influencer.token_symbol, 
      tokenAddress,
      influencer.description || `Token for ${influencer.name}`,
      influencer.category || 'Content Creator'
    ]);

    // 2. Initial real-time quote
    await db.query(`
      INSERT INTO token_quotes_realtime (
        token_id, captured_at, price_usd, day_open, day_high, day_low, 
        prev_close, volume_24h_usd, market_cap_usd, circ_supply, 
        total_supply, market_status
      )
      VALUES ($1, NOW(), $2, $2, $2, $2, $2, 0, $3, $4, $5, 'open')
    `, [
      tokenId,
      initialPrice,
      initialPrice * parseFloat(influencer.token_total_supply) * 0.7, // Market cap (70% circulating)
      parseFloat(influencer.token_total_supply) * 0.7, // Circulating supply
      parseFloat(influencer.token_total_supply) // Total supply
    ]);

    // 3. Initial performance data
    const performanceData = [
      ['1D', 0], ['5D', 0], ['1M', 0], ['3M', 0], 
      ['6M', 0], ['YTD', 0], ['1Y', 0]
    ];

    for (const [horizon, returnPct] of performanceData) {
      await db.query(`
        INSERT INTO token_returns (token_id, horizon, return_pct, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (token_id, horizon) DO UPDATE SET
          return_pct = EXCLUDED.return_pct,
          updated_at = EXCLUDED.updated_at
      `, [tokenId, horizon, returnPct]);
    }

    // 4. Initial daily stats
    await db.query(`
      INSERT INTO token_stats_daily (
        token_id, date, avg_volume_30d, volatility_30d, 
        holders_count, top10_concentration_pct
      )
      VALUES ($1, CURRENT_DATE, 0, 0, 1, 30.0)
      ON CONFLICT (token_id, date) DO UPDATE SET
        holders_count = EXCLUDED.holders_count
    `, [tokenId]);

    // 5. Initial news entry
    await db.query(`
      INSERT INTO token_news (
        token_id, published_at, source, title, summary, news_type
      )
      VALUES ($1, NOW(), 'CoinFluence', $2, $3, 'press')
    `, [
      tokenId,
      `${influencer.token_name} (${influencer.token_symbol}) Launches on CoinFluence`,
      `${influencer.name} has successfully launched their token ${influencer.token_name} after meeting their pledge threshold. The token is now available for trading.`
    ]);

    console.log(`✅ Initial analytics data created for token ${tokenId}`);
  }

  /**
   * Calculate initial token price based on pledged amounts
   */
  calculateInitialPrice(influencer) {
    const totalPledgedETH = parseFloat(influencer.total_pledged_eth || 0);
    const totalPledgedUSDC = parseFloat(influencer.total_pledged_usdc || 0);
    const totalSupply = parseFloat(influencer.token_total_supply || 1000000);
    
    // Assume ETH = $2000 for calculation
    const totalValueUSD = (totalPledgedETH * 2000) + totalPledgedUSDC;
    
    // Initial price = total pledged value / (70% of total supply)
    // This gives tokens value based on what people pledged
    const circulatingSupply = totalSupply * 0.7;
    const initialPrice = totalValueUSD > 0 ? totalValueUSD / circulatingSupply : 0.001;
    
    return Math.max(initialPrice, 0.001); // Minimum price of $0.001
  }

  /**
   * Get influencer by wallet address for token creation
   */
  async getInfluencerByWallet(walletAddress) {
    const result = await db.query(
      'SELECT * FROM influencers WHERE wallet_address = $1',
      [walletAddress]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Influencer not found');
    }
    
    return result.rows[0];
  }

  /**
   * Process approved influencer for token creation
   * Called when admin clicks "Create Token" for an approved influencer
   */
  async prepareTokenCreation(influencerId) {
    try {
      const influencerResult = await db.query(`
        SELECT * FROM influencers 
        WHERE id = $1 AND is_approved = true AND status != 'live'
      `, [influencerId]);

      if (influencerResult.rows.length === 0) {
        throw new Error('Influencer not found or not approved');
      }

      const influencer = influencerResult.rows[0];

      // Check if threshold is met
      const ethThreshold = parseFloat(influencer.pledge_threshold_eth || 0);
      const usdcThreshold = parseFloat(influencer.pledge_threshold_usdc || 0);
      const totalEth = parseFloat(influencer.total_pledged_eth || 0);
      const totalUsdc = parseFloat(influencer.total_pledged_usdc || 0);

      const thresholdMet = (ethThreshold > 0 && totalEth >= ethThreshold) || 
                          (usdcThreshold > 0 && totalUsdc >= usdcThreshold);

      if (!thresholdMet) {
        throw new Error('Pledge threshold not met');
      }

      // Return data ready for token creation
      return {
        influencerId: influencer.id,
        name: influencer.token_name || `${influencer.name} Token`,
        symbol: influencer.token_symbol || influencer.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
        influencerName: influencer.name,
        influencerWallet: influencer.wallet_address,
        totalSupply: "1000000", // 1M tokens
        influencer
      };

    } catch (error) {
      console.error('❌ Error preparing token creation:', error);
      throw error;
    }
  }

  /**
   * Update influencer card state after token creation
   * This is what makes the card switch from "pre-investment" to "live trading"
   */
  async updateInfluencerCardState(influencerId) {
    try {
      // This query will be used by the frontend to determine card state
      const result = await db.query(`
        SELECT 
          i.*,
          t.contract_address as token_address,
          CASE 
            WHEN i.status = 'live' AND i.launched_at IS NOT NULL THEN 'live'
            WHEN i.is_approved = true THEN 'approved'
            WHEN (i.pledge_threshold_eth > 0 AND i.total_pledged_eth >= i.pledge_threshold_eth) OR
                 (i.pledge_threshold_usdc > 0 AND i.total_pledged_usdc >= i.pledge_threshold_usdc) THEN 'threshold_met'
            ELSE 'pledging'
          END as card_state
        FROM influencers i
        LEFT JOIN tokens t ON i.id = t.influencer_id
        WHERE i.id = $1
      `, [influencerId]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating card state:', error);
      throw error;
    }
  }

  /**
   * Test method to verify service is working
   */
  async test() {
    try {
      const result = await db.query('SELECT COUNT(*) as count FROM influencers');
      return {
        success: true,
        message: 'TokenCreationService is working',
        influencers_count: result.rows[0].count
      };
    } catch (error) {
      throw new Error(`Service test failed: ${error.message}`);
    }
  }
}

module.exports = new TokenCreationService();