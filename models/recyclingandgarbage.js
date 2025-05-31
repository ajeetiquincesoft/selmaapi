module.exports = (sequelize, DataTypes) => {
  const recyclingAndGarbage = sequelize.define('recyclingandgarbage', {
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
       title: {
        type: DataTypes.STRING,
        allowNull: false
      },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    shortdescription: {
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
    tableName: 'recyclingandgarbage',
    timestamps: true
  });

  recyclingAndGarbage.associate = function (models) {
    // ParksAndRecreationContent belongs to a User
    recyclingAndGarbage.belongsTo(models.User, {
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

  return recyclingAndGarbage;
};
