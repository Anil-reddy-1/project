const pool = require('../src/config/db');

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'order_items', 'deliveries', 'delivery_status_history', 'stock_transactions')
      ORDER BY table_name
    `);
    
    console.log('\nExisting tables:');
    if (result.rows.length === 0) {
      console.log('  None of the order/delivery tables exist yet');
    } else {
      result.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    // Check if orders table has columns
    if (result.rows.find(r => r.table_name === 'orders')) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
        ORDER BY ordinal_position
      `);
      console.log('\nOrders table columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
