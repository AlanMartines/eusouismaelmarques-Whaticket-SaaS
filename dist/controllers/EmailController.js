"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCampaignEmail = exports.VerifyDNS = exports.generateKey = exports.save = exports.show = exports.update = exports.remove = exports.templates = exports.index = void 0;
const socket_1 = require("../libs/socket");
const path_1 = __importDefault(require("path"));
const CreateCampaignService_1 = __importDefault(require("../services/CampaignEmailService/CreateCampaignService"));
const ListEmailService_1 = __importDefault(require("../services/CampaignEmailService/ListEmailService"));
const GenerateDkimService_1 = __importDefault(require("../services/CampaignEmailService/GenerateDkimService"));
const VerifyDkimDns_1 = __importDefault(require("../services/CampaignEmailService/VerifyDkimDns"));
const ShowCapaignEmailService_1 = __importDefault(require("../services/CampaignEmailService/ShowCapaignEmailService"));
const fs_1 = require("fs");
const DeleteService_1 = __importDefault(require("../services/CampaignEmailService/DeleteService"));
const UpdateService_1 = __importDefault(require("../services/CampaignEmailService/UpdateService"));
const SaveTemplateService_1 = __importDefault(require("../services/CampaignEmailService/SaveTemplateService"));
const index = async (req, res) => {
    const { pageNumber, searchParam } = req.query;
    const { companyId } = req.user;
    const { email, count, hasMore } = await (0, ListEmailService_1.default)({
        searchParam,
        pageNumber,
        companyId,
    });
    return res.json({ email, count, hasMore });
};
exports.index = index;
const templates = async (req, res) => {
    try {
        const { companyId } = req.user;
        const templatesDirectory = path_1.default.join(__dirname, '..', 'controllers', 'templates', companyId.toString());
        const templatesHtmlDirectory = path_1.default.join(__dirname, '..', 'controllers', 'templates_html', companyId.toString());
        const templatesFiles = await fs_1.promises.readdir(templatesDirectory);
        const templatesArray = await Promise.all(templatesFiles.map(async (file) => {
            const filePath = path_1.default.join(templatesDirectory, file);
            const content = await fs_1.promises.readFile(filePath, 'utf-8');
            return { fileName: file, content };
        }));
        const templatesHtmlFiles = await fs_1.promises.readdir(templatesHtmlDirectory);
        const templatesHtmlArray = await Promise.all(templatesHtmlFiles.map(async (file) => {
            const filePath = path_1.default.join(templatesHtmlDirectory, file);
            const content = await fs_1.promises.readFile(filePath, 'utf-8');
            return { fileName: file, content };
        }));
        return res.json({ success: true, templates: templatesArray, templatesHtml: templatesHtmlArray });
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        return res.status(500).json({ success: false, error: 'Error fetching templates.' });
    }
};
exports.templates = templates;

const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    await (0, DeleteService_1.default)(id);
    const io = (0, socket_1.getIO)();
    io.emit(`company-${companyId}-email`, {
        action: "delete",
        id
    });
    return res.status(200).json({ message: "Template deleted" });
};
exports.remove = remove;
const update = async (req, res) => {
    const data = req.body;
    const { id } = req.params;
    const record = await (0, UpdateService_1.default)({
        ...data,
        id: +id
    });
    return res.status(200).json(record);
};
exports.update = update;
const show = async (req, res) => {
    const { id } = req.params;
    const record = await (0, ShowCapaignEmailService_1.default)(id);
    return res.status(200).json(record);
};
exports.show = show;
const save = async (req, res) => {
    const { html, design, companyId, templateName } = req.body;
    try {
        const templateRecord = await (0, SaveTemplateService_1.default)(companyId, templateName);
        if (templateRecord) {
            return res.status(400).json({ success: false, message: 'Template with the same name already exists.' });
        }
        const baseDirectory = 'templates';
        const userDirectory = path_1.default.join('src/controllers', baseDirectory, companyId.toString());
        const filePath = path_1.default.join(userDirectory, `${companyId}-${templateName}.json`);
        await fs_1.promises.mkdir(userDirectory, { recursive: true });
        await fs_1.promises.writeFile(filePath, design);
        const baseDirectory_html = 'templates_html';
        const userDirectory_html = path_1.default.join('src/controllers', baseDirectory_html, companyId.toString());
        const filePath_html = path_1.default.join(userDirectory_html, `${companyId}-${templateName}.html`);
        await fs_1.promises.mkdir(userDirectory_html, { recursive: true });
        await fs_1.promises.writeFile(filePath_html, html);
        const io = (0, socket_1.getIO)();
        io.emit('templateUpdated', { message: 'New template saved!' });
        return res.status(200).json({ success: true, message: 'Template saved successfully.' });
    }
    catch (error) {
        console.error('Error saving the file:', error);
        return res.status(500).json({ success: false, error: 'Error saving the file.' });
    }
};
exports.save = save;
const generateKey = async (req, res) => {
    try {
        const { domain, companyId } = req.body;
        if (!domain || !companyId) {
            return res.status(400).json({ error: 'Parâmetros inválidos.' });
        }
        const dkimRecord = await (0, GenerateDkimService_1.default)({ domain, companyId });
        if (dkimRecord) {
            return res.status(200).json(dkimRecord);
        }
        else {
            return res.status(500).json(dkimRecord);
        }
    }
    catch (error) {
        console.error('Erro no controller GenerateDkimKeysController:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
exports.generateKey = generateKey;
const VerifyDNS = async (req, res) => {
    try {
        const { id } = req.params;
        const dkimRecord = await (0, VerifyDkimDns_1.default)(parseInt(id));
        if (dkimRecord.success == true) {
            return res.status(200).json(dkimRecord);
        }
        else {
            return res.status(500).json(dkimRecord);
        }
    }
    catch (error) {
        console.error('Erro no controller GenerateDkimKeysController:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
exports.VerifyDNS = VerifyDNS;
const saveCampaignEmail = async (req, res) => {
    const newEmail = req.body;
    const contact = await (0, CreateCampaignService_1.default)({
        ...newEmail,
        name: newEmail.name,
        companyId: newEmail.companyId
    });
    return res.status(200).json(contact);
};
exports.saveCampaignEmail = saveCampaignEmail;
