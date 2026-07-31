const https = require('https');

const url = 'https://qisvoguakfwwyeiedhuz.supabase.co/rest/v1/games?select=*';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpc3ZvZ3Vha2Z3d3llaWVkaHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwOTI1MTgsImV4cCI6MjEwMDY2ODUxOH0.GEZmFrwy46a_8PzC8lpb6LVckMYVFwdZw1q_i31aDqM';

const req = https.request(url, {
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode}`);
    console.log(`Response Body: ${data}`);
  });
});

req.on('error', (e) => console.error(e));
req.end();
