module.exports = (sequelize, DataTypes) => {
  const Pages = sequelize.define(
    "pages",
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      shortdescription: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      featured_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      images: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      counsil_members: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      contacts: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      hours: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      undeletable: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "pages",
      // underscored: true
    }
  );

  Pages.associate = function (models) {
    Pages.belongsTo(models.PagesCategory, {
      foreignKey: "category_id",
      as: "category",
    });
    // Belongs to user
    Pages.belongsTo(models.User, {
      foreignKey: "userId",
      as: "author",
    });
  };

  return Pages;
};
