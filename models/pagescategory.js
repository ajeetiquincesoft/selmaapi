module.exports = (sequelize, DataTypes) => {
  const PagesCategory = sequelize.define('pagescategory', {
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
    tableName: 'pagescategory',
    timestamps: true // remove if you have `createdAt` and `updatedAt`
  });

  PagesCategory.associate = function (models) {
    PagesCategory.hasMany(models.Pages, {
      foreignKey: 'category_id',
      as: 'pages'
    });
  };

  return PagesCategory;
};