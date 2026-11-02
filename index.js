/**
 * Quantum Node - 双模代理服务 (VLESS over WebSocket + Socks5 兼容 + Cyber Snake 伪装)
 * 纯 Node.js 原生内置模块实现，零 npm 依赖，超低内存常驻 (~20MB)。
 * 适用于受限容器、低配 PaaS (512MB RAM) 及 Cloudflare CDN 加速落地。
 */

const http = require('http');
const net = require('net');
const crypto = require('crypto');

// ==========================================
// 核心配置变量 (可在此自由修改与更换)
// ==========================================
const PORT = process.env.PORT || 8080;                                              // 监听端口 (容器开放端口)
const VLESS_UUID = '5b007b63-b462-4caa-974f-50bb3297f62a';      // VLESS 认证 UUID
const WS_PATH = '/3c7066bcc4f61ed0';                              // WebSocket 接入路径 (暗号)

// 兼容保留原生 Socks5 直连模式 (若客户端直接以 0x05 裸 TCP 连入，自动 fallback)
const SOCKS5_ENABLED = true;
const SOCKS5_USERNAME = '3c7066bcc4f61ed0';
const SOCKS5_PASSWORD = 'ouiw0lw7h3gx9fzmx';
// ==========================================

// 解析 UUID 为 16 字节原始 Buffer
const UUID_BUF = Buffer.from(VLESS_UUID.replace(/-/g, ''), 'hex');

