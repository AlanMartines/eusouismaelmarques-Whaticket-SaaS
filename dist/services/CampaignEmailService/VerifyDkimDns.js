"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
const SignEmail_1 = __importDefault(require("../../models/SignEmail"));
const VerifyDkimDNS = async (id) => {
    try {
        const dkimRecord = await SignEmail_1.default.findOne({
            where: {
                companyId: id
            }
        });
        let dnsRecords;
        if (!dkimRecord) {
            return { success: false, message: 'Registro DKIM não encontrado' };
        }
        const domainMatch = /d=([^;]+)/.exec(dkimRecord.dkim);
        const domain = domainMatch ? domainMatch[1] : null;
        if (!domain) {
            return { success: false, message: 'Erro ao extrair o domínio do registro DKIM' };
        }
        console.log(domain);
        try {
            if (!dnsRecords) {
                dnsRecords = await new Promise((resolve, reject) => {
                    dns_1.default.resolveTxt(domain, (err, records) => {
                        if (err) {
                            return { success: false, message: 'DNS não cadastrado ou propagado' };
                        }
                        else {
                            resolve(records);
                        }
                    });
                });
                console.log(dnsRecords);
                const isDkimConfigured = dnsRecords[0][0];
                console.log(isDkimConfigured);
                if (isDkimConfigured != null) {
                    return { success: true, message: 'O registro está configurado corretamente no DNS' };
                }
                else {
                    return { success: false, message: 'O registro não foi encontrado no DNS' };
                }
            }
        }
        catch (dnsError) {
            console.error('Erro ao resolver registros DNS:', dnsError);
            return { success: false, message: 'Erro ao verificar - Problema com registros DNS' };
        }
    }
    catch (error) {
        console.error('Erro ao verificar DNS:', error);
        return { success: false, message: 'Erro interno ao verificar registro DNS' };
    }
};
exports.default = VerifyDkimDNS;
