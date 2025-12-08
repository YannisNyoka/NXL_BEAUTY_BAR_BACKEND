const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3001;

// Serve a simple HTML page to test CORS
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CORS Test</title>
      </head>
      <body>
        <h1>CORS Test Page</h1>
        <button onclick="testPing()">Test Ping</button>
        <button onclick="testServices()">Test Services</button>
        <div id="result"></div>

        <script>
          async function testPing() {
            try {
              const response = await fetch('http://localhost:3001/api/ping', {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              const data = await response.json();
              document.getElementById('result').innerHTML = 'Ping Test: ' + JSON.stringify(data);
            } catch (error) {
              document.getElementById('result').innerHTML = 'Ping Error: ' + error.message;
            }
          }

          async function testServices() {
            try {
              const response = await fetch('http://localhost:3001/api/services', {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Basic ' + btoa('test@example.com:password123')
                }
              });
              const data = await response.json();
              document.getElementById('result').innerHTML = 'Services Test: ' + JSON.stringify(data);
            } catch (error) {
              document.getElementById('result').innerHTML = 'Services Error: ' + error.message;
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`CORS test server running at http://localhost:${PORT}`);
});