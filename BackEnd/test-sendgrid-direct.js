// Direct SendGrid test
require('dotenv').config();
const sgMail = require('@sendgrid/mail');

const testSendGridDirect = async () => {
  console.log('🧪 Testing SendGrid directly...');
  console.log('🔑 API Key exists:', !!process.env.SENDGRID_API_KEY);
  console.log('🔑 API Key starts with SG:', process.env.SENDGRID_API_KEY?.startsWith('SG.'));
  console.log('📧 From email:', process.env.EMAIL_FROM);

  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ No SendGrid API key found');
    return;
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: 'yannisnyoka@gmail.com',
      from: process.env.EMAIL_FROM,
      subject: 'Test Email from NXL Beauty Bar',
      html: '<h1>SendGrid Test</h1><p>If you receive this, SendGrid is working!</p>',
    };

    const result = await sgMail.send(msg);
    console.log('✅ SendGrid email sent successfully!');
    console.log('📧 Message ID:', result[0].headers['x-message-id']);

  } catch (error) {
    console.log('❌ SendGrid error:', error.message);
    
    if (error.message.includes('The from address does not match')) {
      console.log('🔧 You need to verify your sender email in SendGrid dashboard');
      console.log('📖 Go to: Settings → Sender Authentication → Verify a Single Sender');
    }
  }
};

testSendGridDirect();