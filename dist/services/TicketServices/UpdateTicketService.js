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
const moment_1 = __importDefault(require("moment"));
const Sentry = __importStar(require("@sentry/node"));
const CheckContactOpenTickets_1 = __importDefault(require("../../helpers/CheckContactOpenTickets"));
const SetTicketMessagesAsRead_1 = __importDefault(require("../../helpers/SetTicketMessagesAsRead"));
const socket_1 = require("../../libs/socket");
const Setting_1 = __importDefault(require("../../models/Setting"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const ShowTicketService_1 = __importDefault(require("./ShowTicketService"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const SendWhatsAppMessage_1 = __importDefault(require("../WbotServices/SendWhatsAppMessage"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("./FindOrCreateATicketTrakingService"));
const GetTicketWbot_1 = __importDefault(require("../../helpers/GetTicketWbot"));
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const lodash_1 = require("lodash");
const sendFacebookMessage_1 = __importDefault(require("../FacebookServices/sendFacebookMessage"));
const UpdateTicketService = async ({ ticketData, ticketId, companyId }) => {
    try {
        const { status, justClose } = ticketData;
        let { queueId, userId } = ticketData;
        let chatbot = ticketData.chatbot || false;
        let queueOptionId = ticketData.queueOptionId || null;
        const io = (0, socket_1.getIO)();
        const key = "userRating";
        const setting = await Setting_1.default.findOne({
            where: {
                companyId,
                key
            }
        });
        const ticket = await (0, ShowTicketService_1.default)(ticketId, companyId);
        const ticketTraking = await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId,
            companyId,
            whatsappId: ticket.whatsappId
        });
        if (ticket.channel === "whatsapp") {
            (0, SetTicketMessagesAsRead_1.default)(ticket);
        }
        const oldStatus = ticket.status;
        const oldUserId = ticket.user?.id;
        const oldQueueId = ticket.queueId;
        if (oldStatus === "closed") {
            await (0, CheckContactOpenTickets_1.default)(ticket.contact.id);
            chatbot = null;
            queueOptionId = null;
        }
        if (status !== undefined && ["closed"].indexOf(status) > -1) {
            const { complationMessage, ratingMessage } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, companyId);
            if (setting?.value === "enabled") {
                if (ticketTraking.ratingAt == null && !justClose) {
                    const ratingTxt = ratingMessage || "";
                    let bodyRatingMessage = `\u200e${ratingTxt}\n\n`;
                    bodyRatingMessage +=
                        "Digite de 1 à 3 para qualificar nosso atendimento:\n*1* - _Insatisfeito_\n*2* - _Satisfeito_\n*3* - _Muito Satisfeito_\n\n";
                    if (ticket.channel === "whatsapp") {
                        await (0, SendWhatsAppMessage_1.default)({ body: bodyRatingMessage, ticket });
                    }
                    if (["facebook", "instagram"].includes(ticket.channel)) {
                        console.log(`Checking if ${ticket.contact.number} is a valid ${ticket.channel} contact`);
                        await (0, sendFacebookMessage_1.default)({ body: bodyRatingMessage, ticket });
                    }
                    await ticketTraking.update({
                        ratingAt: (0, moment_1.default)().toDate()
                    });
                    io.to("open")
                        .to(ticketId.toString())
                        .emit(`company-${ticket.companyId}-ticket`, {
                        action: "delete",
                        ticketId: ticket.id
                    });
                    return { ticket, oldStatus, oldUserId };
                }
                ticketTraking.ratingAt = (0, moment_1.default)().toDate();
                ticketTraking.rated = false;
            }
            if (!(0, lodash_1.isNil)(complationMessage) && complationMessage !== "") {
                const body = `\u200e${complationMessage}`;
                if (ticket.channel === "whatsapp") {
                    await (0, SendWhatsAppMessage_1.default)({ body, ticket });
                }
                if (["facebook", "instagram"].includes(ticket.channel)) {
                    console.log(`Checking if ${ticket.contact.number} is a valid ${ticket.channel} contact`);
                    await (0, sendFacebookMessage_1.default)({ body, ticket });
                }
            }
            ticketTraking.finishedAt = (0, moment_1.default)().toDate();
            ticketTraking.whatsappId = ticket.whatsappId;
            ticketTraking.userId = ticket.userId;
            queueId = null;
            userId = null;
        }
        if (queueId !== undefined && queueId !== null) {
            ticketTraking.queuedAt = (0, moment_1.default)().toDate();
        }
        if (oldQueueId !== queueId && !(0, lodash_1.isNil)(oldQueueId) && !(0, lodash_1.isNil)(queueId)) {
            const queue = await Queue_1.default.findByPk(queueId);
            if (ticket.channel === "whatsapp") {
                const wbot = await (0, GetTicketWbot_1.default)(ticket);
                const queueChangedMessage = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                    text: "\u200eVocê foi transferido, em breve iremos iniciar seu atendimento."
                });
                await (0, wbotMessageListener_1.verifyMessage)(queueChangedMessage, ticket, ticket.contact);
            }
            if (["facebook", "instagram"].includes(ticket.channel)) {
                console.log(`Checking if ${ticket.contact.number} is a valid ${ticket.channel} contact`);
                await (0, sendFacebookMessage_1.default)({ body: "\u200eVocê foi transferido, em breve iremos iniciar seu atendimento.", ticket });
            }
        }
        await ticket.update({
            status,
            queueId,
            userId,
            whatsappId: ticket.whatsappId,
            chatbot,
            queueOptionId
        });
        await ticket.reload();
        if (status !== undefined && ["pending"].indexOf(status) > -1) {
            ticketTraking.update({
                whatsappId: ticket.whatsappId,
                queuedAt: (0, moment_1.default)().toDate(),
                startedAt: null,
                userId: null
            });
            io.emit(`company-${companyId}-ticket`, {
                action: "removeFromList",
                ticketId: ticket?.id
            });
        }
        if (status !== undefined && ["open"].indexOf(status) > -1) {
            ticketTraking.update({
                startedAt: (0, moment_1.default)().toDate(),
                ratingAt: null,
                rated: false,
                whatsappId: ticket.whatsappId,
                userId: ticket.userId
            });
            io.emit(`company-${companyId}-ticket`, {
                action: "removeFromList",
                ticketId: ticket?.id
            });
        }
        await ticketTraking.save();
        if (justClose && status == 'closed') {
            io.emit(`company-${companyId}-ticket`, {
                action: "removeFromList",
                ticketId: ticket?.id
            });
        }
        else if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
            io.to(oldStatus).emit(`company-${companyId}-ticket`, {
                action: "delete",
                ticketId: ticket.id
            });
        }
        io.to(ticket.status)
            .to("notification")
            .to(ticketId.toString())
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
        });
        return { ticket, oldStatus, oldUserId };
    }
    catch (err) {
        Sentry.captureException(err);
    }
};
exports.default = UpdateTicketService;
