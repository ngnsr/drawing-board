const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color');
const sizePicker = document.getElementById('size');
const eraseButton = document.getElementById('erase');
const undoButton = document.getElementById('undo');
const clearButton = document.getElementById('clear');

canvas.width = window.innerWidth - 40;
canvas.height = window.innerHeight - 100;

let drawing = false;
let currentColor = colorPicker.value;
let currentSize = sizePicker.value;
updateCursor(currentSize, currentColor);
let isErasing = false;

let userId = localStorage.getItem('userId');
if (!userId) {
  userId = Math.random().toString(36).substring(2, 15);
  localStorage.setItem('userId', userId);
}

const socket = new WebSocket(`ws://${window.location.host}`);

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ type: 'init', userId }));
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if(data.type === 'init'){
    data.list.forEach((e) => {
      e.forEach((v) => {
        drawOnCanvas(v.x, v.y, v.color, v.size, v.isErasing);
      });
    })

  } else if (data.type === 'draw') {
    drawOnCanvas(data.x, data.y, data.color, data.size, data.isErasing);
  } else if (data.type === 'clear') {
    drawing = false;
    clearCanvas();
    ctx.beginPath();
  } else if (data.type === 'newLine'){
    drawing = false;
    ctx.beginPath();
  } else if(data.type === 'undo'){
    drawing = false;

    clearCanvas();

    if(data.list.length == 0) return;

    data.list.forEach((e) => {
      e.forEach((v) => {
        drawOnCanvas(v.x, v.y, v.color, v.size, v.isErasing);
      });
    })

    ctx.beginPath();
  }
});

colorPicker.addEventListener('input', () => {
  drawing = false;
  currentColor = colorPicker.value;
  updateCursor(currentSize, currentColor);
});

sizePicker.addEventListener('input', () => {
  drawing = false;
  currentSize = sizePicker.value;
  updateCursor(currentSize, currentColor);
});

eraseButton.addEventListener('click', () => {
  drawing = false;
  isErasing = !isErasing;
  if(isErasing){
    eraseButton.textContent = 'Draw'
  }else{
    eraseButton.textContent = 'Erase'
  }

});

function updateCursor(size, color) {
  const cursorSize = size;
  // stroke='${color}' -- don't work
  canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}" ><circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${cursorSize / 2}" stroke="black" stroke-width="1" fill="transparent"/></svg>') ${cursorSize / 2} ${cursorSize / 2}, crosshair`;
}

undoButton.addEventListener('click', () => {
  drawing = false;
  sendUndo();
});

clearButton.addEventListener('click', () => {
  drawing = false;
  sendClear();
  clearCanvas();
});

canvas.addEventListener('mousedown', (event) => {
  drawing = true;
  draw(event);
});

canvas.addEventListener('mousemove', draw);

canvas.addEventListener('mouseup', () => {
  if(drawing) {
    drawing = false;
  
    ctx.beginPath()
    socket.send(JSON.stringify({type: 'newLine', userId}));
  }
});

canvas.addEventListener('mouseout', () => {
  if(drawing) {
    drawing = false;
    ctx.beginPath();
    socket.send(JSON.stringify({type: 'newLine', userId}));
  }
});

function draw(event) {
  if (!drawing) return;
  
  const x = event.offsetX;
  const y = event.offsetY;

  drawOnCanvas(x, y, currentColor, currentSize, isErasing);
  
  socket.send(JSON.stringify({
    type: 'draw',
    userId,
    x,
    y,
    color: currentColor,
    size: currentSize,
    isErasing
  }));
}

function drawOnCanvas(x, y, color, size, erase) {
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  
  if (erase) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
  }

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function clearCanvas(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function sendUndo(){
  socket.send(JSON.stringify({ type: 'undo', userId }));
}

function sendClear(){
  socket.send(JSON.stringify({ type: 'clear', userId }));
}
