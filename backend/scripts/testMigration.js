const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function test() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', '003_addresses_geolocation_image.sql');
    console.log('Reading migration from:', migrationPath);
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('SQL file read successfully, length:', sql.length);
    console.log('\nExecuting migration...\n');
    
    const result = await client.query(sql);
    console.log('\n✅ Migration executed successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    console.error('Position:', error.position);
    console.error('\nFull error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
