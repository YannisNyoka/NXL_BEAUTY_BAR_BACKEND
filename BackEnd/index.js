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

  // Indexes
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await employeesCollection.createIndex({ email: 1 }, { unique: true });
  await availabilityCollection.createIndex({ date: 1, employeeId: 1, time: 1 });

  console.log('Connected to MongoDB');
}

//-------------------------------------------
// BASIC AUTH MIDDLEWARE
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
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

//-------------------------------------------
// HEALTH CHECK
//-------------------------------------------
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Backend running' });
});

//-------------------------------------------
// USER SIGNUP
//-------------------------------------------
app.post('/api/user/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const exists = await usersCollection.findOne({ email });
    if (exists) return res.status(409).json({ error: 'User exists' });

    const encodedPass = Buffer.from(password).toString('base64');

    const result = await usersCollection.insertOne({
      email,
      password: encodedPass,
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
    if (password !== decoded) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ message: 'Signin successful', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Signin failed' });
  }
});

//-------------------------------------------
// GET USERS (protected)
//-------------------------------------------
app.get('/api/users', basicAuth, async (req, res) => {
  const users = await usersCollection.find().toArray();
  res.json(users);
});

//-------------------------------------------
// CREATE APPOINTMENT
//-------------------------------------------
app.post('/api/appointments', basicAuth, async (req, res) => {
  try {
    const appointment = req.body;
    const result = await appointmentsCollection.insertOne({
      ...appointment,
      status: "Booked",
      createdAt: new Date()
    });
    res.status(201).json({ message: 'Appointment created', appointmentId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

//-------------------------------------------
// LIST APPOINTMENTS (public)
//-------------------------------------------
app.get('/api/appointments', async (req, res) => {
  try {
    const query = {};
    const { userId, employeeId, status, date, from, to } = req.query;

    if (userId) query.userId = userId;
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (date) query.date = date;
    if (from && to) query.date = { $gte: from, $lte: to };

    const list = await appointmentsCollection.find(query).sort({ date: 1, time: 1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

//-------------------------------------------
// DELETE APPOINTMENT
//-------------------------------------------
app.delete('/api/appointments/:id', basicAuth, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

  const result = await appointmentsCollection.deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return res.status(404).json({ error: 'Not found' });

  res.json({ message: 'Appointment cancelled' });
});

//-------------------------------------------
// UPDATE APPOINTMENT
//-------------------------------------------
app.put('/api/appointments/:id', basicAuth, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const result = await appointmentsCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result.value) return res.status(404).json({ error: 'Not found' });
  res.json(result.value);
});

//-------------------------------------------
// PUBLIC CANCEL APPOINTMENT
//-------------------------------------------
app.put('/api/appointments/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const result = await appointmentsCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status: 'Cancelled', cancelReason: reason || null, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  res.json(result.value);
});

//-------------------------------------------
// PUBLIC RESCHEDULE APPOINTMENT
//-------------------------------------------
app.put('/api/appointments/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;

    const appt = await appointmentsCollection.findOne({ _id: new ObjectId(id) });
    if (!appt) return res.status(404).json({ error: 'Not found' });

    const employeeId = appt.employeeId;

    const blocked = await availabilityCollection.findOne({ date, time, employeeId });
    if (blocked) return res.status(409).json({ error: 'Slot blocked' });

    const conflict = await appointmentsCollection.findOne({
      employeeId,
      date,
      time,
      _id: { $ne: new ObjectId(id) },
      status: { $ne: 'Cancelled' }
    });
    if (conflict) return res.status(409).json({ error: 'Already booked' });

    const result = await appointmentsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { date, time, status: "Rescheduled", updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json(result.value);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reschedule' });
  }
});

//-------------------------------------------
// SERVICES
//-------------------------------------------
app.get('/api/services', async (req, res) => {
  const services = await servicesCollection.find().sort({ name: 1 }).toArray();
  res.json(services);
});

app.post('/api/services', basicAuth, async (req, res) => {
  const { name, durationMinutes, price } = req.body;
  if (!name || !durationMinutes || !price)
    return res.status(400).json({ error: 'Missing fields' });

  const service = { name, durationMinutes, price, active: true, createdAt: new Date() };
  const result = await servicesCollection.insertOne(service);
  res.status(201).json({ _id: result.insertedId, ...service });
});

app.put('/api/services/:id', basicAuth, async (req, res) => {
  const { id } = req.params;

  const result = await servicesCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...req.body, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result.value) return res.status(404).json({ error: 'Not found' });
  res.json(result.value);
});

app.delete('/api/services/:id', basicAuth, async (req, res) => {
  const { id } = req.params;
  const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });

  if (!result.deletedCount) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Service deleted' });
});

//-------------------------------------------
// AVAILABILITY
//-------------------------------------------
app.get('/api/availability', async (req, res) => {
  const { date, employeeId } = req.query;
  const q = {};
  if (date) q.date = date;
  if (employeeId) q.employeeId = employeeId;

  const slots = await availabilityCollection.find(q).sort({ date: 1, time: 1 }).toArray();
  res.json(slots);
});

app.post('/api/availability', basicAuth, async (req, res) => {
  const { date, time, employeeId, reason } = req.body;
  if (!date || !time || !employeeId)
    return res.status(400).json({ error: 'Missing fields' });

  const exists = await availabilityCollection.findOne({ date, time, employeeId });
  if (exists) return res.status(409).json({ error: 'Slot blocked' });

  const slot = { date, time, employeeId, reason: reason || null, createdAt: new Date() };
  const result = await availabilityCollection.insertOne(slot);

  res.status(201).json({ _id: result.insertedId, ...slot });
});

app.delete('/api/availability/:id', basicAuth, async (req, res) => {
  const result = await availabilityCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  if (!result.deletedCount) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Availability slot removed' });
});

//-------------------------------------------
// EMPLOYEES
//-------------------------------------------
app.post('/api/employees', basicAuth, async (req, res) => {
  const employee = req.body;
  const result = await employeesCollection.insertOne({
    ...employee,
    createdAt: new Date()
  });
  res.status(201).json({ employeeId: result.insertedId });
});

app.get('/api/employees', basicAuth, async (req, res) => {
  const employees = await employeesCollection.find().toArray();
  res.json(employees);
});

//-------------------------------------------
// PAYMENTS
//-------------------------------------------
app.post('/api/payments', basicAuth, async (req, res) => {
  const payment = { ...req.body, createdAt: new Date() };
  const result = await paymentsCollection.insertOne(payment);
  res.status(201).json({ paymentId: result.insertedId });
});

app.get('/api/payments', basicAuth, async (req, res) => {
  const payments = await paymentsCollection.find().toArray();
  res.json(payments);
});

//-------------------------------------------
// SEND CONFIRMATION EMAIL
//-------------------------------------------
app.post('/api/send-confirmation-email', async (req, res) => {
  try {
    const { name, email, service, date, time } = req.body;

    if (!email || !name || !service || !date || !time)
      return res.status(400).json({ success: false, error: 'Missing fields' });

    const html = generateConfirmationEmail(name, { service, date, time });

    const mailOpts = {
      from: process.env.EMAIL_FROM || 'nxlbeautybar@gmail.com',
      to: email,
      subject: `Appointment Confirmed - ${date} ${time}`,
      html
    };

    const info = await transporter.sendMail(mailOpts);
    res.json({ success: true, message: 'Email sent', messageId: info.messageId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

//-------------------------------------------
// START SERVER
//-------------------------------------------
connectToDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
});

module.exports = app;
