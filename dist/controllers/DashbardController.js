"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.index = void 0;
const DashbardDataService_1 = __importDefault(require("../services/ReportService/DashbardDataService"));
const index = async (req, res) => {
    const params = req.query;
    const { companyId } = req.user;
    let daysInterval = 3;
    const dashboardData = await (0, DashbardDataService_1.default)(companyId, params);
    return res.status(200).json(dashboardData);
};
exports.index = index;
