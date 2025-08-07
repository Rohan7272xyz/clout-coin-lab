// Backend/setInfluencer.js
// Script to promote a user to influencer status

const db = require('./database/db');
require('dotenv').config();

async function setInfluencer(email, options = {}) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node setInfluencer.js user-email@example.com [--reason="reason for promotion"]');
    console.log('Example: node setInfluencer.js sarah@example.com --reason="Verified social media presence"');
    process.exit(1);
  }
  
  try {
    console.log(`🔧 Setting influencer status for: ${email}`);
    
    // Check if user exists
    const userCheck = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length === 0) {
      console.error(`❌ User with email "${email}" not found`);
      console.log('   Please make sure the user has signed up first.');
      process.exit(1);
    }
    
    const user = userCheck.rows[0];
    console.log(`✅ Found user: ${user.display_name || user.email}`);
    console.log(`   Current status: ${user.status || 'browser'}`);
    console.log(`   Wallet: ${user.wallet_address || 'Not connected'}`);
    
    // Check if already an influencer or admin
    if (user.status === 'influencer') {
      console.log(`⚠️  User is already an influencer!`);
      process.exit(0);
    }
    
    if (user.status === 'admin') {
      console.log(`⚠️  User is an admin. Admins cannot be demoted to influencer.`);
      process.exit(1);
    }
    
    // Update to influencer status
    const result = await db.query(
      `UPDATE users 
       SET status = 'influencer',
           status_updated_by = 'admin-script',
           status_updated_at = CURRENT_TIMESTAMP
       WHERE email = $1
       RETURNING *`,
      [email]
    );
    
    if (result.rows.length > 0) {
      console.log(`\n🎉 Successfully promoted user to INFLUENCER status!`);
      console.log(`   User: ${result.rows[0].email}`);
      console.log(`   Status: ${result.rows[0].status}`);
      console.log(`   Wallet: ${result.rows[0].wallet_address}`);
      
      if (options.reason) {
        console.log(`   Reason: ${options.reason}`);
      }
      
      // Also add them to the influencers table if they're not already there
      await addToInfluencersTable(result.rows[0], options.reason);
      
      // Show all influencers
      const influencers = await db.query(
        `SELECT email, display_name, status, created_at 
         FROM users 
         WHERE status = 'influencer'
         ORDER BY created_at`
      );
      
      console.log(`\n📊 Current Influencer Users (${influencers.rows.length}):`);
      console.log('=========================================');
      influencers.rows.forEach((influencer, index) => {
        console.log(`${index + 1}. ${influencer.email} (${influencer.display_name || 'No name'})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting influencer status:', error.message);
    console.log('\n🔧 If you get a "column does not exist" error, run this SQL first:');
    console.log('   ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'browser\';');
    console.log('   ALTER TABLE users ADD COLUMN IF NOT EXISTS status_updated_by VARCHAR(255);');
    console.log('   ALTER TABLE users ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP;');
    process.exit(1);
  }
}

async function addToInfluencersTable(user, reason) {
  try {
    // Check if already exists in influencers table
    const existingInfluencer = await db.query(
      'SELECT * FROM influencers WHERE email = $1 OR wallet_address = $2',
      [user.email, user.wallet_address]
    );
    
    if (existingInfluencer.rows.length > 0) {
      console.log(`   ✅ User already exists in influencers table`);
      return;
    }
    
    // Add to influencers table
    const handle = `@${user.display_name?.toLowerCase().replace(/\s+/g, '') || user.email.split('@')[0]}`;
    
    const influencerData = {
      name: user.display_name || user.email.split('@')[0],
      handle: handle,
      email: user.email,
      wallet_address: user.wallet_address,
      followers_count: 0, // Will be updated later
      category: 'General',
      description: reason || 'Promoted to influencer status',
      avatar_url: user.profile_picture_url,
      verified: false,
      status: 'approved'
    };
    
    await db.query(`
      INSERT INTO influencers (name, handle, email, wallet_address, followers_count, category, description, avatar_url, verified, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        wallet_address = EXCLUDED.wallet_address,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, [
      influencerData.name,
      influencerData.handle,
      influencerData.email,
      influencerData.wallet_address,
      influencerData.followers_count,
      influencerData.category,
      influencerData.description,
      influencerData.avatar_url,
      influencerData.verified,
      influencerData.status
    ]);
    
    console.log(`   ✅ Added to influencers table with handle: ${handle}`);
  } catch (error) {
    console.log(`   ⚠️  Could not add to influencers table: ${error.message}`);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const email = args[0];
  const options = {};
  
  // Parse --reason flag
  const reasonArg = args.find(arg => arg.startsWith('--reason='));
  if (reasonArg) {
    options.reason = reasonArg.split('=')[1].replace(/['"]/g, '');
  }
  
  return { email, options };
}

// Main execution
const { email, options } = parseArgs();
setInfluencer(email, options);