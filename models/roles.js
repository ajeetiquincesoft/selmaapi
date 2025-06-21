module.exports = (sequelize, DataTypes) => {
  const Roles = sequelize.define('roles', {
   
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userpermissions: {
      type: DataTypes.TEXT,
      allowNull: false
    },
   
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    tableName: 'roles',
    // underscored: true
  });

  return Roles;
};