module.exports = (sequelize, DataTypes) => {
  const PagesCategory = sequelize.define('PagesCategory', {
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
    tableName: 'PagesCategory',
    timestamps: true // remove if you have `createdAt` and `updatedAt`
  });

  PagesCategory.associate = function (models) {
    PagesCategory.hasMany(models.pages, {
      foreignKey: 'category_id',
      as: 'page'
    });
  };

  return PagesCategory;
};