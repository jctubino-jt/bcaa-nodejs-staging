const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const qs = require('querystring');
const dotenv = require('dotenv'); // Add dotenv for managing environment variables

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 8080;
const microsoftOauth2Server = process.env.MICROSOFT_OAUTH2_SERVER;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const scope = process.env.SCOPE;
const apiHostname = process.env.API_HOSTNAME;

// Middleware to parse JSON requests
app.use(bodyParser.json());

app.get('/',(req,res)=>res.json({message: "Test sample"}))

// POST endpoint
app.post('/v1/transactions', async (req, res) => {
  try {
    const bearerToken = await getBearerToken();
    await newTransaction(bearerToken, req.body, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the server
app.listen(port);

const getBearerToken = async () => {
  const bearerTokenData = {
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope
  };

  const bearerTokenOptions = {
    method: 'POST',
    hostname: 'login.microsoftonline.com',
    path: microsoftOauth2Server, // Use the environment variable
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(bearerTokenOptions, (response) => {
      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        resolve(body.access_token);
      });

      response.on("error", (error) => {
        reject(error);
      });
    });

    req.write(qs.stringify(bearerTokenData));
    req.end();
  });
};

const newTransaction = async (bearerToken, data, res) => {
  const options = {
    method: 'POST',
    hostname: apiHostname, // Use the environment variable
    path: '/v1/transactions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`
    }
  };

  const req = https.request(options, (response) => {
    const chunks = [];

    response.on("data", (chunk) => {
      chunks.push(chunk);
    });

    response.on("end", () => {
      const body = Buffer.concat(chunks);
      console.log(body.toString());

      // Return the same status code as the API response
      res.status(response.statusCode).json(JSON.parse(body.toString()));
    });

    response.on("error", (error) => {
      console.error(error);
      // Return the same status code as the API error response
      res.status(response.statusCode || 500).json({ message: 'API Call failed', error: error });
    });
  });

  req.write(JSON.stringify(data));
  req.end();
};