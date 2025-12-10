require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const transporter = require('./config/email');
const { generateConfirmationEmail } = require('./utils/emailTemplate');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

// Global declarations for MongoDB client and database name
let client;
const DB_NAME = 'NXL_BEAUTY_BAR';

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://www.nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com',
    'https://www.nxlbeautybar.com.s3-website.eu-north-1.amazonaws.com'
  ],
  credentials: true
}));

//-------------------------------------------
// DATABASE CONNECTION
//-------------------------------------------
let db;
let usersCollection;
let appointmentsCollection;
let servicesCollection;
let employeesCollection;
let paymentsCollection;
let availabilityCollection;

async function connectToDB() {
  client = new MongoClient(MONGO_URI);
  await client.connect();

  db = client.db(DB_NAME);

  usersCollection = db.collection('USERS');
  appointmentsCollection = db.collection('APPOINTMENTS');
  servicesCollection = db.collection('SERVICES');
  employeesCollection = db.collection('EMPLOYEES');
  paymentsCollection = db.collection('PAYMENTS');
  availabilityCollection = db.collection('AVAILABILITY');

  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await employeesCollection.createIndex({ email: 1 }, { unique: true });
  // Adjusted index key order for better availability queries
  await availabilityCollection.createIndex({ date: 1, stylist: 1, time: 1 });

  console.log('MongoDB Connected');
}

//-------------------------------------------
// BASIC AUTH (for admin dashboard)
//-------------------------------------------
const basicAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Basic '))
      return res.status(401).json({ error: 'Authentication required' });

    const decoded = Buffer.from(header.split(' ')[1], 'base64').toString();
    const [email, password] = decoded.split(':');

    // NOTE: **CRITICAL SECURITY FLAW HERE** - Replace with bcrypt and JWT in production!
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const stored = Buffer.from(user.password, 'base64').toString();
    if (stored !== password) return res.status(401).json({ error: 'Invalid credentials' });

    req.user = user;
    next();
  } catch (e) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

//-------------------------------------------
// HEALTH CHECK
//-------------------------------------------
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Backend Running' });
});

//-------------------------------------------
// USER SIGNUP & SIGNIN (TBD: Apply Security Fixes)
//-------------------------------------------
app.post('/api/user/signup', async (req, res) => {
// ... User Signup code ...
});

app.post('/api/user/signin', async (req, res) => {
// ... User Signin code ...
});

app.get('/api/users', basicAuth, async (req, res) => {
// ... Get Users code ...
});


//-------------------------------------------
// APPOINTMENTS
//-------------------------------------------
// ... Appointment CRUD routes ...

// CREATE appointment
app.post('/api/appointments', basicAuth, async (req, res) => {
  try {
    const { userId, userName, date, time, serviceIds, totalPrice, employeeId } = req.body;

    const appt = {
      userId,
      userName,
      date,
      time,
      serviceIds,
      totalPrice,
      employeeId: employeeId || null,
      status: "confirmed",
      createdAt: new Date()
    };

    const result = await appointmentsCollection.insertOne(appt);
    res.status(201).json({ message: "Appointment created", appointmentId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

// GET all appointments (public)
app.get('/api/appointments', async (req, res) => {
  try {
    const list = await appointmentsCollection
      .find({})
      .sort({ date: 1, time: 1 })
      .toArray();

    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load appointments' });
  }
});

// DELETE appointment
app.delete('/api/appointments/:id', basicAuth, async (req, res) => {
  const id = req.params.id;
  
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid appointment ID format' });
  }

  const result = await appointmentsCollection.deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return res.status(404).json({ error: 'Not found' });

  res.json({ success: true, message: "Appointment deleted" });
});

// UPDATE appointment
app.put('/api/appointments/:id', basicAuth, async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid appointment ID format' });
  }

  const result = await appointmentsCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...req.body, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result.value) return res.status(404).json({ error: 'Not found' });

  res.json(result.value);
});


//-------------------------------------------
// SERVICES (MATCHED EXACTLY TO FRONTEND)
//-------------------------------------------

// GET all services (Normalization for frontend)
app.get('/api/services', async (req, res) => {
  try {
    const services = await servicesCollection.find({}).toArray(); 
    
    // Transform data to include 'durationMinutes' for frontend compatibility
    const normalizedServices = services.map(s => ({
      ...s,
      durationMinutes: s.duration, // Use the stored 'duration' field for 'durationMinutes'
    }));

    res.json({
      success: true,
      data: normalizedServices
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
      details: error.message
    });
  }
});

// POST create new service
app.post('/api/services', basicAuth, async (req, res) => {
  try {
    // Frontend sends duration as 'durationMinutes' or just 'duration' in handleServiceAdd
    const { name, description, price, duration, durationMinutes } = req.body;
    
    const finalDuration = durationMinutes ?? duration; // Prefer durationMinutes, fallback to duration
    
    if (!name || !price || !finalDuration) { 
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, price, duration (in minutes)'
      });
    }

    const service = {
      name,
      description: description || '',
      price: parseFloat(price),
      duration: parseInt(finalDuration), // Store as 'duration' in MongoDB
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await servicesCollection.insertOne(service);
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      serviceId: result.insertedId,
      // Return normalized data matching frontend expectation
      data: { ...service, _id: result.insertedId, durationMinutes: service.duration } 
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create service',
      details: error.message
    });
  }
});

