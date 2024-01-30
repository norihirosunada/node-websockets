"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
require("dotenv/config");
const PORT = parseInt(process.env.PORT || '3000', 10);
const INDEX = '/index.html';
const BETWEEN = '/theinbetween.html';
let movieSize = 1;
const server = (0, express_1.default)()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .get('/theinbetween', (req, res) => {
    res.sendFile(BETWEEN, { root: __dirname });
})
    .listen(PORT, () => console.log(`Listening on ${PORT}`));
// クライアントを表すクラス
class Client {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;
    }
}
// 部屋を表すクラス
class Room {
    constructor(id, videoId) {
        this.id = id;
        this.videoId = videoId;
        this.clients = [];
    }
}
let clients = [];
let rooms = [];
const wss = new ws_1.Server({ server });
wss.on('connection', (ws, req) => {
    movieSize = Number(process.env.VIDEO_COUNT);
    const clientId = generateUniqueId();
    const client = { id: clientId, ws: ws };
    clients.push(client);
    let currentRoomId;
    console.log('current rooms');
    console.log(rooms);
    console.log(`${clientId}:\tconnected`);
    ws.on("message", (data) => {
        var _a, _b, _c;
        const message = JSON.parse(data);
        console.log(`${clientId}:\tmessage ${JSON.stringify(message)}`);
        switch (message.type) {
            case 'joinRoom':
                currentRoomId = (_b = (_a = rooms.find(room => room.clients.length < 2)) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : generateUniqueId();
                joinRoom(clientId, currentRoomId, message.ignoreVideoId);
                break;
            case 'leaveRoom':
                currentRoomId = (_c = clients.find((client => client.id == clientId))) === null || _c === void 0 ? void 0 : _c.roomId;
                if (currentRoomId) {
                    leaveRoom(clientId, currentRoomId);
                }
                break;
        }
    });
    ws.on('close', () => {
        var _a;
        console.log(`${clientId}:\tClient disconnected`);
        let roomId = (_a = clients.find((client => client.id == clientId))) === null || _a === void 0 ? void 0 : _a.roomId;
        if (roomId) {
            leaveRoom(clientId, roomId);
        }
    });
});
function joinRoom(clientId, roomId, ignoreVideoId) {
    console.log(`${clientId}:\tjoinRoom(clientId=${clientId}, roomId=${roomId}, ignoreVideoId=${ignoreVideoId})`);
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        console.error(`Client with ID ${clientId} not found.`);
        return;
    }
    // クライアントを以前の部屋から削除します。
    if (client.roomId !== undefined) {
        leaveRoom(clientId, client.roomId);
    }
    let room = rooms.find(r => r.id === roomId);
    if (!room || room.clients.find(c => c.id === clientId)) {
        // 指定の番号の部屋が存在しない場合は新たに作成します。
        console.log(`${clientId}:\tNew room`);
        room = new Room(roomId, getRandomVideoId(ignoreVideoId));
        rooms.push(room);
    }
    // クライアントを新しい部屋に追加します。
    room.clients.push(client);
    client.roomId = room.id; // クライアントが入室した部屋のIDを保存
    // クライアントに部屋への参加を通知します。
    client.ws.send(JSON.stringify({ type: 'VIDEO_ID', id: room.videoId }));
    console.log(`${clientId}:\tJoined room ${roomId}, video ${room.videoId}`);
    if (room.clients.length >= 2) {
        room.clients.forEach((client) => {
            client.ws.send(JSON.stringify({ type: 'PLAY' }));
        });
    }
}
// クライアントを部屋から削除する関数
function leaveRoom(clientId, roomId) {
    console.log(`${clientId}:\tleaveRoom(clientId=${clientId}, roomId=${roomId})`);
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        console.error(`Room with ID ${roomId} not found.`);
        return;
    }
    const clientIndex = room.clients.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
        // クライアントを部屋から削除します。
        room.clients.splice(clientIndex, 1);
        // クライアントの`roomID`を更新します。
        const client = clients.find(c => c.id === clientId);
        if (client) {
            client.roomId = undefined;
            // クライアントに部屋からの退出を通知します。
            // client.ws.send(`Left room ${roomId}`);
        }
        // 部屋が空になったら削除します。
        if (room.clients.length === 0) {
            rooms = rooms.filter(r => r.id !== roomId);
        }
        // 部屋に残ったクライアントに動画のストップを通知
        if (room.clients.length === 1) {
            room.clients.forEach(c => c.ws.send(JSON.stringify({ type: 'STOP' })));
        }
    }
    else {
        console.error(`Client with ID ${clientId} not found in the room ${roomId}.`);
    }
}
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15);
}
function getRandomRoomId() {
    return Math.floor(Math.random() * movieSize);
}
function getRandomVideoId(ignore = undefined) {
    const availableIds = [];
    for (let i = 1; i <= movieSize; i++) {
        if (ignore !== undefined && i === ignore)
            continue;
        availableIds.push(i);
    }
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    return availableIds[randomIndex];
}
