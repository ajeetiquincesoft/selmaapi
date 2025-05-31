'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.createTable('parksandrecreationcontent', {
      
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' }
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      mission: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      vision: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      hours: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      contacts: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.INTEGER,
        defaultValue: '1'
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    await queryInterface.dropTable('parksandrecreationcontent');
  }
};