// PUT update service
app.put('/api/services/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Frontend sends duration as 'durationMinutes' in handleServiceAdd update block
    const { name, description, price, duration, durationMinutes } = req.body; 

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid service ID format' });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    
    const finalDuration = durationMinutes ?? duration;
    if (finalDuration !== undefined) updateData.duration = parseInt(finalDuration); // Store/update as 'duration'
    
    updateData.updatedAt = new Date();

    const result = await servicesCollection.findOneAndUpdate( 
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }
    
    // Normalize returned data for frontend
    const normalizedData = {
      ...result.value,
      durationMinutes: result.value.duration,
    };

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: normalizedData
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
      details: error.message
    });
  }
});

// DELETE service
app.delete('/api/services/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid service ID format' });
    }

    const result = await servicesCollection.deleteOne({ 
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
      details: error.message
    });
  }
});


//-------------------------------------------
// AVAILABILITY (MATCHED EXACTLY TO FRONTEND)
//-------------------------------------------

// GET all availability (supports query filters for date/stylist)
app.get('/api/availability', async (req, res) => {
  try {
    const { date, stylist } = req.query;
    
    let filter = {};
    if (date) filter.date = date;
    // The frontend sends 'stylist' as the name/label in the query
    if (stylist) filter.stylist = stylist; 

    const availability = await availabilityCollection.find(filter).toArray();
    
    res.json({
      success: true,
      data: availability,
      count: availability.length
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability',
      details: error.message
    });
  }
});

// POST create unavailable slot
app.post('/api/availability', basicAuth, async (req, res) => {
  try {
    // Frontend sends date as ISO string (YYYY-MM-DD), time as string (09:00 am), and stylistName
    const { date, time, employeeId, stylistName, reason, status } = req.body; 

    if (!date || !time) { 
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: date, time'
      });
    }
    
    // Check for existing slot to prevent duplicates (optional, but good practice)
    const exists = await availabilityCollection.findOne({ date, time, stylist: stylistName || 'All' });
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'Availability slot already exists for this date, time, and stylist.'
      });
    }

    const unavailableSlot = {
      date, // YYYY-MM-DD
      time, // Single time slot string (e.g., "09:00 am")
      employeeId: employeeId || null, // Store employee ID if available
      stylist: stylistName || 'All', // Store stylist name/label (Frontend's 'stylist' field)
      reason: reason || 'Not specified',
      status: status || 'unavailable', // Frontend sends status in selection summary
      createdAt: new Date()
    };

    const result = await availabilityCollection.insertOne(unavailableSlot);

    res.status(201).json({
      success: true,
      message: 'Unavailable slot created successfully',
      slotId: result.insertedId,
      // Return normalized data matching frontend expectation
      data: { ...unavailableSlot, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating availability slot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create availability slot',
      details: error.message
    });
  }
});

// DELETE unavailable slot
app.delete('/api/availability/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid availability ID format' });
    }

    const result = await availabilityCollection.deleteOne({ 
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Availability slot not found' });
    }

    res.json({
      success: true,
      message: 'Availability slot deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting availability slot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete availability slot',
      details: error.message
    });
  }
});


//-------------------------------------------
// EMPLOYEES & PAYMENTS
//-------------------------------------------
// ... Employee & Payment routes ...
app.get('/api/employees', basicAuth, async (req, res) => {
  const employees = await employeesCollection.find().toArray();
  res.json(employees);
});

app.post('/api/employees', basicAuth, async (req, res) => {
  const employee = { ...req.body, createdAt: new Date() };
  const result = await employeesCollection.insertOne(employee);

  res.status(201).json({ employeeId: result.insertedId });
});

app.get('/api/payments', basicAuth, async (req, res) => {
  const payments = await paymentsCollection.find().toArray();
  res.json(payments);
});

app.post('/api/payments', basicAuth, async (req, res) => {
  const payment = { ...req.body, createdAt: new Date() };

  const result = await paymentsCollection.insertOne(payment);
  res.status(201).json({ paymentId: result.insertedId });
});


//-------------------------------------------
// SEND CONFIRMATION EMAIL
//-------------------------------------------
app.post('/api/send-confirmation-email', async (req, res) => {
  try {
    const { name, email, service, date, time } = req.body;

    if (!email || !name || !service || !date || !time)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const html = generateConfirmationEmail(name, { service, date, time });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Appointment Confirmed - ${date} ${time}`,
      html
    });

    res.json({ success: true, message: "Email sent", messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email" });
  }
});

//-------------------------------------------
// START SERVER
//-------------------------------------------
connectToDB().then(() => {
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Server running on port ${PORT}`)
  );
}).catch(err => {
  console.error("Failed to connect to MongoDB and start server:", err);
  process.exit(1);
});

module.exports = app;