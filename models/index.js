const { Sequelize, DataTypes } = require('sequelize');
const config = require(__dirname + '/../config/config.json').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect
});

const db = {};

// ✅ Load models first
db.User = require('./user')(sequelize, DataTypes);
db.UserMeta = require('./usermeta')(sequelize, DataTypes);
db.News = require('./news')(sequelize, DataTypes);
db.NewsCategory = require('./newscategory')(sequelize, DataTypes);
db.JobsCategory = require('./jobscategory')(sequelize, DataTypes);
db.Jobs = require('./jobs')(sequelize, DataTypes);
db.EventsCategory = require('./eventscategory')(sequelize, DataTypes);
db.Events = require('./events')(sequelize, DataTypes);
db.ParksAndRecreationContent = require('./parksandrecreationcontent')(sequelize,DataTypes);
db.ParksAndRecreationCategory = require('./parksandrecreationcategory')(sequelize,DataTypes);

db.ParksAndRecreation =require('./parksandrecreation')(sequelize,DataTypes)
// ✅ Associate after all models are initialized
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
