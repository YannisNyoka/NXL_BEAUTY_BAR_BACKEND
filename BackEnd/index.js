require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const transporter = require('./config/email');
const { generateConfirmationEmail } = require('./utils/emailTemplate');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

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
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  db = client.db('NXL_BEAUTY_BAR');

  usersCollection = db.collection('USERS');
  appointmentsCollection = db.collection('APPOINTMENTS');
  servicesCollection = db.collection('SERVICES');
  employeesCollection = db.collection('EMPLOYEES');
  paymentsCollection = db.collection('PAYMENTS');
  availabilityCollection = db.collection('AVAILABILITY');

  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await employeesCollection.createIndex({ email: 1 }, { unique: true });
  await availabilityCollection.createIndex({ date: 1, employeeId: 1, time: 1 });

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
// USER SIGNUP
//-------------------------------------------
app.post('/api/user/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const exists = await usersCollection.findOne({ email });
    if (exists) return res.status(409).json({ error: 'User already exists' });

    const encoded = Buffer.from(password).toString('base64');

    const result = await usersCollection.insertOne({
      email,
      password: encoded,
      firstName,
      lastName,
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Signup successful', userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

//-------------------------------------------
// USER SIGNIN
//-------------------------------------------
app.post('/api/user/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const decoded = Buffer.from(user.password, 'base64').toString();
    if (decoded !== password) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ message: 'Signin successful', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Signin failed' });
  }
});

//-------------------------------------------
// GET USERS (ADMIN)
//-------------------------------------------
app.get('/api/users', basicAuth, async (req, res) => {
  const users = await usersCollection.find().toArray();
  res.json(users);
});


//-------------------------------------------
// APPOINTMENTS (FRONTEND–MATCHED SHAPE)
//-------------------------------------------

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

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// DELETE appointment
app.delete('/api/appointments/:id', basicAuth, async (req, res) => {
  const id = req.params.id;

  const result = await appointmentsCollection.deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return res.status(404).json({ error: 'Not found' });

  res.json({ message: "Appointment deleted" });
});

// UPDATE appointment
app.put('/api/appointments/:id', basicAuth, async (req, res) => {
  const id = req.params.id;

  const result = await appointmentsCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...req.body, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result.value) return res.status(404).json({ error: 'Not found' });

  res.json(result.value);
});


//-------------------------------------------
// SERVICES (PERFECT MATCH FOR FRONTEND)
//-------------------------------------------

app.get('/api/services', async (req, res) => {
  const services = await servicesCollection.find().sort({ name: 1 }).toArray();
  res.json(services);
});

app.post('/api/services', basicAuth, async (req, res) => {
  const { name, durationMinutes, price } = req.body;

  if (!name || !durationMinutes || !price)
    return res.status(400).json({ error: "Missing fields" });

  const service = {
    name,
    durationMinutes,
    price,
    active: true,
    createdAt: new Date()
  };

  const result = await servicesCollection.insertOne(service);
  res.status(201).json({ _id: result.insertedId, ...service });
});

app.put('/api/services/:id', basicAuth, async (req, res) => {
  const id = req.params.id;

  const result = await servicesCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...req.body, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result.value) return res.status(404).json({ error: "Service not found" });

  res.json(result.value);
});

app.delete('/api/services/:id', basicAuth, async (req, res) => {
  const id = req.params.id;

  const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return res.status(404).json({ error: "Not found" });

  res.json({ message: "Service deleted" });
});


//-------------------------------------------
// AVAILABILITY (MATCHED EXACTLY TO FRONTEND)
//-------------------------------------------

app.get('/api/availability', async (req, res) => {
  const slots = await availabilityCollection
    .find({})
    .sort({ date: 1, time: 1 })
    .toArray();

  res.json(slots);
});

app.post('/api/availability', basicAuth, async (req, res) => {
  const { date, time, employeeId, reason } = req.body;

  const exists = await availabilityCollection.findOne({ date, time, employeeId });
  if (exists) return res.status(409).json({ error: "Slot already blocked" });

  const slot = {
    date,
    time,
    employeeId,
    reason: reason || null,
    createdAt: new Date()
  };

  const result = await availabilityCollection.insertOne(slot);
  res.status(201).json({ _id: result.insertedId, ...slot });
});

app.delete('/api/availability/:id', basicAuth, async (req, res) => {
  const id = req.params.id;

  const result = await availabilityCollection.deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return res.status(404).json({ error: "Not found" });

  res.json({ message: "Availability removed" });
});


//-------------------------------------------
// EMPLOYEES
//-------------------------------------------
app.get('/api/employees', basicAuth, async (req, res) => {
  const employees = await employeesCollection.find().toArray();
  res.json(employees);
});

app.post('/api/employees', basicAuth, async (req, res) => {
  const employee = { ...req.body, createdAt: new Date() };
  const result = await employeesCollection.insertOne(employee);

  res.status(201).json({ employeeId: result.insertedId });
});


//-------------------------------------------
// PAYMENTS
//-------------------------------------------
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
});

module.exports = app;
