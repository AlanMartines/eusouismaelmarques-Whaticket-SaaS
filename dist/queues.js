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
exports.startQueueProcess = exports.randomValue = exports.parseToMilliseconds = exports.campaignQueue = exports.sendScheduledMessages = exports.scheduleMonitor = exports.messageQueue = exports.userMonitor = void 0;
const Sentry = __importStar(require("@sentry/node"));
const bull_1 = __importDefault(require("bull"));
const SendMessage_1 = require("./helpers/SendMessage");
const Whatsapp_1 = __importDefault(require("./models/Whatsapp"));
const logger_1 = require("./utils/logger");
const moment_1 = __importDefault(require("moment"));
const Schedule_1 = __importDefault(require("./models/Schedule"));
const Contact_1 = __importDefault(require("./models/Contact"));
const sequelize_1 = require("sequelize");
const GetDefaultWhatsApp_1 = __importDefault(require("./helpers/GetDefaultWhatsApp"));
const Campaign_1 = __importDefault(require("./models/Campaign"));
const ContactList_1 = __importDefault(require("./models/ContactList"));
const ContactListItem_1 = __importDefault(require("./models/ContactListItem"));
const lodash_1 = require("lodash");
const CampaignSetting_1 = __importDefault(require("./models/CampaignSetting"));
const CampaignShipping_1 = __importDefault(require("./models/CampaignShipping"));
const GetWhatsappWbot_1 = __importDefault(require("./helpers/GetWhatsappWbot"));
const database_1 = __importDefault(require("./database"));
const SendWhatsAppMedia_1 = require("./services/WbotServices/SendWhatsAppMedia");
const socket_1 = require("./libs/socket");
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("./models/User"));
const Company_1 = __importDefault(require("./models/Company"));
const Plan_1 = __importDefault(require("./models/Plan"));
const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;
const connection = process.env.REDIS_URI || "";
const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;
exports.userMonitor = new bull_1.default("UserMonitor", connection);
exports.messageQueue = new bull_1.default("MessageQueue", connection, {
    limiter: {
        max: limiterMax,
        duration: limiterDuration
    }
});
exports.scheduleMonitor = new bull_1.default("ScheduleMonitor", connection);
exports.sendScheduledMessages = new bull_1.default("SendSacheduledMessages", connection);
exports.campaignQueue = new bull_1.default("CampaignQueue", connection);
async function handleSendMessage(job) {
    try {
        const { data } = job;
        const whatsapp = await Whatsapp_1.default.findByPk(data.whatsappId);
        if (whatsapp == null) {
            throw Error("Whatsapp não identificado");
        }
        const messageData = data.data;
        await (0, SendMessage_1.SendMessage)(whatsapp, messageData);
    }
    catch (e) {
        Sentry.captureException(e);
        logger_1.logger.error("MessageQueue -> SendMessage: error", e.message);
        throw e;
    }
}
async function handleVerifySchedules(job) {
    try {
        const { count, rows: schedules } = await Schedule_1.default.findAndCountAll({
            where: {
                status: "PENDENTE",
                sentAt: null,
                sendAt: {
                    [sequelize_1.Op.gte]: (0, moment_1.default)().format("YYYY-MM-DD HH:mm:ss"),
                    [sequelize_1.Op.lte]: (0, moment_1.default)().add("30", "seconds").format("YYYY-MM-DD HH:mm:ss")
                }
            },
            include: [{ model: Contact_1.default, as: "contact" }]
        });
        if (count > 0) {
            schedules.map(async (schedule) => {
                await schedule.update({
                    status: "AGENDADA"
                });
                exports.sendScheduledMessages.add("SendMessage", { schedule }, { delay: 40000 });
                logger_1.logger.info(`Disparo agendado para: ${schedule.contact.name}`);
            });
        }
    }
    catch (e) {
        Sentry.captureException(e);
        logger_1.logger.error("SendScheduledMessage -> Verify: error", e.message);
        throw e;
    }
}
async function handleSendScheduledMessage(job) {
    const { data: { schedule } } = job;
    let scheduleRecord = null;
    try {
        scheduleRecord = await Schedule_1.default.findByPk(schedule.id);
    }
    catch (e) {
        Sentry.captureException(e);
        logger_1.logger.info(`Erro ao tentar consultar agendamento: ${schedule.id}`);
    }
    try {
        const whatsapp = await (0, GetDefaultWhatsApp_1.default)(schedule.companyId);
        await (0, SendMessage_1.SendMessage)(whatsapp, {
            number: schedule.contact.number,
            body: schedule.body
        });
        await scheduleRecord?.update({
            sentAt: (0, moment_1.default)().format("YYYY-MM-DD HH:mm"),
            status: "ENVIADA"
        });
        logger_1.logger.info(`Mensagem agendada enviada para: ${schedule.contact.name}`);
        exports.sendScheduledMessages.clean(15000, "completed");
    }
    catch (e) {
        Sentry.captureException(e);
        await scheduleRecord?.update({
            status: "ERRO"
        });
        logger_1.logger.error("SendScheduledMessage -> SendMessage: error", e.message);
        throw e;
    }
}
async function handleVerifyCampaigns(job) {
    /**
     * @todo
     * Implementar filtro de campanhas
     */
    const campaigns = await database_1.default.query(`select id, "scheduledAt" from "Campaigns" c
    where "scheduledAt" between now() and now() + '1 hour'::interval and status = 'PROGRAMADA'`, { type: sequelize_1.QueryTypes.SELECT });
    logger_1.logger.info(`Campanhas encontradas: ${campaigns.length}`);
    for (let campaign of campaigns) {
        try {
            const now = (0, moment_1.default)();
            const scheduledAt = (0, moment_1.default)(campaign.scheduledAt);
            const delay = scheduledAt.diff(now, "milliseconds");
            logger_1.logger.info(`Campanha enviada para a fila de processamento: Campanha=${campaign.id}, Delay Inicial=${delay}`);
            exports.campaignQueue.add("ProcessCampaign", {
                id: campaign.id,
                delay
            }, {
                removeOnComplete: true
            });
        }
        catch (err) {
            Sentry.captureException(err);
        }
    }
}
async function getCampaign(id) {
    return await Campaign_1.default.findByPk(id, {
        include: [
            {
                model: ContactList_1.default,
                as: "contactList",
                attributes: ["id", "name"],
                include: [
                    {
                        model: ContactListItem_1.default,
                        as: "contacts",
                        attributes: ["id", "name", "number", "email", "isWhatsappValid"],
                        where: { isWhatsappValid: true }
                    }
                ]
            },
            {
                model: Whatsapp_1.default,
                as: "whatsapp",
                attributes: ["id", "name"]
            },
            {
                model: CampaignShipping_1.default,
                as: "shipping",
                include: [{ model: ContactListItem_1.default, as: "contact" }]
            }
        ]
    });
}
async function getContact(id) {
    return await ContactListItem_1.default.findByPk(id, {
        attributes: ["id", "name", "number", "email"]
    });
}
async function getSettings(campaign) {
    const settings = await CampaignSetting_1.default.findAll({
        where: { companyId: campaign.companyId },
        attributes: ["key", "value"]
    });
    let messageInterval = 20;
    let longerIntervalAfter = 20;
    let greaterInterval = 60;
    let variables = [];
    settings.forEach(setting => {
        if (setting.key === "messageInterval") {
            messageInterval = JSON.parse(setting.value);
        }
        if (setting.key === "longerIntervalAfter") {
            longerIntervalAfter = JSON.parse(setting.value);
        }
        if (setting.key === "greaterInterval") {
            greaterInterval = JSON.parse(setting.value);
        }
        if (setting.key === "variables") {
            variables = JSON.parse(setting.value);
        }
    });
    return {
        messageInterval,
        longerIntervalAfter,
        greaterInterval,
        variables
    };
}
function parseToMilliseconds(seconds) {
    return seconds * 1000;
}
exports.parseToMilliseconds = parseToMilliseconds;
async function sleep(seconds) {
    logger_1.logger.info(`Sleep de ${seconds} segundos iniciado: ${(0, moment_1.default)().format("HH:mm:ss")}`);
    return new Promise(resolve => {
        setTimeout(() => {
            logger_1.logger.info(`Sleep de ${seconds} segundos finalizado: ${(0, moment_1.default)().format("HH:mm:ss")}`);
            resolve(true);
        }, parseToMilliseconds(seconds));
    });
}
function getCampaignValidMessages(campaign) {
    const messages = [];
    if (!(0, lodash_1.isEmpty)(campaign.message1) && !(0, lodash_1.isNil)(campaign.message1)) {
        messages.push(campaign.message1);
    }
    if (!(0, lodash_1.isEmpty)(campaign.message2) && !(0, lodash_1.isNil)(campaign.message2)) {
        messages.push(campaign.message2);
    }
    if (!(0, lodash_1.isEmpty)(campaign.message3) && !(0, lodash_1.isNil)(campaign.message3)) {
        messages.push(campaign.message3);
    }
    if (!(0, lodash_1.isEmpty)(campaign.message4) && !(0, lodash_1.isNil)(campaign.message4)) {
        messages.push(campaign.message4);
    }
    if (!(0, lodash_1.isEmpty)(campaign.message5) && !(0, lodash_1.isNil)(campaign.message5)) {
        messages.push(campaign.message5);
    }
    return messages;
}
function getCampaignValidConfirmationMessages(campaign) {
    const messages = [];
    if (!(0, lodash_1.isEmpty)(campaign.confirmationMessage1) &&
        !(0, lodash_1.isNil)(campaign.confirmationMessage1)) {
        messages.push(campaign.confirmationMessage1);
    }
    if (!(0, lodash_1.isEmpty)(campaign.confirmationMessage2) &&
        !(0, lodash_1.isNil)(campaign.confirmationMessage2)) {
        messages.push(campaign.confirmationMessage2);
    }
    if (!(0, lodash_1.isEmpty)(campaign.confirmationMessage3) &&
        !(0, lodash_1.isNil)(campaign.confirmationMessage3)) {
        messages.push(campaign.confirmationMessage3);
    }
    if (!(0, lodash_1.isEmpty)(campaign.confirmationMessage4) &&
        !(0, lodash_1.isNil)(campaign.confirmationMessage4)) {
        messages.push(campaign.confirmationMessage4);
    }
    if (!(0, lodash_1.isEmpty)(campaign.confirmationMessage5) &&
        !(0, lodash_1.isNil)(campaign.confirmationMessage5)) {
        messages.push(campaign.confirmationMessage5);
    }
    return messages;
}
function getProcessedMessage(msg, variables, contact) {
    let finalMessage = msg;
    if (finalMessage.includes("{nome}")) {
        finalMessage = finalMessage.replace(/{nome}/g, contact.name);
    }
    if (finalMessage.includes("{email}")) {
        finalMessage = finalMessage.replace(/{email}/g, contact.email);
    }
    if (finalMessage.includes("{numero}")) {
        finalMessage = finalMessage.replace(/{numero}/g, contact.number);
    }
    variables.forEach(variable => {
        if (finalMessage.includes(`{${variable.key}}`)) {
            const regex = new RegExp(`{${variable.key}}`, "g");
            finalMessage = finalMessage.replace(regex, variable.value);
        }
    });
    return finalMessage;
}
function randomValue(min, max) {
    return Math.floor(Math.random() * max) + min;
}
exports.randomValue = randomValue;
async function verifyAndFinalizeCampaign(campaign) {
    const { contacts } = campaign.contactList;
    const count1 = contacts.length;
    const count2 = await CampaignShipping_1.default.count({
        where: {
            campaignId: campaign.id,
            deliveredAt: {
                [sequelize_1.Op.not]: null
            }
        }
    });
    if (count1 === count2) {
        await campaign.update({ status: "FINALIZADA", completedAt: (0, moment_1.default)() });
    }
    const io = (0, socket_1.getIO)();
    io.emit(`company-${campaign.companyId}-campaign`, {
        action: "update",
        record: campaign
    });
}
async function handleProcessCampaign(job) {
    try {
        const { id } = job.data;
        let { delay } = job.data;
        const campaign = await getCampaign(id);
        const settings = await getSettings(campaign);
        if (campaign) {
            const { contacts } = campaign.contactList;
            if ((0, lodash_1.isArray)(contacts)) {
                let index = 0;
                for (let contact of contacts) {
                    exports.campaignQueue.add("PrepareContact", {
                        contactId: contact.id,
                        campaignId: campaign.id,
                        variables: settings.variables,
                        delay: delay || 0
                    }, {
                        removeOnComplete: true
                    });
                    logger_1.logger.info(`Registro enviado pra fila de disparo: Campanha=${campaign.id};Contato=${contact.name};delay=${delay}`);
                    index++;
                    if (index % settings.longerIntervalAfter === 0) {
                        //intervalo maior após intervalo configurado de mensagens
                        delay += parseToMilliseconds(settings.greaterInterval);
                    }
                    else {
                        delay += parseToMilliseconds(randomValue(0, settings.messageInterval));
                    }
                }
                await campaign.update({ status: "EM_ANDAMENTO" });
            }
        }
    }
    catch (err) {
        Sentry.captureException(err);
    }
}
async function handlePrepareContact(job) {
    try {
        const { contactId, campaignId, delay, variables } = job.data;
        const campaign = await getCampaign(campaignId);
        const contact = await getContact(contactId);
        const campaignShipping = {};
        campaignShipping.number = contact.number;
        campaignShipping.contactId = contactId;
        campaignShipping.campaignId = campaignId;
        const messages = getCampaignValidMessages(campaign);
        if (messages.length) {
            const radomIndex = randomValue(0, messages.length);
            const message = getProcessedMessage(messages[radomIndex], variables, contact);
            campaignShipping.message = `\u200c${message}`;
        }
        if (campaign.confirmation) {
            const confirmationMessages = getCampaignValidConfirmationMessages(campaign);
            if (confirmationMessages.length) {
                const radomIndex = randomValue(0, confirmationMessages.length);
                const message = getProcessedMessage(confirmationMessages[radomIndex], variables, contact);
                campaignShipping.confirmationMessage = `\u200c${message}`;
            }
        }
        const [record, created] = await CampaignShipping_1.default.findOrCreate({
            where: {
                campaignId: campaignShipping.campaignId,
                contactId: campaignShipping.contactId
            },
            defaults: campaignShipping
        });
        if (!created &&
            record.deliveredAt === null &&
            record.confirmationRequestedAt === null) {
            record.set(campaignShipping);
            await record.save();
        }
        if (record.deliveredAt === null &&
            record.confirmationRequestedAt === null) {
            const nextJob = await exports.campaignQueue.add("DispatchCampaign", {
                campaignId: campaign.id,
                campaignShippingId: record.id,
                contactListItemId: contactId
            }, {
                delay
            });
            await record.update({ jobId: nextJob.id });
        }
        await verifyAndFinalizeCampaign(campaign);
    }
    catch (err) {
        Sentry.captureException(err);
        logger_1.logger.error(`campaignQueue -> PrepareContact -> error: ${err.message}`);
    }
}
async function handleDispatchCampaign(job) {
    try {
        const { data } = job;
        const { campaignShippingId, campaignId } = data;
        const campaign = await getCampaign(campaignId);
        const wbot = await (0, GetWhatsappWbot_1.default)(campaign.whatsapp);
        logger_1.logger.info(`Disparo de campanha solicitado: Campanha=${campaignId};Registro=${campaignShippingId}`);
        const campaignShipping = await CampaignShipping_1.default.findByPk(campaignShippingId, {
            include: [{ model: ContactListItem_1.default, as: "contact" }]
        });
        const chatId = `${campaignShipping.number}@s.whatsapp.net`;
        if (campaign.confirmation && campaignShipping.confirmation === null) {
            await wbot.sendMessage(chatId, {
                text: campaignShipping.confirmationMessage
            });
            await campaignShipping.update({ confirmationRequestedAt: (0, moment_1.default)() });
        }
        else {
            await wbot.sendMessage(chatId, {
                text: campaignShipping.message
            });
            if (campaign.mediaPath) {
                const filePath = path_1.default.resolve("public", campaign.mediaPath);
                const options = await (0, SendWhatsAppMedia_1.getMessageOptions)(campaign.mediaName, filePath);
                if (Object.keys(options).length) {
                    await wbot.sendMessage(chatId, { ...options });
                }
            }
            await campaignShipping.update({ deliveredAt: (0, moment_1.default)() });
        }
        await verifyAndFinalizeCampaign(campaign);
        const io = (0, socket_1.getIO)();
        io.emit(`company-${campaign.companyId}-campaign`, {
            action: "update",
            record: campaign
        });
        logger_1.logger.info(`Campanha enviada para: Campanha=${campaignId};Contato=${campaignShipping.contact.name}`);
    }
    catch (err) {
        Sentry.captureException(err);
        logger_1.logger.error(err.message);
        console.log(err.stack);
    }
}
async function handleLoginStatus(job) {
    const users = await database_1.default.query(`select id from "Users" where "updatedAt" < now() - '5 minutes'::interval and online = true`, { type: sequelize_1.QueryTypes.SELECT });
    for (let item of users) {
        try {
            const user = await User_1.default.findByPk(item.id);
            await user.update({ online: false });
            logger_1.logger.info(`Usuário passado para offline: ${item.id}`);
        }
        catch (e) {
            Sentry.captureException(e);
        }
    }
}
async function handleInvoiceCreate() {
    const job = new CronJob('0 * * * * *', async () => {
        const companies = await Company_1.default.findAll();
        companies.map(async (c) => {
            var dueDate = c.dueDate;
            const date = (0, moment_1.default)(dueDate).format();
            const timestamp = (0, moment_1.default)().format();
            const hoje = (0, moment_1.default)((0, moment_1.default)()).format("DD/MM/yyyy");
            var vencimento = (0, moment_1.default)(dueDate).format("DD/MM/yyyy");
            var diff = (0, moment_1.default)(vencimento, "DD/MM/yyyy").diff((0, moment_1.default)(hoje, "DD/MM/yyyy"));
            var dias = moment_1.default.duration(diff).asDays();
            if (dias < 20) {
                const plan = await Plan_1.default.findByPk(c.planId);
                const sql = `SELECT COUNT(*) mycount FROM "Invoices" WHERE "companyId" = ${c.id} AND "dueDate"::text LIKE '${(0, moment_1.default)(dueDate).format("yyyy-MM-DD")}%';`;
                const invoice = await database_1.default.query(sql, { type: sequelize_1.QueryTypes.SELECT });
                if (invoice[0]['mycount'] > 0) {
                }
                else {
                    const sql = `INSERT INTO "Invoices" (detail, status, value, "updatedAt", "createdAt", "dueDate", "companyId")
          VALUES ('${plan.name}', 'open', '${plan.value}', '${timestamp}', '${timestamp}', '${date}', ${c.id});`;
                    const invoiceInsert = await database_1.default.query(sql, { type: sequelize_1.QueryTypes.INSERT });
                    /*           let transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                  user: 'email@gmail.com',
                                  pass: 'senha'
                                }
                              });
                    
                              const mailOptions = {
                                from: 'heenriquega@gmail.com', // sender address
                                to: `${c.email}`, // receiver (use array of string for a list)
                                subject: 'Fatura gerada - Sistema', // Subject line
                                html: `Olá ${c.name} esté é um email sobre sua fatura!<br>
                    <br>
                    Vencimento: ${vencimento}<br>
                    Valor: ${plan.value}<br>
                    Link: ${process.env.FRONTEND_URL}/financeiro<br>
                    <br>
                    Qualquer duvida estamos a disposição!
                                `// plain text body
                              };
                    
                              transporter.sendMail(mailOptions, (err, info) => {
                                if (err)
                                  console.log(err)
                                else
                                  console.log(info);
                              }); */
                }
            }
        });
    });
    job.start();
}
handleInvoiceCreate();
async function startQueueProcess() {
    logger_1.logger.info("Iniciando processamento de filas");
    exports.messageQueue.process("SendMessage", handleSendMessage);
    exports.scheduleMonitor.process("Verify", handleVerifySchedules);
    exports.sendScheduledMessages.process("SendMessage", handleSendScheduledMessage);
    exports.campaignQueue.process("VerifyCampaignsDaatabase", handleVerifyCampaigns);
    exports.campaignQueue.process("ProcessCampaign", handleProcessCampaign);
    exports.campaignQueue.process("PrepareContact", handlePrepareContact);
    exports.campaignQueue.process("DispatchCampaign", handleDispatchCampaign);
    exports.userMonitor.process("VerifyLoginStatus", handleLoginStatus);
    exports.scheduleMonitor.add("Verify", {}, {
        repeat: { cron: "*/5 * * * * *" },
        removeOnComplete: true
    });
    exports.campaignQueue.add("VerifyCampaignsDaatabase", {}, {
        repeat: { cron: "*/20 * * * * *" },
        removeOnComplete: true
    });
    exports.userMonitor.add("VerifyLoginStatus", {}, {
        repeat: { cron: "* * * * *" },
        removeOnComplete: true
    });
}
exports.startQueueProcess = startQueueProcess;
