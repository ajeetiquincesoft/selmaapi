module.exports = (sequelize, DataTypes) => {
    const Job = sequelize.define('jobs', {
      userId: DataTypes.INTEGER,
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      shortdescription: DataTypes.STRING,
      featured_image: DataTypes.STRING,
      link: DataTypes.TEXT,
      apply_link:DataTypes.TEXT,
      category_id: DataTypes.INTEGER,
      status: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      published_at: DataTypes.DATE
    }, {
      tableName: 'jobs',
    //   underscored: true
    });
  
    Job.associate = function(models) {
      Job.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
  
      Job.belongsTo(models.JobsCategory, {
        foreignKey: 'category_id',
        as: 'category'
      });
    };
  
    return Job;
  };
  