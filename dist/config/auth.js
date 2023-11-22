"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    secret: process.env.JWT_SECRET || "mysecret",
    expiresIn: "30d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "myanothersecret",
    refreshExpiresIn: "7d"
};
