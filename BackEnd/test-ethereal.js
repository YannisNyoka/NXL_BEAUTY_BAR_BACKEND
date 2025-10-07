// Test with Ethereal Email (test email service)
require('dotenv').config();
const nodemailer = require('nodemailer');

const testEtherealEmail = async () => {
  try {
    console.log('🧪 Testing with Ethereal Email...');
    
    // Create test account
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Test account created:', testAccount.user);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Send test email
    const info = await transporter.sendMail({
      from: testAccount.user,
      to: 'test@example.com',
      subject: 'Test Email from NXL Beauty Bar',
      html: '<h1>Test Email</h1><p>If you see this, the email system is working!</p>',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

testEtherealEmail();