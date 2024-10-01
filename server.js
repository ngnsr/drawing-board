const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const clients = new Map();

wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    userId = data.userId;

    if (data.type === 'init') {
      if (!clients.has(userId)) {
        clients.set(userId, []);
      }

      const actions = [...clients.values()];
      ws.send(JSON.stringify({ type: "init", list: actions }));
    } else if (data.type === 'draw' && userId) {
      const userActions = clients.get(userId);
      userActions.push(data);

      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } else if (data.type === 'undo' && userId) {
      const userActions = clients.get(userId);
      if (userActions.length > 0) {

        if (userActions[userActions.length - 1].type === 'newLine') userActions.pop();
        while(userActions.length > 0 && userActions[userActions.length - 1].type != 'newLine'){
          userActions.pop();
        }

        const actions = [...clients.values()];

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "undo", list: actions }));
          }
        });
      }
    } else if (data.type === 'clear') {
      clients.get(userId).length = 0;
      const userActions = clients.get(userId);
      userActions.length = 0;

      if (wss.clients.size > 0) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'undo', list: [...clients.values()] }));
          }
        });
      }

    } else if (data.type === 'newLine' && userId) {
      const userActions = clients.get(userId);
      userActions.push({ type: "newLine" });

      if (wss.clients.size > 0) {
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'newLine' }));
          }
        });
      }
    }
  });

});

server.listen(3000, () => {
  console.log('Server start on port 3000');
});
