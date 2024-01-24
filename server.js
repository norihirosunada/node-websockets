'use strict';

const express = require('express');
const WebSocket = require('ws');
const url = require('url');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';
const BETWEEN = '/theinbetween.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .get('/theinbetween', (req, res) => {
    res.sendFile(BETWEEN);
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

function getQueryParams(req) {
  return url.parse(req.url, true).query;
}

function getClientCountForQuery(query) {
  let count = 0;
  wss.clients.forEach(client => {
    if (client.query && client.query === query) {
      count++;
    }
  });
  return count;
}

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log('Client connected');
  const ip = req.socket.remoteAddress;
  console.log(`req: ${req.url}`)
  
  ws.query = getQueryParams(req).query;
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.query === ws.query) {
      const clientCount = getClientCountForQuery(ws.query);
      console.log(`Client count for query ('${ws.query}'): ${clientCount}`);
      client.send(JSON.stringify({ type: 'CLIENT_COUNT', query: ws.query, count: wss.clients.size }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'CLIENT_COUNT', count: wss.clients.size }));
      }
    });

  });
});
