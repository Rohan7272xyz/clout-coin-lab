// Backend/services/liquidityAutomationService.js
// Phase 5a: Service to automatically handle liquidity deployment after token creation
// Integrates with existing tokenCreationService and influencerRoutes

const { spawn } = require('child_process');
const path = require('path');
const db = require('../database/db');
const liquidityAutomationService = require('../services/liquidityAutomationService');

class LiquidityAutomationService {
  constructor() {
    this.LIQUIDITY_SETTINGS = {
      'base-sepolia': {
        defaultEthAmount: "0.05", // Conservative for testnet
        defaultTokenPercentage: 15, // 15% of total supply
        feeTier: 3000, // 0.3%
        minEthBalance: "0.1" // Minimum ETH needed
      },
      'base': {
        defaultEthAmount: "0.5", // Higher for mainnet
        defaultTokenPercentage: 10, // 10% of total supply  
        feeTier: 3000, // 0.3%
        minEthBalance: "1.0" // Minimum ETH needed
      }
    };
  }

  /**
   * Main automation function - called after token deployment
   */
  async createLiquidityForToken({
    tokenAddress,
    tokenSymbol,
    tokenName,
    totalSupply = 1000000,
    network = 'base-sepolia',
    influencerId,
    customSettings = {}
  }) {
    try {
      console.log(`\n🌊 Starting automated liquidity creation for ${tokenSymbol}`);
      console.log(`📍 Network: ${network}, Token: ${tokenAddress}`);

      // Get liquidity settings for this network
      const settings = {
        ...this.LIQUIDITY_SETTINGS[network],
        ...customSettings
      };

      // Validate prerequisites
      await this.validatePrerequisites(tokenAddress, network, settings);

      // Execute pool creation script
      const poolResult = await this.executePoolCreation({
        tokenAddress,
        tokenSymbol,
        tokenName,
        totalSupply,
        network,
        settings
      });

      // Update database with liquidity info
      await this.updateDatabaseWithLiquidity(influencerId, poolResult);

      // Log automation event
      await this.logLiquidityEvent(influencerId, poolResult);

      console.log(`✅ Automated liquidity creation completed for ${tokenSymbol}`);
      return {
        success: true,
        poolAddress: poolResult.poolAddress,
        liquidityTokenId: poolResult.liquidityTokenId,
        txHash: poolResult.txHash,
        ethAmount: poolResult.ethAmount,
        tokenAmount: poolResult.tokenAmount,
        explorerUrl: poolResult.explorerUrl,
        poolExplorerUrl: poolResult.poolExplorerUrl,
        message: `Liquidity pool created successfully for ${tokenSymbol}`
      };

    } catch (error) {
      console.error(`❌ Automated liquidity creation failed:`, error);
      
      // Log failure for debugging
      await this.logLiquidityFailure(influencerId, tokenAddress, error.message);
      
      throw new Error(`Liquidity automation failed: ${error.message}`);
    }
  }

  /**
   * Validate that we can create liquidity
   */
  async validatePrerequisites(tokenAddress, network, settings) {
    // Check if network is supported
    if (!this.LIQUIDITY_SETTINGS[network]) {
      throw new Error(`Unsupported network for liquidity automation: ${network}`);
    }

    // Additional validation could include:
    // - Wallet balance checks
    // - Gas price checks
    // - Network connectivity
    
    console.log(`✅ Prerequisites validated for ${network}`);
  }

