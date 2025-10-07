// Test SendGrid email configuration
require('dotenv').config();
const axios = require('axios');

const testSendGridEmail = async () => {
  console.log('🧪 Testing SendGrid email configuration...');
  console.log('🔑 API Key configured:', process.env.SENDGRID_API_KEY ? 'Yes' : 'No');
  console.log('📧 From email:', process.env.EMAIL_FROM || 'Not set');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not found in .env file');
    console.log('📖 Please follow the setup guide in SENDGRID_SETUP.md');
    return;
  }

  if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    console.log('⚠️  Warning: API key should start with "SG."');
  }

  try {
    const response = await axios.post('http://localhost:3001/api/send-confirmation-email', {
      customerEmail: 'yannisnyoka@gmail.com',
      customerName: 'Test Customer',
      appointmentDetails: {
        date: 'October 7, 2025',
        time: '10:30 AM',
        services: ['Manicure', 'Pedicure'],
        employee: 'Noxolo',
        totalPrice: 250,
        totalDuration: 90,
        contactNumber: '+27123456789'
      }
    });
    
    console.log('✅ Email sent successfully via SendGrid!');
    console.log('📧 Response:', response.data);
  } catch (error) {
    console.log('❌ Email failed!');
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.data?.details?.includes('Forbidden')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Verify your SendGrid API key is correct');
      console.log('2. Make sure you verified your sender email in SendGrid');
      console.log('3. Check SendGrid dashboard for any issues');
    }
  }
};

testSendGridEmail();