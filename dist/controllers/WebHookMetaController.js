"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webHook = exports.index = void 0;
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const facebookMessageListener_1 = require("../services/FacebookServices/facebookMessageListener");
// import { handleMessage } from "../services/FacebookServices/facebookMessageListener";
const index = async (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "whaticket";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
    }
    return res.status(403).json({
        message: "Forbidden"
    });
};
exports.index = index;
const webHook = async (req, res) => {
    try {
        const { body } = req;
        if (body.object === "page" || body.object === "instagram") {
            let channel;
            if (body.object === "page") {
                channel = "facebook";
            }
            else {
                channel = "instagram";
            }
            body.entry?.forEach(async (entry) => {
                const getTokenPage = await Whatsapp_1.default.findOne({
                    where: {
                        facebookPageUserId: entry.id,
                        channel
                    }
                });
                if (getTokenPage) {
                    entry.messaging?.forEach((data) => {
                        console.log(data);
                        (0, facebookMessageListener_1.handleMessage)(getTokenPage, data, channel, getTokenPage.companyId);
                    });
                }
            });
            return res.status(200).json({
                message: "EVENT_RECEIVED"
            });
        }
        return res.status(404).json({
            message: body
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error
        });
    }
};
exports.webHook = webHook;
