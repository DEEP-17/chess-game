var board = null;
var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');
let c_player = null;
let timerinstance = null;
let currentmatchtime = null;
// Sounds
const moveSound = new Audio('./sounds/move.mp3');
const captureSound = new Audio('./sounds/capture.mp3');
const checkSound = new Audio('./sounds/check.mp3');
const castleSound = new Audio('./sounds/castle.mp3');
const startSound = new Audio('./sounds/start.mp3');
const endSound = new Audio('./sounds/end.mp3');

// Highlight legal moves
function removeHighlights() {
  $('#Board1 .square-55d63').removeClass('highlight check');
  $('#Board1 .square-55d63').find('.legal-dot').remove();
}

function highlightSquare(square) {
  const $square = $('#Board1 .square-' + square);

  // Add a small black dot to indicate legal move
  if ($square.find('.legal-dot').length === 0) {
    $square.append('<div class="legal-dot"></div>');
  }
}

// Show legal moves for the selected piece
function showLegalMoves(piece, source) {
  const legalMoves = game.moves({
    square: source,
    verbose: true,
  });

  legalMoves.forEach((move) => highlightSquare(move.to));
}

// Handle piece drag start
function onDragStart(source, piece, position, orientation) {
  if(game.turn()!==c_player)
  {
    return false;
  }
  if (game.game_over()) return false;

  // Only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }

  // Show legal moves
  removeHighlights();
  showLegalMoves(piece, source);
}

// Handle piece drop
function onDrop(source, target) {
  removeHighlights();

  // See if the move is legal
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q', // Always promote to queen for simplicity
  });

  if (move === null) return 'snapback';

  // Determine move type and play appropriate sound
  const moveIsCapture = move.flags.includes('c');
  const moveIsCastle = move.flags.includes('k') || move.flags.includes('q');

  if (moveIsCapture) {
    captureSound.play(); // Play capture sound
  } else if (moveIsCastle) {
    castleSound.play(); // Play castle sound
  } else if (game.in_check()) {
    checkSound.play(); // Play check sound for discovered check
  } else {
    moveSound.play(); // Play regular move sound
  }
  socket.emit('sync_state',game.fen(),game.turn());
  if(timerinstance)
  {
    timerinstance.pause();
  }
  else
  {
    timerinstance= startTimer(NUmber(currentmatchtimetime)*60, 'timerdisplay', function() {alert("Done!");});
  }
  updateStatus();
}

// Highlight the king's square if in check
function highlightKingInCheck() {
  if (!game.in_check()) return;

  const boardSquares = game.board();
  const turn = game.turn();
  let kingSquare = null;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = boardSquares[i][j];
      if (piece && piece.type === 'k' && piece.color === turn) {
        kingSquare = String.fromCharCode(97 + j) + (8 - i);
        break;
      }
    }
  }

  if (kingSquare) {
    $('#Board1 .square-' + kingSquare).addClass('check');
  }
}

// Function to update the PGN display
// Function to update the PGN display
function updatePGN() {
  const pgn = game.pgn({
    max_width: 5,  // To limit the number of moves per line
    newline_char: '\n', // This ensures each set of moves is separated by new lines
    skip_setup: true // Skip the setup headers
  });

  // Remove the setup headers if they are present
  const formattedPgn = pgn.replace(/\[.*?\]\s*/g, ''); // Remove all headers

  document.getElementById('pgn').textContent = formattedPgn;
}

// Update game status
function updateStatus() {
  let status = '';
  const moveColor = game.turn() === 'b' ? 'Black' : 'White';

  if (game.in_checkmate()) {
    const winner=game.turn()==='w'?'Black':'White';
      alert('Checkmate');
      socket.emit('game_over',winner);
    status = 'Game over, ' + moveColor + ' is in checkmate.';
    endSound.play(); // Play end game sound
  } else if (game.in_draw()) {
    status = 'Game over, drawn position.';
    endSound.play(); // Play end game sound
  } else {
    status = moveColor + ' to move';
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check.';
      highlightKingInCheck();
    }
  }

  $status.html(status);
  updatePGN(); // Ensure PGN is updated
}

