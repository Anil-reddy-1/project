const { validateRequest, schemas } = require('./middleware/validateRequest');
const express = require('express');
const app = express();
app.use(express.json());
app.post('/test', validateRequest(schemas.createStaff), (req, res) => res.json(req.validatedBody || req.body));
app.use((err, req, res, next) => res.status(400).json(err));

const request = require('supertest');
request(app)
  .post('/test')
  .send({ name: 'Test', email: 'test@t.com', phone: '1234567890', role: 'manager', department: 'sales', status: 'active' })
  .end((err, res) => {
    console.log(res.body);
    process.exit(0);
  });
