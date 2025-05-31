module.exports = (sequelize, DataTypes) => {
  const NewsCategory = sequelize.define('newscategory', {
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
    },
  }, {
    tableName: 'newscategory',
    timestamps: true // remove if you have `createdAt` and `updatedAt`
  });

  NewsCategory.associate = function (models) {
    NewsCategory.hasMany(models.News, {
      foreignKey: 'category_id',
      as: 'news'
    });
  };

  return NewsCategory;
};