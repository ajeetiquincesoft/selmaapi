module.exports = (sequelize, DataTypes) => {
  const ParksAndRecreation = sequelize.define('ParksAndRecreation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    category_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'parksandrecreationcategory',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    shortdescription: {
      type: DataTypes.STRING,
      allowNull: true
    },
    featured_image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    images: {
      type: DataTypes.STRING,
      allowNull: true
    },
    facilities: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    link: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    organizor: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'ParksAndRecreation',
    timestamps: true
  });

  ParksAndRecreation.associate = function (models) {
    ParksAndRecreation.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    ParksAndRecreation.belongsTo(models.ParksAndRecreationCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });
  };

  return ParksAndRecreation;
};
