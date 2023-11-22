"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const AppError_1 = __importDefault(require("../errors/AppError"));
const CreateService_1 = __importDefault(require("../services/ScheduleServices/CreateService"));
const ListService_1 = __importDefault(require("../services/ScheduleServices/ListService"));
const UpdateService_1 = __importDefault(require("../services/ScheduleServices/UpdateService"));
const ShowService_1 = __importDefault(require("../services/ScheduleServices/ShowService"));
const DeleteService_1 = __importDefault(require("../services/ScheduleServices/DeleteService"));
const index = async (req, res) => {
    const { contactId, userId, pageNumber, searchParam } = req.query;
    const { companyId } = req.user;
    const { schedules, count, hasMore } = await (0, ListService_1.default)({
        searchParam,
        contactId,
        userId,
        pageNumber,
        companyId
    });
    return res.json({ schedules, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { body, sendAt, contactId, userId } = req.body;
    const { companyId } = req.user;
    const schedule = await (0, CreateService_1.default)({
        body,
        sendAt,
        contactId,
        companyId,
        userId
    });
    const io = (0, socket_1.getIO)();
    io.emit("schedule", {
        action: "create",
        schedule
    });
    return res.status(200).json(schedule);
};
exports.store = store;
const show = async (req, res) => {
    const { scheduleId } = req.params;
    const { companyId } = req.user;
    const schedule = await (0, ShowService_1.default)(scheduleId, companyId);
    return res.status(200).json(schedule);
};
exports.show = show;
const update = async (req, res) => {
    if (req.user.profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { scheduleId } = req.params;
    const scheduleData = req.body;
    const { companyId } = req.user;
    const schedule = await (0, UpdateService_1.default)({ scheduleData, id: scheduleId, companyId });
    const io = (0, socket_1.getIO)();
    io.emit("schedule", {
        action: "update",
        schedule
    });
    return res.status(200).json(schedule);
};
exports.update = update;
const remove = async (req, res) => {
    const { scheduleId } = req.params;
    const { companyId } = req.user;
    await (0, DeleteService_1.default)(scheduleId, companyId);
    const io = (0, socket_1.getIO)();
    io.emit("schedule", {
        action: "delete",
        scheduleId
    });
    return res.status(200).json({ message: "Schedule deleted" });
};
exports.remove = remove;
