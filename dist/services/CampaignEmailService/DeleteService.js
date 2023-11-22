"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Email_1 = __importDefault(require("../../models/Email"));
const DeleteService = async (id) => {
    const record = await Email_1.default.findOne({
        where: { id }
    });
    if (!record) {
        throw new AppError_1.default("ERR_NO_HELP_FOUND", 404);
    }
    await record.destroy();
};
exports.default = DeleteService;
