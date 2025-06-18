const express = require("express");
const app = express();
const cors = require("cors");
const db = require("./models");
const path = require('path');
require("dotenv").config();
app.enable("trust proxy");
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.protocol === "http") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userRoutes = require("./routes/route");
app.use("/api", userRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'images')));
// Serve static images
app.use("/images", express.static("images"));


// Use port from .env or fallback to 3000
const PORT = process.env.PORT || 3000;

db.sequelize.sync().then(() => {
  console.log("DB Synced");
  app.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
  });
});
