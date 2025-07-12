const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from Vercel!' });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Discord Key Bot Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 50px; text-align: center; }
        h1 { color: #5865F2; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>🤖 Discord Key Bot Dashboard</h1>
      <div class="card">
        <h2>Dashboard is Live!</h2>
        <p>Your Discord bot dashboard is now running on Vercel.</p>
        <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
      </div>
      <div class="card">
        <h3>Next Steps:</h3>
        <p>1. Update Discord OAuth URL to this domain</p>
        <p>2. Connect your Discord bot to the same database</p>
        <p>3. Test the login functionality</p>
      </div>
    </body>
    </html>
  `);
});

module.exports = app;