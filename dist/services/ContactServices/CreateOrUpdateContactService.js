"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("../../libs/socket");
const Contact_1 = __importDefault(require("../../models/Contact"));
const CreateOrUpdateContactService = async ({ name, number: rawNumber, profilePicUrl, isGroup, email = "", companyId, extraInfo = [], channel = "whatsapp" }) => {
    const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");
    const io = (0, socket_1.getIO)();
    let contact;
    contact = await Contact_1.default.findOne({
        where: {
            number,
            companyId,
            channel
        }
    });
    if (contact) {
        contact.update({ profilePicUrl });
        io.emit(`company-${companyId}-contact`, {
            action: "update",
            contact
        });
    }
    else {
        contact = await Contact_1.default.create({
            name,
            number,
            profilePicUrl,
            email,
            isGroup,
            extraInfo,
            companyId,
            channel
        });
        io.emit(`company-${companyId}-contact`, {
            action: "create",
            contact
        });
    }
    return contact;
};
exports.default = CreateOrUpdateContactService;
