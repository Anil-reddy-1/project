/**
 * Quick test script to verify Brevo email integration
 * Run with: npx ts-node test-brevo.ts
 */

import { credentialMailer } from './src/services/credential-mailer';

async function testBrevo() {
  console.log('🧪 Testing Brevo email integration...\n');

  try {
    await credentialMailer.send({
      to: {
        name: 'Test User',
        email: 'your-email@example.com', // Replace with your email
        phone: '+91 98765 43210',
      },
      type: 'account_created',
      passwordResetLink: 'https://example.com/reset-password?token=test123',
    });

    console.log('\n✅ Test completed!');
    console.log('   Check your email inbox (and spam folder)');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testBrevo();
