"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("../../libs/socket");
const Message_1 = __importDefault(require("../../models/Message"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const CreateMessageService = async ({ messageData, companyId }) => {
    await Message_1.default.upsert({ ...messageData, companyId });
    const message = await Message_1.default.findByPk(messageData.id, {
        include: [
            "contact",
            {
                model: Ticket_1.default,
                as: "ticket",
                include: ["contact", "queue"]
            },
            {
                model: Message_1.default,
                as: "quotedMsg",
                include: ["contact"]
            }
        ]
    });
    if (message.ticket.queueId !== null && message.queueId === null) {
        await message.update({ queueId: message.ticket.queueId });
    }
    if (!message) {
        throw new Error("ERR_CREATING_MESSAGE");
    }
    const io = (0, socket_1.getIO)();
    io.to(message.ticketId.toString())
        .to(message.ticket.status)
        .to("notification")
        .emit(`company-${companyId}-appMessage`, {
        action: "create",
        message,
        ticket: message.ticket,
        contact: message.ticket.contact
    });
    return message;
};
exports.default = CreateMessageService;
