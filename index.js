const net = require('net');

// ==================== 核心配置 ====================
const PORT = 7860;                    // 指定端口 30170
const USERNAME = '3c7066bcc4f61ed0';   // Socks5 用户名
const PASSWORD = 'ouiw0lw7h3gx9fzmx';   // Socks5 密码
// ==================================================

// 极具科技感、赛博朋克深色 UI 的贪吃蛇网页
const FAKE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quantum Snake // 量子贪食蛇</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(16, 24, 40, 0.75);
      --accent: #00f0ff;
      --accent-glow: rgba(0, 240, 255, 0.35);
      --food: #ff0055;
      --food-glow: rgba(255, 0, 85, 0.6);
      --text: #f0f6fc;
      --text-dim: #7d8590;
      --border: rgba(0, 240, 255, 0.2);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background: var(--bg);
      background-image: 
        radial-gradient(ellipse at 50% 10%, rgba(0, 240, 255, 0.08) 0%, transparent 60%),
        linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 30px 30px, 30px 30px;
      color: var(--text);
      font-family: 'Segoe UI', -apple-system, Roboto, monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .wrapper {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 28px;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px var(--accent-glow);
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 480px;
      width: 100%;
    }
    header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 12px;
      height: 12px;
      background: var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 12px var(--accent);
    }
    h1 {
      font-size: 16px;
      letter-spacing: 2px;
      color: var(--accent);
      text-transform: uppercase;
    }
    .scoreboard {
      display: flex;
      gap: 16px;
      font-size: 13px;
    }
    .score-item {
      color: var(--text-dim);
    }
    .score-item span {
      color: var(--text);
      font-weight: bold;
      font-size: 15px;
      margin-left: 4px;
    }
    .canvas-container {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(0, 240, 255, 0.3);
      box-shadow: inset 0 0 20px rgba(0, 240, 255, 0.1);
    }
    canvas {
      display: block;
      background: #060911;
    }
    .overlay {
      position: absolute;
      inset: 0;
      background: rgba(6, 9, 17, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      backdrop-filter: blur(4px);
    }
    .overlay.hidden { display: none; }
    .btn {
      background: transparent;
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 10px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      letter-spacing: 1.5px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
    }
    .btn:hover {
      background: var(--accent);
      color: #060911;
      box-shadow: 0 0 20px var(--accent);
    }
    footer {
      margin-top: 16px;
      font-size: 12px;
      color: var(--text-dim);
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .keys-hint {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      justify-content: center;
    }
    .kbd {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header>
      <div class="brand">
        <div class="brand-logo"></div>
        <h1>Cyber Snake</h1>
      </div>
      <div class="scoreboard">
        <div class="score-item">SCORE<span id="score">0</span></div>
        <div class="score-item">HIGH<span id="high">0</span></div>
      </div>
    </header>

    <div class="canvas-container">
      <canvas id="game" width="400" height="400"></canvas>
      <div class="overlay" id="overlay">
        <h2 id="overlay-title" style="color:var(--accent); letter-spacing: 2px;">NEURAL ACTIVE</h2>
        <p style="font-size: 13px; color: var(--text-dim);" id="overlay-msg">点击按钮或按空格键启动量子矩阵</p>
        <button class="btn" id="start-btn">INITIALIZE</button>
      </div>
    </div>

    <footer>
      <div class="keys-hint">
        控制: <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> 或 <span class="kbd">↑</span><span class="kbd">↓</span><span class="kbd">←</span><span class="kbd">→</span>
      </div>
      <div>CORE STATUS: SYNCHRONIZED // QUANTUM GRID v2.5</div>
    </footer>
  </div>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highEl = document.getElementById('high');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayMsg = document.getElementById('overlay-msg');
    const startBtn = document.getElementById('start-btn');

    const GRID = 20;
    const COUNT = canvas.width / GRID;

    let snake = [];
    let food = { x: 5, y: 5 };
    let dx = 1, dy = 0;
    let nextDx = 1, nextDy = 0;
    let score = 0;
    let highScore = localStorage.getItem('cs_high') || 0;
    highEl.textContent = highScore;

    let loopInterval = null;
    let isRunning = false;

    function resetGame() {
      snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ];
      dx = 1; dy = 0;
      nextDx = 1; nextDy = 0;
      score = 0;
      scoreEl.textContent = score;
      placeFood();
    }

    function placeFood() {
      let valid = false;
      while (!valid) {
        food.x = Math.floor(Math.random() * COUNT);
        food.y = Math.floor(Math.random() * COUNT);
        valid = !snake.some(s => s.x === food.x && s.y === food.y);
      }
    }

    function draw() {
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制背景微弱网格
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= canvas.width; i += GRID) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // 绘制食物（量子能量核心，发光效果）
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff0055';
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * GRID, (food.y + 0.5) * GRID, GRID / 2 - 3, 0, Math.PI * 2);
      ctx.fill();

      // 绘制蛇身
      snake.forEach((seg, index) => {
        const isHead = index === 0;
        ctx.shadowBlur = isHead ? 15 : 6;
        ctx.shadowColor = '#00f0ff';
        ctx.fillStyle = isHead ? '#ffffff' : (index % 2 === 0 ? '#00f0ff' : '#00aaff');
        
        const r = isHead ? 4 : 2;
        const x = seg.x * GRID + 1.5;
        const y = seg.y * GRID + 1.5;
        const s = GRID - 3;
        
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, s, s, r) : ctx.rect(x, y, s, s);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    function update() {
      dx = nextDx;
      dy = nextDy;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // 撞墙或自撞检测
      if (head.x < 0 || head.x >= COUNT || head.y < 0 || head.y >= COUNT ||
          snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        if (score > highScore) {
          highScore = score;
          highEl.textContent = highScore;
          localStorage.setItem('cs_high', highScore);
        }
        placeFood();
      } else {
        snake.pop();
      }

      draw();
    }

    function startGame() {
      resetGame();
      overlay.classList.add('hidden');
      isRunning = true;
      clearInterval(loopInterval);
      loopInterval = setInterval(update, 110);
      draw();
    }

    function gameOver() {
      clearInterval(loopInterval);
      isRunning = false;
      overlayTitle.textContent = 'SYSTEM BREACH';
      overlayTitle.style.color = '#ff0055';
      overlayMsg.textContent = '节点脱机，最终得分: ' + score;
      startBtn.textContent = 'RE-INITIALIZE';
      overlay.classList.remove('hidden');
    }

    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        if (dy !== 1) { nextDx = 0; nextDy = -1; }
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        if (dy !== -1) { nextDx = 0; nextDy = 1; }
      } else if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        if (dx !== 1) { nextDx = -1; nextDy = 0; }
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        if (dx !== -1) { nextDx = 1; nextDy = 0; }
      } else if (k === ' ' && !isRunning) {
        startGame();
      }
    });

    startBtn.addEventListener('click', startGame);
    draw();
  </script>
