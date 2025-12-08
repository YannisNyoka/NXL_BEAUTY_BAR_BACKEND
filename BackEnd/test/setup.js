// Test setup file
require('dotenv').config();
const chai = require('chai');

// Global test configuration
global.expect = chai.expect;
global.should = chai.should();

// Test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.TEST_PORT || 3002;

console.log('🚀 Test environment initialized for NXL Beauty Bar API');