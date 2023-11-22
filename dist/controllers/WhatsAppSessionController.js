"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wbot_1 = require("../libs/wbot");
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const store = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, companyId);
    return res.status(200).json({ message: "Starting session." });
};
const update = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const { whatsapp } = await (0, UpdateWhatsAppService_1.default)({
        whatsappId,
        companyId,
        whatsappData: { session: "" }
    });
    if (whatsapp.channel === "whatsapp") {
        await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, companyId);
    }
    return res.status(200).json({ message: "Starting session." });
};
const remove = async (req, res) => {
    console.log("remove");
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    if (whatsapp.channel === "whatsapp") {
        const wbot = (0, wbot_1.getWbot)(whatsapp.id);
        wbot.logout();
        wbot.ws.close();
    }
    if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
        whatsapp.destroy();
    }
    return res.status(200).json({ message: "Session disconnected." });
};
exports.default = { store, remove, update };
