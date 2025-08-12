// Backend/routes/influencerRoutes.js - Phase 4B: Real Token Deployment Integration + Enhanced Coin Details
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');
const tokenCreationService = require('../services/tokenCreationService');
const liquidityAutomationService = require('../services/liquidityAutomationService');
const { spawn } = require('child_process');
const path = require('path');

// Helper function to format followers - MOVED TO TOP TO FIX ERROR
function formatFollowers(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

// Middleware to verify authentication
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    
    // Get user from database
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 OR firebase_uid = $2',
      [decoded.email, decoded.uid]
    );
    
    if (result.rows.length > 0) {
      req.dbUser = result.rows[0];
    } else {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    next();
  } catch (err) {
    console.error('Authentication failed:', err);
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (req.dbUser?.status !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      current: req.dbUser?.status
    });
  }
  next();
};

// Helper function to deploy real token using Hardhat - FIXED VERSION
async function deployRealToken(tokenName, tokenSymbol, walletAddress, network = 'base-sepolia') {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Starting ${network} deployment: ${tokenName} (${tokenSymbol}) for ${walletAddress}`);
    
    // FIXED: Use environment variable approach instead of hardhat positional args
    let command, args, env;
    
    if (network === 'base' || network === 'base-sepolia') {
      command = 'node';
      args = ['scripts/deployInfluencerToken.js', tokenName, tokenSymbol, walletAddress];
      env = { 
        ...process.env, 
        HARDHAT_NETWORK: network // Set network via environment variable
      };
    } else {
      // Fallback to testnet for unsupported networks
      command = 'node';
      args = ['scripts/deployInfluencerToken.js', tokenName, tokenSymbol, walletAddress];
      env = { 
        ...process.env, 
        HARDHAT_NETWORK: 'base-sepolia'
      };
    }
    
    // Set working directory to Backend folder where Hardhat is configured
    const workingDir = path.join(__dirname, '..');
    
    console.log(`📦 Executing: HARDHAT_NETWORK=${network} ${command} ${args.join(' ')} in ${workingDir}`);
    
    const deployment = spawn(command, args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env // Use modified environment with HARDHAT_NETWORK
    });
    
    let stdout = '';
    let stderr = '';
    
    deployment.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`📤 Deployment output: ${output.trim()}`);
    });
    
    deployment.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      console.log(`⚠️ Deployment warning: ${error.trim()}`);
    });
    
    deployment.on('close', (code) => {
      console.log(`🏁 Deployment process finished with code: ${code}`);
      
      if (code === 0) {
        // Parse successful deployment output
        try {
          // Look for JSON output from deployment script - improved regex to handle multiline JSON
          const jsonMatch = stdout.match(/📦 DEPLOYMENT_RESULT_JSON:\s*\n*(\{[\s\S]*?\n\})/);
          
          if (jsonMatch) {
            // Clean up the JSON string by removing any console output mixed in
            let jsonString = jsonMatch[1];
            
            // Remove any console log lines that might be mixed in
            jsonString = jsonString.replace(/^\[dotenv.*$/gm, '');
            jsonString = jsonString.replace(/^🌐.*$/gm, '');
            jsonString = jsonString.replace(/^🔗.*$/gm, '');
            jsonString = jsonString.replace(/^🚀.*$/gm, '');
            jsonString = jsonString.replace(/^💰.*$/gm, '');
            jsonString = jsonString.replace(/^📝.*$/gm, '');
            jsonString = jsonString.replace(/^⏳.*$/gm, '');
            jsonString = jsonString.replace(/^🔄.*$/gm, '');
            jsonString = jsonString.replace(/^✅.*$/gm, '');
            jsonString = jsonString.replace(/^📍.*$/gm, '');
            jsonString = jsonString.replace(/^🔍.*$/gm, '');
            jsonString = jsonString.replace(/^📊.*$/gm, '');
            
            // Remove empty lines and trim
            jsonString = jsonString.replace(/^\s*$/gm, '').trim();
            
            console.log('🧹 Cleaned JSON string:', jsonString);
            
            const result = JSON.parse(jsonString);
            resolve({
              success: true,
              tokenAddress: result.tokenAddress,
              txHash: result.txHash,
              network: result.network,
              networkName: result.networkName,
              chainId: result.chainId,
              explorerUrl: result.explorerUrl,
              verification: result.verification,
              fullOutput: stdout
            });
          } else {
            // Fallback: Look for individual log lines
            const contractMatch = stdout.match(/📍 Contract address: (0x[a-fA-F0-9]{40})/);
            const txHashMatch = stdout.match(/🔗 Transaction hash: (0x[a-fA-F0-9]{64})/);
            
            if (contractMatch && txHashMatch) {
              resolve({
                success: true,
                tokenAddress: contractMatch[1],
                txHash: txHashMatch[1],
                network: network,
                fullOutput: stdout,
                note: 'Deployment succeeded but JSON parsing failed, using fallback'
              });
            } else {
              reject(new Error(`Deployment succeeded but couldn't parse contract details from output: ${stdout}`));
            }
          }
        } catch (parseError) {
          // Even if JSON parsing fails, try to extract key info manually
          console.log('⚠️ JSON parsing failed, trying manual extraction:', parseError.message);
          
          const contractMatch = stdout.match(/📍 Contract address: (0x[a-fA-F0-9]{40})/);
          const txHashMatch = stdout.match(/🔗 Transaction hash: (0x[a-fA-F0-9]{64})/);
          
          if (contractMatch && txHashMatch) {
            resolve({
              success: true,
              tokenAddress: contractMatch[1],
              txHash: txHashMatch[1],
              network: network,
              fullOutput: stdout,
              note: 'JSON parsing failed but manual extraction succeeded'
            });
          } else {
            reject(new Error(`Deployment succeeded but output parsing failed: ${parseError.message}. Output: ${stdout}`));
          }
        }
      } else {
        // Deployment failed
        const fullError = stderr || stdout || 'Unknown deployment error';
        console.log(`❌ Deployment failed with code ${code}:`, fullError);
        reject(new Error(`Deployment failed: ${fullError}`));
      }
    });
    
    deployment.on('error', (error) => {
      console.log(`💥 Deployment process error:`, error);
      reject(new Error(`Failed to start deployment process: ${error.message}`));
    });
    
    // Set a timeout for deployment
    setTimeout(() => {
      deployment.kill();
      reject(new Error('Deployment timeout after 2 minutes'));
    }, 120000); // 2 minutes timeout
  });
}