// Handle piece snap
function onSnapEnd() {
  board.position(game.fen());
  updatePGN(); // Update PGN after each move
}

// Handle timer button click
function handleButtonClick(event) {
  const timer = Number(event.target.getAttribute('data-time'));
  socket.emit('want_to_play', timer);
  $('#main-element').hide();
  $('#waiting_text').show();
}

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.getElementsByClassName('timer-button');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', handleButtonClick);
  }
  const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatBox = document.getElementById('chat-box');

    sendButton.addEventListener('click', () => {
        const message = chatInput.value;
        console.log(`Sending message: ${message}`);
        socket.emit('send_message', message);
        displayMessage('You', message);
        chatInput.value = '';
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    socket.on('receive_message', (message) => {
        console.log(`Message received: ${message}`);
        displayMessage('Opponent', message);
    });

    function displayMessage(sender, message) {
        console.log(`Displaying message from ${sender}: ${message}`);
        const messageElement = document.createElement('div');
        messageElement.textContent = `${sender}: ${message}`;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
});

// Board configuration
const config = {
  draggable: true,
  position: 'start',
  onchange:onchange,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
};
board = Chessboard('Board1', config);

updateStatus();

// Add CSS for highlighting and legal moves
const style = document.createElement('style');
style.innerHTML = `
  .legal-dot {
    width: 15px;
    height: 15px;
    background-color: rgba(0, 0, 0, 0.4);
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .square-55d63 {
    position: relative;
  }
  .square-55d63.highlight {
    background-color: rgba(255, 255, 0, 0.5);
  }
  .square-55d63.check {
    background-color: rgba(255, 0, 0, 0.6) !important;
    transition: background-color 2s ease;
  }
`;
document.head.appendChild(style);

// Socket connection
const socket = io('https://chess-game-backend-z158.onrender.com');
console.log(socket);
// socket.on('i_am_connected',function(){
//   alert('you are connected to backend server');
// });
socket.on('totalplayers',function(data){
  $('#total_players').html('Total Players: '+data);
});
socket.on('match_made',(color,time)=>{
  c_player=color;
  alert("you are playing as "+color);
  startSound.play();
  $('#main-element').show();
  $('#waiting_text').hide();
  const currentplayer=color==='b' ?'Black':'White';
  $('#buttonsparent').html('you are playing as ' + currentplayer + '<p id="timerdisplay"></p>'); // Corrected line
  game.reset();
  board.clear();
  board.start();
  board.orientation(currentplayer.toLowerCase());
  currentmatchtime=time;
  if(game.turn()===c_player)
  {
    timerinstance= startTimer(Number(time)*60, 'timerdisplay', function() {alert("Done!");});
  }
  else
  {
    timerinstance=null;
    $('#timerdisplay').html('10:00');
  }
  
  // timer.pause();
  // timer.resume();
});
socket.on('sync_state_from_server',function(fen,turn){
  game.load(fen);
  board.position(fen);
  updateStatus();  
  if(timerinstance)
    {
      timerinstance.resume();
    }
    else
    {
      timerinstance= startTimer(Number(currentmatchtime)*60, 'timerdisplay', function() {alert("Done!");});
    }
});
function onchange() {
  console.log('onchange called');
  if (game.game_over()) {
    console.log('Game over detected');
    if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      console.log('Checkmate detected, winner:', winner);
      alert('Checkmate');
      socket.emit('game_over', winner);
      endSound.play(); // Play end game sound
    }
  }
}

socket.on('game_over_from_server', function(winner) {
  alert('Game over, ' + winner + ' wins!');
  window.location.reload();
});   

