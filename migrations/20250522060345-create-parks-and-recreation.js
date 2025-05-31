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

        await queryInterface.createTable('parksandrecreation', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' }
      },
        category_id: {
        type: Sequelize.INTEGER,
        references: { model: 'parksandrecreationcategory', key: 'id' }
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
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
        type: Sequelize.STRING,
        allowNull: true
      },
        facilities: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      link: {
        type: Sequelize.TEXT,
        allowNull: true
      },    
      date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      organizor: {
        type: Sequelize.TEXT,
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

      await queryInterface.dropTable('parksandrecreation');
  }
};