// ======================
// PUBLIC ENDPOINTS (No auth required)
// ======================

// GET /api/influencer - Get all influencers with optional filtering (PUBLIC)
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
    
    // Build the query with enhanced card state logic
    let query = `
      SELECT 
        i.*,
        t.contract_address as token_address,
        t.id as token_id,
        -- Enhanced card state determination
        CASE 
          WHEN i.status = 'live' AND i.launched_at IS NOT NULL THEN 'live'
          WHEN i.is_approved = true AND (
            (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
            (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          ) THEN 'ready_for_launch'
          WHEN i.is_approved = true THEN 'approved'
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 'threshold_met'
          WHEN i.status = 'pledging' THEN 'pledging'
          ELSE 'pending'
        END as card_state,
        -- Progress calculations
        CASE 
          WHEN i.pledge_threshold_eth > 0 THEN 
            ROUND((COALESCE(i.total_pledged_eth, 0) / i.pledge_threshold_eth * 100)::numeric, 1)
          ELSE 0 
        END as eth_progress,
        CASE 
          WHEN i.pledge_threshold_usdc > 0 THEN 
            ROUND((COALESCE(i.total_pledged_usdc, 0) / i.pledge_threshold_usdc * 100)::numeric, 1)
          ELSE 0 
        END as usdc_progress
      FROM influencers i
      LEFT JOIN tokens t ON i.id = t.influencer_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Add filters
    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      queryParams.push(status);
    }
    
    if (category) {
      paramCount++;
      query += ` AND i.category ILIKE $${paramCount}`;
      queryParams.push(`%${category}%`);
    }
    
    if (verified === 'true') {
      query += ` AND i.verified = true`;
    }
    
    if (live_only === 'true') {
      query += ` AND (i.status = 'live' OR i.launched_at IS NOT NULL)`;
    }
    
    if (pledging_only === 'true') {
      query += ` AND i.status = 'pledging'`;
    }
    
    // Add sorting with priority for card states
    query += ` ORDER BY 
      CASE 
        WHEN i.status = 'live' OR i.launched_at IS NOT NULL THEN 1
        WHEN i.is_approved = true AND (
          (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
          (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
        ) THEN 2
        WHEN i.is_approved = true THEN 3
        WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
             (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 4
        ELSE 5
      END,
      i.${sort_by} ${sort_order}
    `;
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    const result = await db.query(query, queryParams);
    
    // Transform data for both admin and public use
    const influencers = result.rows.map(row => {
      const overallProgress = Math.max(row.eth_progress || 0, row.usdc_progress || 0);
      
      return {
        // Basic info
        id: row.id,
        name: row.name,
        handle: row.handle,
        email: row.email,
        wallet_address: row.wallet_address || null, // Now nullable
        category: row.category,
        description: row.description,
        avatar_url: row.avatar_url,
        verified: row.verified,
        followers_count: row.followers_count,
        
        // Token info
        token_name: row.token_name,
        token_symbol: row.token_symbol,
        token_address: row.token_address,
        token_id: row.token_id,
        
        // Pledge info
        pledge_threshold_eth: row.pledge_threshold_eth || 0,
        pledge_threshold_usdc: row.pledge_threshold_usdc || 0,
        total_pledged_eth: row.total_pledged_eth || 0,
        total_pledged_usdc: row.total_pledged_usdc || 0,
        pledge_count: row.pledge_count || 0,
        
        // Status info
        status: row.status,
        card_state: row.card_state,
        is_approved: row.is_approved,
        is_launched: !!row.launched_at,
        launched_at: row.launched_at,
        
        // Progress
        eth_progress: row.eth_progress || 0,
        usdc_progress: row.usdc_progress || 0,
        overall_progress: overallProgress,
        
        // Trading data (if live)
        current_price: row.current_price,
        market_cap: row.market_cap,
        volume_24h: row.volume_24h,
        price_change_24h: row.price_change_24h,
        
        // Timestamps
        created_at: row.created_at,
        updated_at: row.updated_at,
        
        // Legacy fields for backward compatibility
        address: row.wallet_address || null,
        tokenName: row.token_name || `${row.name} Token`,
        symbol: row.token_symbol || row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
        totalPledgedETH: (row.total_pledged_eth || 0).toString(),
        totalPledgedUSDC: (row.total_pledged_usdc || 0).toString(),
        thresholdETH: (row.pledge_threshold_eth || 0).toString(),
        thresholdUSDC: (row.pledge_threshold_usdc || 0).toString(),
        pledgerCount: row.pledge_count || 0,
        thresholdMet: (row.card_state === 'threshold_met' || row.card_state === 'ready_for_launch'),
        isApproved: row.is_approved || false,
        isLaunched: !!row.launched_at,
        tokenAddress: row.token_address,
        createdAt: new Date(row.created_at).getTime(),
        launchedAt: row.launched_at ? new Date(row.launched_at).getTime() : null,
        avatar: row.avatar_url,
        followers: row.followers_count ? formatFollowers(row.followers_count) : null
      };
    });
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM influencers i WHERE 1=1';
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
      countQuery += ` AND (status = 'live' OR launched_at IS NOT NULL)`;
    }
    
    if (pledging_only === 'true') {
      countQuery += ` AND status = 'pledging'`;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: influencers,
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

// GET /api/influencer/:id - Get specific influencer by ID (PUBLIC)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        i.*,
        t.contract_address as token_address,
        t.id as token_id,
        CASE 
          WHEN i.status = 'live' AND i.launched_at IS NOT NULL THEN 'live'
          WHEN i.is_approved = true AND (
            (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
            (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          ) THEN 'ready_for_launch'
          WHEN i.is_approved = true THEN 'approved'
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 'threshold_met'
          WHEN i.status = 'pledging' THEN 'pledging'
          ELSE 'pending'
        END as card_state
      FROM influencers i
      LEFT JOIN tokens t ON i.id = t.influencer_id
      WHERE i.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    const row = result.rows[0];
    const influencer = {
      // Full data structure for both admin and public use
      id: row.id,
      name: row.name,
      handle: row.handle,
      email: row.email,
      walletAddress: row.wallet_address || null, // Now nullable
      category: row.category,
      description: row.description,
      avatar: row.avatar_url,
      verified: row.verified,
      followers: row.followers_count,
      tokenName: row.token_name,
      tokenSymbol: row.token_symbol,
      tokenAddress: row.token_address,
      tokenId: row.token_id,
      pledgeThresholdETH: row.pledge_threshold_eth || 0,
      pledgeThresholdUSDC: row.pledge_threshold_usdc || 0,
      totalPledgedETH: row.total_pledged_eth || 0,
      totalPledgedUSDC: row.total_pledged_usdc || 0,
      pledgeCount: row.pledge_count || 0,
      status: row.status,
      cardState: row.card_state,
      isApproved: row.is_approved,
      isLaunched: !!row.launched_at,
      launchedAt: row.launched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    res.json({
      success: true,
      data: influencer
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

// ======================
// ADMIN ENDPOINTS (Auth required)
// ======================

// POST /api/influencer - Create new influencer CARD (Admin only) - UPDATED: No wallet required
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      handle,
      email,
      category,
      description,
      followersCount,
      avatarUrl,
      pledgeThresholdETH,
      pledgeThresholdUSDC,
      verified = false,
      createCardOnly = false // Flag to indicate card-only creation
    } = req.body;
    
    // UPDATED: Only name, handle, and email are required for card creation
    if (!name || !handle || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name, handle, and email are required to create influencer card'
      });
    }
    
    console.log('📝 Creating influencer card (no wallet required):', { name, handle, email, createCardOnly });
    
    // Ensure handle starts with @
    const formattedHandle = handle.startsWith('@') ? handle : '@' + handle;
    
    // UPDATED: Insert without wallet_address requirement
    const result = await db.query(`
      INSERT INTO influencers (
        name, handle, email, category, description, 
        followers_count, pledge_threshold_eth, pledge_threshold_usdc,
        avatar_url, verified, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
      RETURNING *
    `, [
      name, 
      formattedHandle, 
      email, 
      category || 'general', 
      description || '',
      followersCount || 0, 
      pledgeThresholdETH || 0, 
      pledgeThresholdUSDC || 0,
      avatarUrl || '',
      verified, 
      req.user.uid
    ]);
    
    console.log(`✅ Created influencer card: ${name} (ID: ${result.rows[0].id}) - No wallet address required`);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Influencer card for ${name} created successfully! Card is now visible on PreInvest page.`,
      cardOnly: true // Flag to indicate this is just a card
    });
    
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      const detail = error.detail || '';
      if (detail.includes('handle')) {
        return res.status(400).json({ success: false, error: 'Handle already exists' });
      } else if (detail.includes('email')) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
      }
    }
    
    console.error('Error creating influencer card:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create influencer card',
      details: error.message 
    });
  }
});

