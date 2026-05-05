const http = require('http');

const data = JSON.stringify({ title: 'Test Room' });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/rooms',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let out = '';
  res.on('data', d => out += d);
  res.on('end', () => console.log(out));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
