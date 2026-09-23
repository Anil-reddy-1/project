const { runMigration } = require('./runMigration');

/**
 * Run Cart and Addresses Migration
 * Creates cart_items, saved_for_later, and user_addresses tables
 */

async function main() {
  try {
    console.log('\n📦 Running Cart and Addresses Migration...\n');
    
    await runMigration('002_cart_and_addresses_migration.sql');
    
    console.log('\n✅ Cart tables created successfully!');
    console.log('   - cart_items');
    console.log('   - saved_for_later');
    console.log('   - user_addresses\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure PostgreSQL is running');
    console.error('2. Check database credentials in .env');
    console.error('3. Verify connection: psql -U postgres -d ganga_jamuna');
    console.error('4. Run first migration if not done: npm run migrate:products\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
