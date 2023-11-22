"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFacebookMessageFileExternal = exports.sendFacebookMessageMediaExternal = exports.sendFacebookMessageMedia = exports.typeAttachment = void 0;
const fs_1 = __importDefault(require("fs"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const graphAPI_1 = require("./graphAPI");
const typeAttachment = (media) => {
    if (media.mimetype.includes("image")) {
        return "image";
    }
    if (media.mimetype.includes("video")) {
        return "video";
    }
    if (media.mimetype.includes("audio")) {
        return "audio";
    }
    return "file";
};
exports.typeAttachment = typeAttachment;
const sendFacebookMessageMedia = async ({ media, ticket, body }) => {
    try {
        const type = (0, exports.typeAttachment)(media);
        const domain = `${process.env.BACKEND_URL}/public/${media.filename}`;
        const sendMessage = await (0, graphAPI_1.sendAttachmentFromUrl)(ticket.contact.number, domain, type, ticket.whatsapp.facebookUserToken);
        await ticket.update({ lastMessage: media.filename });
        fs_1.default.unlinkSync(media.path);
        return sendMessage;
    }
    catch (err) {
        throw new AppError_1.default("ERR_SENDING_FACEBOOK_MSG");
    }
};
exports.sendFacebookMessageMedia = sendFacebookMessageMedia;
const sendFacebookMessageMediaExternal = async ({ url, ticket, body }) => {
    try {
        const type = "image";
        // const domain = `${process.env.BACKEND_URL}/public/${media.filename}`
        const sendMessage = await (0, graphAPI_1.sendAttachmentFromUrl)(ticket.contact.number, url, type, ticket.whatsapp.facebookUserToken);
        const randomName = Math.random().toString(36).substring(7);
        await ticket.update({ lastMessage: body || `${randomName}.jpg}` });
        // fs.unlinkSync(media.path);
        return sendMessage;
    }
    catch (err) {
        throw new AppError_1.default("ERR_SENDING_FACEBOOK_MSG");
    }
};
exports.sendFacebookMessageMediaExternal = sendFacebookMessageMediaExternal;
const sendFacebookMessageFileExternal = async ({ url, ticket, body }) => {
    try {
        const type = "file";
        // const domain = `${process.env.BACKEND_URL}/public/${media.filename}`
        const sendMessage = await (0, graphAPI_1.sendAttachmentFromUrl)(ticket.contact.number, url, type, ticket.whatsapp.facebookUserToken);
        const randomName = Math.random().toString(36).substring(7);
        await ticket.update({ lastMessage: body || `${randomName}.pdf}` });
        // fs.unlinkSync(media.path);
        return sendMessage;
    }
    catch (err) {
        throw new AppError_1.default("ERR_SENDING_FACEBOOK_MSG");
    }
};
exports.sendFacebookMessageFileExternal = sendFacebookMessageFileExternal;
