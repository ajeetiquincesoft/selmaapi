// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./selmahousing-d20b9-firebase-adminsdk-fbsvc-ea9dca1d0e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
module.exports = admin;
