module.exports = (sequelize, DataTypes) => {
  const recyclingAndGarbageContent = sequelize.define('recyclingandgarbagecontent', {
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
    tableName: 'recyclingandgarbagecontent',
    timestamps: true
  });

  recyclingAndGarbageContent.associate = function (models) {
    // ParksAndRecreationContent belongs to a User
    recyclingAndGarbageContent.belongsTo(models.User, {
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

  return recyclingAndGarbageContent;
};
