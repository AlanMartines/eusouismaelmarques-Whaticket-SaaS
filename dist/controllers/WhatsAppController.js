"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.show = exports.storeFacebook = exports.store = exports.index = void 0;
const cache_1 = require("../libs/cache");
const socket_1 = require("../libs/socket");
const wbot_1 = require("../libs/wbot");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const DeleteBaileysService_1 = __importDefault(require("../services/BaileysServices/DeleteBaileysService"));
const graphAPI_1 = require("../services/FacebookServices/graphAPI");
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const CreateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/CreateWhatsAppService"));
const DeleteWhatsAppService_1 = __importDefault(require("../services/WhatsappService/DeleteWhatsAppService"));
const ListWhatsAppsService_1 = __importDefault(require("../services/WhatsappService/ListWhatsAppsService"));
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const index = async (req, res) => {
    const { companyId } = req.user;
    const { session } = req.query;
    const whatsapps = await (0, ListWhatsAppsService_1.default)({ companyId, session });
    return res.status(200).json(whatsapps);
};
exports.index = index;
const store = async (req, res) => {
    const { name, status, isDefault, greetingMessage, complationMessage, outOfHoursMessage, queueIds, token } = req.body;
    const { companyId } = req.user;
    const { whatsapp, oldDefaultWhatsapp } = await (0, CreateWhatsAppService_1.default)({
        name,
        status,
        isDefault,
        greetingMessage,
        complationMessage,
        outOfHoursMessage,
        queueIds,
        companyId,
        token
    });
    (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, companyId);
    const io = (0, socket_1.getIO)();
    io.emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.store = store;
const storeFacebook = async (req, res) => {
    const { facebookUserId, facebookUserToken, addInstagram } = req.body;
    const { companyId } = req.user;
    const { data } = await (0, graphAPI_1.getPageProfile)(facebookUserId, facebookUserToken);
    if (data.length === 0) {
        return res.status(400).json({
            error: "Facebook page not found"
        });
    }
    const io = (0, socket_1.getIO)();
    const pages = [];
    for await (const page of data) {
        const { name, access_token, id, instagram_business_account } = page;
        const acessTokenPage = await (0, graphAPI_1.getAccessTokenFromPage)(access_token);
        if (instagram_business_account && addInstagram) {
            const { id: instagramId, username, name: instagramName } = instagram_business_account;
            pages.push({
                name: `Insta ${username || instagramName}`,
                facebookUserId: facebookUserId,
                facebookPageUserId: instagramId,
                facebookUserToken: acessTokenPage,
                tokenMeta: facebookUserToken,
                isDefault: false,
                channel: "instagram",
                status: "CONNECTED",
                greetingMessage: "",
                farewellMessage: "",
                queueIds: [],
                isMultidevice: false,
                companyId
            });
            // await subscribeApp(instagramId, acessTokenPage);
            pages.push({
                name,
                facebookUserId: facebookUserId,
                facebookPageUserId: id,
                facebookUserToken: acessTokenPage,
                tokenMeta: facebookUserToken,
                isDefault: false,
                channel: "facebook",
                status: "CONNECTED",
                greetingMessage: "",
                farewellMessage: "",
                queueIds: [],
                isMultidevice: false,
                companyId
            });
            await (0, graphAPI_1.subscribeApp)(id, acessTokenPage);
        }
        if (!instagram_business_account) {
            pages.push({
                name,
                facebookUserId: facebookUserId,
                facebookPageUserId: id,
                facebookUserToken: acessTokenPage,
                tokenMeta: facebookUserToken,
                isDefault: false,
                channel: "facebook",
                status: "CONNECTED",
                greetingMessage: "",
                farewellMessage: "",
                queueIds: [],
                isMultidevice: false,
                companyId
            });
            await (0, graphAPI_1.subscribeApp)(page.id, acessTokenPage);
        }
    }
    console.log(pages);
    for await (const pageConection of pages) {
        const exist = await Whatsapp_1.default.findOne({
            where: {
                facebookPageUserId: pageConection.facebookPageUserId
            }
        });
        if (exist) {
            await exist.update({
                ...pageConection
            });
        }
        if (!exist) {
            const { whatsapp } = await (0, CreateWhatsAppService_1.default)(pageConection);
            io.emit(`company-${companyId}-whatsapp`, {
                action: "update",
                whatsapp
            });
        }
    }
    return res.status(200);
};
exports.storeFacebook = storeFacebook;
const show = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const { session } = req.query;
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId, session);
    return res.status(200).json(whatsapp);
};
exports.show = show;
const update = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsappData = req.body;
    const { companyId } = req.user;
    const { whatsapp, oldDefaultWhatsapp } = await (0, UpdateWhatsAppService_1.default)({
        whatsappData,
        whatsappId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.update = update;
const remove = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const io = (0, socket_1.getIO)();
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    if (whatsapp.channel === "whatsapp") {
        await (0, DeleteBaileysService_1.default)(whatsappId);
        await (0, DeleteWhatsAppService_1.default)(whatsappId);
        await cache_1.cacheLayer.delFromPattern(`sessions:${whatsappId}:*`);
        (0, wbot_1.removeWbot)(+whatsappId);
        io.emit(`company-${companyId}-whatsapp`, {
            action: "delete",
            whatsappId: +whatsappId
        });
    }
    if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
        const { facebookUserToken } = whatsapp;
        const getAllSameToken = await Whatsapp_1.default.findAll({
            where: {
                facebookUserToken
            }
        });
        await Whatsapp_1.default.destroy({
            where: {
                facebookUserToken
            }
        });
        for await (const whatsapp of getAllSameToken) {
            io.emit(`company-${companyId}-whatsapp`, {
                action: "delete",
                whatsappId: whatsapp.id
            });
        }
    }
    return res.status(200).json({ message: "Session disconnected." });
};
exports.remove = remove;
