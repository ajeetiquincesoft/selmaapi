module.exports = (sequelize, DataTypes) => {
    const EventsCategory = sequelize.define('EventsCategory', {
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
      tableName: 'EventsCategory',
      timestamps: true
    });
  
    EventsCategory.associate = function (models) {
      // Job Category belongs to a User
      EventsCategory.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
  
      // Job Category has many Jobs
      EventsCategory.hasMany(models.Events, {
        foreignKey: 'category_id',
        as: 'events'
      });
    };
  
    return EventsCategory;
  };
  