"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Plans", "value", {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 199.99
            })
        ]);
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("Plans", "value");
    }
};
