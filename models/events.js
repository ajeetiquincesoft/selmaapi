module.exports = (sequelize, DataTypes) => {
    const Events = sequelize.define('Events', {
      userId: DataTypes.INTEGER,
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      shortdescription: DataTypes.STRING,
      featured_image: DataTypes.STRING,
      files:DataTypes.STRING,
      link: DataTypes.TEXT,
      category_id: DataTypes.INTEGER,
      address:DataTypes.STRING,
      date: DataTypes.DATE,
      time:DataTypes.TIME,
      organizor:DataTypes.TEXT,
      status: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      published_at: DataTypes.DATE
    }, {
      tableName: 'Events',
    //   underscored: true
    });
  
    Events.associate = function(models) {
      Events.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
  
      Events.belongsTo(models.EventsCategory, {
        foreignKey: 'category_id',
        as: 'category'
      });
    };
  
    return Events;
  };
  