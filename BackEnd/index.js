require('dotenv').config();
const express = require('express');
const {MongoClient, ObjectId} = require('mongodb');
const bodyParser = require('body-parser');
const transporter = require('./config/email');
const { generateConfirmationEmail } = require('./utils/emailTemplate');
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const app = express();
// Middleware to parse JSON
app.use(express.json());
const cors = require('cors');
app.use(cors({
  origin: [
    'http://www.nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com',
    'https://www.nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com',
    'http://13.48.199.77:3001',
    'http://localhost:3000',
    'http://localhost:3001'  // Added for development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
let client, db;

// Define collections
let usersCollection, appointmentsCollection, servicesCollection, employeesCollection, paymentsCollection, availabilityCollection;

// Basic Authentication Middleware
const basicAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Basic authentication required' });
    }

    // Extract credentials from Authorization header
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
    const [email, password] = credentials.split(':');

    if (!email || !password) {
      return res.status(401).json({ error: 'Invalid credentials format' });
    }

    // Find user in database
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Decode stored password and compare
    const storedPassword = Buffer.from(user.password, 'base64').toString();
    if (password !== storedPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

async function connectToDatabase() {
  try {
    if (!MONGO_URI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    // Get database instance
    db = client.db('NXL_BEAUTY_BAR');
    console.log('Using database:', db.databaseName);

    // Initialize collections
    usersCollection = db.collection('USERS');
    appointmentsCollection = db.collection('APPOINTMENTS');
    servicesCollection = db.collection('SERVICES');
    employeesCollection = db.collection('EMPLOYEES');
    paymentsCollection = db.collection('PAYMENTS');
    availabilityCollection = db.collection('AVAILABILITY');
    console.log('Collections initialized');

    // Create indexes
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await appointmentsCollection.createIndex({ userId: 1 });
    await servicesCollection.createIndex({ name: 1 });
    await employeesCollection.createIndex({ email: 1 }, { unique: true });
    await paymentsCollection.createIndex({ appointmentId: 1 });
    await availabilityCollection.createIndex({ date: 1, employeeId: 1, time: 1 });
    console.log('Indexes created');

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Add error handling for database connection
process.on('SIGINT', async () => {
  try {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Helper function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate password strength
const isStrongPassword = (password) => {
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /[0-9]/.test(password);
};


// Test endpoint for connection
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Backend connection successful!' });
});

// USER SIGNUP
app.post('/api/user/signup', async (req, res) => {
    console.log("BODY RECEIVED:", req.body);
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists.' });
    }
    const newUser = {
      email,
      password: Buffer.from(password).toString('base64'),
      firstName,
      lastName
    };
    const result = await usersCollection.insertOne(newUser);
    res.status(201).json({ message: 'Signup successful!', userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// USER SIGNIN
app.post('/api/user/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const storedPassword = Buffer.from(user.password, 'base64').toString();
    if (password !== storedPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    res.status(200).json({ message: 'Signin successful!', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Signin failed. Please try again.' });
  }
});

// GET USERS
app.get('/api/users', basicAuth, async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// APPOINTMENTS
app.post('/api/appointments', basicAuth, async (req, res) => {
  try {
    const appointment = req.body;
    const result = await appointmentsCollection.insertOne(appointment);
    res.status(201).json({ message: 'Appointment created successfully', appointmentId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create appointment.' });
  }
});

// List appointments with optional filters (public)
// Accepts: userId, employeeId, status, date (YYYY-MM-DD), from, to
app.get('/api/appointments', async (req, res) => {
  try {
    const { userId, employeeId, status, date, from, to } = req.query;
    const query = {};
    if (userId) query.userId = userId;
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (date) query.date = date;
    if (from && to) query.date = { $gte: from, $lte: to };

    const appts = await appointmentsCollection.find(query).sort({ date: 1, time: 1 }).toArray();
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// DELETE APPOINTMENT
app.delete('/api/appointments/:appointmentId', basicAuth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment ID.' });
    }
    
    const result = await appointmentsCollection.deleteOne({ _id: new ObjectId(appointmentId) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    
    res.status(200).json({ message: 'Appointment cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

// UPDATE APPOINTMENT
app.put('/api/appointments/:appointmentId', basicAuth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updateData = req.body;
    
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment ID.' });
    }
    
    const result = await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    
    res.status(200).json({ message: 'Appointment updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

// Cancel appointment (public)
app.put('/api/appointments/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await appointmentsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: 'Cancelled', cancelReason: reason || null, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(404).json({ error: 'Appointment not found' });
    return res.json(result.value);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Reschedule appointment with conflict checks (public)
app.put('/api/appointments/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;
    if (!date || !time) return res.status(400).json({ error: 'date and time are required' });

    const appt = await appointmentsCollection.findOne({ _id: new ObjectId(id) });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const employeeId = appt.employeeId;

    // Check if slot is blocked in availability
    const blocked = await availabilityCollection.findOne({ date, time, employeeId });
    if (blocked) return res.status(409).json({ error: 'Selected slot is blocked' });

    // Check for existing appointment conflict for the employee
    const conflict = await appointmentsCollection.findOne({
      employeeId,
      date,
      time,
      _id: { $ne: new ObjectId(id) },
      status: { $ne: 'Cancelled' }
    });
    if (conflict) return res.status(409).json({ error: 'Selected slot already booked' });

    const result = await appointmentsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { date, time, status: 'Rescheduled', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(404).json({ error: 'Appointment not found' });
    return res.json(result.value);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// SERVICES
// Get all services (public)
app.get('/api/services', async (req, res) => {
  try {
    const services = await servicesCollection.find({}).sort({ name: 1 }).toArray();
    return res.json(services);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a service (admin)
app.post('/api/services', basicAuth, async (req, res) => {
  try {
    const { name, durationMinutes, price, active = true } = req.body;
    if (!name || !durationMinutes || !price) {
      return res.status(400).json({ error: 'name, durationMinutes, price are required' });
    }
    const service = { name, durationMinutes, price, active, createdAt: new Date() };
    const result = await servicesCollection.insertOne(service);
    return res.status(201).json({ ...service, _id: result.insertedId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update a service (admin)
app.put('/api/services/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const result = await servicesCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(404).json({ error: 'Service not found' });
    return res.json(result.value);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete a service (admin)
app.delete('/api/services/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return res.status(404).json({ error: 'Service not found' });
    return res.json({ message: 'Service deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete service' });
  }
});

// AVAILABILITY
// Get availability (blocked slots). Filter by date/employeeId if provided. (public)
app.get('/api/availability', async (req, res) => {
  try {
    const { date, employeeId } = req.query;
    const query = {};
    if (date) query.date = date; // 'YYYY-MM-DD'
    if (employeeId) query.employeeId = employeeId;
    const slots = await availabilityCollection.find(query).sort({ date: 1, time: 1 }).toArray();
    return res.json(slots);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Create a blocked slot (admin)
app.post('/api/availability', basicAuth, async (req, res) => {
  try {
    const { date, time, employeeId, reason } = req.body;
    if (!date || !time || !employeeId) {
      return res.status(400).json({ error: 'date, time, employeeId are required' });
    }
    // Avoid duplicate blocks
    const existing = await availabilityCollection.findOne({ date, time, employeeId });
    if (existing) return res.status(409).json({ error: 'Slot already blocked' });

    const slot = { date, time, employeeId, reason: reason || null, createdAt: new Date() };
    const result = await availabilityCollection.insertOne(slot);
    return res.status(201).json({ ...slot, _id: result.insertedId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create availability slot' });
  }
});

// Delete a blocked slot (admin)
app.delete('/api/availability/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await availabilityCollection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return res.status(404).json({ error: 'Availability slot not found' });
    return res.json({ message: 'Availability slot deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete availability slot' });
  }
});

// EMPLOYEES
app.post('/api/employees', basicAuth, async (req, res) => {
  try {
    const employee = req.body;
    const result = await employeesCollection.insertOne(employee);
    res.status(201).json({ message: 'Employee created successfully', employeeId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create employee.' });
  }
});

app.get('/api/employees', basicAuth, async (req, res) => {
  try {
    const employees = await employeesCollection.find({}).toArray();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// PAYMENTS
app.post('/api/payments', basicAuth, async (req, res) => {
  try {
    const payment = req.body;
    const result = await paymentsCollection.insertOne(payment);
    res.status(201).json({ message: 'Payment created successfully', paymentId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create payment.' });
  }
});

app.get('/api/payments', basicAuth, async (req, res) => {
  try {
    const payments = await paymentsCollection.find({}).toArray();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// EMAIL
app.post('/api/send-confirmation-email', async (req, res) => {
  try {
    const { name, email, service, date, time } = req.body;
    
    // Validate required fields
    if (!email || !name || !service || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, service, date, time'
      });
    }

    // Generate email HTML
    const appointmentDetails = { service, date, time };
    const emailHtml = generateConfirmationEmail(name, appointmentDetails);
    
    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'nxlbeautybar@gmail.com',
      to: email,
      subject: `Appointment Confirmed - NXL Beauty Bar | ${date} at ${time}`,
      html: emailHtml
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    
    res.json({
      success: true,
      message: 'Confirmation email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send confirmation email',
      details: error.message
    });
  }
});

// Start server after DB connection
connectToDatabase().then(() => {
  // Only start the server if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}).catch(err => {
  console.error('Failed to start server:', err);
});

// Export the app for testing
module.exports = app;
