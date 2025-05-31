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

       await queryInterface.createTable('pages', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' }
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      shortdescription: {
        type: Sequelize.STRING,
        allowNull: true
      },
      featured_image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      images: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        references: { model: 'PagesCategory', key: 'id' }
      },
        name: {
        type: Sequelize.STRING,
        allowNull: true
      },
        designation: {
        type: Sequelize.STRING,
        allowNull: true
      },
        counsil_members: {
        type: Sequelize.STRING,
        allowNull: true
      },
        address: {
        type: Sequelize.STRING,
        allowNull: true
      },
       hours: {
        type: Sequelize.STRING,
        allowNull: true
      },
        contacts: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

     await queryInterface.dropTable('pages');
  }
};
