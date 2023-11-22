"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const SignEmail_1 = __importDefault(require("../../models/SignEmail"));
const GenerateDkimKeys = async (data) => {
    const exist = await SignEmail_1.default.findOne({
        where: {
            companyId: data.companyId
        }
    });
    if (!exist) {
        try {
            const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem',
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                },
            });
            const formattedPublicKey = publicKey
                .replace(/(\r\n|\n|\r)/gm, '')
                .replace(/-{5}BEGIN PUBLIC KEY-{5}|-{5}END PUBLIC KEY-{5}/g, '')
                .trim();
            const formattedPrivateKey = privateKey
                .replace(/(\r\n|\n|\r)/gm, '')
                .replace(/-{5}BEGIN PRIVATE KEY-{5}|-{5}END PRIVATE KEY-{5}/g, '')
                .trim();
            const dkim = `v=DKIM1; k=rsa; p=${formattedPublicKey}; s=mail; d=${data.domain}`;
            const record = await SignEmail_1.default.create({
                publicKey: formattedPublicKey,
                privateKey: formattedPrivateKey,
                dkim,
                companyId: data.companyId,
            });
            return record;
        }
        catch (error) {
            console.error('Erro ao gerar chaves DKIM:', error);
            throw error;
        }
    }
    else {
        return exist.dkim;
    }
};
exports.default = GenerateDkimKeys;
