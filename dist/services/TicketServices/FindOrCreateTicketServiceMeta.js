"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const ShowTicketService_1 = __importDefault(require("./ShowTicketService"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("./FindOrCreateATicketTrakingService"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const FindOrCreateTicketServiceMeta = async (contact, whatsappId, unreadMessages, companyId, channel) => {
    let ticket = await Ticket_1.default.findOne({
        where: {
            status: {
                [sequelize_1.Op.or]: ["open", "pending", "closed"]
            },
            contactId: contact.id,
            companyId,
            channel
        },
        order: [["id", "DESC"]]
    });
    if (ticket) {
        await ticket.update({ unreadMessages });
    }
    if (!ticket) {
        ticket = await Ticket_1.default.findOne({
            where: {
                contactId: contact.id,
                channel
            },
            order: [["updatedAt", "DESC"]]
        });
        if (ticket) {
            await ticket.update({
                status: "pending",
                userId: null,
                unreadMessages,
                companyId,
                channel
            });
            await (0, FindOrCreateATicketTrakingService_1.default)({
                ticketId: ticket.id,
                companyId,
                whatsappId: ticket.whatsappId,
                userId: ticket.userId,
                channel
            });
        }
        const msgIsGroupBlock = await Setting_1.default.findOne({
            where: { key: "timeCreateNewTicket" }
        });
        const value = msgIsGroupBlock ? parseInt(msgIsGroupBlock.value, 10) : 7200;
    }
    if (!ticket) {
        ticket = await Ticket_1.default.findOne({
            where: {
                updatedAt: {
                    [sequelize_1.Op.between]: [+(0, date_fns_1.subHours)(new Date(), 2), +new Date()]
                },
                contactId: contact.id
            },
            order: [["updatedAt", "DESC"]]
        });
        if (ticket) {
            await ticket.update({
                status: "pending",
                userId: null,
                unreadMessages,
                companyId,
                channel
            });
            await (0, FindOrCreateATicketTrakingService_1.default)({
                ticketId: ticket.id,
                companyId,
                whatsappId: ticket.whatsappId,
                userId: ticket.userId,
                channel
            });
        }
    }
    if (!ticket) {
        ticket = await Ticket_1.default.create({
            contactId: contact.id,
            status: "pending",
            isGroup: false,
            unreadMessages,
            whatsappId,
            companyId,
            channel
        });
        await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId: ticket.id,
            companyId,
            whatsappId,
            userId: ticket.userId,
            channel
        });
    }
    else {
        await ticket.update({ whatsappId });
    }
    ticket = await (0, ShowTicketService_1.default)(ticket.id, companyId);
    return ticket;
};
exports.default = FindOrCreateTicketServiceMeta;