// NEW: POST /api/influencer/:id/deploy-real-token - Deploy real token to blockchain (Admin only)
router.post('/:id/deploy-real-token', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      walletAddress, 
      tokenName,
      tokenSymbol,
      totalSupply = 1000000,
      network = 'base-sepolia' // Changed default to base-sepolia
    } = req.body;

    console.log(`🚀 Deploying REAL token for influencer ID: ${id} on ${network} network`);
    
    // Validate required fields
    if (!walletAddress || !tokenName || !tokenSymbol) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address, token name, and token symbol are required for real token deployment'
      });
    }

    // Get influencer details
    const influencerResult = await db.query('SELECT * FROM influencers WHERE id = $1', [id]);
    
    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Influencer not found' });
    }

    const influencer = influencerResult.rows[0];
    
    // Call real Hardhat deployment script - NOW USES FIXED VERSION
    const deploymentResult = await deployRealToken(tokenName, tokenSymbol, walletAddress, network);
    
    if (!deploymentResult.success) {
      throw new Error(deploymentResult.error || 'Token deployment failed');
    }

    console.log(`✅ Real token deployed successfully:`, deploymentResult);

    // Update influencer with wallet address and token details
    const updateResult = await db.query(`
      UPDATE influencers 
      SET 
        wallet_address = $2,
        token_name = $3,
        token_symbol = $4,
        status = 'live',
        launched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, walletAddress, tokenName, tokenSymbol]);

    // FIXED: Create token record in tokens table with correct schema
    try {
      await db.query(`
        INSERT INTO tokens (
          influencer_id, 
          name, 
          ticker, 
          status, 
          contract_address, 
          total_supply, 
          chain_id,
          network,
          launched_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (influencer_id) DO UPDATE SET
          name = EXCLUDED.name,
          ticker = EXCLUDED.ticker,
          status = EXCLUDED.status,
          contract_address = EXCLUDED.contract_address,
          total_supply = EXCLUDED.total_supply,
          chain_id = EXCLUDED.chain_id,
          network = EXCLUDED.network,
          launched_at = EXCLUDED.launched_at,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id,                                    // influencer_id
        tokenName,                            // name
        tokenSymbol,                          // ticker
        'live',                               // status
        deploymentResult.tokenAddress,        // contract_address
        totalSupply,                          // total_supply
        deploymentResult.chainId || 84532,    // chain_id (Base Sepolia)
        network                               // network
      ]);
      
      console.log(`✅ Token record created in database for ${tokenName}`);
    } catch (tokenError) {
      console.error('❌ Error creating token record:', tokenError.message);
      // Don't fail the entire deployment if token record creation fails
    }

    // Use tokenCreationService for comprehensive database updates
    try {
      await tokenCreationService.createInfluencerToken({
        influencerId: id,
        tokenName,
        tokenSymbol,
        tokenAddress: deploymentResult.tokenAddress,
        totalSupply,
        influencerAddress: walletAddress,
        transactionHash: deploymentResult.txHash,
        network,
        deployedBy: req.dbUser.email
      });
    } catch (serviceError) {
      console.log('Note: TokenCreationService may need updates for real deployment integration');
    }

    // Log token creation event
    await db.query(`
      INSERT INTO pledge_events (event_type, influencer_address, event_data)
      VALUES ('token_deployed', $1, $2)
    `, [
      walletAddress,
      JSON.stringify({
        deployed_by: req.dbUser.email,
        deployed_at: new Date().toISOString(),
        influencer_name: influencer.name,
        token_name: tokenName,
        token_symbol: tokenSymbol,
        token_address: deploymentResult.tokenAddress,
        tx_hash: deploymentResult.txHash,
        network: network,
        deployment_type: 'real_blockchain'
      })
    ]);

    console.log(`🎉 Real token deployment completed for ${influencer.name} on ${network}`);

    res.json({
      success: true,
      data: {
        influencer: updateResult.rows[0],
        tokenAddress: deploymentResult.tokenAddress,
        txHash: deploymentResult.txHash,
        network: network,
        deploymentType: 'real_blockchain'
      },
      message: `Real token ${tokenSymbol} deployed successfully to ${network} blockchain for ${influencer.name}`
    });

  } catch (error) {
    console.error('❌ Error deploying real token:', error);
    
    // Enhanced error handling for common blockchain deployment issues
    let errorMessage = error.message || 'Failed to deploy real token';
    let statusCode = 500;

    if (error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for deployment. Please add testnet ETH to your wallet.';
      statusCode = 400;
    } else if (error.message.includes('network')) {
      errorMessage = 'Network connectivity issue. Please check your network configuration.';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Deployment timeout. The transaction may still be pending.';
      statusCode = 408;
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: error.message,
      network: req.body.network || 'unknown'
    });
  }
});

