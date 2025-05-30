const express = require('express');
const app = express();
const cors = require('cors');
const db = require('./models');
require('dotenv').config();

app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/route');
app.use('/api', userRoutes);
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('images'));
db.sequelize.sync().then(() => {
  console.log('DB Synced');
  app.listen(3000, '192.168.10.140', () => {
    console.log('Server running on http://192.168.10.140:3000');
  });
});
