import express, { NextFunction, Request, Response } from "express";
import { parse } from "url";
import { v4 as uuid } from 'uuid';
import WebSocket, { WebSocketServer } from 'ws';
import cors from 'cors';

const app = express();

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

const userMap = new Map();

app.post('/login', (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userName: userNameReq } = req.body as { userName: string };

        for (const [_, { userName }] of userMap.entries()) {
            if (userName === userNameReq) {
                return res.status(401).send('user already exists');
            }
        }

        const id = uuid();

        userMap.set(id, { userName: userNameReq });

        return res.status(200).send({ id })
    } catch (error) {
        return res.status(500).send(error)
    }
})

const webSocketServer = new WebSocketServer({ noServer: true });

webSocketServer.on('connection', (socket: WebSocket.WebSocket, metadata: { userData: { userName: string }, userId: string }) => {
    const { userData, userId } = metadata;

    socket.on('message', (message: ArrayBuffer) => {
        const response = JSON.stringify({
            userId,
            data: {
                userData,
                message: message.toString()
            }
        });


        for (const [_, { socket }] of userMap.entries()) {
            socket?.send(response)
        }
    }
    );
});

const server = app.listen(8080, () => { console.log('Server up at 8080') })

server.on('upgrade', (request, socket, head) => {
    const { query } = (parse(request.url ?? ''))

    const userId = query?.slice(7);

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