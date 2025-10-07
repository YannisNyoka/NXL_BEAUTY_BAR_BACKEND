require('dotenv').config();
const express = require('express');
const {MongoClient, ObjectId} = require('mongodb');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const app = express();
// Middleware to parse JSON
app.use(express.json());
const cors = require('cors');
app.use(cors({
  origin: [
    'http://nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com',
    'https://nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com',
    'http://www.nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com',
    'https://www.nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com',
    'http://13.48.199.77:3001',
    'http://localhost:3000'
  ],
  credentials: true
}));
let client, db;

// Define collections
let usersCollection, appointmentsCollection, servicesCollection, employeesCollection, paymentsCollection;

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
    console.log('Collections initialized');

    // Create indexes
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await appointmentsCollection.createIndex({ userId: 1 });
    await servicesCollection.createIndex({ name: 1 });
    await employeesCollection.createIndex({ email: 1 }, { unique: true });
    await paymentsCollection.createIndex({ appointmentId: 1 });
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

// Start server after DB connection
connectToDatabase().then(() => {
 app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});


// USER SIGNUP
app.post('/api/user/signup', async (req, res) => {
    console.log("BODY RECEIVED:", req.body);
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
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
    res.status(500).json({ message: 'Signup failed. Please try again.' });
  }
});

// USER SIGNIN
app.post('/api/user/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required.' });
    }
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const storedPassword = Buffer.from(user.password, 'base64').toString();
    if (password !== storedPassword) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    res.status(200).json({ message: 'Signin successful!', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Signin failed. Please try again.' });
  }
});

// GET USERS
app.get('/api/users', async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// APPOINTMENTS
app.post('/api/appointments', async (req, res) => {
  try {
    const appointment = req.body;
    const result = await appointmentsCollection.insertOne(appointment);
    res.status(201).json({ message: 'Appointment created successfully', appointmentId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create appointment.' });
  }
});
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await appointmentsCollection.find({}).toArray();
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointments.' });
  }
});

// DELETE APPOINTMENT
app.delete('/api/appointments/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }
    
    const result = await appointmentsCollection.deleteOne({ _id: new ObjectId(appointmentId) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    
    res.status(200).json({ message: 'Appointment cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel appointment.' });
  }
});

// UPDATE APPOINTMENT
app.put('/api/appointments/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updateData = req.body;
    
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }
    
    const result = await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    
    res.status(200).json({ message: 'Appointment updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update appointment.' });
  }
});

// SERVICES
app.post('/api/services', async (req, res) => {
  try {
    const service = req.body;
    const result = await servicesCollection.insertOne(service);
    res.status(201).json({ message: 'Service created successfully', serviceId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create service.' });
  }
});
app.get('/api/services', async (req, res) => {
  try {
    const services = await servicesCollection.find({}).toArray();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch services.' });
  }
});

// EMPLOYEES
app.post('/api/employees', async (req, res) => {
  try {
    const employee = req.body;
    const result = await employeesCollection.insertOne(employee);
    res.status(201).json({ message: 'Employee created successfully', employeeId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create employee.' });
  }
});
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await employeesCollection.find({}).toArray();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employees.' });
  }
});

// PAYMENTS
app.post('/api/payments', async (req, res) => {
  try {
    const payment = req.body;
    const result = await paymentsCollection.insertOne(payment);
    res.status(201).json({ message: 'Payment created successfully', paymentId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create payment.' });
  }
});
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await paymentsCollection.find({}).toArray();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payments.' });
  }
});
