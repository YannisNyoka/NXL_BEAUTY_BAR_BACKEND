const sgMail = require('@sendgrid/mail');

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Custom sendMail function to match nodemailer interface
const sendMail = async (mailOptions) => {
  const msg = {
    to: mailOptions.to,
    from: mailOptions.from || process.env.EMAIL_FROM,
    subject: mailOptions.subject,
    html: mailOptions.html,
  };

  try {
    const result = await sgMail.send(msg);
    return {
      messageId: result[0].headers['x-message-id'] || 'sendgrid-success',
      response: 'Email sent successfully via SendGrid'
    };
  } catch (error) {
    throw new Error(`SendGrid error: ${error.message}`);
  }
};

// Export object with sendMail method to match nodemailer interface
module.exports = {
  sendMail
};