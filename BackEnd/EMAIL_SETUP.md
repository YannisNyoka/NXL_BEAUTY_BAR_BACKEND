# Email Configuration Setup

## Gmail App Password Setup

To use the email functionality, you need to set up an App Password for Gmail:

### Steps:

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Security section
   - Enable 2-Factor Authentication if not already enabled

2. **Generate App Password**
   - In Security settings, find "App passwords"
   - Select "Mail" as the app
   - Generate a 16-character app password

3. **Update Environment Variables**
   - Replace `your_app_specific_password` in the `.env` file with the generated app password
   - Update `EMAIL_USER` with your actual Gmail address if different

### Environment Variables Required:

```env
EMAIL_USER=nxlbeautybar@gmail.com
EMAIL_PASSWORD=your_generated_app_password_here
EMAIL_FROM=nxlbeautybar@gmail.com
```

## Testing the Email Endpoint

You can test the email functionality using curl or any API testing tool:

```bash
curl -X POST http://localhost:3001/api/send-confirmation-email \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "test@example.com",
    "customerName": "John Doe",
    "appointmentDetails": {
      "date": "October 7, 2025",
      "time": "10:30 AM",
      "services": ["Manicure", "Pedicure"],
      "employee": "Noxolo",
      "totalPrice": 250,
      "totalDuration": 90,
      "contactNumber": "+27123456789"
    }
  }'
```

## API Endpoint

**POST** `/api/send-confirmation-email`

### Request Body:
```json
{
  "customerEmail": "customer@email.com",
  "customerName": "Customer Name",
  "appointmentDetails": {
    "date": "October 7, 2025",
    "time": "10:30 AM",
    "services": ["Service 1", "Service 2"],
    "employee": "Employee Name",
    "totalPrice": 250,
    "totalDuration": 90,
    "contactNumber": "+27123456789"
  }
}
```

### Response:
```json
{
  "success": true,
  "message": "Confirmation email sent successfully",
  "messageId": "email-message-id"
}
```