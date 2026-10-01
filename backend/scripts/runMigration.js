const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

/**
 * Database Migration Runner
 * Executes SQL migration files
 */

async function runMigration(migrationFile) {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔄 Running migration: ${migrationFile}\n`);
    
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('SQL loaded, executing...');
    
    // Execute the migration
    await client.query(sql);
    
    console.log(`✅ Migration completed successfully: ${migrationFile}\n`);
    
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const migrationFile = process.argv[2] || '001_unified_products_migration.sql';
    
    console.log('='.repeat(60));
    console.log('DATABASE MIGRATION RUNNER');
    console.log('='.repeat(60));
    
    await runMigration(migrationFile);
    
    console.log('='.repeat(60));
    console.log('✅ All migrations completed successfully!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed with errors');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runMigration };
