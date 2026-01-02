/**
 * Test email sending configuration
 * 
 * Usage:
 *   npx tsx scripts/test-email.ts
 * 
 * Tests:
 * 1. SMTP environment variables are configured
 * 2. Connection to Gmail SMTP server
 * 3. Sending a test email
 */

import nodemailer from 'nodemailer';

async function testEmailConfig() {
  console.log('\n📧 Testing Email Configuration...\n');
  
  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables...');
  const smtpHost = process.env.SMTP_HOST || process.env.FLOW2_SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.FLOW2_SMTP_PORT || '587');
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || process.env.FLOW2_SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.FLOW2_SMTP_PASS;
  
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('❌ Missing SMTP configuration:');
    console.error(`   SMTP_HOST: ${smtpHost ? '✓ Set' : '✗ Missing'}`);
    console.error(`   SMTP_USER: ${smtpUser ? '✓ Set' : '✗ Missing'}`);
    console.error(`   SMTP_PASS: ${smtpPass ? '✓ Set (hidden)' : '✗ Missing'}`);
    process.exit(1);
  }
  
  console.log(`✅ Environment variables configured:`);
  console.log(`   SMTP_HOST: ${smtpHost}`);
  console.log(`   SMTP_PORT: ${smtpPort}`);
  console.log(`   SMTP_SECURE: ${smtpSecure}`);
  console.log(`   SMTP_USER: ${smtpUser}`);
  console.log(`   SMTP_PASS: ${smtpPass.substring(0, 4)}****\n`);
  
  // Step 2: Create transporter
  console.log('Step 2: Creating nodemailer transporter...');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    debug: true, // Enable debug output
    logger: true, // Log to console
  });
  
  console.log('✅ Transporter created\n');
  
  // Step 3: Verify connection
  console.log('Step 3: Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified\n');
  } catch (error: any) {
    console.error('❌ SMTP connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Response: ${error.response || 'N/A'}`);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Troubleshooting EAUTH error:');
      console.error('   1. For Gmail: Use App Password, not your regular password');
      console.error('   2. Enable 2-Step Verification on your Google account');
      console.error('   3. Generate an App Password at: https://myaccount.google.com/apppasswords');
      console.error('   4. Use the 16-character App Password as SMTP_PASS');
    }
    
    process.exit(1);
  }
  
  // Step 4: Send test email
  console.log('Step 4: Sending test email...');
  const testEmail = {
    from: `Flow2 Test <${smtpUser}>`,
    to: smtpUser, // Send to self
    subject: `[Flow2 Test] Email Configuration Test - ${new Date().toLocaleString()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">✅ Email Configuration Test Successful</h2>
        <p>Your SMTP configuration is working correctly!</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>SMTP Host:</strong> ${smtpHost}</p>
          <p style="margin: 4px 0;"><strong>SMTP Port:</strong> ${smtpPort}</p>
          <p style="margin: 4px 0;"><strong>Secure:</strong> ${smtpSecure}</p>
          <p style="margin: 4px 0;"><strong>From:</strong> ${smtpUser}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          This is an automated test email from the Flow2 system.<br/>
          Timestamp: ${new Date().toISOString()}
        </p>
      </div>
    `,
  };
  
  try {
    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Response: ${result.response}\n`);
    
    console.log('🎉 All tests passed! Email configuration is working correctly.');
    console.log(`📬 Check your inbox at: ${smtpUser}\n`);
  } catch (error: any) {
    console.error('❌ Failed to send test email:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Response: ${error.response || 'N/A'}\n`);
    
    process.exit(1);
  }
}

// Run test
testEmailConfig().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

