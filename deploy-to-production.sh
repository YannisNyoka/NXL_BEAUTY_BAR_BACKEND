#!/bin/bash

# NXL Beauty Bar - Production Deployment Script
# This script will deploy your email functionality to EC2

PEM_KEY="C:/Users/yanni/Downloads/nxlbeautybar.pem"
EC2_IP="13.48.199.77"
EC2_USER="ec2-user"

echo "🚀 Starting NXL Beauty Bar deployment..."
echo "📡 Connecting to EC2: $EC2_IP"

# Connect to EC2 and deploy
ssh -i "$PEM_KEY" "$EC2_USER@$EC2_IP" << 'EOF'
    echo "🔄 Connected to production server..."
    
    # Navigate to project directory (adjust path as needed)
    cd ~/nxlbeautybar_backend || cd /var/www/nxlbeautybar_backend || cd /opt/nxlbeautybar_backend
    
    echo "📥 Pulling latest code from GitHub..."
    git pull origin main
    
    echo "📦 Installing SendGrid dependency..."
    npm install @sendgrid/mail
    
    echo "📋 Checking dependencies..."
    npm list @sendgrid/mail
    
    echo "⚙️ Setting up environment variables..."
    
    # Check if .env exists, if not create from template
    if [ ! -f .env ]; then
        echo "Creating .env file from template..."
        cp .env.example .env
        echo "⚠️  IMPORTANT: You need to manually add your SendGrid API key to .env"
    else
        echo "✅ .env file exists"
    fi
    
    echo "🔍 Current .env contents (without secrets):"
    grep -v "API_KEY\|PASSWORD" .env || echo "No .env file found"
    
    echo "🔄 Restarting application..."
    
    # Try different restart methods
    if command -v pm2 > /dev/null; then
        echo "Using PM2 to restart..."
        pm2 restart all
        pm2 status
    elif pgrep node > /dev/null; then
        echo "Stopping existing Node.js processes..."
        pkill node
        sleep 2
        echo "Starting application in background..."
        nohup node index.js > app.log 2>&1 &
        sleep 3
        echo "Application started with PID: $(pgrep node)"
    else
        echo "Starting application..."
        nohup node index.js > app.log 2>&1 &
        sleep 3
        echo "Application started with PID: $(pgrep node)"
    fi
    
    echo "✅ Deployment completed!"
    echo "🔗 Your server should now be running at: http://13.48.199.77:3001"
    
EOF

echo ""
echo "🎯 Next Steps:"
echo "1. Add your SendGrid API key to the .env file on the server"
echo "2. Test the email endpoint using the test script"
echo "3. Your appointment confirmations will work automatically!"