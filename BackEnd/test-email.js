// Simple test script to test the email endpoint
require('dotenv').config();
const axios = require('axios');

const testEmailEndpoint = async () => {
  console.log('🧪 Testing email endpoint...');
  console.log('📧 Using email:', process.env.EMAIL_USER || 'Not set');
  console.log('🔑 Password length:', (process.env.EMAIL_PASSWORD || '').length);
  
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
    
    console.log('✅ Email sent successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Email failed!');
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.data?.details?.includes('Invalid login')) {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Make sure your server is restarted after changing .env');
      console.log('2. Verify 2-Factor Authentication is enabled on Gmail');
      console.log('3. Generate a fresh App Password from Google Account Security');
      console.log('4. Use the App Password (not your regular Gmail password)');
    }
  }
};

testEmailEndpoint();