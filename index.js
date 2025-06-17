const express = require("express");
const app = express();
const cors = require("cors");
const db = require("./models");
require("dotenv").config();
const path = require('path');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userRoutes = require("./routes/route");
app.use("/api", userRoutes);

// Serve static images
// app.use("/uploads", express.static("images"));
app.use('/uploads', express.static(path.join(__dirname, 'images')));

// Use port from .env or fallback to 3000
const PORT = process.env.PORT || 3000;

db.sequelize.sync().then(() => {
  console.log("DB Synced");
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
