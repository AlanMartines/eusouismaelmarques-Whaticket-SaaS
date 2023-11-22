"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Email_1 = __importDefault(require("../../models/Email"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ShowCapaignEmailService = async (id) => {
    const record = await Email_1.default.findByPk(id);
    if (!record) {
        throw new AppError_1.default("ERR_NO_EMAIL_FOUND", 404);
    }
    return record;
};
exports.default = ShowCapaignEmailService;