</body>
</html>`;

const HTTP_RESPONSE = 
  'HTTP/1.1 200 OK\r\n' +
  'Content-Type: text/html; charset=UTF-8\r\n' +
  `Content-Length: ${Buffer.byteLength(FAKE_HTML)}\r\n` +
  'Connection: close\r\n' +
  'Server: nginx/1.22.0\r\n' +
  '\r\n' +
  FAKE_HTML;

// 创建 TCP 服务器，实现协议动态分流（HTTP / Socks5）
const server = net.createServer((socket) => {
  let isSocks = false;
  let stage = 0; // 0: 握手协商, 1: 认证阶段, 2: CONNECT转发, 3: Pipe状态
  let remoteSocket = null;

  socket.on('error', () => {
    if (remoteSocket) remoteSocket.destroy();
  });

  socket.on('data', (data) => {
    try {
      // 阶段 0: 探测流量类型
      if (stage === 0) {
        if (data[0] === 0x05) {
          isSocks = true;
        } else {
          // 非 Socks5 流量（浏览器或平台探测），返回伪装贪吃蛇页面
          socket.write(HTTP_RESPONSE);
          socket.end();
          return;
        }
      }

      // Socks5 流程处理
      if (isSocks) {
        // 握手
        if (stage === 0) {
          const nmethods = data[1];
          const methods = data.slice(2, 2 + nmethods);
          
          if (methods.includes(0x02)) {
            socket.write(Buffer.from([0x05, 0x02])); // 协商为用户名密码认证
            stage = 1;
          } else {
            socket.write(Buffer.from([0x05, 0xff]));
            socket.end();
          }
          return;
        }

        // 认证
        if (stage === 1) {
          if (data[0] !== 0x01) return socket.end();
          const ulen = data[1];
          const u = data.slice(2, 2 + ulen).toString();
          const plen = data[2 + ulen];
          const p = data.slice(3 + ulen, 3 + ulen + plen).toString();

          if (u === USERNAME && p === PASSWORD) {
            socket.write(Buffer.from([0x01, 0x00])); // 认证成功
            stage = 2;
          } else {
            socket.write(Buffer.from([0x01, 0x01])); // 认证失败
            socket.end();
          }
          return;
        }

        // CONNECT 代理连接
        if (stage === 2) {
          if (data[0] !== 0x05 || data[1] !== 0x01) {
            return socket.end(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          }

          const atyp = data[3];
          let host = '';
          let portOffset = 4;

          if (atyp === 0x01) { // IPv4
            host = data.slice(4, 8).join('.');
            portOffset = 8;
          } else if (atyp === 0x03) { // 域名
            const hostLen = data[4];
            host = data.slice(5, 5 + hostLen).toString();
            portOffset = 5 + hostLen;
          } else if (atyp === 0x04) { // IPv6
            host = data.slice(4, 20).toString('hex').match(/.{1,4}/g).join(':');
            portOffset = 20;
          } else {
            return socket.end();
          }

          const destPort = data.readUInt16BE(portOffset);

          remoteSocket = net.connect(destPort, host, () => {
            socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
            socket.pipe(remoteSocket);
            remoteSocket.pipe(socket);
          });

          remoteSocket.on('error', () => {
            socket.destroy();
          });

          stage = 3;
        }
      }
    } catch (err) {
      socket.destroy();
    }
  });
});

// 静默启动，不向控制台倾倒任何节点敏感信息，保持服务器日志绝对干净
server.listen(PORT, '0.0.0.0');
