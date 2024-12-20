const { createServer } = require("http");
const { Server } = require("socket.io");
const port = 3000;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["*"]
  }
});
let totalplayers = 0;
let players = {};
let waiting = {
  '10': [],
  '20': [],
  '15': [],
};
let matches = {
  '10': [],
  '20': [],
  '15': [],
};

function removesocketfromwaitingperiod(socket) {
  const foreachloop = [10, 15, 20];
  foreachloop.forEach((time) => {
    const index = waiting[time].indexOf(socket);
    if (index > -1) {
      waiting[time].splice(index, 1);
    }
  });
  console.log(waiting);
}

function fireondisconnect(socket) {
  removesocketfromwaitingperiod(socket.id);
  totalplayers--;
  firetotalplayers();
}

function initialsetupmatch(opponentid, socketid, time) {
  players[opponentid].emit('match_made', "w", time);
  players[socketid].emit('match_made', "b", time);

  players[opponentid].on('sync_state', function (fen, turn) {
    players[socketid].emit('sync_state_from_server', fen, turn);
  });

  players[socketid].on('sync_state', function (fen, turn) {
    players[opponentid].emit('sync_state_from_server', fen, turn);
  });

  players[opponentid].on('game_over', function (winner) {
    players[socketid].emit('game_over_from_server', winner);
  });

  players[socketid].on('game_over', function (winner) {
    players[opponentid].emit('game_over_from_server', winner);
  });

  // Chat functionality
  players[opponentid].on('send_message', function (message) {
    players[socketid].emit('receive_message', message);
  });

  players[socketid].on('send_message', function (message) {
    players[opponentid].emit('receive_message', message);
  });
  
}

function handleplayrequest(socket, time) {
  if (waiting[time].length > 0) {
    const opponentid = waiting[time].splice(0, 1)[0];
    matches[time].push({ [opponentid]: socket.id });
    initialsetupmatch(opponentid, socket.id, time);
    return;
  }
  if (!waiting[time].includes(socket.id)) {
    waiting[time].push(socket.id);
  }
}

function fireonconnect(socket) {
  socket.on('want_to_play', function (time) {
    handleplayrequest(socket, time);
  });
  totalplayers++;
  firetotalplayers();
}

io.on("connection", (socket) => {
  players[socket.id] = socket;
  fireonconnect(socket);
  socket.on('disconnect', () => fireondisconnect(socket));
  socket.on('send_message', (message) => {
    const senderId = socket.id;
    const opponentId = Object.keys(players).find(id => id !== senderId);
    if (opponentId) {
      players[opponentId].emit('receive_message', message);
    }
  });
});

function firetotalplayers() {
  io.emit('totalplayers', totalplayers);
}

httpServer.listen(port, function () {
  console.log('your server is running at port ' + port);
});
