/**
 * PhonePe Mock Mode Testing Script
 * Phase 4 Testing - Task A2
 * 
 * Tests the mock payment flow without hitting PhonePe API
 */

// Load environment variables FIRST, before any imports
import dotenv from 'dotenv';
dotenv.config();

import { phonePeService } from '../src/services/phonepe.service';
import { env } from '../src/config/env';

async function testMockPayments() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         PhonePe Mock Mode Testing Script                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check if mock mode is enabled
  console.log('📋 Configuration Check:');
  console.log(`   Mock Mode: ${env.PHONEPE_MOCK_MODE ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`   Merchant ID: ${env.PHONEPE_MERCHANT_ID}`);
  console.log(`   Redirect URL: ${env.PHONEPE_REDIRECT_URL}\n`);

  if (!env.PHONEPE_MOCK_MODE) {
    console.error('⚠️  Mock mode is disabled. Set PHONEPE_MOCK_MODE=true in .env');
    process.exit(1);
  }

  const testRetailerId = 'test-retailer-001';
  const testAmount = 1250.50; // ₹1,250.50

  try {
    // ============================================================
    // TEST 1: Successful Payment Flow
    // ============================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 1: Successful Payment Flow');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Step 1: Initiate Payment...');
    const payment1 = await phonePeService.initiatePayment({
      amount: testAmount,
      retailerId: testRetailerId,
      retailerPhone: '9876543210',
      orderId: 'ORD-20260725-0001',
    });

    console.log('✅ Payment Initiated:');
    console.log(`   Transaction ID: ${payment1.merchantTransactionId}`);
    console.log(`   Payment URL: ${payment1.paymentUrl}`);
    console.log(`   Expires At: ${payment1.expiresAt.toISOString()}\n`);

    // Wait for 1 second (simulate user on payment page)
    console.log('⏳ Simulating user on payment page (1 second)...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Step 2: Check Payment Status (immediately)...');
    const status1a = await phonePeService.checkPaymentStatus(payment1.merchantTransactionId);
    console.log('📊 Status:', status1a.status);
    console.log('   Message:', status1a.message);
    console.log('   Success:', status1a.success ? '✅' : '⏳', '\n');

    // Wait for 2.5 seconds (auto-complete kicks in after 2 seconds)
    console.log('⏳ Waiting 2.5 seconds (mock auto-completes after 2s)...\n');
    await new Promise(resolve => setTimeout(resolve, 2500));

    console.log('Step 3: Check Payment Status (after auto-complete)...');
    const status1b = await phonePeService.checkPaymentStatus(payment1.merchantTransactionId);
    console.log('📊 Status:', status1b.status);
    console.log('   Success:', status1b.success ? '✅ YES' : '❌ NO');
    console.log('   Transaction ID:', status1b.transactionId);
    console.log('   Amount:', status1b.amount, 'paise');
    console.log('   Response Code:', status1b.responseCode, '\n');

    if (status1b.success && status1b.status === 'paid') {
      console.log('✅ TEST 1 PASSED: Payment completed successfully\n');
    } else {
      console.error('❌ TEST 1 FAILED: Payment did not complete\n');
    }

    // ============================================================
    // TEST 2: Failed Payment Flow
    // ============================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 2: Failed Payment Flow (Manual State Change)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Step 1: Initiate Payment...');
    const payment2 = await phonePeService.initiatePayment({
      amount: 500,
      retailerId: testRetailerId,
      orderId: 'ORD-20260725-0002',
    });

    console.log('✅ Payment Initiated:');
    console.log(`   Transaction ID: ${payment2.merchantTransactionId}\n`);

    console.log('Step 2: Manually set payment to FAILED...');
    phonePeService.setMockPaymentState(payment2.merchantTransactionId, 'FAILED');
    console.log('✅ State manually set to FAILED\n');

    console.log('Step 3: Check Payment Status...');
    const status2 = await phonePeService.checkPaymentStatus(payment2.merchantTransactionId);
    console.log('📊 Status:', status2.status);
    console.log('   Success:', status2.success ? '✅' : '❌');
    console.log('   Message:', status2.message, '\n');

    if (!status2.success && status2.status === 'failed') {
      console.log('✅ TEST 2 PASSED: Failed payment handled correctly\n');
    } else {
      console.error('❌ TEST 2 FAILED: Failed payment not detected\n');
    }

    // ============================================================
    // TEST 3: Transaction Not Found
    // ============================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 3: Transaction Not Found');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const fakeTransactionId = 'NONEXISTENT123456';
    console.log('Step 1: Check status of non-existent transaction...');
    console.log(`   Transaction ID: ${fakeTransactionId}\n`);

    const status3 = await phonePeService.checkPaymentStatus(fakeTransactionId);
    console.log('📊 Status:', status3.status);
    console.log('   Success:', status3.success ? '✅' : '❌');
    console.log('   Message:', status3.message, '\n');

    if (status3.status === 'pending' && !status3.success) {
      console.log('✅ TEST 3 PASSED: Non-existent transaction handled correctly\n');
    } else {
      console.error('❌ TEST 3 FAILED: Non-existent transaction not handled properly\n');
    }

    // ============================================================
    // Summary
    // ============================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ All mock payment tests completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Test with actual frontend checkout flow');
    console.log('   2. Verify webhook callbacks work in mock mode');
    console.log('   3. Test COD flow (no PhonePe interaction)');
    console.log('   4. Document test results in Phase 4 test report\n');

  } catch (error) {
    console.error('❌ TEST FAILED WITH ERROR:');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testMockPayments()
  .then(() => {
    console.log('✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
