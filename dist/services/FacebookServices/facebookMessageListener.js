"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRating = exports.handleMessage = exports.verifyMessageMedia = exports.verifyMessage = void 0;
const fs_1 = require("fs");
const axios_1 = __importDefault(require("axios"));
const path_1 = require("path");
const CreateOrUpdateContactService_1 = __importDefault(require("../ContactServices/CreateOrUpdateContactService"));
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const graphAPI_1 = require("./graphAPI");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const Message_1 = __importDefault(require("../../models/Message"));
const FindOrCreateTicketServiceMeta_1 = __importDefault(require("../TicketServices/FindOrCreateTicketServiceMeta"));
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const moment_1 = __importDefault(require("moment"));
const UserRating_1 = __importDefault(require("../../models/UserRating"));
const lodash_1 = require("lodash");
const socket_1 = require("../../libs/socket");
const FindOrCreateATicketTrakingService_1 = __importDefault(require("../TicketServices/FindOrCreateATicketTrakingService"));
const sendFacebookMessageMedia_1 = require("../FacebookServices/sendFacebookMessageMedia");
const sendFacebookMessage_1 = __importDefault(require("../FacebookServices/sendFacebookMessage"));
const QueueOption_1 = __importDefault(require("../../models/QueueOption"));
const verifyContact = async (msgContact, companyId, channel = "whatsapp") => {
    if (!msgContact)
        return null;
    const contactData = {
        name: msgContact?.name || `${msgContact?.first_name} ${msgContact?.last_name}`,
        number: msgContact.id,
        profilePicUrl: "",
        isGroup: false,
        companyId,
        channel
    };
    const contact = (0, CreateOrUpdateContactService_1.default)(contactData);
    return contact;
};
const verifyQuotedMessage = async (msg) => {
    if (!msg)
        return null;
    const quoted = msg?.reply_to?.mid;
    if (!quoted)
        return null;
    const quotedMsg = await Message_1.default.findOne({
        where: { id: quoted }
    });
    if (!quotedMsg)
        return null;
    return quotedMsg;
};
const verifyMessage = async (msg, body, ticket, contact, companyId, channel) => {
    const quotedMsg = await verifyQuotedMessage(msg);
    const messageData = {
        id: msg.mid || msg.message_id,
        ticketId: ticket.id,
        contactId: msg.is_echo ? undefined : contact.id,
        body: msg.text || body,
        fromMe: msg.is_echo,
        read: msg?.is_echo,
        quotedMsgId: quotedMsg?.id,
        ack: 3,
        dataJson: JSON.stringify(msg),
        channel: channel
    };
    await (0, CreateMessageService_1.default)({ messageData, companyId });
    await ticket.update({
        lastMessage: msg.text
    });
};
exports.verifyMessage = verifyMessage;
const verifyMessageMedia = async (msg, ticket, contact, companyId, channel) => {
    const { data } = await axios_1.default.get(msg.attachments[0].payload.url, {
        responseType: "arraybuffer"
    });
    // eslint-disable-next-line no-eval
    const { fileTypeFromBuffer } = await eval('import("file-type")');
    const type = await fileTypeFromBuffer(data);
    const fileName = `${new Date().getTime()}.${type.ext}`;
    (0, fs_1.writeFileSync)((0, path_1.join)(__dirname, "..", "..", "..", "public", fileName), data, "base64");
    const messageData = {
        id: msg.mid,
        ticketId: ticket.id,
        contactId: msg.is_echo ? undefined : contact.id,
        body: msg?.text || fileName,
        fromMe: msg.is_echo,
        mediaType: msg.attachments[0].type,
        mediaUrl: fileName,
        read: msg.is_echo,
        quotedMsgId: null,
        ack: 3,
        dataJson: JSON.stringify(msg),
        channel: channel
    };
    await (0, CreateMessageService_1.default)({ messageData, companyId: companyId });
    await ticket.update({
        lastMessage: msg?.text || fileName,
    });
};
exports.verifyMessageMedia = verifyMessageMedia;
const sendMessageImage = async (contact, ticket, url, caption) => {
    let sentMessage;
    try {
        sentMessage = await (0, sendFacebookMessageMedia_1.sendFacebookMessageMediaExternal)({
            url,
            ticket,
        });
    }
    catch (error) {
        await (0, sendFacebookMessage_1.default)({
            ticket,
            body: (0, Mustache_1.default)('Não consegui enviar o PDF, tente novamente!', contact)
        });
    }
    // verifyMessage(sentMessage, ticket, contact);
};
const verifyQueue = async (wbot, message, ticket, contact) => {
    const { queues, greetingMessage } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
    if (queues?.length === 1) {
        const firstQueue = (0, lodash_1.head)(queues);
        let chatbot = false;
        if (firstQueue?.options) {
            chatbot = firstQueue?.options?.length > 0;
        }
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: firstQueue?.id, chatbot },
            ticketId: ticket.id,
            companyId: ticket.companyId,
        });
        return;
    }
    const selectedOption = message;
    const choosenQueue = queues[+selectedOption - 1];
    const companyId = ticket.companyId;
    const botText = async () => {
        let options = "";
        queues.forEach((queue, index) => {
            options += `*[ ${index + 1} ]* - ${queue.name}\n`;
        });
        const textMessage = (0, Mustache_1.default)(`\u200e${greetingMessage}\n\n${options}`, contact);
        await (0, sendFacebookMessage_1.default)({
            ticket,
            body: textMessage
        });
        // const sendMsg = await wbot.sendMessage(
        //   `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        //   textMessage
        // );
        // await verifyMessage(sendMsg, ticket, ticket.contact);
    };
    if (choosenQueue) {
        let chatbot = false;
        if (choosenQueue?.options) {
            chatbot = choosenQueue?.options?.length > 0;
        }
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: choosenQueue.id, chatbot },
            ticketId: ticket.id,
            companyId: ticket.companyId,
        });
        /* Tratamento para envio de mensagem quando a fila está fora do expediente */
        if (choosenQueue?.options?.length === 0) {
            const queue = await Queue_1.default.findByPk(choosenQueue.id);
            const { schedules } = queue;
            const now = (0, moment_1.default)();
            const weekday = now.format("dddd").toLowerCase();
            let schedule;
            if (Array.isArray(schedules) && schedules?.length > 0) {
                schedule = schedules.find((s) => s.weekdayEn === weekday && s.startTime !== "" && s.startTime !== null && s.endTime !== "" && s.endTime !== null);
            }
            if (queue.outOfHoursMessage !== null && queue.outOfHoursMessage !== "" && !(0, lodash_1.isNil)(schedule)) {
                const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
                const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
                if (now.isBefore(startTime) || now.isAfter(endTime)) {
                    const body = (0, Mustache_1.default)(`${queue.outOfHoursMessage}\n\n*[ # ]* - Voltar ao Menu Principal`, ticket.contact);
                    const sentMessage = await (0, sendFacebookMessage_1.default)({
                        ticket,
                        body: body
                    });
                    // const sentMessage = await wbot.sendMessage(
                    //   `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                    //   text: body,
                    // }
                    // );
                    // await verifyMessage(sentMessage, ticket, contact);
                    await (0, UpdateTicketService_1.default)({
                        ticketData: { queueId: null, chatbot },
                        ticketId: ticket.id,
                        companyId: ticket.companyId,
                    });
                    return;
                }
            }
            const body = (0, Mustache_1.default)(`\u200e${choosenQueue.greetingMessage}`, ticket.contact);
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: body
            });
            // await verifyMessage(sentMessage, ticket, contact);
        }
    }
    else {
        await botText();
    }
};
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
    if (ticket.queue !== null) {
        const queue = await Queue_1.default.findByPk(ticket.queueId);
        const { schedules } = queue;
        const now = (0, moment_1.default)();
        const weekday = now.format("dddd").toLowerCase();
        let schedule;
        if (Array.isArray(schedules) && schedules?.length > 0) {
            schedule = schedules.find((s) => s.weekdayEn === weekday && s.startTime !== "" && s.startTime !== null && s.endTime !== "" && s.endTime !== null);
        }
        if (ticket.queue.outOfHoursMessage !== null && ticket.queue.outOfHoursMessage !== "" && !(0, lodash_1.isNil)(schedule)) {
            const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
            const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
            if (now.isBefore(startTime) || now.isAfter(endTime)) {
                const body = (0, Mustache_1.default)(`${ticket.queue.outOfHoursMessage}\n\n*[ # ]* - Voltar ao Menu Principal`, ticket.contact);
                await (0, sendFacebookMessage_1.default)({
                    ticket,
                    body: body
                });
                // await verifyMessage(sentMessage, ticket, ticket.contact);
                return;
            }
            const body = (0, Mustache_1.default)(`\u200e${ticket.queue.greetingMessage}`, ticket.contact);
            // const sentMessage = await wbot.sendMessage(
            //   `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            //   text: body,
            // }
            // );
            await (0, sendFacebookMessage_1.default)({
                ticket,
                body: body
            });
            // await verifyMessage(sentMessage, ticket, ticket.contact);
        }
    }
    const messageBody = msg;
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
        const botText = async () => {
            let options = "";
            queueOptions.forEach((option, i) => {
                options += `*[ ${option.option} ]* - ${option.title}\n`;
            });
            options += `\n*[ # ]* - Voltar Menu Inicial`;
            const textMessage = (0, Mustache_1.default)(`\u200e${queue.greetingMessage}\n\n${options}`, ticket.contact);
            // const sendMsg = await wbot.sendMessage(
            //   `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            //   textMessage
            // );
            await (0, sendFacebookMessage_1.default)({
                ticket,
                body: textMessage
            });
            // await verifyMessage(sendMsg, ticket, ticket.contact);
        };
        return botText();
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
        if (queueOptions?.length > 1) {
            const botText = async () => {
                let options = "";
                queueOptions.forEach((option, i) => {
                    options += `*[ ${option.option} ]* - ${option.title}\n`;
                });
                options += `\n*[ # ]* - Voltar Menu Inicial`;
                await (0, sendFacebookMessage_1.default)({
                    ticket,
                    body: (0, Mustache_1.default)(`\u200e${currentOption.message}\n\n${options}`, ticket.contact)
                });
            };
            return botText();
        }
    }
};
const sendMessageLink = async (ticket, url) => {
    await (0, sendFacebookMessageMedia_1.sendFacebookMessageFileExternal)({
        url,
        ticket,
    });
    // verifyMessage(sentMessage, ticket, contact);
};
const handleMessage = async (token, webhookEvent, channel, companyId) => {
    if (webhookEvent.message) {
        let msgContact;
        const senderPsid = webhookEvent.sender.id;
        const recipientPsid = webhookEvent.recipient.id;
        const { message } = webhookEvent;
        const fromMe = message.is_echo;
        if (fromMe) {
            // if (/\u200e/.test(message.text)) return;
            msgContact = await (0, graphAPI_1.profilePsid)(recipientPsid, token.facebookUserToken);
        }
        else {
            msgContact = await (0, graphAPI_1.profilePsid)(senderPsid, token.facebookUserToken);
        }
        const contact = await verifyContact(msgContact, companyId, channel);
        const unreadCount = fromMe ? 0 : 1;
        const getSession = await Whatsapp_1.default.findOne({
            where: {
                facebookPageUserId: token.facebookPageUserId
            },
            include: [
                {
                    model: Queue_1.default,
                    as: "queues",
                    attributes: ["id", "name", "color", "greetingMessage"],
                    include: [{ model: QueueOption_1.default, as: "options" }]
                }
            ],
            order: [
                ["queues", "id", "ASC"],
            ]
        });
        if (fromMe && getSession.complationMessage && (0, Mustache_1.default)(getSession.complationMessage, contact) === `${message.text}`) {
            return;
        }
        const ticket = await (0, FindOrCreateTicketServiceMeta_1.default)(contact, getSession.id, unreadCount, companyId, channel);
        if (message.attachments) {
            await (0, exports.verifyMessageMedia)(message, ticket, contact, companyId, channel);
        }
        await (0, exports.verifyMessage)(message, message.text, ticket, contact, companyId, channel);
        if (message == "#") {
            await ticket.update({
                queueOptionId: null,
                chatbot: false,
                queueId: null,
            });
            return;
        }
        const ticketTraking = await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId: ticket.id,
            companyId,
            whatsappId: getSession?.id,
            channel,
        });
        try {
            if (!fromMe) {
                if (ticketTraking !== null && (0, wbotMessageListener_1.verifyRating)(ticketTraking)) {
                    (0, exports.handleRating)(message, ticket, ticketTraking);
                    return;
                }
            }
        }
        catch (e) {
            console.log(e);
        }
        if (!ticket.queue && !fromMe && !ticket.userId && getSession?.queues?.length >= 1) {
            await verifyQueue(getSession, message, ticket, ticket.contact);
        }
        const dontReadTheFirstQuestion = ticket.queue === null;
        await ticket.reload();
        if (getSession?.queues?.length == 1 && ticket.queue) {
            if (ticket.chatbot && !fromMe) {
                await handleChartbot(ticket, message, getSession);
            }
        }
        if (getSession?.queues?.length > 1 && ticket.queue) {
            if (ticket.chatbot && !fromMe) {
                await handleChartbot(ticket, message, getSession, dontReadTheFirstQuestion);
            }
        }
    }
};
exports.handleMessage = handleMessage;
const handleRating = async (msg, ticket, ticketTraking) => {
    const io = (0, socket_1.getIO)();
    let rate = null;
    if (msg.text) {
        rate = +msg.text || null;
    }
    if (!Number.isNaN(rate) && Number.isInteger(rate) && !(0, lodash_1.isNull)(rate)) {
        const { complationMessage } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, ticket.companyId);
        let finalRate = rate;
        if (rate < 1) {
            finalRate = 1;
        }
        if (rate > 3) {
            finalRate = 3;
        }
        await UserRating_1.default.create({
            ticketId: ticketTraking.ticketId,
            companyId: ticketTraking.companyId,
            userId: ticketTraking.userId,
            rate: finalRate,
        });
        const body = (0, Mustache_1.default)(`\u200e${complationMessage}`, ticket.contact);
        await (0, sendFacebookMessage_1.default)({
            ticket,
            body: body
        });
        await ticketTraking.update({
            finishedAt: (0, moment_1.default)().toDate(),
            rated: true,
        });
        setTimeout(async () => {
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
        }, 2000);
    }
};
exports.handleRating = handleRating;
