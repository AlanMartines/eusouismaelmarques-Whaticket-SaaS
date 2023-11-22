"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMultiFileAuthState = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const cache_1 = require("../libs/cache");
const logger_1 = require("../utils/logger");
const useMultiFileAuthState = async (whatsapp) => {
    const writeData = async (data, file) => {
        try {
            await cache_1.cacheLayer.set(`sessions:${whatsapp.id}:${file}`, JSON.stringify(data, baileys_1.BufferJSON.replacer));
        }
        catch (error) {
            console.log("writeData error", error);
            return null;
        }
    };
    const readData = async (file) => {
        try {
            const data = await cache_1.cacheLayer.get(`sessions:${whatsapp.id}:${file}`);
            if (data) {
                return JSON.parse(data, baileys_1.BufferJSON.reviver);
            }
            return null;
        }
        catch (error) {
            console.log("Read data error", error);
            return null;
        }
    };
    const removeData = async (file) => {
        try {
            await cache_1.cacheLayer.del(`sessions:${whatsapp.id}:${file}`);
        }
        catch (error) {
            console.log("removeData", error);
        }
    };
    const creds = (await readData("creds")) || (0, baileys_1.initAuthCreds)();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (let id of ids) {
                        try {
                            let value = await readData(`${type}-${id}`);
                            if (type === "app-state-sync-key") {
                                value = baileys_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                        catch (error) {
                            logger_1.logger.error(`useMultiFileAuthState (69) -> error: ${error.message}`);
                            logger_1.logger.error(`useMultiFileAuthState (72) -> stack: ${error.stack}`);
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    // eslint-disable-next-line no-restricted-syntax, guard-for-in
                    for (const category in data) {
                        // eslint-disable-next-line no-restricted-syntax, guard-for-in
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}`;
                            tasks.push(value ? writeData(value, file) : removeData(file));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, "creds");
        }
    };
};
exports.useMultiFileAuthState = useMultiFileAuthState;