// PUT /api/influencer/:id - Update influencer (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    delete updates.updated_at;
    delete updates.is_approved; // Use separate approval endpoint
    delete updates.launched_at; // Set automatically
    
    // If handle is being updated, ensure it starts with @
    if (updates.handle && !updates.handle.startsWith('@')) {
      updates.handle = '@' + updates.handle;
    }
    
    // Convert camelCase to snake_case for database fields
    const dbFields = {
      walletAddress: 'wallet_address',
      pledgeThresholdETH: 'pledge_threshold_eth',
      pledgeThresholdUSDC: 'pledge_threshold_usdc',
      tokenName: 'token_name',
      tokenSymbol: 'token_symbol',
      followers: 'followers_count',
      followersCount: 'followers_count',
      avatarUrl: 'avatar_url'
    };
    
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      const dbKey = dbFields[key] || key;
      dbUpdates[dbKey] = updates[key];
    });
    
    // Build dynamic UPDATE query
    const setClause = Object.keys(dbUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    if (!setClause) {
      return res.status(400).json({ 
        success: false, 
        error: 'No updates provided' 
      });
    }
    
    const values = [id, ...Object.values(dbUpdates)];
    
    const result = await db.query(
      `UPDATE influencers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    console.log(`✅ Influencer ${result.rows[0].name} updated successfully`);
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

// POST /api/influencer/:id/approve - Approve influencer (Admin only)
router.post('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✅ Approving influencer ID: ${id}`);
    
    // Get influencer details and check if threshold is met
    const influencerResult = await db.query(`
      SELECT *,
        CASE 
          WHEN (pledge_threshold_eth > 0 AND COALESCE(total_pledged_eth, 0) >= pledge_threshold_eth) OR
               (pledge_threshold_usdc > 0 AND COALESCE(total_pledged_usdc, 0) >= pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met
      FROM influencers 
      WHERE id = $1
    `, [id]);
    
    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Influencer not found' });
    }
    
    const influencer = influencerResult.rows[0];
    
    if (influencer.is_approved) {
      return res.status(400).json({ 
        success: false, 
        error: 'Influencer is already approved' 
      });
    }
    
    // Update to approved status
    const updateResult = await db.query(`
      UPDATE influencers 
      SET is_approved = true, approved_at = CURRENT_TIMESTAMP, status = 'approved'
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    // Log approval event (only if wallet address exists)
    if (influencer.wallet_address) {
      await db.query(`
        INSERT INTO pledge_events (event_type, influencer_address, event_data)
        VALUES ('approved', $1, $2)
      `, [
        influencer.wallet_address,
        JSON.stringify({
          approved_by: req.dbUser.email,
          approved_at: new Date().toISOString(),
          influencer_name: influencer.name
        })
      ]);
    }
    
    console.log(`✅ Influencer ${influencer.name} approved successfully`);
    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `${influencer.name} approved successfully`
    });
  } catch (error) {
    console.error('❌ Error approving influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve influencer',
      details: error.message 
    });
  }
});

// POST /api/influencer/:id/create-token - Create token for influencer (Admin only) - LEGACY MOCK VERSION
router.post('/:id/create-token', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      walletAddress, // NOW provided during token creation
      tokenName,
      tokenSymbol,
      totalSupply,
      tokenAddress, 
      txHash 
    } = req.body;
    
    console.log(`🚀 Creating MOCK token for influencer ID: ${id} (Legacy endpoint)`);
    
    // UPDATED: Wallet address is now required during token creation, not card creation
    if (!walletAddress || !tokenName || !tokenSymbol) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address, token name, and token symbol are required for token creation'
      });
    }
    
    // Get influencer details
    const influencerResult = await db.query('SELECT * FROM influencers WHERE id = $1', [id]);
    
    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Influencer not found' });
    }
    
    const influencer = influencerResult.rows[0];
    
    // Update influencer with wallet address and token details
    const updateResult = await db.query(`
      UPDATE influencers 
      SET 
        wallet_address = $2,
        token_name = $3,
        token_symbol = $4,
        status = 'live',
        launched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, walletAddress, tokenName, tokenSymbol]);
    
    // Create token record in tokens table if it exists
    try {
      await db.query(`
        INSERT INTO tokens (influencer_id, name, ticker, status, contract_address, total_supply, launched_at)
        VALUES ($1, $2, $3, 'live', $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (influencer_id) DO UPDATE SET
          name = EXCLUDED.name,
          ticker = EXCLUDED.ticker,
          status = EXCLUDED.status,
          contract_address = EXCLUDED.contract_address,
          total_supply = EXCLUDED.total_supply,
          launched_at = EXCLUDED.launched_at
      `, [id, tokenName, tokenSymbol, tokenAddress, totalSupply || 1000000]);
    } catch (tokenError) {
      console.log('Note: tokens table may not exist yet, skipping token record creation');
    }
    
    // Log token creation event
    await db.query(`
      INSERT INTO pledge_events (event_type, influencer_address, event_data)
    VALUES ('token_created', $1, $2)
  `, [
    walletAddress,
    JSON.stringify({
      created_by: req.dbUser.email,
      created_at: new Date().toISOString(),
      influencer_name: influencer.name,
      token_name: tokenName,
      token_symbol: tokenSymbol,
      token_address: tokenAddress,
      tx_hash: txHash,
      deployment_type: 'mock'
    })
  ]);
  
  console.log(`✅ Mock token created successfully for ${influencer.name}`);
  res.json({
    success: true,
    data: {
      influencer: updateResult.rows[0],
      tokenAddress: tokenAddress,
      txHash: txHash
    },
    message: `Mock token ${tokenSymbol} created successfully for ${influencer.name}`
  });
} catch (error) {
  console.error('❌ Error creating mock token:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Failed to create token',
    details: error.message 
  });
}
});