// ==========================================
// 赛博朋克深色 UI 贪吃蛇小游戏 (HTML5 Canvas)
// ==========================================
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
      border: 1px solid rgba(0, 240, 255, 0.15);
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
      background: #050811;
    }
    canvas {
      display: block;
    }
    .overlay {
      position: absolute;
      inset: 0;
      background: rgba(9, 13, 22, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      transition: opacity 0.2s ease;
    }
    .overlay.hidden {
      display: none;
    }
    .status-text {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: var(--text);
    }
    .action-btn {
      background: transparent;
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      cursor: pointer;
      box-shadow: 0 0 15px var(--accent-glow);
      transition: all 0.2s ease;
    }
    .action-btn:hover {
      background: var(--accent);
      color: #000;
      box-shadow: 0 0 25px var(--accent);
    }
    .controls-hint {
      margin-top: 16px;
      font-size: 12px;
      color: var(--text-dim);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .key-badge {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      color: var(--text);
      font-size: 10px;
    }
    .mobile-controls {
      display: grid;
      grid-template-columns: repeat(3, 48px);
      grid-template-rows: repeat(2, 48px);
      gap: 8px;
      margin-top: 14px;
    }
    @media (min-width: 600px) {
      .mobile-controls { display: none; }
    }
    .m-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 8px;
      color: var(--accent);
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .m-btn:active {
      background: var(--accent-glow);
    }
    .btn-up { grid-column: 2; grid-row: 1; }
    .btn-left { grid-column: 1; grid-row: 2; }
    .btn-down { grid-column: 2; grid-row: 2; }
    .btn-right { grid-column: 3; grid-row: 2; }
  </style>
</head>
<body>
  <div class="wrapper">
    <header>
      <div class="brand">
        <div class="brand-logo"></div>
        <h1>Quantum Node</h1>
      </div>
      <div class="scoreboard">
        <div class="score-item">SCORE<span id="score">0</span></div>
        <div class="score-item">HIGH<span id="high-score">0</span></div>
      </div>
    </header>

    <div class="canvas-container">
      <canvas id="gameCanvas" width="380" height="380"></canvas>
      <div id="overlay" class="overlay">
        <div id="overlayText" class="status-text">SYSTEM READY</div>
        <button id="startBtn" class="action-btn">INITIALIZE</button>
      </div>
    </div>

    <div class="controls-hint">
      <span>NAVIGATE:</span>
      <span class="key-badge">W</span><span class="key-badge">A</span><span class="key-badge">S</span><span class="key-badge">D</span>
      <span>or</span>
      <span class="key-badge">ARROWS</span>
    </div>

    <div class="mobile-controls">
      <button class="m-btn btn-up" ontouchstart="handleTouch('UP')">▲</button>
      <button class="m-btn btn-left" ontouchstart="handleTouch('LEFT')">◀</button>
      <button class="m-btn btn-down" ontouchstart="handleTouch('DOWN')">▼</button>
      <button class="m-btn btn-right" ontouchstart="handleTouch('RIGHT')">▶</button>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');
    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlayText');
    const startBtn = document.getElementById('startBtn');

    const GRID_SIZE = 19;
    const CELL_COUNT = 20;
    const CANVAS_SIZE = GRID_SIZE * CELL_COUNT;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    let snake = [];
    let food = { x: 0, y: 0 };
    let dir = { x: 0, y: 0 };
    let nextDir = { x: 0, y: 0 };
    let score = 0;
    let highScore = localStorage.getItem('quantum_snake_hi') || 0;
    highScoreEl.innerText = highScore;

    let gameLoop = null;
    let isPlaying = false;

    function resetGame() {
      snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
      ];
      dir = { x: 0, y: -1 };
      nextDir = { x: 0, y: -1 };
      score = 0;
      scoreEl.innerText = score;
      spawnFood();
    }

    function spawnFood() {
      let valid = false;
      while (!valid) {
        food.x = Math.floor(Math.random() * CELL_COUNT);
        food.y = Math.floor(Math.random() * CELL_COUNT);
        valid = !snake.some(segment => segment.x === food.x && segment.y === food.y);
      }
    }

    function draw() {
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
      }

      ctx.save();
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      snake.forEach((seg, index) => {
        const opacity = 1 - (index / snake.length) * 0.6;
        ctx.fillStyle = index === 0 ? '#00f0ff' : 'rgba(0, 240, 255, ' + opacity + ')';
        ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
      });
      ctx.restore();
    }

    function step() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) {
        return gameOver();
      }

      for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
          return gameOver();
        }
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        if (score > highScore) {
          highScore = score;
          highScoreEl.innerText = highScore;
          localStorage.setItem('quantum_snake_hi', highScore);
        }
        spawnFood();
      } else {
        snake.pop();
      }

      draw();
    }

    function gameOver() {
      isPlaying = false;
      clearInterval(gameLoop);
      overlayText.innerText = 'SIGNAL COLLAPSED';
      startBtn.innerText = 'RECONNECT';
      overlay.classList.remove('hidden');
    }

    function startGame() {
      resetGame();
      isPlaying = true;
      overlay.classList.add('hidden');
      draw();
      clearInterval(gameLoop);
      gameLoop = setInterval(step, 90);
    }

    window.addEventListener('keydown', e => {
      if (!isPlaying && (e.code === 'Space' || e.code === 'Enter')) {
        startGame();
        return;
      }
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y === 0) nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y === 0) nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x === 0) nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x === 0) nextDir = { x: 1, y: 0 };
          break;
      }
    });

    function handleTouch(direction) {
      if (!isPlaying) return;
      if (direction === 'UP' && dir.y === 0) nextDir = { x: 0, y: -1 };
      if (direction === 'DOWN' && dir.y === 0) nextDir = { x: 0, y: 1 };
      if (direction === 'LEFT' && dir.x === 0) nextDir = { x: -1, y: 0 };
      if (direction === 'RIGHT' && dir.x === 0) nextDir = { x: 1, y: 0 };
    }

    startBtn.addEventListener('click', startGame);
    draw();
  </script>
