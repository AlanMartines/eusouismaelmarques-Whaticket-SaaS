"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.removeConstraint("Contacts", "number_companyid_unique");
    },
    down: (queryInterface) => {
        return queryInterface.removeConstraint("Contacts", "number_companyid_unique");
    }
};
