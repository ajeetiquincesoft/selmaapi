module.exports = (sequelize, DataTypes) => {
  const Notifications = sequelize.define('notifications', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    tableName: 'notifications',
    // underscored: true
  });


  return Notifications;
};