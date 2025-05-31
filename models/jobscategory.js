module.exports = (sequelize, DataTypes) => {
    const JobsCategory = sequelize.define('jobscategory', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      }
    }, {
      tableName: 'jobscategory',
      timestamps: true
    });
  
    JobsCategory.associate = function (models) {
      // Job Category belongs to a User
      JobsCategory.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
  
      // Job Category has many Jobs
      JobsCategory.hasMany(models.Jobs, {
        foreignKey: 'category_id',
        as: 'jobs'
      });
    };
  
    return JobsCategory;
  };
  