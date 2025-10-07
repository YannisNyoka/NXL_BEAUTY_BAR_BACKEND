// Quick test with temporary SMTP service
require('dotenv').config();
const nodemailer = require('nodemailer');
const { generateConfirmationEmail } = require('./utils/emailTemplate');

const quickEmailTest = async () => {
  try {
    console.log('🧪 Testing with temporary email service...');
    
    // Create test account with Ethereal Email
    const testAccount = await nodemailer.createTestAccount();
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    // Generate the same email template your API uses
    const appointmentDetails = {
      date: 'October 7, 2025',
      time: '10:30 AM',
      services: ['Manicure', 'Pedicure'],
      employee: 'Noxolo',
      totalPrice: 250,
      totalDuration: 90,
      contactNumber: '+27123456789'
    };

    const emailHtml = generateConfirmationEmail('Test Customer', appointmentDetails);

    const info = await transporter.sendMail({
      from: testAccount.user,
      to: 'yannisnyoka@gmail.com',
      subject: `Appointment Confirmed - NXL Beauty Bar | ${appointmentDetails.date} at ${appointmentDetails.time}`,
      html: emailHtml
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Preview your email here:', nodemailer.getTestMessageUrl(info));
    console.log('📧 This is exactly how your customers will see the email!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

quickEmailTest();