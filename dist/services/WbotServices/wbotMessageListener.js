"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessage = exports.wbotMessageListener = exports.handleRating = exports.verifyRating = exports.verifyMessage = exports.getQuotedMessageId = exports.getQuotedMessage = exports.getBodyMessage = exports.makeid = exports.sendMessageLink = exports.sendMessageImage = exports.sleep = exports.validaCpfCnpj = exports.isNumeric = void 0;
const path_1 = require("path");
const util_1 = require("util");
const fs_1 = require("fs");
const Sentry = __importStar(require("@sentry/node"));
const lodash_1 = require("lodash");
const baileys_1 = require("@whiskeysockets/baileys");
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Message_1 = __importDefault(require("../../models/Message"));
const Tmp_1 = __importDefault(require("./Tmp"));
const socket_1 = require("../../libs/socket");
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const logger_1 = require("../../utils/logger");
const CreateOrUpdateContactService_1 = __importDefault(require("../ContactServices/CreateOrUpdateContactService"));
const FindOrCreateTicketService_1 = __importDefault(require("../TicketServices/FindOrCreateTicketService"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const UserRating_1 = __importDefault(require("../../models/UserRating"));
const SendWhatsAppMessage_1 = __importDefault(require("./SendWhatsAppMessage"));
const moment_1 = __importDefault(require("moment"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const QueueOption_1 = __importDefault(require("../../models/QueueOption"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("../TicketServices/FindOrCreateATicketTrakingService"));
const VerifyCurrentSchedule_1 = __importDefault(require("../CompanyService/VerifyCurrentSchedule"));
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const CampaignShipping_1 = __importDefault(require("../../models/CampaignShipping"));
const sequelize_1 = require("sequelize");
const queues_1 = require("../../queues");
const User_1 = __importDefault(require("../../models/User"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const cache_1 = require("../../libs/cache");
const providers_1 = require("./providers");
const Debounce_1 = require("../../helpers/Debounce");
const fs = require('fs');
const isNumeric = (value) => /^-?\d+$/.test(value);
exports.isNumeric = isNumeric;
const writeFileAsync = (0, util_1.promisify)(fs_1.writeFile);
const getTypeMessage = (msg) => {
    return (0, baileys_1.getContentType)(msg.message);
};
function validaCpfCnpj(val) {
    if (val.length == 11) {
        var cpf = val.trim();
        cpf = cpf.replace(/\./g, '');
        cpf = cpf.replace('-', '');
        cpf = cpf.split('');
        var v1 = 0;
        var v2 = 0;
        var aux = false;
        for (var i = 1; cpf.length > i; i++) {
            if (cpf[i - 1] != cpf[i]) {
                aux = true;
            }
        }
        if (aux == false) {
            return false;
        }
        for (var i = 0, p = 10; (cpf.length - 2) > i; i++, p--) {
            v1 += cpf[i] * p;
        }
        v1 = ((v1 * 10) % 11);
        if (v1 == 10) {
            v1 = 0;
        }
        if (v1 != cpf[9]) {
            return false;
        }
        for (var i = 0, p = 11; (cpf.length - 1) > i; i++, p--) {
            v2 += cpf[i] * p;
        }
        v2 = ((v2 * 10) % 11);
        if (v2 == 10) {
            v2 = 0;
        }
        if (v2 != cpf[10]) {
            return false;
        }
        else {
            return true;
        }
    }
    else if (val.length == 14) {
        var cnpj = val.trim();
        cnpj = cnpj.replace(/\./g, '');
        cnpj = cnpj.replace('-', '');
        cnpj = cnpj.replace('/', '');
        cnpj = cnpj.split('');
        var v1 = 0;
        var v2 = 0;
        var aux = false;
        for (var i = 1; cnpj.length > i; i++) {
            if (cnpj[i - 1] != cnpj[i]) {
                aux = true;
            }
        }
        if (aux == false) {
            return false;
        }
        for (var i = 0, p1 = 5, p2 = 13; (cnpj.length - 2) > i; i++, p1--, p2--) {
            if (p1 >= 2) {
                v1 += cnpj[i] * p1;
            }
            else {
                v1 += cnpj[i] * p2;
            }
        }
        v1 = (v1 % 11);
        if (v1 < 2) {
            v1 = 0;
        }
        else {
            v1 = (11 - v1);
        }
        if (v1 != cnpj[12]) {
            return false;
        }
        for (var i = 0, p1 = 6, p2 = 14; (cnpj.length - 1) > i; i++, p1--, p2--) {
            if (p1 >= 2) {
                v2 += cnpj[i] * p1;
            }
            else {
                v2 += cnpj[i] * p2;
            }
        }
        v2 = (v2 % 11);
        if (v2 < 2) {
            v2 = 0;
        }
        else {
            v2 = (11 - v2);
        }
        if (v2 != cnpj[13]) {
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return false;
    }
}
exports.validaCpfCnpj = validaCpfCnpj;
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(time) {
    await timeout(time);
}
exports.sleep = sleep;
const sendMessageImage = async (wbot, contact, ticket, url, caption) => {
    let sentMessage;
    try {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            image: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
            fileName: caption,
            caption: caption,
            mimetype: 'image/jpeg'
        });
    }
    catch (error) {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            text: (0, Mustache_1.default)('Não consegui enviar o PDF, tente novamente!', contact)
        });
    }
    (0, exports.verifyMessage)(sentMessage, ticket, contact);
};
exports.sendMessageImage = sendMessageImage;
const sendMessageLink = async (wbot, contact, ticket, url, caption) => {
    let sentMessage;
    try {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            document: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
            fileName: caption,
            caption: caption,
            mimetype: 'application/pdf'
        });
    }
    catch (error) {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            text: (0, Mustache_1.default)('Não consegui enviar o PDF, tente novamente!', contact)
        });
    }
    (0, exports.verifyMessage)(sentMessage, ticket, contact);
};
exports.sendMessageLink = sendMessageLink;
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
exports.makeid = makeid;
const getBodyButton = (msg) => {
    if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText) {
        let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText}*`;
        for (const buton of msg.message?.viewOnceMessage?.message?.buttonsMessage?.buttons) {
            bodyMessage += `\n\n${buton.buttonText?.displayText}`;
        }
        return bodyMessage;
    }
    if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.listMessage) {
        let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.listMessage?.description}*`;
        for (const buton of msg.message?.viewOnceMessage?.message?.listMessage?.sections) {
            for (const rows of buton.rows) {
                bodyMessage += `\n\n${rows.title}`;
            }
        }
        return bodyMessage;
    }
};
const msgLocation = (image, latitude, longitude) => {
    if (image) {
        var b64 = Buffer.from(image).toString("base64");
        let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
        return data;
    }
};
const getBodyMessage = (msg) => {
    try {
        let type = getTypeMessage(msg);
        const types = {
            conversation: msg?.message?.conversation,
            imageMessage: msg.message?.imageMessage?.caption,
            videoMessage: msg.message.videoMessage?.caption,
            extendedTextMessage: msg.message.extendedTextMessage?.text,
            buttonsResponseMessage: msg.message.buttonsResponseMessage?.selectedButtonId,
            templateButtonReplyMessage: msg.message?.templateButtonReplyMessage?.selectedId,
            messageContextInfo: msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.listResponseMessage?.title,
            buttonsMessage: getBodyButton(msg) || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId,
            viewOnceMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
            stickerMessage: "sticker",
            contactMessage: msg.message?.contactMessage?.vcard,
            contactsArrayMessage: "varios contatos",
            //locationMessage: `Latitude: ${msg.message.locationMessage?.degreesLatitude} - Longitude: ${msg.message.locationMessage?.degreesLongitude}`,
            locationMessage: msgLocation(msg.message?.locationMessage?.jpegThumbnail, msg.message?.locationMessage?.degreesLatitude, msg.message?.locationMessage?.degreesLongitude),
            liveLocationMessage: `Latitude: ${msg.message.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message.liveLocationMessage?.degreesLongitude}`,
            documentMessage: msg.message?.documentMessage?.title,
            audioMessage: "Áudio",
            listMessage: getBodyButton(msg) || msg.message.listResponseMessage?.title,
            listResponseMessage: msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
            reactionMessage: msg.message.reactionMessage?.text || "reaction",
        };
        const objKey = Object.keys(types).find(key => key === type);
        if (!objKey) {
            logger_1.logger.warn(`#### Nao achou o type 152: ${type}
${JSON.stringify(msg)}`);
            Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
            Sentry.captureException(new Error("Novo Tipo de Mensagem em getTypeMessage"));
        }
        return types[type];
    }
    catch (error) {
        Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg.message });
        Sentry.captureException(error);
        console.log(error);
    }
};
exports.getBodyMessage = getBodyMessage;
const getQuotedMessage = (msg) => {
    const body = msg.message.imageMessage.contextInfo ||
        msg.message.videoMessage.contextInfo ||
        msg.message?.documentMessage ||
        msg.message.extendedTextMessage.contextInfo ||
        msg.message.buttonsResponseMessage.contextInfo ||
        msg.message.listResponseMessage.contextInfo ||
        msg.message.templateButtonReplyMessage.contextInfo ||
        msg.message.buttonsResponseMessage?.contextInfo ||
        msg?.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
        msg.message.listResponseMessage?.contextInfo;
    msg.message.senderKeyDistributionMessage;
    // testar isso
    return (0, baileys_1.extractMessageContent)(body[Object.keys(body).values().next().value]);
};
exports.getQuotedMessage = getQuotedMessage;
const getQuotedMessageId = (msg) => {
    const body = (0, baileys_1.extractMessageContent)(msg.message)[Object.keys(msg?.message).values().next().value];
    return body?.contextInfo?.stanzaId;
};
exports.getQuotedMessageId = getQuotedMessageId;
const getMeSocket = (wbot) => {
    return {
        id: (0, baileys_1.jidNormalizedUser)(wbot.user.id),
        name: wbot.user.name
    };
};
const getSenderMessage = (msg, wbot) => {
    const me = getMeSocket(wbot);
    if (msg.key.fromMe)
        return me.id;
    const senderId = msg.participant || msg.key.participant || msg.key.remoteJid || undefined;
    return senderId && (0, baileys_1.jidNormalizedUser)(senderId);
};
const getContactMessage = async (msg, wbot) => {
    const isGroup = msg.key.remoteJid.includes("g.us");
    const rawNumber = msg.key.remoteJid.replace(/\D/g, "");
    return isGroup
        ? {
            id: getSenderMessage(msg, wbot),
            name: msg.pushName
        }
        : {
            id: msg.key.remoteJid,
            name: msg.key.fromMe ? rawNumber : msg.pushName
        };
};
const downloadMedia = async (msg) => {
    const mineType = msg.message?.imageMessage ||
        msg.message?.audioMessage ||
        msg.message?.videoMessage ||
        msg.message?.stickerMessage ||
        msg.message?.documentMessage ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    const messageType = msg.message?.documentMessage
        ? "document"
        : mineType.mimetype.split("/")[0].replace("application", "document")
            ? mineType.mimetype
                .split("/")[0]
                .replace("application", "document")
            : mineType.mimetype.split("/")[0];
    let stream;
    let contDownload = 0;
    while (contDownload < 10 && !stream) {
        try {
            stream = await (0, baileys_1.downloadContentFromMessage)(msg.message.audioMessage ||
                msg.message.videoMessage ||
                msg.message.documentMessage ||
                msg.message.imageMessage ||
                msg.message.stickerMessage ||
                msg.message.extendedTextMessage?.contextInfo.quotedMessage.imageMessage ||
                msg.message?.buttonsMessage?.imageMessage ||
                msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
                msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
                msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
                msg.message?.interactiveMessage?.header?.imageMessage, messageType);
        }
        catch (error) {
            contDownload++;
            await new Promise(resolve => setTimeout(resolve, 1000 * contDownload * 2));
            logger_1.logger.warn(`>>>> erro ${contDownload} de baixar o arquivo ${msg?.key.id}`);
        }
    }
    let buffer = Buffer.from([]);
    // eslint-disable-next-line no-restricted-syntax
    try {
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
    }
    catch (error) {
        return { data: "error", mimetype: "", filename: "" };
    }
    if (!buffer) {
        Sentry.setExtra("ERR_WAPP_DOWNLOAD_MEDIA", { msg });
        Sentry.captureException(new Error("ERR_WAPP_DOWNLOAD_MEDIA"));
        throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
    }
    let filename = msg.message?.documentMessage?.fileName || "";
    if (!filename) {
        const ext = mineType.mimetype.split("/")[1].split(";")[0];
        filename = `${new Date().getTime()}.${ext}`;
    }
    const media = {
        data: buffer,
        mimetype: mineType.mimetype,
        filename
    };
    return media;
};
const verifyContact = async (msgContact, wbot, companyId) => {
    let profilePicUrl;
    try {
        profilePicUrl = await wbot.profilePictureUrl(msgContact.id);
    }
    catch (e) {
        Sentry.captureException(e);
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    }
    const contactData = {
        name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
        number: msgContact.id.replace(/\D/g, ""),
        profilePicUrl,
        isGroup: msgContact.id.includes("g.us"),
        companyId,
    };
    const contact = (0, CreateOrUpdateContactService_1.default)(contactData);
    return contact;
};
const verifyQuotedMessage = async (msg) => {
    if (!msg)
        return null;
    const quoted = (0, exports.getQuotedMessageId)(msg);
    if (!quoted)
        return null;
    const quotedMsg = await Message_1.default.findOne({
        where: { id: quoted },
    });
    if (!quotedMsg)
        return null;
    return quotedMsg;
};
const verifyMediaMessage = async (msg, ticket, contact) => {
    const io = (0, socket_1.getIO)();
    const quotedMsg = await verifyQuotedMessage(msg);
    const media = await downloadMedia(msg);
    if (!media) {
        throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
    }
    if (!media.filename) {
        const ext = media.mimetype.split("/")[1].split(";")[0];
        media.filename = `${new Date().getTime()}.${ext}`;
    }
    try {
        await writeFileAsync((0, path_1.join)(__dirname, "..", "..", "..", "public", media.filename), media.data, "base64");
    }
    catch (err) {
        Sentry.captureException(err);
        logger_1.logger.error(err);
    }
    const body = (0, exports.getBodyMessage)(msg);
    const messageData = {
        id: msg.key.id,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : contact.id,
        body: body ? body : media.filename,
        fromMe: msg.key.fromMe,
        read: msg.key.fromMe,
        mediaUrl: media.filename,
        mediaType: media.mimetype.split("/")[0],
        quotedMsgId: quotedMsg?.id,
        ack: msg.status,
        remoteJid: msg.key.remoteJid,
        participant: msg.key.participant,
        dataJson: JSON.stringify(msg),
    };
    await ticket.update({
        lastMessage: body || media.filename,
    });
    const newMessage = await (0, CreateMessageService_1.default)({
        messageData,
        companyId: ticket.companyId,
    });
    if (!msg.key.fromMe && ticket.status === "closed") {
        await ticket.update({ status: "pending" });
        await ticket.reload({
            include: [
                { model: Queue_1.default, as: "queue" },
                { model: User_1.default, as: "user" },
                { model: Contact_1.default, as: "contact" },
            ],
        });
        io.to("closed").emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id,
        });
        io.to(ticket.status)
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id,
        });
    }
    return newMessage;
};
const verifyMessage = async (msg, ticket, contact) => {
    const io = (0, socket_1.getIO)();
    const quotedMsg = await verifyQuotedMessage(msg);
    const body = (0, exports.getBodyMessage)(msg);
    const messageData = {
        id: msg.key.id,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : contact.id,
        body: body,
        fromMe: msg.key.fromMe,
        mediaType: getTypeMessage(msg),
        read: msg.key.fromMe,
        quotedMsgId: quotedMsg?.id,
        ack: msg.status,
        remoteJid: msg.key.remoteJid,
        participant: msg.key.participant,
        dataJson: JSON.stringify(msg)
    };
    await ticket.update({
        lastMessage: body
    });
    await (0, CreateMessageService_1.default)({ messageData, companyId: ticket.companyId });
    if (!msg.key.fromMe && ticket.status === "closed") {
        await ticket.update({ status: "pending" });
        await ticket.reload({
            include: [
                { model: Queue_1.default, as: "queue" },
                { model: User_1.default, as: "user" },
                { model: Contact_1.default, as: "contact" }
            ]
        });
        io.to("closed").emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id
        });
        io.to(ticket.status)
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id
        });
    }
};
exports.verifyMessage = verifyMessage;
const isValidMsg = (msg) => {
    if (msg.key.remoteJid === "status@broadcast")
        return false;
    try {
        const msgType = getTypeMessage(msg);
        if (!msgType) {
            return;
        }
        const ifType = msgType === "conversation" ||
            msgType === "extendedTextMessage" ||
            msgType === "audioMessage" ||
            msgType === "videoMessage" ||
            msgType === "imageMessage" ||
            msgType === "documentMessage" ||
            msgType === "stickerMessage" ||
            msgType === "buttonsResponseMessage" ||
            msgType === "buttonsMessage" ||
            msgType === "messageContextInfo" ||
            msgType === "locationMessage" ||
            msgType === "liveLocationMessage" ||
            msgType === "contactMessage" ||
            msgType === "voiceMessage" ||
            msgType === "mediaMessage" ||
            msgType === "contactsArrayMessage" ||
            msgType === "reactionMessage" ||
            msgType === "ephemeralMessage" ||
            msgType === "protocolMessage" ||
            msgType === "listResponseMessage" ||
            msgType === "listMessage" ||
            msgType === "viewOnceMessage" ||
            msgType === "documentWithCaptionMessage";
        console.log('tipo', ifType);
        if (!ifType) {
            logger_1.logger.warn(`#### Nao achou o type em isValidMsg: ${msgType}
${JSON.stringify(msg?.message)}`);
            Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, msgType });
            Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
        }
        return !!ifType;
    }
    catch (error) {
        Sentry.setExtra("Error isValidMsg", { msg });
        Sentry.captureException(error);
    }
};
const Push = (msg) => {
    return msg.pushName;
};
const verifyQueue = async (wbot, msg, ticket, contact) => {
    const { queues, greetingMessage } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
    if (queues.length === 1) {
        const firstQueue = (0, lodash_1.head)(queues);
        let chatbot = false;
        if (firstQueue?.options) {
            chatbot = firstQueue.options.length > 0;
        }
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: firstQueue?.id, chatbot },
            ticketId: ticket.id,
            companyId: ticket.companyId,
        });
        return;
    }
    const selectedOption = (0, exports.getBodyMessage)(msg);
    const choosenQueue = queues[+selectedOption - 1];
    const companyId = ticket.companyId;
    const buttonActive = await Setting_1.default.findOne({
        where: {
            key: "chatBotType",
            companyId
        }
    });
    const botList = async () => {
        const sectionsRows = [];
        queues.forEach((queue, index) => {
            sectionsRows.push({
                title: queue.name,
                rowId: `${index + 1}`
            });
        });
        const sections = [
            {
                rows: sectionsRows
            }
        ];
        const listMessage = {
            text: (0, Mustache_1.default)(`\u200e${greetingMessage}`, contact),
            buttonText: "Escolha uma opção",
            sections
        };
        const sendMsg = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, listMessage);
        await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
    };
    const botButton = async () => {
        const buttons = [];
        queues.forEach((queue, index) => {
            buttons.push({
                buttonId: `${index + 1}`,
                buttonText: { displayText: queue.name },
                type: 4
            });
        });
        const buttonMessage = {
            text: (0, Mustache_1.default)(`\u200e${greetingMessage}`, contact),
            buttons,
            headerType: 4
        };
        const sendMsg = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, buttonMessage);
        await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
    };
    const botText = async () => {
        let options = "";
        queues.forEach((queue, index) => {
            options += `*[ ${index + 1} ]* - ${queue.name}\n`;
        });
        const textMessage = {
            text: (0, Mustache_1.default)(`\u200e${greetingMessage}\n\n${options}`, contact),
        };
        const sendMsg = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
        await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
    };
    if (choosenQueue) {
        let chatbot = false;
        if (choosenQueue?.options) {
            chatbot = choosenQueue.options.length > 0;
        }
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: choosenQueue.id, chatbot },
            ticketId: ticket.id,
            companyId: ticket.companyId,
        });
        /* Tratamento para envio de mensagem quando a fila está fora do expediente */
        if (choosenQueue.options.length === 0) {
            const queue = await Queue_1.default.findByPk(choosenQueue.id);
            const { schedules } = queue;
            const now = (0, moment_1.default)();
            const weekday = now.format("dddd").toLowerCase();
            let schedule;
            if (Array.isArray(schedules) && schedules.length > 0) {
                schedule = schedules.find((s) => s.weekdayEn === weekday && s.startTime !== "" && s.startTime !== null && s.endTime !== "" && s.endTime !== null);
            }
            if (queue.outOfHoursMessage !== null && queue.outOfHoursMessage !== "" && !(0, lodash_1.isNil)(schedule)) {
                const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
                const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
                if (now.isBefore(startTime) || now.isAfter(endTime)) {
                    const body = (0, Mustache_1.default)(`${queue.outOfHoursMessage}\n\n*[ # ]* - Voltar ao Menu Principal`, ticket.contact);
                    const sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                        text: body,
                    });
                    await (0, exports.verifyMessage)(sentMessage, ticket, contact);
                    await (0, UpdateTicketService_1.default)({
                        ticketData: { queueId: null, chatbot },
                        ticketId: ticket.id,
                        companyId: ticket.companyId,
                    });
                    return;
                }
            }
            const body = (0, Mustache_1.default)(`\u200e${choosenQueue.greetingMessage}`, ticket.contact);
            const sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                text: body,
            });
            await (0, exports.verifyMessage)(sentMessage, ticket, contact);
        }
    }
    else {
        if (buttonActive.value === "list") {
            return botList();
        }
        ;
        if (buttonActive.value === "button" && queues.length <= 4) {
            return botButton();
        }
        if (buttonActive.value === "text") {
            return botText();
        }
        if (buttonActive.value === "button" && queues.length > 4) {
            return botText();
        }
    }
};
const verifyRating = (ticketTraking) => {
    if (ticketTraking &&
        ticketTraking.finishedAt === null &&
        ticketTraking.userId !== null &&
        ticketTraking.ratingAt !== null) {
        return true;
    }
    return false;
};
exports.verifyRating = verifyRating;
const handleRating = async (msg, ticket, ticketTraking) => {
    const io = (0, socket_1.getIO)();
    let rate = null;
    if (msg?.message?.conversation) {
        rate = +msg.message?.conversation || null;
    }
    if (!Number.isNaN(rate) && Number.isInteger(rate) && !(0, lodash_1.isNull)(rate)) {
        const { complationMessage } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, ticket.companyId);
        let finalRate = rate;
        if (rate < 1) {
            finalRate = 1;
        }
        if (rate > 5) {
            finalRate = 5;
        }
        await UserRating_1.default.create({
            ticketId: ticketTraking.ticketId,
            companyId: ticketTraking.companyId,
            userId: ticketTraking.userId,
            rate: finalRate,
        });
        const body = (0, Mustache_1.default)(`\u200e${complationMessage}`, ticket.contact);
        await (0, SendWhatsAppMessage_1.default)({ body, ticket });
        await ticketTraking.update({
            finishedAt: (0, moment_1.default)().toDate(),
            rated: true,
        });
        await ticket.update({
            queueId: null,
            chatbot: null,
            queueOptionId: null,
            userId: null,
            status: "closed",
        });
        io.to("open").emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id,
        });
        io.to(ticket.status)
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id,
        });
    }
};
exports.handleRating = handleRating;
const handleChartbot = async (ticket, msg, wbot, dontReadTheFirstQuestion = false) => {
    const queue = await Queue_1.default.findByPk(ticket.queueId, {
        include: [
            {
                model: QueueOption_1.default,
                as: "options",
                where: { parentId: null },
                order: [
                    ["option", "ASC"],
                    ["createdAt", "ASC"],
                ],
            },
        ],
    });
    const messageBody = (0, exports.getBodyMessage)(msg);
    if (messageBody == "#") {
        // voltar para o menu inicial
        await ticket.update({ queueOptionId: null, chatbot: false, queueId: null });
        await verifyQueue(wbot, msg, ticket, ticket.contact);
        return;
    }
    // voltar para o menu anterior
    if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId) && messageBody == "#") {
        const option = await QueueOption_1.default.findByPk(ticket.queueOptionId);
        await ticket.update({ queueOptionId: option?.parentId });
        // escolheu uma opção
    }
    else if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId)) {
        const count = await QueueOption_1.default.count({
            where: { parentId: ticket.queueOptionId },
        });
        let option = {};
        if (count == 1) {
            option = await QueueOption_1.default.findOne({
                where: { parentId: ticket.queueOptionId },
            });
        }
        else {
            option = await QueueOption_1.default.findOne({
                where: {
                    option: messageBody || "",
                    parentId: ticket.queueOptionId,
                },
            });
        }
        if (option) {
            await ticket.update({ queueOptionId: option?.id });
        }
        // não linha a primeira pergunta
    }
    else if (!(0, lodash_1.isNil)(queue) && (0, lodash_1.isNil)(ticket.queueOptionId) && !dontReadTheFirstQuestion) {
        const option = queue?.options.find((o) => o.option == messageBody);
        if (option) {
            await ticket.update({ queueOptionId: option?.id });
        }
    }
    await ticket.reload();
    if (!(0, lodash_1.isNil)(queue) && (0, lodash_1.isNil)(ticket.queueOptionId)) {
        const queueOptions = await QueueOption_1.default.findAll({
            where: { queueId: ticket.queueId, parentId: null },
            order: [
                ["option", "ASC"],
                ["createdAt", "ASC"],
            ],
        });
        const companyId = ticket.companyId;
        const buttonActive = await Setting_1.default.findOne({
            where: {
                key: "chatBotType",
                companyId
            }
        });
        const botList = async () => {
            const sectionsRows = [];
            queueOptions.forEach((option, i) => {
                sectionsRows.push({
                    title: option.title,
                    rowId: `${option.option}`
                });
            });
            sectionsRows.push({
                title: "Voltar Menu Inicial",
                rowId: `#`
            });
            const sections = [
                {
                    rows: sectionsRows
                }
            ];
            const listMessage = {
                text: (0, Mustache_1.default)(`\u200e${queue.greetingMessage}`, ticket.contact),
                buttonText: "Escolha uma opção",
                sections
            };
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, listMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
        };
        const botButton = async () => {
            const buttons = [];
            queueOptions.forEach((option, i) => {
                buttons.push({
                    buttonId: `${option.option}`,
                    buttonText: { displayText: option.title },
                    type: 4
                });
            });
            buttons.push({
                buttonId: `#`,
                buttonText: { displayText: "Voltar Menu Inicial" },
                type: 4
            });
            const buttonMessage = {
                text: (0, Mustache_1.default)(`\u200e${queue.greetingMessage}`, ticket.contact),
                buttons,
                headerType: 4
            };
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, buttonMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
        };
        const botText = async () => {
            let options = "";
            queueOptions.forEach((option, i) => {
                options += `*[ ${option.option} ]* - ${option.title}\n`;
            });
            options += `\n*[ # ]* - Voltar Menu Inicial`;
            const textMessage = {
                text: (0, Mustache_1.default)(`\u200e${queue.greetingMessage}\n\n${options}`, ticket.contact),
            };
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
        };
        if (buttonActive.value === "list") {
            return botList();
        }
        ;
        if (buttonActive.value === "button" && QueueOption_1.default.length <= 4) {
            return botButton();
        }
        if (buttonActive.value === "text") {
            return botText();
        }
        if (buttonActive.value === "button" && QueueOption_1.default.length > 4) {
            return botText();
        }
    }
    else if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId)) {
        const currentOption = await QueueOption_1.default.findByPk(ticket.queueOptionId);
        const queueOptions = await QueueOption_1.default.findAll({
            where: { parentId: ticket.queueOptionId },
            order: [
                ["option", "ASC"],
                ["createdAt", "ASC"],
            ],
        });
        if (queueOptions.length == 0) {
            const textMessage = {
                text: (0, Mustache_1.default)(`${currentOption.message}`, ticket.contact),
            };
            const lastMessageFromMe = await Message_1.default.findOne({
                where: {
                    ticketId: ticket.id,
                    fromMe: true,
                    body: textMessage.text
                },
                order: [["createdAt", "DESC"]]
            });
            if (lastMessageFromMe) {
                return;
            }
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
            return;
        }
        if (queueOptions.length > 1) {
            const companyId = ticket.companyId;
            const buttonActive = await Setting_1.default.findOne({
                where: {
                    key: "chatBotType",
                    companyId
                }
            });
            const botList = async () => {
                const sectionsRows = [];
                queueOptions.forEach((option, i) => {
                    sectionsRows.push({
                        title: option.title,
                        rowId: `${option.option}`
                    });
                });
                sectionsRows.push({
                    title: "Voltar Menu Inicial",
                    rowId: `#`
                });
                const sections = [
                    {
                        rows: sectionsRows
                    }
                ];
                const listMessage = {
                    text: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact),
                    buttonText: "Escolha uma opção",
                    sections
                };
                const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, listMessage);
                await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
            };
            const botButton = async () => {
                const buttons = [];
                queueOptions.forEach((option, i) => {
                    buttons.push({
                        buttonId: `${option.option}`,
                        buttonText: { displayText: option.title },
                        type: 4
                    });
                });
                buttons.push({
                    buttonId: `#`,
                    buttonText: { displayText: "Voltar Menu Inicial" },
                    type: 4
                });
                const buttonMessage = {
                    text: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact),
                    buttons,
                    headerType: 4
                };
                const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, buttonMessage);
                await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
            };
            const botText = async () => {
                let options = "";
                queueOptions.forEach((option, i) => {
                    options += `*[ ${option.option} ]* - ${option.title}\n`;
                });
                options += `\n*[ # ]* - Voltar Menu Inicial`;
                const textMessage = {
                    text: (0, Mustache_1.default)(`\u200e${currentOption.message}\n\n${options}`, ticket.contact),
                };
                const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
                await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact);
            };
            if (buttonActive.value === "list") {
                return botList();
            }
            ;
            if (buttonActive.value === "button" && QueueOption_1.default.length <= 4) {
                return botButton();
            }
            if (buttonActive.value === "text") {
                return botText();
            }
            if (buttonActive.value === "button" && QueueOption_1.default.length > 4) {
                return botText();
            }
        }
    }
};
const handleMessage = async (msg, wbot, companyId) => {
    if (!isValidMsg(msg))
        return;
    try {
        let msgContact;
        let groupContact;
        const isGroup = msg.key.remoteJid?.endsWith("@g.us");
        const msgIsGroupBlock = await Setting_1.default.findOne({
            where: {
                companyId,
                key: "CheckMsgIsGroup",
            },
        });
        const bodyMessage = await (0, exports.getBodyMessage)(msg);
        const msgType = getTypeMessage(msg);
        if (msgType === "protocolMessage")
            return; // Tratar isso no futuro para excluir msgs se vor REVOKE
        const hasMedia = msg.message?.audioMessage ||
            msg.message?.imageMessage ||
            msg.message?.videoMessage ||
            msg.message?.documentMessage ||
            msg.message.stickerMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage ||
            msg?.message?.ephemeralMessage?.message?.imageMessage ||
            msg?.message?.ephemeralMessage?.message?.audioMessage ||
            msg?.message?.ephemeralMessage?.message?.videoMessage ||
            msg?.message?.ephemeralMessage?.message?.documentMessage ||
            msg?.message?.ephemeralMessage?.message?.stickerMessage ||
            msg.message?.viewOnceMessage?.message?.imageMessage ||
            msg.message?.viewOnceMessage?.message?.videoMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.imageMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.videoMessage ||
            msg.message?.documentWithCaptionMessage?.message?.documentMessage;
        if (msg.key.fromMe) {
            if (/\u200e/.test(bodyMessage))
                return;
            if (!hasMedia &&
                msgType !== "conversation" &&
                msgType !== "extendedTextMessage" &&
                msgType !== "vcard" &&
                msgType !== "reactionMessage" &&
                msgType !== "ephemeralMessage" &&
                msgType !== "protocolMessage")
                return;
            msgContact = await getContactMessage(msg, wbot);
        }
        else {
            msgContact = await getContactMessage(msg, wbot);
        }
        if (msgIsGroupBlock?.value === "enabled" && isGroup)
            return;
        if (isGroup) {
            try {
                //Verificar se bdTemp[msg.key.remoteJid] tem createdAt e se ja tem mais de 10 minutos em relação ao momento atual
                if (Tmp_1.default[msg.key.remoteJid] && Tmp_1.default[msg.key.remoteJid]?.grupo?.createdAt && Tmp_1.default[msg.key.remoteJid].grupo) {
                    const createdAt = Tmp_1.default[msg.key.remoteJid]?.grupo.createdAt;
                    const now = new Date();
                    const diff = now.getTime() - createdAt.getTime();
                    const minutes = Math.floor(diff / 60000);
                    if (minutes > 10) {
                        //sleep de meio segundo para evitar bloqueio
                        await new Promise(resolve => setTimeout(resolve, 500));
                        let temp = await wbot.groupMetadata(msg.key.remoteJid);
                        temp["createdAt"] = new Date();
                        Tmp_1.default[msg.key.remoteJid].grupo = temp;
                    }
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    let temp = await wbot.groupMetadata(msg.key.remoteJid);
                    temp["createdAt"] = new Date();
                    Tmp_1.default[msg.key.remoteJid] = { grupo: temp, ...Tmp_1.default[msg.key.remoteJid] };
                }
                const grupoMeta = Tmp_1.default[msg.key.remoteJid].grupo;
                const msgGroupContact = {
                    id: grupoMeta.id,
                    name: grupoMeta.subject,
                };
                groupContact = await verifyContact(msgGroupContact, wbot, companyId);
                if (bodyMessage && bodyMessage.toUpperCase() === "##KEYGROUP") {
                    const sentMessage = await wbot.sendMessage(`${msg.key.remoteJid}`, {
                        text: `Grupo id: ${grupoMeta.id} \nNome: ${grupoMeta.subject} \nQtd Participantes: ${grupoMeta.participants.length}\n \nParticipantes:\n${grupoMeta.participants.map((participant) => `${participant.id} ${participant.admin ? participant.admin : ""}`).join("\n")}`,
                    });
                }
                if (bodyMessage && bodyMessage.toUpperCase() === "##REAJA") {
                    const emoticons = ['🤘🏽', '💖', '👏🏻', '🙏🏻', '🤓'];
                    const reactionMessage = {
                        react: {
                            text: emoticons[Math.floor(Math.random() * emoticons.length)] || '😬',
                            key: msg.key
                        }
                    };
                    const sentMessage = await wbot.sendMessage(`${msg.key.remoteJid}`, reactionMessage);
                }
            }
            catch (err) {
                console.log(err);
                Sentry.setExtra('Error isGroup', { companyId, msg, });
                Sentry.captureException(err);
                logger_1.logger.error(`Error isGroup: Err: ${err}`);
                throw new Error("ERR_ISGROUP_LISTNER");
            }
        }
        const whatsapp = await (0, ShowWhatsAppService_1.default)(wbot.id, companyId);
        const contact = await verifyContact(msgContact, wbot, companyId);
        let unreadMessages = 0;
        if (msg.key.fromMe) {
            await cache_1.cacheLayer.set(`contacts:${contact.id}:unreads`, "0");
        }
        else {
            const unreads = await cache_1.cacheLayer.get(`contacts:${contact.id}:unreads`);
            unreadMessages = +unreads + 1;
            await cache_1.cacheLayer.set(`contacts:${contact.id}:unreads`, `${unreadMessages}`);
        }
        const lastMessage = await Message_1.default.findOne({
            where: {
                contactId: contact.id,
                companyId,
            },
            order: [["createdAt", "DESC"]],
        });
        if (unreadMessages === 0 && whatsapp.complationMessage && (0, Mustache_1.default)(whatsapp.complationMessage, contact).trim().toLowerCase() === lastMessage.body.trim().toLowerCase()) {
            return;
        }
        const ticket = await (0, FindOrCreateTicketService_1.default)(contact, wbot.id, unreadMessages, companyId, groupContact);
        await (0, providers_1.provider)(ticket, msg, companyId, contact, wbot);
        // voltar para o menu inicial
        if (bodyMessage == "#") {
            await ticket.update({
                queueOptionId: null,
                chatbot: false,
                queueId: null,
            });
            await verifyQueue(wbot, msg, ticket, ticket.contact);
            return;
        }
        const ticketTraking = await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId: ticket.id,
            companyId,
            whatsappId: whatsapp?.id
        });
        try {
            if (!msg.key.fromMe) {
                /**
                 * Tratamento para avaliação do atendente
                 */
                if ((0, exports.verifyRating)(ticketTraking)) {
                    (0, exports.handleRating)(msg, ticket, ticketTraking);
                    return;
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        if (hasMedia) {
            await verifyMediaMessage(msg, ticket, contact);
        }
        else {
            await (0, exports.verifyMessage)(msg, ticket, contact);
        }
        const currentSchedule = await (0, VerifyCurrentSchedule_1.default)(companyId);
        const scheduleType = await Setting_1.default.findOne({
            where: {
                companyId,
                key: "scheduleType"
            }
        });
        try {
            if (!msg.key.fromMe && scheduleType) {
                /**
                 * Tratamento para envio de mensagem quando a empresa está fora do expediente
                 */
                if (scheduleType.value === "company" &&
                    !(0, lodash_1.isNil)(currentSchedule) &&
                    (!currentSchedule || currentSchedule.inActivity === false)) {
                    const body = `${whatsapp.outOfHoursMessage}`;
                    const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                        await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                            text: body
                        });
                    }, 3000, ticket.id);
                    debouncedSentMessage();
                    return;
                }
                if (scheduleType.value === "queue" && ticket.queueId !== null) {
                    /**
                     * Tratamento para envio de mensagem quando a fila está fora do expediente
                     */
                    const queue = await Queue_1.default.findByPk(ticket.queueId);
                    const { schedules } = queue;
                    const now = (0, moment_1.default)();
                    const weekday = now.format("dddd").toLowerCase();
                    let schedule = null;
                    if (Array.isArray(schedules) && schedules.length > 0) {
                        schedule = schedules.find(s => s.weekdayEn === weekday &&
                            s.startTime !== "" &&
                            s.startTime !== null &&
                            s.endTime !== "" &&
                            s.endTime !== null);
                    }
                    if (scheduleType.value === "queue" &&
                        queue.outOfHoursMessage !== null &&
                        queue.outOfHoursMessage !== "" &&
                        !(0, lodash_1.isNil)(schedule)) {
                        const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
                        const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
                        if (now.isBefore(startTime) || now.isAfter(endTime)) {
                            const body = `${queue.outOfHoursMessage}`;
                            const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                                await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                                    text: body
                                });
                            }, 3000, ticket.id);
                            debouncedSentMessage();
                            return;
                        }
                    }
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        try {
            if (!msg.key.fromMe) {
                if (ticketTraking !== null && (0, exports.verifyRating)(ticketTraking)) {
                    (0, exports.handleRating)(msg, ticket, ticketTraking);
                    return;
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        if (!ticket.queue &&
            !isGroup &&
            !msg.key.fromMe &&
            !ticket.userId &&
            whatsapp.queues.length >= 1) {
            await verifyQueue(wbot, msg, ticket, ticket.contact);
        }
        const dontReadTheFirstQuestion = ticket.queue === null;
        await ticket.reload();
        try {
            //Fluxo fora do expediente
            if (!msg.key.fromMe && scheduleType && ticket.queueId !== null) {
                /**
                 * Tratamento para envio de mensagem quando a fila está fora do expediente
                 */
                const queue = await Queue_1.default.findByPk(ticket.queueId);
                const { schedules } = queue;
                const now = (0, moment_1.default)();
                const weekday = now.format("dddd").toLowerCase();
                let schedule = null;
                if (Array.isArray(schedules) && schedules.length > 0) {
                    schedule = schedules.find(s => s.weekdayEn === weekday &&
                        s.startTime !== "" &&
                        s.startTime !== null &&
                        s.endTime !== "" &&
                        s.endTime !== null);
                }
                if (scheduleType.value === "queue" &&
                    queue.outOfHoursMessage !== null &&
                    queue.outOfHoursMessage !== "" &&
                    !(0, lodash_1.isNil)(schedule)) {
                    const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
                    const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
                    if (now.isBefore(startTime) || now.isAfter(endTime)) {
                        const body = queue.outOfHoursMessage;
                        const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                            await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                                text: body
                            });
                        }, 3000, ticket.id);
                        debouncedSentMessage();
                        return;
                    }
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        if (!whatsapp?.queues?.length && !ticket.userId && !isGroup && !msg.key.fromMe) {
            const lastMessage = await Message_1.default.findOne({
                where: {
                    ticketId: ticket.id,
                    fromMe: true
                },
                order: [["createdAt", "DESC"]]
            });
            if (lastMessage && lastMessage.body.includes(whatsapp.greetingMessage)) {
                return;
            }
            if (whatsapp.greetingMessage) {
                const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                    await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                        text: whatsapp.greetingMessage
                    });
                }, 1000, ticket.id);
                debouncedSentMessage();
                return;
            }
        }
        if (whatsapp.queues.length == 1 && ticket.queue) {
            if (ticket.chatbot && !msg.key.fromMe) {
                await handleChartbot(ticket, msg, wbot);
            }
        }
        if (whatsapp.queues.length > 1 && ticket.queue) {
            if (ticket.chatbot && !msg.key.fromMe) {
                await handleChartbot(ticket, msg, wbot, dontReadTheFirstQuestion);
            }
        }
    }
    catch (err) {
        console.log(err);
        Sentry.captureException(err);
        logger_1.logger.error(`Error handling whatsapp message: Err: ${err}`);
    }
};
exports.handleMessage = handleMessage;
const handleMsgAck = async (msg, chat) => {
    await new Promise((r) => setTimeout(r, 500));
    const io = (0, socket_1.getIO)();
    try {
        const messageToUpdate = await Message_1.default.findByPk(msg.key.id, {
            include: [
                "contact",
                {
                    model: Message_1.default,
                    as: "quotedMsg",
                    include: ["contact"],
                },
            ],
        });
        if (!messageToUpdate)
            return;
        await messageToUpdate.update({ ack: chat });
        io.to(messageToUpdate.ticketId.toString()).emit(`company-${messageToUpdate.companyId}-appMessage`, {
            action: "update",
            message: messageToUpdate,
        });
    }
    catch (err) {
        Sentry.captureException(err);
        logger_1.logger.error(`Error handling message ack. Err: ${err}`);
    }
};
const verifyRecentCampaign = async (message, companyId) => {
    if (!message.key.fromMe) {
        const number = message.key.remoteJid.replace(/\D/g, "");
        const campaigns = await Campaign_1.default.findAll({
            where: { companyId, status: "EM_ANDAMENTO", confirmation: true },
        });
        if (campaigns) {
            const ids = campaigns.map((c) => c.id);
            const campaignShipping = await CampaignShipping_1.default.findOne({
                where: { campaignId: { [sequelize_1.Op.in]: ids }, number, confirmation: null },
            });
            if (campaignShipping) {
                await campaignShipping.update({
                    confirmedAt: (0, moment_1.default)(),
                    confirmation: true,
                });
                await queues_1.campaignQueue.add("DispatchCampaign", {
                    campaignShippingId: campaignShipping.id,
                    campaignId: campaignShipping.campaignId,
                }, {
                    delay: (0, queues_1.parseToMilliseconds)((0, queues_1.randomValue)(0, 10)),
                });
            }
        }
    }
};
const verifyCampaignMessageAndCloseTicket = async (message, companyId) => {
    const io = (0, socket_1.getIO)();
    const body = await (0, exports.getBodyMessage)(message);
    const isCampaign = /\u200c/.test(body);
    if (message.key.fromMe && isCampaign) {
        const messageRecord = await Message_1.default.findOne({
            where: { id: message.key.id, companyId },
        });
        const ticket = await Ticket_1.default.findByPk(messageRecord.ticketId);
        await ticket.update({ status: "closed" });
        io.to("open").emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id,
        });
        io.to(ticket.status)
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id,
        });
    }
};
const filterMessages = (msg) => {
    if (msg.message?.protocolMessage)
        return false;
    if ([
        baileys_1.WAMessageStubType.REVOKE,
        baileys_1.WAMessageStubType.E2E_DEVICE_CHANGED,
        baileys_1.WAMessageStubType.E2E_IDENTITY_CHANGED,
        baileys_1.WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType))
        return false;
    return true;
};
const wbotMessageListener = async (wbot, companyId) => {
    try {
        wbot.ev.on("messages.upsert", async (messageUpsert) => {
            const messages = messageUpsert.messages
                .filter(filterMessages)
                .map(msg => msg);
            if (!messages)
                return;
            messages.forEach(async (message) => {
                // if (
                //   !message.key.fromMe &&
                //   messageUpsert.type === "notify"
                // ) {
                //   (wbot as WASocket)!.readMessages([message.key]);
                // }
                const messageExists = await Message_1.default.count({
                    where: { id: message.key.id, companyId }
                });
                if (!messageExists) {
                    const body = await (0, exports.getBodyMessage)(message);
                    const isCampaign = /\u200c/.test(body);
                    if (!isCampaign) {
                        await handleMessage(message, wbot, companyId);
                    }
                    await verifyCampaignMessageAndCloseTicket(message, companyId);
                    await verifyRecentCampaign(message, companyId);
                }
            });
        });
        wbot.ev.on("messages.update", (messageUpdate) => {
            if (messageUpdate.length === 0)
                return;
            messageUpdate.forEach(async (message) => {
                let ack;
                if (message.update.status === 3 && message?.key?.fromMe) {
                    ack = 2;
                }
                else {
                    ack = message.update.status;
                }
                handleMsgAck(message, ack);
            });
        });
        wbot.ev.on('message-receipt.update', (events) => {
            events.forEach(async (msg) => {
                const ack = msg?.receipt?.receiptTimestamp ? 3 :
                    msg?.receipt?.readTimestamp ? 4 : 0;
                if (!ack)
                    return;
                await handleMsgAck(msg, ack);
            });
        });
    }
    catch (error) {
        Sentry.captureException(error);
        logger_1.logger.error(`Error handling wbot message listener. Err: ${error}`);
    }
};
exports.wbotMessageListener = wbotMessageListener;
