"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../errors/AppError"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const GetDefaultWhatsApp = async (companyId) => {
    const defaultWhatsapp = await Whatsapp_1.default.findOne({
        where: { isDefault: true, companyId }
    });
    if (!defaultWhatsapp) {
        throw new AppError_1.default("ERR_NO_DEF_WAPP_FOUND");
    }
    return defaultWhatsapp;
};
exports.default = GetDefaultWhatsApp;
