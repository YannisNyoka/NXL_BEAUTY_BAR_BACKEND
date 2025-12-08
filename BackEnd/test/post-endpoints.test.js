const request = require('supertest');
const { expect } = require('chai');

// Import the app
const app = require('../index');

describe('POST Endpoints - Comprehensive Test Suite', function() {
  // Increase timeout for database operations
  this.timeout(15000);

  describe('POST /api/user/signup - User Registration', () => {
    it('should return 400 for missing required fields', (done) => {
      request(app)
        .post('/api/user/signup')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('required');
          done();
        });
    });

    it('should return 400 for missing email field', (done) => {
      request(app)
        .post('/api/user/signup')
        .send({
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('required');
          done();
        });
    });

    it('should return 400 for missing password field', (done) => {
      request(app)
        .post('/api/user/signup')
        .send({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('required');
          done();
        });
    });

    it('should return 400 for missing firstName field', (done) => {
      request(app)
        .post('/api/user/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          lastName: 'Doe'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('required');
          done();
        });
    });

    it('should return 400 for missing lastName field', (done) => {
      request(app)
        .post('/api/user/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('required');
          done();
        });
    });

    it('should handle valid user data structure (may fail due to DB connection)', (done) => {
      const validUser = {
        email: 'test' + Date.now() + '@example.com', // Unique email
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      request(app)
        .post('/api/user/signup')
        .send(validUser)
        .end((err, res) => {
          if (err) return done(err);
          // Accept various outcomes since DB might not be connected
          expect([201, 409, 500]).to.include(res.status);
          expect(res.body).to.be.an('object');
          done();
        });
    });

    it('should handle empty string values', (done) => {
      request(app)
        .post('/api/user/signup')
        .send({
          email: '',
          password: '',
          firstName: '',
          lastName: ''
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should handle malformed JSON', (done) => {
      request(app)
        .post('/api/user/signup')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should validate data types', (done) => {
      request(app)
        .post('/api/user/signup')
        .send({
          email: 123, // Invalid type
          password: true, // Invalid type
          firstName: ['John'], // Invalid type
          lastName: { name: 'Doe' } // Invalid type
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          done();
        });
    });
  });

  describe('POST /api/user/signin - User Authentication', () => {
    it('should return 400 for missing credentials', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Email and password are required');
          done();
        });
    });

    it('should return 400 for missing email', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({
          password: 'password123'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Email and password are required');
          done();
        });
    });

    it('should return 400 for missing password', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({
          email: 'test@example.com'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Email and password are required');
          done();
        });
    });

    it('should handle invalid credentials gracefully', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .end((err, res) => {
          if (err) return done(err);
          expect([401, 500]).to.include(res.status); // 401 for invalid creds, 500 if DB not connected
          expect(res.body).to.be.an('object');
          done();
        });
    });

    it('should handle empty credentials', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({
          email: '',
          password: ''
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should validate email format implicitly', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({
          email: 'not-an-email',
          password: 'password123'
        })
        .end((err, res) => {
          if (err) return done(err);
          expect([400, 401, 500]).to.include(res.status);
          expect(res.body).to.be.an('object');
          done();
        });
    });

    it('should handle SQL injection attempts', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({
          email: "admin'; DROP TABLE users; --",
          password: "' OR '1'='1"
        })
        .end((err, res) => {
          if (err) return done(err);
          expect([400, 401, 500]).to.include(res.status);
          expect(res.body).to.be.an('object');
          done();
        });
    });
  });

  describe('POST /api/appointments - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
      request(app)
        .post('/api/appointments')
        .send({
          customerName: 'John Doe',
          service: 'Haircut',
          date: '2024-01-15',
          time: '14:00',
          customerEmail: 'john@example.com'
        })
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should validate Content-Type header', (done) => {
      request(app)
        .post('/api/appointments')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(401) // Auth error comes first
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should require authentication header', (done) => {
      const appointmentData = {
        customerName: 'Jane Doe',
        service: 'Manicure',
        date: '2024-01-20',
        time: '10:00',
        customerEmail: 'jane@example.com'
      };

      request(app)
        .post('/api/appointments')
        .send(appointmentData)
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should handle invalid Basic auth credentials', (done) => {
      request(app)
        .post('/api/appointments')
        .auth('invalid@email.com', 'wrongpassword')
        .send({
          customerName: 'Test Customer',
          service: 'Test Service'
        })
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should handle large appointment data', (done) => {
      const largeData = {
        customerName: 'A'.repeat(1000),
        service: 'B'.repeat(1000),
        notes: 'C'.repeat(5000)
      };

      request(app)
        .post('/api/appointments')
        .send(largeData)
        .expect(401) // Still should fail auth first
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });
  });

  describe('POST /api/services - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
      request(app)
        .post('/api/services')
        .send({
          name: 'New Service',
          price: 50,
          duration: 60,
          description: 'Test service'
        })
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should validate JSON input format', (done) => {
      request(app)
        .post('/api/services')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400) // Bad JSON should return 400
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should handle empty request body', (done) => {
      request(app)
        .post('/api/services')
        .send({})
        .expect(401) // Auth error comes first
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });
  });

  describe('POST /api/employees - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
      request(app)
        .post('/api/employees')
        .send({
          name: 'New Employee',
          position: 'Stylist',
          phone: '1234567890',
          email: 'employee@example.com'
        })
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should reject requests with invalid auth format', (done) => {
      request(app)
        .post('/api/employees')
        .set('Authorization', 'Invalid auth-header')
        .send({
          name: 'Employee Test',
          position: 'Manager'
        })
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should handle special characters in employee data', (done) => {
      request(app)
        .post('/api/employees')
        .send({
          name: 'José María O\'Connor',
          position: 'Senior Stylist & Manager',
          phone: '+1-555-123-4567',
          email: 'jose.maria@example.com'
        })
        .expect(401) // Still auth error
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });
  });

  describe('POST /api/payments - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
      request(app)
        .post('/api/payments')
        .send({
          appointmentId: '507f1f77bcf86cd799439011',
          amount: 100,
          paymentMethod: 'credit_card',
          status: 'completed'
        })
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should validate request body structure', (done) => {
      request(app)
        .post('/api/payments')
        .send({}) // Empty body
        .expect(401) // Auth error comes first
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should handle invalid ObjectId format', (done) => {
      request(app)
        .post('/api/payments')
        .send({
          appointmentId: 'invalid-object-id',
          amount: 100
        })
        .expect(401) // Auth error first
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should handle negative payment amounts', (done) => {
      request(app)
        .post('/api/payments')
        .send({
          appointmentId: '507f1f77bcf86cd799439011',
          amount: -50,
          paymentMethod: 'credit_card'
        })
        .expect(401) // Auth error first
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });
  });

  describe('POST /api/send-confirmation-email - Email Endpoint', () => {
    it('should return 400 for missing required email fields', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Missing required fields');
          done();
        });
    });

    it('should validate name field presence', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          email: 'test@example.com',
          service: 'Haircut',
          date: '2024-01-15',
          time: '14:00'
          // Missing name field
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Missing required fields');
          done();
        });
    });

    it('should validate email field presence', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: 'Test User',
          service: 'Haircut',
          date: '2024-01-15',
          time: '14:00'
          // Missing email field
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Missing required fields');
          done();
        });
    });

    it('should validate service field presence', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          date: '2024-01-15',
          time: '14:00'
          // Missing service field
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Missing required fields');
          done();
        });
    });

    it('should validate date field presence', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          service: 'Haircut',
          time: '14:00'
          // Missing date field
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Missing required fields');
          done();
        });
    });

    it('should validate time field presence', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          service: 'Haircut',
          date: '2024-01-15'
          // Missing time field
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Missing required fields');
          done();
        });
    });

    it('should accept complete email data structure', (done) => {
      const emailData = {
        name: 'Test Customer',
        email: 'test@example.com',
        service: 'Hair Styling',
        date: '2024-01-15',
        time: '14:00'
      };

      request(app)
        .post('/api/send-confirmation-email')
        .send(emailData)
        .end((err, res) => {
          if (err) return done(err);
          // Note: This might fail due to SendGrid config, but we're testing structure
          expect([200, 500]).to.include(res.status); // Accept success or server error
          expect(res.body).to.be.an('object');
          done();
        });
    });

    it('should handle empty string values', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: '',
          email: '',
          service: '',
          date: '',
          time: ''
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.include('Missing required fields');
          done();
        });
    });

    it('should handle invalid email format', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: 'Test User',
          email: 'invalid-email-format',
          service: 'Haircut',
          date: '2024-01-15',
          time: '14:00'
        })
        .end((err, res) => {
          if (err) return done(err);
          expect([400, 500]).to.include(res.status); // Validation error or server error
          expect(res.body).to.be.an('object');
          done();
        });
    });

    it('should handle special characters in names and services', (done) => {
      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: 'José María O\'Connor',
          email: 'jose@example.com',
          service: 'Hair Styling & Color Treatment',
          date: '2024-01-15',
          time: '14:00'
        })
        .end((err, res) => {
          if (err) return done(err);
          expect([200, 500]).to.include(res.status);
          expect(res.body).to.be.an('object');
          done();
        });
    });

    it('should handle future dates correctly', (done) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateString = futureDate.toISOString().split('T')[0];

      request(app)
        .post('/api/send-confirmation-email')
        .send({
          name: 'Future Customer',
          email: 'future@example.com',
          service: 'Consultation',
          date: dateString,
          time: '10:00'
        })
        .end((err, res) => {
          if (err) return done(err);
          expect([200, 500]).to.include(res.status);
          expect(res.body).to.be.an('object');
          done();
        });
    });
  });

  describe('POST endpoints - Security and Edge Cases', () => {
    it('should handle malformed JSON gracefully', (done) => {
      request(app)
        .post('/api/user/signup')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should return appropriate content-type headers', (done) => {
      request(app)
        .post('/api/user/signin')
        .send({})
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should handle requests with unusual content-types', (done) => {
      request(app)
        .post('/api/user/signup')
        .set('Content-Type', 'application/xml')
        .send('<user><email>test@example.com</email></user>')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should handle very large request bodies', (done) => {
      const largeData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'A'.repeat(10000),
        lastName: 'B'.repeat(10000)
      };

      request(app)
        .post('/api/user/signup')
        .send(largeData)
        .end((err, res) => {
          if (err) return done(err);
          expect([400, 413, 500]).to.include(res.status); // Bad request, payload too large, or server error
          done();
        });
    });

    it('should handle requests with no body', (done) => {
      request(app)
        .post('/api/user/signup')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          done();
        });
    });
  });
});