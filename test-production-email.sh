#!/bin/bash

# Test script for production email endpoint
echo "Testing NXL Beauty Bar email endpoint..."

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

echo "\n\nIf successful, you should receive an email and see a success response!"