// GET /api/influencer/admin/stats - Admin dashboard stats (Admin only)
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
try {
  console.log('📊 Fetching admin stats for user:', req.dbUser.email);
  
  const queries = [
    // Users statistics
    db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_today,
        COUNT(CASE WHEN status = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN status = 'influencer' THEN 1 END) as influencer_count,
        COUNT(CASE WHEN status = 'investor' THEN 1 END) as investor_count
      FROM users
    `),
    
    // Influencers statistics
    db.query(`
      SELECT 
        COUNT(*) as total_influencers,
        COUNT(CASE WHEN status = 'live' THEN 1 END) as live_tokens,
        COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_influencers,
        COUNT(CASE WHEN status = 'pending' AND is_approved = false THEN 1 END) as pending_approvals
      FROM influencers
    `),
    
    // Pledges statistics
    db.query(`
      SELECT 
        COUNT(*) as total_pledges,
        SUM(COALESCE(eth_amount, 0)) as total_eth_pledged,
        SUM(COALESCE(usdc_amount, 0)) as total_usdc_pledged,
        COUNT(DISTINCT user_address) as unique_pledgers
      FROM pledges 
      WHERE has_withdrawn = false
    `),
    
    // Volume calculation
    db.query(`
      SELECT 
        SUM(COALESCE(eth_amount, 0) + COALESCE(usdc_amount, 0) / 2000) * 2000 as total_volume_usd
      FROM pledges 
      WHERE has_withdrawn = false
    `)
  ];
  
  const [usersResult, influencersResult, pledgesResult, volumeResult] = await Promise.all(queries);
  
  const userStats = usersResult.rows[0];
  const influencerStats = influencersResult.rows[0];
  const pledgeStats = pledgesResult.rows[0];
  const volumeStats = volumeResult.rows[0];
  
  const totalVolume = parseFloat(volumeStats.total_volume_usd || 0);
  const totalFees = totalVolume * 0.05; // 5% platform fee
  
  const response = {
    totalInfluencers: parseInt(influencerStats.total_influencers),
    activeTokens: parseInt(influencerStats.live_tokens), // Updated field name
    pendingApprovals: parseInt(influencerStats.pending_approvals),
    totalPledges: parseInt(pledgeStats.total_pledges || 0),
    totalEthRaised: parseFloat(pledgeStats.total_eth_pledged || 0),
    totalUsdcRaised: parseFloat(pledgeStats.total_usdc_pledged || 0),
    totalVolume: totalVolume,
    totalFees: totalFees,
    activeUsers24h: parseInt(pledgeStats.unique_pledgers || 0),
    newUsersToday: parseInt(userStats.new_users_today),
    approvedInfluencers: parseInt(influencerStats.approved_influencers),
    totalPledgers: parseInt(pledgeStats.unique_pledgers || 0)
  };
  
  console.log('✅ Admin stats loaded successfully:', response);
  res.json(response);
} catch (error) {
  console.error('❌ Error fetching admin stats:', error);
  res.status(500).json({ 
    error: 'Failed to fetch statistics', 
    details: error.message 
  });
}
});

// DELETE /api/influencer/:id - Delete influencer (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
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

// ======================
// LEGACY ENDPOINTS (For backward compatibility)
// ======================

// GET /api/influencer/handle/:handle - Get influencer by handle (PUBLIC)
router.get('/handle/:handle', async (req, res) => {
try {
  let { handle } = req.params;
  
  // Ensure handle starts with @
  if (!handle.startsWith('@')) {
    handle = '@' + handle;
  }
  
  const result = await db.query(
    'SELECT * FROM influencers WHERE handle = $1',
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

// GET /api/influencer/address/:address - Get influencer by wallet address (PUBLIC)
router.get('/address/:address', async (req, res) => {
try {
  const { address } = req.params;
  
  const result = await db.query(
    'SELECT * FROM influencers WHERE wallet_address = $1',
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

// 🔥 ENHANCED: GET /api/influencer/coin/:identifier - Get coin details with database + tokens table integration
router.get('/coin/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    console.log('🪙 Fetching coin details for:', identifier);
    
    let query;
    let params;
    
    // Enhanced query to include tokens table data
    const baseQuery = `
      SELECT 
        i.*,
        t.contract_address,
        t.network,
        t.status as token_status,
        t.total_supply as token_total_supply,
        t.chain_id,
        t.launched_at as token_launched_at
      FROM influencers i
      LEFT JOIN tokens t ON i.id = t.influencer_id
    `;
    
    // Check if identifier is a number (ID) or string (name/symbol)
    if (!isNaN(parseInt(identifier))) {
      // Search by ID
      query = baseQuery + ' WHERE i.id = $1';
      params = [parseInt(identifier)];
    } else {
      // Search by name, handle, or symbol (case insensitive)
      query = baseQuery + `
        WHERE LOWER(i.name) = LOWER($1) 
           OR LOWER(i.handle) = LOWER($2)
           OR LOWER(i.token_symbol) = LOWER($1)
           OR LOWER(REPLACE(i.name, ' ', '')) = LOWER($1)
      `;
      params = [identifier, `@${identifier.toLowerCase()}`];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Token not found',
        identifier: identifier,
        message: 'No token found with that symbol, name, or handle'
      });
    }
    
    const row = result.rows[0];
    
    // 🔥 ENHANCED: Return data structure that matches useRealTokenData expectations
    const coinData = {
      // Basic influencer info
      id: row.id,
      name: row.name,
      handle: row.handle || `@${row.name.toLowerCase().replace(/\s+/g, '')}`,
      token_name: row.token_name || `${row.name} Token`,
      token_symbol: row.token_symbol || row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
      avatar: row.avatar_url,
      category: row.category || 'general',
      description: row.description || '',
      followers: row.followers_count ? formatFollowers(row.followers_count) : '0',
      verified: row.verified || false,
      website: row.website,
      headquarters: row.headquarters,
      
      // Status info - CRITICAL for frontend detection
      status: row.status, // 'live', 'pending', etc.
      contract_address: row.contract_address, // From tokens table
      network: row.network || 'base-sepolia', // From tokens table
      wallet_address: row.wallet_address,
      launched_at: row.launched_at,
      
      // Token metadata
      total_supply: row.token_total_supply || 1000000,
      chain_id: row.chain_id || 84532,
      
      // Legacy fields for backward compatibility
      tokenName: row.token_name || `${row.name} Token`,
      symbol: row.token_symbol || row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
      currentPrice: row.current_price || 0.000001,
      priceChange24h: row.price_change_24h || 0,
      marketCap: row.market_cap || 1000000,
      volume24h: row.volume_24h || 0,
      totalSupply: row.token_total_supply || 1000000,
      circulatingSupply: Math.floor((row.token_total_supply || 1000000) * 0.7),
      contractAddress: row.contract_address,
      isLive: row.status === 'live' && !!row.contract_address,
      etherscanVerified: row.status === 'live' && !!row.contract_address,
      launchedAt: row.launched_at
    };
    
    console.log('✅ Coin details found:', {
      name: coinData.name,
      symbol: coinData.token_symbol,
      status: coinData.status,
      isLive: coinData.isLive,
      contract: coinData.contract_address,
      network: coinData.network
    });
    
    res.json(coinData);
    
  } catch (error) {
    console.error('❌ Error fetching coin details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch coin details',
      details: error.message,
      identifier: req.params.identifier
    });
  }
});


// NEW ENDPOINT: Check liquidity status for any token
router.get('/:id/liquidity-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const liquidityStatus = await liquidityAutomationService.getLiquidityStatus(id);
    
    res.json({
      success: true,
      data: liquidityStatus
    });
    
  } catch (error) {
    console.error('Error getting liquidity status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get liquidity status',
      details: error.message
    });
  }
});

// NEW ENDPOINT: Manually trigger liquidity creation for existing tokens
router.post('/:id/create-liquidity', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { liquiditySettings = {} } = req.body;
    
    // Get token details
    const tokenResult = await db.query(`
      SELECT 
        i.name, i.token_name, i.token_symbol, i.wallet_address,
        t.contract_address, t.network, t.total_supply
      FROM influencers i
      JOIN tokens t ON i.id = t.influencer_id
      WHERE i.id = $1
    `, [id]);
    
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Token not found or not deployed' 
      });
    }
    
    const token = tokenResult.rows[0];
    
    // Check if liquidity already exists
    const liquidityStatus = await liquidityAutomationService.getLiquidityStatus(id);
    if (liquidityStatus.hasLiquidity) {
      return res.status(400).json({
        success: false,
        error: 'Liquidity already exists for this token',
        poolAddress: liquidityStatus.poolAddress
      });
    }
    
    // Create liquidity
    const liquidityResult = await liquidityAutomationService.createLiquidityForToken({
      tokenAddress: token.contract_address,
      tokenSymbol: token.token_symbol,
      tokenName: token.token_name,
      totalSupply: token.total_supply,
      network: token.network,
      influencerId: id,
      customSettings: liquiditySettings
    });
    
    res.json({
      success: true,
      data: liquidityResult,
      message: `Liquidity created successfully for ${token.token_symbol}`
    });
    
  } catch (error) {
    console.error('Error creating manual liquidity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create liquidity',
      details: error.message
    });
  }
});

module.exports = router;
