module.exports = (sequelize, DataTypes) => {
    const ParksAndRecreationCategory = sequelize.define('parksandrecreationcategory', {
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
        },
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    }, {
      tableName: 'parksandrecreationcategory',
      timestamps: true
    });
  
    ParksAndRecreationCategory.associate = function (models) {
      ParksAndRecreationCategory.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
  
      ParksAndRecreationCategory.hasMany(models.ParksAndRecreationCategory, {
        foreignKey: 'parentId',
        as: 'parent'
      });
        // Category has many ParksAndRecreation entries
      ParksAndRecreationCategory.hasMany(models.ParksAndRecreation, {
        foreignKey: 'category_id',
        as: 'parks'
      });
    };
  
    return ParksAndRecreationCategory;
  };
  