function startTimer(seconds, container, oncomplete) {
  var startTime, timer, obj, ms = seconds*1000,
      display = document.getElementById(container);
  obj = {};
  obj.resume = function() {
      startTime = new Date().getTime();
      timer = setInterval(obj.step,250); // adjust this number to affect granularity
                          // lower numbers are more accurate, but more CPU-expensive
  };
  obj.pause = function() {
      ms = obj.step();
      clearInterval(timer);
  };
  obj.step = function() {
      var now = Math.max(0,ms-(new Date().getTime()-startTime)),
          m = Math.floor(now/60000), s = Math.floor(now/1000)%60;
      s = (s < 10 ? "0" : "")+s;
      display.innerHTML = m+":"+s;
      if( now == 0) {
          clearInterval(timer);
          obj.resume = function() {};
          if( oncomplete) oncomplete();
      }
      return now;
  };
  obj.resume();
  return obj;
}

document.getElementById('play-stockfish').addEventListener('click', function() {
  let level = prompt("Enter difficulty level (0-20):", "1");
  let color = prompt("Enter your color (white/black):", "white");
  let duration = prompt("Enter match duration (10/15/30 minutes):", "10");
  if (level !== null && color !== null && duration !== null) {
    // alert(`Waiting for opponent...`);
    setTimeout(() => {
      startSound.play();
      alert(`You are playing as ${color} in a ${duration}-minute match.`);
      playAgainstStockfish(parseInt(level), color.toLowerCase());
    }, 2000); // Simulate waiting for opponent
  }
});

function playAgainstStockfish(level, playerColor) {
  const stockfish = new Worker('stockfish.js');
  stockfish.postMessage('uci');
  stockfish.postMessage('setoption name Skill Level value ' + level);
  stockfish.postMessage('ucinewgame');

  let isPlayerTurn = (playerColor === 'white');

  function makeStockfishMove() {
    stockfish.postMessage('position fen ' + game.fen());
    stockfish.postMessage('go movetime 1000');
  }

  stockfish.onmessage = function(event) {
    const message = event.data;
    if (message.startsWith('bestmove')) {
      const move = message.split(' ')[1];
      game.move(move, { sloppy: true });
      board.position(game.fen());
      updateStatus();
      isPlayerTurn = true;
      playSound(move);
      highlightMove(move);
      checkGameOver();
    }
  };

  function onDragStart(source, piece, position, orientation) {
    if (game.in_checkmate() === true || game.in_draw() === true ||
        piece.search(/^b/) !== -1 && playerColor === 'white' ||
        piece.search(/^w/) !== -1 && playerColor === 'black' ||
        !isPlayerTurn) {
      return false;
    }
  }

  function onDrop(source, target) {
    if (!isPlayerTurn) {
      return 'snapback';
    }

    const move = game.move({
      from: source,
      to: target,
      promotion: 'q'
    });

    if (move === null) return 'snapback';

    board.position(game.fen());
    updateStatus();
    playSound(move);
    highlightMove(move);
    isPlayerTurn = false;
    window.setTimeout(makeStockfishMove, 250);
    checkGameOver();
  }

  function onSnapEnd() {
    board.position(game.fen());
    updatePGN(); // Update PGN after each move
  }

  function playSound(move) {
    if (move.flags.includes('c')) {
      captureSound.play();
    } else if (move.flags.includes('k') || move.flags.includes('q')) {
      castleSound.play();
    } else if (move.flags.includes('e')) {
      captureSound.play();
    } else if (move.flags.includes('p')) {
      moveSound.play();
    } else {
      moveSound.play();
    }
  }

  function highlightMove(move) {
    removeHighlights();
    $('#Board1 .square-' + move.from).addClass('highlight');
    $('#Board1 .square-' + move.to).addClass('highlight');
  }

  function checkGameOver() {
    if (game.in_checkmate() === true || game.in_draw() === true) {
      endSound.play();
      alert('Game over');
    }
  }

  const config = {
    draggable: true,
    position: 'start',
    orientation: playerColor, // Set the orientation based on player color
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  };

  board = Chessboard('Board1', config);
  updateStatus();
  updatePGN();

  if (playerColor === 'black') {
    isPlayerTurn = false;
    makeStockfishMove();
  }
}
