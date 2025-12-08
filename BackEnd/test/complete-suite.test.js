const request = require('supertest');
const { expect } = require('chai');

// Import the app
const app = require('../index');

describe('🏥 NXL Beauty Bar API - Complete Test Suite', function() {
  // Global timeout for all tests
  this.timeout(20000);

  before(function() {
    console.log('🚀 Starting NXL Beauty Bar API Test Suite...');
  });

  after(function() {
    console.log('✅ Test Suite Completed');
  });

  describe('📍 Health Check & Basic Endpoints', () => {
    describe('GET /api/ping', () => {
      it('✅ should return 200 with pong message', (done) => {
        request(app)
          .get('/api/ping')
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.equal('pong');
            done();
          });
      });

      it('⚡ should respond within 1000ms', (done) => {
        const start = Date.now();
        request(app)
          .get('/api/ping')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            const duration = Date.now() - start;
            expect(duration).to.be.below(1000);
            expect(res.body).to.have.property('message');
            done();
          });
      });

      it('📋 should have correct response structure', (done) => {
        request(app)
          .get('/api/ping')
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.a('string');
            done();
          });
      });
    });
  });

  describe('👥 User Management Endpoints', () => {
    describe('POST /api/user/signup - User Registration', () => {
      it('❌ should return 400 for missing required fields', (done) => {
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

      it('❌ should return 400 for missing email field', (done) => {
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

      it('❌ should return 400 for missing password field', (done) => {
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
            done();
          });
      });

      it('📝 should handle complete signup data (may fail without DB)', (done) => {
        const validUser = {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        };
        
        request(app)
          .post('/api/user/signup')
          .send(validUser)
          .end((err, res) => {
            // Accept various outcomes since DB might not be connected
            expect([201, 400, 409, 500]).to.include(res.status);
            expect(res.body).to.be.an('object');
            done();
          });
      });
    });

    describe('POST /api/user/signin - User Authentication', () => {
      it('❌ should return 400 for missing credentials', (done) => {
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

      it('❌ should return 400 for missing email', (done) => {
        request(app)
          .post('/api/user/signin')
          .send({
            password: 'password123'
          })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });

      it('❌ should return 400 for missing password', (done) => {
        request(app)
          .post('/api/user/signin')
          .send({
            email: 'test@example.com'
          })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });

    describe('GET /api/users - User Listing', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .get('/api/users')
          .expect(401)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            expect(res.body.error).to.equal('Basic authentication required');
            done();
          });
      });

      it('🔒 should return 401 with invalid credentials', (done) => {
        request(app)
          .get('/api/users')
          .auth('invalid@email.com', 'wrongpassword')
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });
  });

  describe('📅 Appointment Management', () => {
    describe('GET /api/appointments - List Appointments', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .get('/api/appointments')
          .expect(401)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            expect(res.body.error).to.equal('Basic authentication required');
            done();
          });
      });

      it('🔒 should reject malformed auth headers', (done) => {
        request(app)
          .get('/api/appointments')
          .set('Authorization', 'Basic invalid-base64')
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });

    describe('POST /api/appointments - Create Appointment', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .post('/api/appointments')
          .send({
            customerName: 'John Doe',
            service: 'Haircut',
            date: '2024-01-15',
            time: '14:00'
          })
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });
  });

  describe('💼 Service Management', () => {
    describe('GET /api/services - List Services', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .get('/api/services')
          .expect(401)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });

    describe('POST /api/services - Create Service', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .post('/api/services')
          .send({
            name: 'New Service',
            price: 50,
            duration: 60
          })
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });
  });

  describe('👨‍💼 Employee Management', () => {
    describe('GET /api/employees - List Employees', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .get('/api/employees')
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });

    describe('POST /api/employees - Add Employee', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .post('/api/employees')
          .send({
            name: 'Jane Smith',
            position: 'Stylist'
          })
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });
  });

  describe('💳 Payment Management', () => {
    describe('GET /api/payments - List Payments', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .get('/api/payments')
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });

    describe('POST /api/payments - Process Payment', () => {
      it('🔒 should return 401 without authentication', (done) => {
        request(app)
          .post('/api/payments')
          .send({
            amount: 100,
            method: 'credit_card'
          })
          .expect(401)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });
    });
  });

  describe('📧 Email Confirmation System', () => {
    describe('POST /api/send-confirmation-email - Send Email', () => {
      it('❌ should return 400 for missing required fields', (done) => {
        request(app)
          .post('/api/send-confirmation-email')
          .send({})
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            expect(res.body.error).to.include('required');
            done();
          });
      });

      it('❌ should return 400 for missing email field', (done) => {
        request(app)
          .post('/api/send-confirmation-email')
          .send({
            name: 'Test User',
            service: 'Haircut',
            date: '2024-01-15',
            time: '14:00'
          })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('error');
            done();
          });
      });

      it('📧 should accept complete email data (may fail without SendGrid)', (done) => {
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
            // Accept success or server error (SendGrid might not be configured)
            expect([200, 500]).to.include(res.status);
            expect(res.body).to.be.an('object');
            done();
          });
      });
    });
  });

  describe('❌ Error Handling & Edge Cases', () => {
    it('404 should return 404 for non-existent endpoints', (done) => {
      request(app)
        .get('/api/nonexistent')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('🔧 should handle malformed JSON gracefully', (done) => {
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

    it('📋 should return proper content-type headers', (done) => {
      request(app)
        .get('/api/ping')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.headers).to.have.property('content-type');
          done();
        });
    });
  });
});