</body>
</html>`;

// ==========================================
// 全局异常兜底保护 (防止极端网络异常导致进程退出)
// ==========================================
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// ==========================================
// 极简原生 WebSocket 帧编解码器 (RFC 6455)
// ==========================================
function parseWsFrames(buffer, onData) {
  let offset = 0;
  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) break;
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    const isMasked = (byte2 & 0x80) !== 0;
    let payloadLen = byte2 & 0x7f;
    let headLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      // 忽略超过 4GB 的极巨帧高 32 位
      payloadLen = buffer.readUInt32BE(offset + 6);
      headLen = 10;
    }

    const maskOffset = offset + headLen;
    const dataOffset = maskOffset + (isMasked ? 4 : 0);
    if (dataOffset + payloadLen > buffer.length) break;

    let payload = buffer.slice(dataOffset, dataOffset + payloadLen);
    if (isMasked) {
      const mask = buffer.slice(maskOffset, maskOffset + 4);
      const unmasked = Buffer.allocUnsafe(payloadLen);
      for (let i = 0; i < payloadLen; i++) {
        unmasked[i] = payload[i] ^ mask[i % 4];
      }
      payload = unmasked;
    }

    offset = dataOffset + payloadLen;

    // opcode 1=text, 2=binary
    if (opcode === 1 || opcode === 2) {
      onData(payload, false);
    } else if (opcode === 8) {
      onData(null, true);
      return { offset, close: true };
    }
  }
  return { offset, close: false };
}

function makeWsFrame(payload, opcode = 2) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len <= 0xffff) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  return Buffer.concat([header, payload]);
}

// ==========================================
// VLESS 协议解包与转发逻辑
// ==========================================
function handleVlessStream(socket) {
  let wsBuffer = Buffer.alloc(0);
  let vlessParsed = false;
  let remoteSocket = null;
  let pendingRemoteData = [];

  const cleanup = () => {
    if (remoteSocket) {
      remoteSocket.destroy();
      remoteSocket = null;
    }
    socket.destroy();
  };

  socket.on('error', cleanup);

  socket.on('data', chunk => {
    wsBuffer = Buffer.concat([wsBuffer, chunk]);

    const res = parseWsFrames(wsBuffer, (payload, isClose) => {
      if (isClose) {
        cleanup();
        return;
      }

      if (!vlessParsed) {
        // VLESS 请求头部格式:
        // 1 byte (version=0) + 16 bytes (UUID) + 1 byte (addon len) + [addon] +
        // 1 byte (command: 1=TCP, 2=UDP) + 2 bytes (port BE) + 1 byte (addr type) + addr + payload
        if (payload.length < 18) {
          return cleanup();
        }

        const clientVersion = payload[0];
        const clientUUID = payload.slice(1, 17);

        // 校验 UUID
        if (!clientUUID.equals(UUID_BUF)) {
          return cleanup();
        }

        let p = 17;
        const addonLen = payload[p];
        p += 1 + addonLen;

        const cmd = payload[p++];
        if (cmd !== 1) { // 仅支持 TCP CONNECT
          return cleanup();
        }

        const destPort = payload.readUInt16BE(p);
        p += 2;

        const addrType = payload[p++];
        let destHost = '';

        if (addrType === 1) { // IPv4
          destHost = payload.slice(p, p + 4).join('.');
          p += 4;
        } else if (addrType === 2) { // 域名
          const hostLen = payload[p++];
          destHost = payload.slice(p, p + hostLen).toString();
          p += hostLen;
        } else if (addrType === 3) { // IPv6
          destHost = payload.slice(p, p + 16).toString('hex').match(/.{1,4}/g).join(':');
          p += 16;
        } else {
          return cleanup();
        }

        vlessParsed = true;

        // VLESS 响应头: version(0) + addonLen(0)
        const vlessResponseHeader = Buffer.from([clientVersion, 0x00]);
        const initialRaw = payload.slice(p);

        // 建立到目标主机/网站的真实出站连接
        remoteSocket = net.connect(destPort, destHost, () => {
          // 发送 VLESS 成功握手
          socket.write(makeWsFrame(vlessResponseHeader));

          if (initialRaw.length > 0) {
            remoteSocket.write(initialRaw);
          }

          // 将缓存中收到的后续数据全部发送
          for (const pending of pendingRemoteData) {
            remoteSocket.write(pending);
          }
          pendingRemoteData = [];

          // 目标返回数据 -> 封装成 WS 二进制帧 -> 写回客户端
          remoteSocket.on('data', rChunk => {
            if (!socket.destroyed) {
              socket.write(makeWsFrame(rChunk));
            }
          });
        });

        remoteSocket.on('error', cleanup);
        remoteSocket.on('end', () => socket.end());
      } else {
        // 已完成 VLESS 握手，直接将解开掩码的 payload 写向目标
        if (remoteSocket && !remoteSocket.connecting) {
          remoteSocket.write(payload);
        } else {
          pendingRemoteData.push(payload);
        }
      }
    });

    if (offset > 0) {
      wsBuffer = wsBuffer.slice(offset);
    }
  });
}

// ==========================================
// 兼容保留: 原生 Socks5 TCP 转发处理逻辑
// ==========================================
function handleSocks5Connection(socket, initialChunk) {
  let stage = 0;
  let remoteSocket = null;

  const cleanup = () => {
    if (remoteSocket) remoteSocket.destroy();
    socket.destroy();
  };

  socket.on('error', cleanup);

  const processChunk = data => {
    try {
      if (stage === 0) {
        const nmethods = data[1];
        const methods = data.slice(2, 2 + nmethods);
        if (methods.includes(0x02)) {
          socket.write(Buffer.from([0x05, 0x02]));
          stage = 1;
        } else {
          socket.write(Buffer.from([0x05, 0xff]));
          socket.end();
        }
        return;
      }

      if (stage === 1) {
        if (data[0] !== 0x01) return socket.end();
        const ulen = data[1];
        const u = data.slice(2, 2 + ulen).toString();
        const plen = data[2 + ulen];
        const p = data.slice(3 + ulen, 3 + ulen + plen).toString();

        if (u === SOCKS5_USERNAME && p === SOCKS5_PASSWORD) {
          socket.write(Buffer.from([0x01, 0x00]));
          stage = 2;
        } else {
          socket.write(Buffer.from([0x01, 0x01]));
          socket.end();
        }
        return;
      }

      if (stage === 2) {
        if (data[0] !== 0x05 || data[1] !== 0x01) {
          return socket.end(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        }

        const atyp = data[3];
        let host = '';
        let portOffset = 4;

        if (atyp === 0x01) {
          host = data.slice(4, 8).join('.');
          portOffset = 8;
        } else if (atyp === 0x03) {
          const hostLen = data[4];
          host = data.slice(5, 5 + hostLen).toString();
          portOffset = 5 + hostLen;
        } else if (atyp === 0x04) {
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

        remoteSocket.on('error', cleanup);
        stage = 3;
      }
    } catch (e) {
      cleanup();
    }
  };

  socket.on('data', processChunk);
  processChunk(initialChunk);
}

// ==========================================
// HTTP 服务 & 协议嗅探网关
// ==========================================
const httpServer = http.createServer((req, res) => {
  // 普通浏览器、CF 巡检、爬虫访问任意网页路径，一律返回赛博朋克深色贪吃蛇
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=UTF-8',
    'Cache-Control': 'no-cache'
  });
  res.end(FAKE_HTML);
});

// 处理 HTTP Upgrade 协议升级 (WebSocket)
httpServer.on('upgrade', (req, socket, head) => {
  const reqUrl = req.url ? req.url.split('?')[0] : '';
  const upgradeHeader = (req.headers['upgrade'] || '').toLowerCase();

  // 严格验证暗号路径和 WebSocket 请求头
  if (reqUrl === WS_PATH && upgradeHeader === 'websocket') {
    const secKey = req.headers['sec-websocket-key'];
    if (!secKey) {
      socket.destroy();
      return;
    }

    // 标准 RFC 6455 握手计算
    const hash = crypto
      .createHash('sha1')
      .update(secKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${hash}`,
      '\r\n'
    ];

    socket.write(responseHeaders.join('\r\n'));

    // 将 initial head 与 socket 交由 VLESS 流处理器接管
    if (head && head.length > 0) {
      socket.unshift(head);
    }
    handleVlessStream(socket);
  } else {
    // 路径或协议不匹配，直接挂断，不暴露特征
    socket.destroy();
  }
});

// ==========================================
// 统一 TCP 调度服务器 (端口复用嗅探)
// ==========================================
const tcpServer = net.createServer(socket => {
  socket.once('data', chunk => {
    if (chunk.length === 0) return socket.destroy();

    // 1. 若首字节为 0x05，判定为标准 Socks5 客户端直接裸连
    if (SOCKS5_ENABLED && chunk[0] === 0x05) {
      handleSocks5Connection(socket, chunk);
    } else {
      // 2. 其余所有流量 (HTTP 访问贪吃蛇、WebSocket 升级请求) 推送至内部 HTTP 服务器处理
      socket.unshift(chunk);
      httpServer.emit('connection', socket);
    }
  });
});

// 静默启动，不向终端或控制台倾倒任何敏感凭据与配置，保持日志绝对干净无痕
tcpServer.listen(PORT, '0.0.0.0');
