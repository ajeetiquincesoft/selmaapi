// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./selmahousing-d20b9-firebase-adminsdk-fbsvc-7c11ae3a46.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
module.exports = admin;