  /**
   * Execute the pool creation script
   */
  async executePoolCreation({
    tokenAddress,
    tokenSymbol, 
    tokenName,
    totalSupply,
    network,
    settings
  }) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Executing pool creation script...`);

      const args = [
        'createUniswapV3Pool.js',
        tokenAddress,
        tokenSymbol,
        settings.defaultEthAmount,
        settings.defaultTokenPercentage.toString(),
        network
      ];

      const workingDir = path.join(__dirname, '..', 'scripts');
      
      console.log(`📦 Command: node ${args.join(' ')} in ${workingDir}`);

      const process = spawn('node', args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          HARDHAT_NETWORK: network 
        }
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`📤 Pool Creation: ${output.trim()}`);
      });

      process.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.log(`⚠️ Pool Warning: ${error.trim()}`);
      });

      process.on('close', (code) => {
        console.log(`🏁 Pool creation process finished with code: ${code}`);

        if (code === 0) {
          try {
            // Parse JSON result from stdout
            const resultMatch = stdout.match(/📦 RESULT_JSON:\s*\n*(\{[\s\S]*?\n\})/);
            
            if (resultMatch) {
              const result = JSON.parse(resultMatch[1]);
              resolve(result);
            } else {
              // Fallback: parse individual fields if JSON parsing fails
              const poolMatch = stdout.match(/📊 Pool Address: (0x[a-fA-F0-9]{40})/);
              const txMatch = stdout.match(/🔗 Transaction: (0x[a-fA-F0-9]{64})/);
              
              if (poolMatch) {
                resolve({
                  success: true,
                  poolAddress: poolMatch[1],
                  txHash: txMatch ? txMatch[1] : 'unknown',
                  ethAmount: settings.defaultEthAmount,
                  tokenAmount: Math.floor((totalSupply * settings.defaultTokenPercentage) / 100),
                  network: network,
                  fallbackParsing: true
                });
              } else {
                reject(new Error(`Pool creation succeeded but couldn't parse results: ${stdout}`));
              }
            }
          } catch (parseError) {
            reject(new Error(`Pool creation output parsing failed: ${parseError.message}. Output: ${stdout}`));
          }
        } else {
          const errorMsg = stderr || stdout || `Process failed with code ${code}`;
          reject(new Error(`Pool creation failed: ${errorMsg}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start pool creation process: ${error.message}`));
      });

      // Set timeout for pool creation
      setTimeout(() => {
        process.kill();
        reject(new Error('Pool creation timeout after 5 minutes'));
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Update database with liquidity information
   */
  async updateDatabaseWithLiquidity(influencerId, poolResult) {
    try {
      console.log(`💾 Updating database with liquidity info...`);

      // Update tokens table with pool information
      await db.query(`
        UPDATE tokens 
        SET 
          pool_address = $2,
          liquidity_token_id = $3,
          liquidity_eth_amount = $4,
          liquidity_token_amount = $5,
          liquidity_created_at = CURRENT_TIMESTAMP,
          liquidity_tx_hash = $6,
          status = 'trading'
        WHERE influencer_id = $1
      `, [
        influencerId,
        poolResult.poolAddress,
        poolResult.liquidityTokenId,
        poolResult.ethAmount,
        poolResult.tokenAmount,
        poolResult.txHash
      ]);

      // Update influencer status to indicate trading is live
      await db.query(`
        UPDATE influencers 
        SET 
          pool_address = $2,
          trading_status = 'live',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [influencerId, poolResult.poolAddress]);

      console.log(`✅ Database updated with liquidity information`);

    } catch (dbError) {
      console.error(`⚠️ Database update failed:`, dbError.message);
      // Don't fail the entire process if DB update fails
    }
  }

  /**
   * Log liquidity creation event
   */
  async logLiquidityEvent(influencerId, poolResult) {
    try {
      // Get influencer details for logging
      const influencerResult = await db.query(
        'SELECT * FROM influencers WHERE id = $1',
        [influencerId]
      );

      if (influencerResult.rows.length > 0) {
        const influencer = influencerResult.rows[0];

        await db.query(`
          INSERT INTO pledge_events (
            event_type, 
            influencer_address, 
            event_data, 
            created_at
          )
          VALUES ('liquidity_created', $1, $2, CURRENT_TIMESTAMP)
        `, [
          influencer.wallet_address,
          JSON.stringify({
            pool_address: poolResult.poolAddress,
            liquidity_token_id: poolResult.liquidityTokenId,
            eth_amount: poolResult.ethAmount,
            token_amount: poolResult.tokenAmount,
            tx_hash: poolResult.txHash,
            network: poolResult.network,
            automation_type: 'full_auto',
            created_at: new Date().toISOString()
          })
        ]);
      }
    } catch (logError) {
      console.error(`⚠️ Event logging failed:`, logError.message);
    }
  }

  /**
   * Log liquidity creation failure
   */
  async logLiquidityFailure(influencerId, tokenAddress, errorMessage) {
    try {
      await db.query(`
        INSERT INTO pledge_events (
          event_type, 
          influencer_address, 
          event_data, 
          created_at
        )
        VALUES ('liquidity_failed', $1, $2, CURRENT_TIMESTAMP)
      `, [
        'automation_system', // Use system identifier for failures
        JSON.stringify({
          influencer_id: influencerId,
          token_address: tokenAddress,
          error_message: errorMessage,
          automation_type: 'full_auto',
          failed_at: new Date().toISOString()
        })
      ]);
    } catch (logError) {
      console.error(`⚠️ Failure logging failed:`, logError.message);
    }
  }

  /**
   * Get liquidity status for a token
   */
  async getLiquidityStatus(influencerId) {
    try {
      const result = await db.query(`
        SELECT 
          i.name,
          i.token_symbol,
          i.wallet_address,
          i.trading_status,
          t.contract_address,
          t.pool_address,
          t.liquidity_token_id,
          t.liquidity_created_at,
          t.liquidity_eth_amount,
          t.liquidity_token_amount,
          t.network
        FROM influencers i
        LEFT JOIN tokens t ON i.id = t.influencer_id
        WHERE i.id = $1
      `, [influencerId]);

      if (result.rows.length === 0) {
        return { hasLiquidity: false, message: 'Influencer not found' };
      }

      const data = result.rows[0];
      
      return {
        hasLiquidity: !!data.pool_address,
        poolAddress: data.pool_address,
        liquidityTokenId: data.liquidity_token_id,
        ethAmount: data.liquidity_eth_amount,
        tokenAmount: data.liquidity_token_amount,
        createdAt: data.liquidity_created_at,
        tradingStatus: data.trading_status,
        network: data.network,
        tokenAddress: data.contract_address
      };

    } catch (error) {
      console.error(`❌ Error getting liquidity status:`, error);
      return { hasLiquidity: false, error: error.message };
    }
  }

  /**
   * Test the automation service
   */
  async test() {
    try {
      console.log(`🧪 Testing LiquidityAutomationService...`);
      
      const supportedNetworks = Object.keys(this.LIQUIDITY_SETTINGS);
      console.log(`📡 Supported networks: ${supportedNetworks.join(', ')}`);
      
      // Test database connectivity
      const dbTest = await db.query('SELECT 1 as test');
      console.log(`💾 Database connectivity: ✅`);
      
      return {
        success: true,
        supportedNetworks,
        liquiditySettings: this.LIQUIDITY_SETTINGS,
        databaseConnected: dbTest.rows.length > 0
      };
      
    } catch (error) {
      throw new Error(`Service test failed: ${error.message}`);
    }
  }
}

module.exports = new LiquidityAutomationService();