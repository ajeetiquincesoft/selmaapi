module.exports = (sequelize, DataTypes) => {
  const ParksAndRecreationContent = sequelize.define('parksandrecreationcontent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mission: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    vision: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    hours: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    contacts: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    tableName: 'parksandrecreationcontent',
    timestamps: true
  });

  ParksAndRecreationContent.associate = function (models) {
    // ParksAndRecreationContent belongs to a User
    ParksAndRecreationContent.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Optionally define related content associations here if needed
    // Example:
    // ParksAndRecreationContent.hasMany(models.ParkEvents, {
    //   foreignKey: 'content_id',
    //   as: 'events'
    // });
  };

  return ParksAndRecreationContent;
};
