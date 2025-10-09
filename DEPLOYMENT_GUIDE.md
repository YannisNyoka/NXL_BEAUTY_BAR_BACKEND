# 🚀 NXL Beauty Bar - Email Deployment Guide

## Quick Deployment (Windows)

### Option 1: Using PowerShell Commands

**⚠️ IMPORTANT:** Run these commands in the correct environment:
- SSH commands: Run on your EC2 server (after connecting via SSH)
- PowerShell commands: Run on your Windows machine

1. **Connect to your EC2 server (Windows PowerShell):**
```powershell
ssh -i "C:\Users\yanni\Downloads\nxlbeautybar.pem" ec2-user@13.48.199.77
```

2. **Once connected to EC2, update your code (Linux commands):**
```bash
# Find your project directory
cd ~/nxlbeautybar_backend
# or try: cd /var/www/nxlbeautybar_backend
# or try: cd /opt/nxlbeautybar_backend

# Pull latest code
git pull origin main

# Install SendGrid
npm install @sendgrid/mail
```

3. **Set up environment variables:**
```bash
# Create/edit .env file (ON YOUR EC2 SERVER, not Windows)
nano .env

# Add these lines:
SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY_HERE
EMAIL_FROM=yannisnyoka@gmail.com
```

**⚠️ IMPORTANT:** The `nano` command should be run on your EC2 server after SSH connection, NOT on your Windows machine!

4. **Restart your application:**
```bash
# If using PM2:
pm2 restart all

# Or manually:
pkill node
nohup node index.js &
```

### Option 2: Run the deployment batch file
```cmd
deploy-to-production.bat
```

## Test Your Email Endpoint

After deployment, test with:

```bash
curl -X POST http://13.48.199.77:3001/api/send-confirmation-email \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "yannisnyoka@gmail.com",
    "customerName": "Test Customer",
    "appointmentDetails": {
      "date": "October 9, 2025",
      "time": "10:30 AM",
      "services": ["Manicure", "Pedicure"],
      "employee": "Noxolo",
      "totalPrice": 250,
      "totalDuration": 90,
      "contactNumber": "+27123456789"
    }
  }'
```

## Expected Response
```json
{
  "success": true,
  "message": "Confirmation email sent successfully",
  "messageId": "sendgrid-message-id"
}
```

## Troubleshooting

### If email endpoint returns 404:
- Make sure you pulled the latest code
- Check that index.js contains the email endpoint
- Restart the Node.js application

### If email sending fails:
- Verify SendGrid API key is correct
- Check that sender email is verified in SendGrid
- Look at server logs for detailed errors

### Check server logs:
```bash
# If using PM2:
pm2 logs

# If running manually:
tail -f app.log
```

## Files Created for Deployment:
- ✅ `deploy-to-production.sh` - Bash deployment script
- ✅ `deploy-to-production.bat` - Windows batch deployment script
- ✅ `test-production-email.sh` - Test script for the endpoint
- ✅ This deployment guide

## Your SendGrid API Key:
```
Replace YOUR_SENDGRID_API_KEY_HERE with your actual SendGrid API key when deploying
```

**Once deployed, your appointment confirmation emails will work automatically! 🎉**