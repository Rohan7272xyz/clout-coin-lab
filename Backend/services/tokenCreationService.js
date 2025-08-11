// Backend/services/tokenCreationService.js - Phase 4B: Enhanced for Real Token Deployment
// Service to handle Token Factory → Database integration with Network Support
const db = require('../database/db');

class TokenCreationService {
  constructor() {
    this.TOKEN_FACTORY_ADDRESS = "0x18594f5d4761b9DBEA625dDeD86356F6D346A09a";
    
    // Network configurations
    this.NETWORKS = {
      'base-sepolia': { chainId: 84532, name: 'Base Sepolia Testnet', ethPrice: 2000 },
      'base': { chainId: 8453, name: 'Base Mainnet', ethPrice: 2000 }
    };
  }

  /**
   * Handle token creation and sync with database
   * ENHANCED: Now supports real contract addresses and network-specific data
   */
  async createInfluencerToken({
    influencerId,
    tokenAddress,
    transactionHash,
    tokenName,
    tokenSymbol,
    totalSupply = 1000000,
    influencerAddress,
    network = 'base-sepolia',
    deployedBy,
    deploymentType = 'real' // 'real' or 'mock'
  }) {
    try {
      console.log(`🚀 Processing ${deploymentType} token creation for influencer:`, influencerId);
      console.log(`📍 Network: ${network}, Contract: ${tokenAddress}`);
      
      // Validate network
      const networkConfig = this.NETWORKS[network];
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`);
      }

      // Validate required fields
      if (!influencerId || !tokenAddress || !tokenName || !tokenSymbol) {
        throw new Error('Missing required fields for token creation');
      }

      // Start database transaction
      await db.query('BEGIN');

      // 1. Update influencer record with token details
      const updateInfluencerResult = await db.query(`
        UPDATE influencers 
        SET 
          wallet_address = COALESCE(wallet_address, $2),
          token_address = $3,
          token_name = $4,
          token_symbol = $5,
          token_total_supply = $6,
          status = 'live',
          launched_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [influencerId, influencerAddress, tokenAddress, tokenName, tokenSymbol, totalSupply]);

      if (updateInfluencerResult.rows.length === 0) {
        throw new Error('Influencer not found');
      }

      const influencer = updateInfluencerResult.rows[0];

      // 2. Create/update token entry in tokens table with network info
      const tokenResult = await db.query(`
        INSERT INTO tokens (
          influencer_id, name, ticker, status, contract_address, 
          chain_id, network, launched_at, total_supply, decimals,
          deployment_type, deployment_tx_hash, deployed_by
        )
        VALUES ($1, $2, $3, 'live', $4, $5, $6, CURRENT_TIMESTAMP, $7, 18, $8, $9, $10)
        ON CONFLICT (influencer_id) DO UPDATE SET
          contract_address = EXCLUDED.contract_address,
          chain_id = EXCLUDED.chain_id,
          network = EXCLUDED.network,
          deployment_type = EXCLUDED.deployment_type,
          deployment_tx_hash = EXCLUDED.deployment_tx_hash,
          deployed_by = EXCLUDED.deployed_by,
          launched_at = EXCLUDED.launched_at
        RETURNING id
      `, [
        influencerId, 
        tokenName, 
        tokenSymbol, 
        tokenAddress, 
        networkConfig.chainId, 
        network,
        totalSupply, 
        deploymentType,
        transactionHash,
        deployedBy
      ]);

      const tokenId = tokenResult.rows[0].id;

      // 3. Create initial analytics entries with network-aware data
      await this.createInitialAnalyticsData(tokenId, influencer, tokenAddress, network);

      // 4. Log creation event with enhanced data
      await db.query(`
        INSERT INTO pledge_events (
          event_type, influencer_address, event_data, created_at
        )
        VALUES ('token_deployed', $1, $2, CURRENT_TIMESTAMP)
      `, [
        influencerAddress,
        JSON.stringify({
          token_address: tokenAddress,
          token_name: tokenName,
          token_symbol: tokenSymbol,
          tx_hash: transactionHash,
          network: network,
          chain_id: networkConfig.chainId,
          deployment_type: deploymentType,
          deployed_by: deployedBy,
          launched_at: new Date().toISOString(),
          total_supply: totalSupply
        })
      ]);

      await db.query('COMMIT');
      console.log(`✅ ${deploymentType} token creation processed successfully on ${network}`);
      
      return {
        success: true,
        tokenId,
        tokenAddress,
        network,
        chainId: networkConfig.chainId,
        influencer: updateInfluencerResult.rows[0]
      };

    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Error processing token creation:', error);
      throw error;
    }
  }

  /**
   * LEGACY: Handle token creation (for backward compatibility)
   * Redirects to new createInfluencerToken method
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
    createdBy,
    network = 'local'
  }) {
    return this.createInfluencerToken({
      influencerId,
      tokenAddress,
      transactionHash: txHash,
      tokenName,
      tokenSymbol,
      totalSupply,
      influencerAddress: influencerWallet,
      network,
      deployedBy: createdBy,
      deploymentType: 'legacy'
    });
  }

  /**
   * Create initial analytics data for new token
   * ENHANCED: Network-aware pricing and explorer links
   */
  async createInitialAnalyticsData(tokenId, influencer, tokenAddress, network = 'local') {
    const networkConfig = this.NETWORKS[network];
    const initialPrice = this.calculateInitialPrice(influencer, network);
    
    try {
      // 1. Token reference data with network info
      await db.query(`
        INSERT INTO token_reference (
          token_id, name, ticker, contract_address, chain_id, network,
          launch_date, description, category, explorer_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9)
        ON CONFLICT (token_id) DO UPDATE SET
          contract_address = EXCLUDED.contract_address,
          chain_id = EXCLUDED.chain_id,
          network = EXCLUDED.network,
          explorer_url = EXCLUDED.explorer_url,
          launch_date = EXCLUDED.launch_date
      `, [
        tokenId, 
        influencer.token_name, 
        influencer.token_symbol, 
        tokenAddress,
        networkConfig.chainId,
        network,
        influencer.description || `Token for ${influencer.name}`,
        influencer.category || 'Content Creator',
        this.getExplorerUrl(tokenAddress, network)
      ]);

      // 2. Initial real-time quote with network-adjusted pricing
      const circulatingSupply = parseFloat(influencer.token_total_supply || 1000000) * 0.7;
      const marketCap = initialPrice * circulatingSupply;

      await db.query(`
        INSERT INTO token_quotes_realtime (
          token_id, captured_at, price_usd, day_open, day_high, day_low, 
          prev_close, volume_24h_usd, market_cap_usd, circ_supply, 
          total_supply, market_status, network, chain_id
        )
        VALUES ($1, NOW(), $2, $2, $2, $2, $2, 0, $3, $4, $5, 'open', $6, $7)
        ON CONFLICT (token_id) DO UPDATE SET
          price_usd = EXCLUDED.price_usd,
          market_cap_usd = EXCLUDED.market_cap_usd,
          network = EXCLUDED.network,
          chain_id = EXCLUDED.chain_id
      `, [
        tokenId,
        initialPrice,
        marketCap,
        circulatingSupply,
        parseFloat(influencer.token_total_supply || 1000000),
        network,
        networkConfig.chainId
      ]);

      // 3. Initial performance data (unchanged)
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

      // 4. Initial daily stats with network info
      await db.query(`
        INSERT INTO token_stats_daily (
          token_id, date, avg_volume_30d, volatility_30d, 
          holders_count, top10_concentration_pct, network
        )
        VALUES ($1, CURRENT_DATE, 0, 0, 1, 30.0, $2)
        ON CONFLICT (token_id, date) DO UPDATE SET
          holders_count = EXCLUDED.holders_count,
          network = EXCLUDED.network
      `, [tokenId, network]);

      // 5. Initial news entry with deployment details
      const newsTitle = `${influencer.token_name} (${influencer.token_symbol}) Launches on ${networkConfig.name}`;
      const newsSummary = network === 'local' 
        ? `${influencer.name} has successfully deployed their test token ${influencer.token_name} on the local development network for testing purposes.`
        : `${influencer.name} has successfully launched their token ${influencer.token_name} on ${networkConfig.name} after meeting their pledge threshold. The token is now available for trading.`;

      await db.query(`
        INSERT INTO token_news (
          token_id, published_at, source, title, summary, news_type, 
          metadata
        )
        VALUES ($1, NOW(), 'CoinFluence', $2, $3, 'launch', $4)
        ON CONFLICT (token_id, published_at, source) DO NOTHING
      `, [
        tokenId,
        newsTitle,
        newsSummary,
        JSON.stringify({
          network: network,
          chain_id: networkConfig.chainId,
          contract_address: tokenAddress,
          deployment_type: 'real'
        })
      ]);

      console.log(`✅ Initial analytics data created for token ${tokenId} on ${network}`);

    } catch (analyticsError) {
      console.warn(`⚠️ Some analytics tables may not exist yet:`, analyticsError.message);
      // Don't fail the entire process if analytics tables don't exist
    }
  }

  /**
   * Calculate initial token price based on pledged amounts
   * ENHANCED: Network-aware ETH pricing
   */
  calculateInitialPrice(influencer, network = 'local') {
    const networkConfig = this.NETWORKS[network];
    const ethPrice = networkConfig?.ethPrice || 2000;
    
    const totalPledgedETH = parseFloat(influencer.total_pledged_eth || 0);
    const totalPledgedUSDC = parseFloat(influencer.total_pledged_usdc || 0);
    const totalSupply = parseFloat(influencer.token_total_supply || 1000000);
    
    // Calculate total value in USD
    const totalValueUSD = (totalPledgedETH * ethPrice) + totalPledgedUSDC;
    
    // Initial price = total pledged value / (70% of total supply)
    const circulatingSupply = totalSupply * 0.7;
    const calculatedPrice = totalValueUSD > 0 ? totalValueUSD / circulatingSupply : 0.001;
    
    // Different minimum prices for different networks
    const minPrice = network === 'base' ? 0.01 : 0.001; // Higher min for mainnet
    
    return Math.max(calculatedPrice, minPrice);
  }

  /**
   * Get blockchain explorer URL for the token
   */
  getExplorerUrl(tokenAddress, network) {
    const explorerMap = {
      'base-sepolia': `https://sepolia.basescan.org/token/${tokenAddress}`,
      'base': `https://basescan.org/token/${tokenAddress}`
    };

    return explorerMap[network] || null;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(network) {
    return this.NETWORKS[network] || this.NETWORKS['base-sepolia'];
  }

  /**
   * Validate if a contract address is real (not a mock)
   */
  isRealContractAddress(tokenAddress) {
    // Mock addresses usually follow patterns like 0x5FbDB... (Hardhat default) or random hex
    const hardhatDefaultPattern = /^0x5FbDB2315678afecb367f032d93F642f64180aa3$/i;
    const shortMockPattern = /^0x[0-9a-f]{8,20}$/i; // Suspiciously short addresses
    
    if (hardhatDefaultPattern.test(tokenAddress)) {
      return false; // Hardhat default deployment address
    }
    
    if (tokenAddress.length < 42) {
      return false; // Too short to be a real address
    }
    
    return true; // Likely a real contract address
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
   * ENHANCED: Returns network-aware preparation data
   */
  async prepareTokenCreation(influencerId, network = 'base-sepolia') {
    try {
      const influencerResult = await db.query(`
        SELECT * FROM influencers 
        WHERE id = $1 AND status != 'live'
      `, [influencerId]);

      if (influencerResult.rows.length === 0) {
        throw new Error('Influencer not found or already has a live token');
      }

      const influencer = influencerResult.rows[0];
      const networkConfig = this.getNetworkConfig(network);

      // For real deployment, ensure we have required data
      if (!influencer.wallet_address) {
        throw new Error('Wallet address required for blockchain deployment');
      }

      // Return data ready for token creation
      return {
        influencerId: influencer.id,
        name: influencer.token_name || `${influencer.name} Token`,
        symbol: influencer.token_symbol || influencer.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
        influencerName: influencer.name,
        influencerWallet: influencer.wallet_address,
        totalSupply: "1000000", // 1M tokens
        network: network,
        chainId: networkConfig.chainId,
        networkName: networkConfig.name,
        influencer
      };
    } catch (error) {
      console.error('❌ Error preparing token creation:', error);
      throw error;
    }
  }

  /**
   * Update influencer card state after token creation
   * ENHANCED: Network-aware state calculation
   */
  async updateInfluencerCardState(influencerId) {
    try {
      const result = await db.query(`
        SELECT 
          i.*,
          t.contract_address as token_address,
          t.network as token_network,
          t.chain_id as token_chain_id,
          t.deployment_type,
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

      if (result.rows.length === 0) {
        throw new Error('Influencer not found');
      }

      const data = result.rows[0];
      
      // Add network info to response
      if (data.token_network) {
        data.network_info = this.getNetworkConfig(data.token_network);
        data.explorer_url = this.getExplorerUrl(data.token_address, data.token_network);
        data.is_real_deployment = this.isRealContractAddress(data.token_address);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating card state:', error);
      throw error;
    }
  }

  /**
   * Test method to verify service is working
   * ENHANCED: Network connectivity testing
   */
  async test() {
    try {
      const [influencersResult, tokensResult] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM influencers'),
        db.query(`
          SELECT COUNT(*) as count, 
                 COUNT(CASE WHEN network = 'local' THEN 1 END) as local_count,
                 COUNT(CASE WHEN network = 'base-sepolia' THEN 1 END) as testnet_count,
                 COUNT(CASE WHEN network = 'base' THEN 1 END) as mainnet_count
          FROM tokens
        `).catch(() => ({ rows: [{ count: 0, local_count: 0, testnet_count: 0, mainnet_count: 0 }] }))
      ]);

      const tokensStats = tokensResult.rows[0];

      return {
        success: true,
        message: 'TokenCreationService is working with network support',
        stats: {
          influencers_count: influencersResult.rows[0].count,
          tokens_total: tokensStats.count,
          tokens_local: tokensStats.local_count,
          tokens_testnet: tokensStats.testnet_count,
          tokens_mainnet: tokensStats.mainnet_count
        },
        supported_networks: Object.keys(this.NETWORKS)
      };
    } catch (error) {
      throw new Error(`Service test failed: ${error.message}`);
    }
  }
}

module.exports = new TokenCreationService();