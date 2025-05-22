module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: DataTypes.STRING,
    role: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    password: DataTypes.STRING,
  });

  User.associate = function (models) {
    // A User has one UserMeta
    User.hasOne(models.UserMeta, {
      foreignKey: 'userId',
      as: 'meta'
    });

    User.hasMany(models.JobsCategory, {
      foreignKey: 'userId',
      as: 'jobCategories'
    });

    User.hasMany(models.NewsCategory, {
      foreignKey: 'userId',
      as: 'newsCategories'
    });

    User.hasMany(models.News, {
      foreignKey: 'userId',
      as: 'news'
    });

    User.hasMany(models.Jobs, {
      foreignKey: 'userId',
      as: 'jobs'
    });

    User.hasMany(models.Events, {
      foreignKey: 'userId',
      as: 'Events'
    });

    User.hasMany(models.EventsCategory, {
      foreignKey: 'userId',
      as: 'eventsCategories'
    });
  };

  return User;
};
