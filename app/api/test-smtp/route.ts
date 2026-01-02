/**
 * Test SMTP Configuration via API Route
 * 
 * This endpoint tests the email sending configuration.
 * Call with: GET /api/test-smtp
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(req: NextRequest) {
  const results: any = {
    step1_env_check: {},
    step2_connection: {},
    step3_send_test: {},
  };
  
  try {
    // Step 1: Check environment variables
    const smtpHost = process.env.SMTP_HOST || process.env.FLOW2_SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || process.env.FLOW2_SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER || process.env.FLOW2_SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.FLOW2_SMTP_PASS;
    
    results.step1_env_check = {
      status: (smtpHost && smtpUser && smtpPass) ? 'pass' : 'fail',
      smtp_host: smtpHost || 'MISSING',
      smtp_port: smtpPort,
      smtp_secure: smtpSecure,
      smtp_user: smtpUser || 'MISSING',
      smtp_pass: smtpPass ? `${smtpPass.substring(0, 4)}****` : 'MISSING',
    };
    
    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({
        success: false,
        message: 'SMTP configuration incomplete. Check .env.local file.',
        results,
      }, { status: 500 });
    }
    
    // Step 2: Create transporter and verify connection
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    
    try {
      await transporter.verify();
      results.step2_connection = {
        status: 'pass',
        message: 'SMTP connection verified successfully',
      };
    } catch (error: any) {
      results.step2_connection = {
        status: 'fail',
        error_message: error.message,
        error_code: error.code,
        error_response: error.response,
        troubleshooting: error.code === 'EAUTH' ? 
          'For Gmail: Use App Password instead of your regular password. Enable 2-Step Verification and generate an App Password at https://myaccount.google.com/apppasswords' :
          'Check SMTP host, port, and credentials'
      };
      
      return NextResponse.json({
        success: false,
        message: 'SMTP connection failed',
        results,
      }, { status: 500 });
    }
    
    // Step 3: Send test email
    const testEmail = {
      from: `Flow2 Test <${smtpUser}>`,
      to: smtpUser, // Send to self
      subject: `[Flow2 SMTP Test] ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">✅ SMTP Configuration Test Successful</h2>
          <p>Your email sending configuration is working correctly!</p>
          
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
      results.step3_send_test = {
        status: 'pass',
        message_id: result.messageId,
        response: result.response,
        recipient: smtpUser,
      };
      
      return NextResponse.json({
        success: true,
        message: `✅ All tests passed! Test email sent to ${smtpUser}`,
        results,
      });
      
    } catch (error: any) {
      results.step3_send_test = {
        status: 'fail',
        error_message: error.message,
        error_code: error.code,
        error_response: error.response,
      };
      
      return NextResponse.json({
        success: false,
        message: 'Test email sending failed',
        results,
      }, { status: 500 });
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Unexpected error during SMTP test',
      error: error.message,
      results,
    }, { status: 500 });
  }
}

