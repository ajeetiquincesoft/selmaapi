module.exports = (sequelize, DataTypes) => {
  const UserMeta = sequelize.define("UserMeta", {
    address: DataTypes.STRING,
    profile_pic: DataTypes.STRING,
    gender: DataTypes.STRING,
    userId: DataTypes.INTEGER,
  });

  UserMeta.associate = function (models) {
    // UserMeta belongs to a User
    UserMeta.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return UserMeta;
};
