# SendGrid Setup Guide

## 🚀 Quick Setup Steps

### 1. Create SendGrid Account
1. Go to https://sendgrid.com/
2. Click "Start for Free"
3. Sign up with your email
4. Verify your email address

### 2. Get API Key
1. After logging in, go to **Settings** > **API Keys**
2. Click **"Create API Key"**
3. Choose **"Restricted Access"**
4. Set these permissions:
   - **Mail Send**: Full Access
   - All others: No Access
5. Click **"Create & View"**
6. **Copy the API key** (starts with `SG.`)

### 3. Update Environment Variables
Replace `your_sendgrid_api_key_here` in your `.env` file:

```env
SENDGRID_API_KEY=SG.your_actual_api_key_here
EMAIL_FROM=nxlbeautybar@gmail.com
```

### 4. Verify Sender Email (Important!)
1. In SendGrid dashboard, go to **Settings** > **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Enter your email details:
   - **From Email**: nxlbeautybar@gmail.com
   - **From Name**: NXL Beauty Bar
   - **Reply To**: nxlbeautybar@gmail.com
   - **Company**: NXL Beauty Bar
   - **Address**: Your business address
4. Click **"Create"**
5. **Check your email** and click the verification link

### 5. Test the Setup
After completing steps 1-4, restart your server and run:
```bash
node test-email.js
```

## 📧 Benefits of SendGrid vs Gmail

- ✅ **No 2FA complexity**
- ✅ **Higher delivery rates**
- ✅ **Professional email tracking**
- ✅ **No daily send limits** (free tier: 100 emails/day)
- ✅ **Better error handling**
- ✅ **Designed for applications**

## 💡 Free Tier Limits
- **100 emails per day** (perfect for testing and small business)
- Can upgrade later for more volume

## ⚠️ Important Notes
- You **must verify your sender email** before sending
- Keep your API key secure (never commit to git)
- The API key starts with `SG.` followed by a long string