"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Email_1 = __importDefault(require("../../models/Email"));
const ListService = async ({ companyId, searchParam, pageNumber = "1", }) => {
    let whereCondition = {};
    if (searchParam) {
        whereCondition = {
            [sequelize_1.Op.or]: [
                { name: { [sequelize_1.Op.like]: `%${searchParam}%` } },
                { color: { [sequelize_1.Op.like]: `%${searchParam}%` } }
            ]
        };
    }
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: email } = await Email_1.default.findAndCountAll({
        where: { ...whereCondition, companyId },
        limit,
        offset,
        order: [["name", "ASC"]],
        subQuery: false,
        attributes: [
            'id',
            'name',
            'createdAt'
        ],
    });
    const hasMore = count > offset + email.length;
    return {
        email,
        count,
        hasMore
    };
};
exports.default = ListService;
