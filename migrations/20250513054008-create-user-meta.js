'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserMeta', {
       id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
       userId: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' }
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true, 
      },
      profile_pic: {
        type: Sequelize.STRING,
        allowNull: true, 
      },
      gender: {
        type: Sequelize.STRING,
        allowNull: true, 
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
   await queryInterface.dropTable('UserMeta');
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
