"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const url_1 = require("url");
const uuid_1 = require("uuid");
const ws_1 = require("ws");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
const userMap = new Map();
app.post('/login', (req, res, next) => {
    try {
        const { userName: userNameReq } = req.body;
        for (const [_, { userName }] of userMap.entries()) {
            if (userName === userNameReq) {
                return res.status(401).send('user already exists');
            }
        }
        const id = (0, uuid_1.v4)();
        userMap.set(id, { userName: userNameReq });
        return res.status(200).send({ id });
    }
    catch (error) {
        return res.status(500).send(error);
    }
});
const webSocketServer = new ws_1.WebSocketServer({ noServer: true });
webSocketServer.on('connection', (socket, metadata) => {
    const { userData, userId } = metadata;
    socket.on('message', (message) => {
        const response = JSON.stringify({
            userId,
            data: {
                userData,
                message: message.toString()
            }
        });
        for (const [_, { socket }] of userMap.entries()) {
            socket === null || socket === void 0 ? void 0 : socket.send(response);
        }
    });
});
const server = app.listen(8080, () => { console.log('Server up at 8080'); });
server.on('upgrade', (request, socket, head) => {
    var _a;
    const { query } = ((0, url_1.parse)((_a = request.url) !== null && _a !== void 0 ? _a : ''));
    const userId = query === null || query === void 0 ? void 0 : query.slice(7);
    if (!userMap.has(userId)) {
        request.destroy();
    }
    webSocketServer.handleUpgrade(request, socket, head, socket => {
        const { userName } = userMap.get(userId);
        const randomColor = Math.floor(Math.random() * 16777215).toString(16);
        userMap.set(userId, { userName, socket, colour: `#${randomColor}` });
        const metadata = { userData: { userName, colour: `#${randomColor}` }, userId };
        webSocketServer.emit('connection', socket, metadata);
    });
});
