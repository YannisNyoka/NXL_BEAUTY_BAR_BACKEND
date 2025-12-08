const request = require('supertest');
const { expect } = require('chai');

// Import the app
const app = require('../index');

describe('GET Endpoints - Comprehensive Test Suite', function() {
  // Increase timeout for database operations
  this.timeout(10000);

  describe('GET /api/ping - Health Check Endpoint', () => {
    it('should return 200 status code', (done) => {
      request(app)
        .get('/api/ping')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should return correct response structure', (done) => {
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

    it('should respond quickly (performance test)', (done) => {
      const startTime = Date.now();
      request(app)
        .get('/api/ping')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const responseTime = Date.now() - startTime;
          expect(responseTime).to.be.below(1000); // Should respond within 1 second
          done();
        });
    });

    it('should handle multiple concurrent requests', (done) => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          new Promise((resolve, reject) => {
            request(app)
              .get('/api/ping')
              .expect(200)
              .end((err, res) => {
                if (err) reject(err);
                else resolve(res);
              });
          })
        );
      }
      
      Promise.all(requests)
        .then(responses => {
          responses.forEach(res => {
            expect(res.body.message).to.equal('pong');
          });
          done();
        })
        .catch(done);
    });
  });

  describe('GET /api/users - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
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

    it('should return 401 with invalid Basic auth credentials', (done) => {
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

    it('should return 401 with malformed Authorization header', (done) => {
      request(app)
        .get('/api/users')
        .set('Authorization', 'Basic invalid-base64-string')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should return 401 with Bearer token instead of Basic auth', (done) => {
      request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer some-jwt-token')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should return proper error structure for unauthorized access', (done) => {
      request(app)
        .get('/api/users')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.be.a('string');
          expect(res.body.error).to.not.be.empty;
          done();
        });
    });
  });

  describe('GET /api/appointments - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
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

    it('should validate Authorization header format', (done) => {
      request(app)
        .get('/api/appointments')
        .set('Authorization', 'InvalidFormat credentials')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should handle empty Authorization header', (done) => {
      request(app)
        .get('/api/appointments')
        .set('Authorization', '')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should handle missing credentials in Basic auth', (done) => {
      // Create Basic auth with empty credentials
      const emptyCredentials = Buffer.from(':').toString('base64');
      request(app)
        .get('/api/appointments')
        .set('Authorization', `Basic ${emptyCredentials}`)
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          done();
        });
    });
  });

  describe('GET /api/services - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
      request(app)
        .get('/api/services')
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should return JSON response with error details', (done) => {
      request(app)
        .get('/api/services')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('error');
          expect(res.header['content-type']).to.match(/application\/json/);
          done();
        });
    });

    it('should handle case-insensitive Authorization header', (done) => {
      request(app)
        .get('/api/services')
        .set('authorization', 'basic invalid') // lowercase header
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });
  });

  describe('GET /api/employees - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
      request(app)
        .get('/api/employees')
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should reject other authentication schemes', (done) => {
      request(app)
        .get('/api/employees')
        .set('Authorization', 'Digest username="test"')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should validate credentials format in Basic auth', (done) => {
      // Create malformed credentials (missing colon separator)
      const malformedCredentials = Buffer.from('usernamenocolon').toString('base64');
      request(app)
        .get('/api/employees')
        .set('Authorization', `Basic ${malformedCredentials}`)
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          done();
        });
    });
  });

  describe('GET /api/payments - Protected Endpoint', () => {
    it('should return 401 without authentication', (done) => {
      request(app)
        .get('/api/payments')
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.equal('Basic authentication required');
          done();
        });
    });

    it('should maintain consistent error response structure', (done) => {
      request(app)
        .get('/api/payments')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('error');
          expect(res.body.error).to.be.a('string');
          expect(Object.keys(res.body)).to.have.length(1); // Only error property
          done();
        });
    });
  });

  describe('GET /nonexistent-endpoints - Error Handling', () => {
    it('should return 404 for non-existent endpoints', (done) => {
      request(app)
        .get('/api/nonexistent')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should handle malformed URLs gracefully', (done) => {
      request(app)
        .get('/api/users/../../../etc/passwd')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should handle special characters in URLs', (done) => {
      request(app)
        .get('/api/test%20endpoint')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should handle very long URLs', (done) => {
      const longPath = '/api/' + 'a'.repeat(1000);
      request(app)
        .get(longPath)
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });
  });

  describe('GET endpoints - Security and Edge Cases', () => {
    it('should not expose sensitive information in error messages', (done) => {
      request(app)
        .get('/api/users')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.not.include('password');
          expect(res.body.error).to.not.include('database');
          expect(res.body.error).to.not.include('internal');
          done();
        });
    });

    it('should handle requests with unusual headers', (done) => {
      request(app)
        .get('/api/ping')
        .set('X-Custom-Header', 'unusual-value')
        .set('User-Agent', 'Test-Agent/1.0')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).to.equal('pong');
          done();
        });
    });

    it('should handle requests with no Accept header', (done) => {
      request(app)
        .get('/api/ping')
        .unset('Accept')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).to.equal('pong');
          done();
        });
    });

    it('should handle requests with invalid Accept header', (done) => {
      request(app)
        .get('/api/ping')
        .set('Accept', 'invalid/content-type')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).to.equal('pong');
          done();
        });
    });
  });
});