(() => {
  'use strict';

  const canvas = document.getElementById('universe');
  const ctx = canvas.getContext('2d', { alpha: true });
  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  const state = { direction: 0, scrollY: scrollY, scrollImpulse: 0, orbit: false, palette: 0, warpUntil: 0, lastTime: 0 };
  const palettes = [
    { a: [46, 126, 255], b: [90, 226, 255], c: [133, 114, 255] },
    { a: [117, 92, 255], b: [100, 225, 255], c: [232, 118, 255] },
    { a: [25, 205, 208], b: [90, 191, 255], c: [144, 139, 255] },
    { a: [70, 145, 255], b: [176, 151, 255], c: [82, 238, 255] }
  ];
  let width = innerWidth;
  let height = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let particles = [];
  let lastScrollMark = -1;
  const pulses = [];

  const rand = (min, max) => Math.random() * (max - min) + min;
  const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

  function makeParticle(randomY = true) {
    return {
      x: rand(0, width), y: randomY ? rand(0, height) : rand(-15, -4),
      depth: rand(.28, 1), radius: rand(.45, 1.5),
      vx: rand(-.16, .16), vy: rand(.08, .32),
      phase: rand(0, Math.PI * 2), blink: rand(.006, .024), hue: Math.random()
    };
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(155, Math.max(65, Math.floor(width * height / 8500)));
    particles = Array.from({ length: count }, () => makeParticle(true));
  }

  function drawGrid(time) {
    const palette = palettes[state.palette];
    const horizon = height * .54;
    const verticalShift = (scrollY * .17 + time * .004 * (state.direction || 1)) % 48;
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const p = i / 15;
      const y = horizon + Math.pow(p, 1.78) * height * .7 + verticalShift * p;
      ctx.strokeStyle = rgba(palette.a, .012 + p * .045);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    const vanishX = width * .5 + (mouse.x - width * .5) * .045;
    for (let i = -13; i <= 13; i++) {
      ctx.strokeStyle = rgba(palette.a, .018 + (1 - Math.abs(i) / 14) * .025);
      ctx.beginPath(); ctx.moveTo(vanishX, horizon - 10); ctx.lineTo(vanishX + i * width * .095, height + 25); ctx.stroke();
    }
    const glow = ctx.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, height * .6);
    glow.addColorStop(0, rgba(palette.a, .09));
    glow.addColorStop(1, rgba(palette.a, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - 80, width, height - horizon + 100);
    ctx.restore();
  }

  function drawParticles(delta, time) {
    const palette = palettes[state.palette];
    const velocity = Math.min(1.8, Math.max(.4, delta / 16.67));
    for (const p of particles) {
      p.phase += p.blink * velocity;
      p.x += p.vx * velocity + state.scrollImpulse * .12 * p.depth;
      p.y += p.vy * velocity + state.direction * .45 * p.depth * velocity;
      if (p.x < -9) p.x = width + 9;
      if (p.x > width + 9) p.x = -9;
      if (p.y > height + 9) p.y = -9;
      if (p.y < -9) p.y = height + 9;

      let dx = mouse.x - p.x;
      let dy = mouse.y - p.y;
      let distance2 = dx * dx + dy * dy;
      if (mouse.active && distance2 < 175 * 175) {
        const distance = Math.sqrt(distance2) || 1;
        const force = (1 - distance / 175) * .55 * p.depth;
        p.x -= (dx / distance) * force * 2.8;
        p.y -= (dy / distance) * force * 2.8;
      }
      if (state.orbit) {
        const ox = p.x - width * .5;
        const oy = p.y - height * .5;
        p.x += -oy * .0011 / p.depth;
        p.y += ox * .0011 / p.depth;
      }
      if (state.warpUntil > time) {
        dx = p.x - mouse.x;
        dy = p.y - mouse.y;
        const distance = Math.hypot(dx, dy) + 1;
        p.x += dx / distance * 3.4 * p.depth;
        p.y += dy / distance * 3.4 * p.depth;
      }

      const alpha = (.14 + (Math.sin(p.phase) + 1) * .16) * p.depth;
      const color = p.hue > .78 ? palette.c : (p.hue > .38 ? palette.b : palette.a);
      ctx.beginPath();
      ctx.fillStyle = rgba(color, alpha);
      ctx.arc(p.x, p.y, p.radius * p.depth + .25, 0, Math.PI * 2);
      ctx.fill();
      if (mouse.active && distance2 < 135 * 135 && p.depth > .52) {
        ctx.beginPath();
        ctx.strokeStyle = rgba(palette.b, .12 * (1 - Math.sqrt(distance2) / 135));
        ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    state.scrollImpulse *= .92;
    if (Math.abs(state.scrollImpulse) < .025) state.scrollImpulse = 0;
  }

  function drawPulses(time) {
    const palette = palettes[state.palette];
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      const progress = (time - pulse.started) / pulse.duration;
      if (progress >= 1) { pulses.splice(i, 1); continue; }
      if (progress < 0) continue;
      const radius = progress * pulse.maxRadius;
      ctx.save();
      ctx.lineWidth = Math.max(.65, 2 * (1 - progress));
      ctx.strokeStyle = rgba(pulse.color || palette.b, .66 * (1 - progress));
      ctx.shadowBlur = 13;
      ctx.shadowColor = rgba(pulse.color || palette.b, .43 * (1 - progress));
      ctx.beginPath(); ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(palette.a, .2 * (1 - progress));
      ctx.beginPath(); ctx.arc(pulse.x, pulse.y, radius * .72, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function animate(time) {
    if (!state.lastTime) state.lastTime = time;
    const delta = Math.min(40, time - state.lastTime);
    state.lastTime = time;
    ctx.clearRect(0, 0, width, height);
    drawGrid(time);
    drawParticles(delta, time);
    updateGame(delta / 1000, time);
    drawGame();
    drawPulses(time);
    if (state.warpUntil && time > state.warpUntil) {
      state.warpUntil = 0;
      body.classList.remove('warp-mode');
    }
    requestAnimationFrame(animate);
  }

  function setMouse(x, y) {
    mouse.x = x;
    mouse.y = y;
    mouse.active = true;
    root.style.setProperty('--mouse-x', `${x}px`);
    root.style.setProperty('--mouse-y', `${y}px`);
  }

  function addPulse(x, y, color = palettes[state.palette].b, duration = 1050) {
    pulses.push({ x, y, color, started: performance.now(), duration, maxRadius: Math.max(width, height) * .65 });
    if (pulses.length > 18) pulses.shift();
  }

  function flash() {
    const layer = document.querySelector('.screen-flash');
    layer.classList.remove('flash');
    void layer.offsetWidth;
    layer.classList.add('flash');
  }


  function runAction(action) {
    if (action === 'pulse') {
      state.scrollImpulse = 19;
      addPulse(mouse.x, mouse.y, palettes[state.palette].b, 1150);
      addPulse(mouse.x, mouse.y, palettes[state.palette].a, 900);
      flash();
    } else if (action === 'orbit') {
      state.orbit = !state.orbit;
      body.classList.toggle('orbit-mode', state.orbit);
      addPulse(width * .5, height * .5, palettes[state.palette].c, 950);
    } else if (action === 'warp') {
      state.palette = (state.palette + 1) % palettes.length;
      state.warpUntil = performance.now() + 1250;
      state.scrollImpulse = 25;
      body.classList.add('warp-mode');
      flash();
      addPulse(mouse.x, mouse.y, palettes[state.palette].c, 1000);
    }
    // The effects are deliberately visual only; no explanatory copy is shown.
  }

  window.addEventListener('pointermove', event => setMouse(event.clientX, event.clientY), { passive: true });
  window.addEventListener('pointerdown', event => {
    setMouse(event.clientX, event.clientY);
  }, { passive: true });
  window.addEventListener('pointerleave', () => { mouse.active = false; }, { passive: true });
  // A janela de seleção é criada no fundo, como a seleção de área de trabalho do Windows.
  const marquee = document.getElementById('selectionMarquee');
  const MAX_W = 250, MAX_H = 190;           // tamanho máximo da raquete (px)
  const paddle = { rect: null, until: 0, vx: 0, vy: 0, cx: 0, cy: 0, t: 0 };
  let selecting = null;
  window.addEventListener('pointerdown', event => {
    if (mode !== 'pong' || event.button !== (red.on ? 2 : 0)) return;
    selecting = { btn: event.button, id: event.pointerId, x: event.clientX, y: event.clientY, ax: event.clientX, ay: event.clientY, moved: false };
    paddle.rect = null; paddle.vx = paddle.vy = 0; paddle.t = 0;
    marquee.classList.remove('visible', 'settling');
    marquee.style.left = `${event.clientX}px`;
    marquee.style.top = `${event.clientY}px`;
    marquee.style.width = '0px';
    marquee.style.height = '0px';
    try { event.target.setPointerCapture?.(event.pointerId); } catch (_) { /* opcional */ }
  });
  window.addEventListener('pointermove', event => {
    if (!selecting || selecting.id !== event.pointerId) return;
    const x = event.clientX, y = event.clientY;
    if (Math.abs(x - selecting.x) + Math.abs(y - selecting.y) <= 5 && !selecting.moved) return;
    selecting.moved = true;
    // a âncora desliza quando passa do tamanho máximo: a raquete acompanha o mouse
    if (x - selecting.ax > MAX_W) selecting.ax = x - MAX_W;
    if (selecting.ax - x > MAX_W) selecting.ax = x + MAX_W;
    if (y - selecting.ay > MAX_H) selecting.ay = y - MAX_H;
    if (selecting.ay - y > MAX_H) selecting.ay = y + MAX_H;
    const l = Math.min(selecting.ax, x), t = Math.min(selecting.ay, y);
    const w = Math.abs(x - selecting.ax), h = Math.abs(y - selecting.ay);
    marquee.classList.add('visible');
    marquee.style.left = `${l}px`; marquee.style.top = `${t}px`;
    marquee.style.width = `${w}px`; marquee.style.height = `${h}px`;
    paddle.rect = { l, t, r: l + w, b: t + h };
    const cx = l + w / 2, cy = t + h / 2, dt = (event.timeStamp - paddle.t) / 1000;
    if (paddle.t && dt > 0) {
      paddle.vx = paddle.vx * .6 + ((cx - paddle.cx) / dt) * .4;
      paddle.vy = paddle.vy * .6 + ((cy - paddle.cy) / dt) * .4;
    }
    paddle.cx = cx; paddle.cy = cy; paddle.t = event.timeStamp;
  });
  function finishSelection(event) {
    if (!selecting || (event && event.pointerId !== undefined && selecting.id !== event.pointerId)) return;
    if (event && event.type === 'pointerup' && event.button !== selecting.btn) return;
    const wasDrag = selecting.moved;
    selecting = null;
    if (wasDrag) {
      paddle.until = performance.now() + 650;   // a raquete ainda vale enquanto some
      marquee.classList.add('settling');
      window.setTimeout(() => marquee.classList.remove('visible', 'settling'), 650);
    } else {
      runAction('pulse'); // clique esquerdo simples
    }
  }
  window.addEventListener('pointerup', finishSelection);
  window.addEventListener('pointercancel', finishSelection);

  // Efeitos nos cliques do mouse:
  //   esquerdo (clique)  -> onda de pulso
  //   direito            -> distorção do campo + troca de cor
  //   botão do meio      -> liga/desliga o campo orbital
  window.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') return;
    if (event.button === (red.on ? 0 : 2)) runAction('warp');   // o botão que não é raquete vira efeito
    else if (event.button === 1) runAction('orbit');
  });
  window.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('mousedown', event => { if (event.button === 1) event.preventDefault(); });
  window.addEventListener('auxclick', event => { if (event.button === 1) event.preventDefault(); });

  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    const difference = current - state.scrollY;
    if (Math.abs(difference) > 1) {
      state.direction = difference > 0 ? 1 : -1;
      state.scrollImpulse = Math.max(-16, Math.min(16, difference * .34));
      body.classList.toggle('scroll-down', state.direction > 0);
      body.classList.toggle('scroll-up', state.direction < 0);
      const marker = Math.min(11, Math.floor((current / Math.max(1, document.documentElement.scrollHeight - innerHeight)) * 12));
      if (marker !== lastScrollMark) {
        document.querySelectorAll('.scroll-markers i').forEach((item, index) => item.classList.toggle('active', index === marker));
        lastScrollMark = marker;
      }
    }
    state.scrollY = current;
  }, { passive: true });
  window.addEventListener('wheel', event => {
    state.scrollImpulse += Math.max(-9, Math.min(9, event.deltaY * .025));
    if (event.deltaY) state.direction = event.deltaY > 0 ? 1 : -1;
  }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  // ================= PING-PONG 3D =================
  // Mundo: x = lateral, y = altura, z = profundidade (0 = beira da mesa do jogador, L = lado do NEXUS).
  const TB = { L: 2.74, W: 1.52, NET: 1.37, NETH: .16, G: 5.2, R: .042, HITZ: -.15 };
  const cam = { x: 0, y: .8, z: -1.55, c: Math.cos(.33), s: Math.sin(.33) };
  const hashSoccer = location.hash.match(/^#futebol(\d*)/);       // #futebol (ou #futebol4 = campo girando) abre direto o futebol
  let mode = hashSoccer ? 'soccer' : (/^#roleta/.test(location.hash) ? 'pong' : 'menu');   // começa no menu (os atalhos #futebol/#roleta pulam o menu)
  const TURN_3P = 6;                                                  // futebol 3º (6º turno) em diante: 3ª pessoa com o mouse
  const isTP = () => mode === 'soccer' && game.turn >= 4;             // visão girada: aérea no 4º turno (futebol 2º), 3ª pessoa do 6º em diante
  const is3P = () => mode === 'soccer' && game.turn >= TURN_3P;
  const skill = { box: 0, blocks: 0, spin: 0, tp: 0, hit: 0, power: 0, aim: 0, redHit: 0, kick: 0, aimKick: 0, redKick: 0, goals: 0, rounds: 0 };
  const keys = {};
  const game = { turn: hashSoccer ? (+hashSoccer[1] || 2) : 1, rounds: 0, phase: 'point', until: performance.now() + 2600, you: 0, cpu: 0, rally: 0, best: 0 };
  const ball = { x: 0, y: .3, z: TB.L, vx: 0, vy: 0, vz: 0, dir: 'in', bounced: false, trail: [] };
  const hudMsg = document.getElementById('hudMsg');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrapAng = a => Math.atan2(Math.sin(a), Math.cos(a));
  let msgTimer = 0;

  function project(x, y, z) {
    if (cam.yaw) { const ox = x - cam.px, oz = z - cam.pz, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); x = cam.px + ox * cy - oz * sy; z = cam.pz + ox * sy + oz * cy; }
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    const d = dz * cam.c - dy * cam.s;
    if (d < .08) return null;
    const F = height * 1.05;
    return { x: width / 2 + dx / d * F, y: height * .5 - (dz * cam.s + dy * cam.c) / d * F, s: F / d };
  }
  function say(text, ms = 0) {
    hudMsg.textContent = text; hudMsg.classList.add('show');
    clearTimeout(msgTimer);
    if (ms) msgTimer = setTimeout(() => hudMsg.classList.remove('show'), ms);
  }
  function updateHud() {
    document.getElementById('scoreYou').textContent = game.you;
    document.getElementById('scoreCpu').textContent = game.cpu;
    document.getElementById('hudRally').textContent = game.rally > 1 ? `RALLY ${game.rally}  ·  RECORDE ${Math.max(game.best, game.rally)}` : (game.best ? `RECORDE ${game.best}` : '');
  }
  // lança a bola para pousar em (tx, 0, tz) depois de T segundos
  function launch(tx, tz, T) {
    ball.vx = (tx - ball.x) / T; ball.vz = (tz - ball.z) / T; ball.vy = (.5 * TB.G * T * T - ball.y) / T;
  }
  function serve() {
    if (mode === 'soccer') return kickoff();
    Object.assign(ball, { x: rand(-.4, .4), y: .28, z: TB.L + .1, dir: 'in', bounced: false, trail: [] });
    launch(rand(-.55, .55), rand(.35, 1), .95);
    game.phase = 'rally'; game.rally = 0; updateHud();
    if (!game.best && !game.you && !game.cpu) say('Segure o mouse e arraste: o retângulo é a sua raquete', 5000); else hudMsg.classList.remove('show');
  }
  function scorePoint(who, why) {
    if (who === 'you') game.you++; else if (who === 'cpu') game.cpu++;
    if (mode !== 'roulette' && (game.you >= ROUL.WIN_SCORE || game.cpu >= ROUL.WIN_SCORE)) { updateHud(); return startRoulette(game.you >= ROUL.WIN_SCORE ? 'you' : 'cpu'); }   // 50 pontos: o jogo muda TUDO
    game.best = Math.max(game.best, game.rally);
    say(`${who === 'you' ? 'PONTO SEU' : who === 'cpu' ? 'PONTO DO NEXUS' : 'SEM PONTO'}  ·  ${why}`);
    game.phase = 'point'; game.until = performance.now() + 1700;
    const wasAer = isTP() && !is3P(), wasTP = is3P();
    game.rounds++; if (mode === 'soccer') skill.rounds++; if (wasAer) skill.spin++; if (wasTP) skill.tp++;
    if (game.rounds >= 10) {                         // 10 rodadas: alterna ping-pong <-> futebol
      game.rounds = 0; game.turn++; game.until = performance.now() + 3600; flash();
      if (mode === 'pong') { mode = 'soccer'; say(game.turn >= TURN_3P ? '10 RODADAS  ·  FUTEBOL 3D  ·  3ª PESSOA: o mouse controla a visão' : game.turn >= 4 ? '10 RODADAS  ·  FUTEBOL 3D  ·  VISÃO AÉREA: o campo gira' : '10 RODADAS  ·  FUTEBOL 3D'); }
      else { mode = 'pong'; Object.assign(cam, { x: 0, y: .8, z: -1.55, c: Math.cos(.33), s: Math.sin(.33), yaw: 0 }); say(game.turn >= 3 ? '10 RODADAS  ·  VOLTA PRO PING-PONG  ·  A CASA VAI OSCILAR' : '10 RODADAS  ·  VOLTA PRO PING-PONG'); }
    }
    updateHud();
  }
  const noPoint = why => scorePoint(null, why);
  function tryHit(time) {
    const r = paddle.rect;
    if (!r || !((selecting && selecting.moved) || time < paddle.until)) return;
    const p = project(ball.x, ball.y, ball.z);
    if (!p) return;
    const m = p.s * TB.R * .7;
    if (p.x < r.l - m || p.x > r.r + m || p.y < r.t - m || p.y > r.b + m) return;
    const nx = clamp((p.x - (r.l + r.r) / 2) / Math.max(30, (r.r - r.l) / 2), -1, 1);
    const ny = clamp((p.y - (r.t + r.b) / 2) / Math.max(30, (r.b - r.t) / 2), -1, 1);
    const power = clamp(Math.hypot(paddle.vx, paddle.vy) / 2500, 0, 1);   // quanto mais rápido você arrasta, mais forte
    const tx = clamp(ball.x * .4 + nx * .45 + clamp(paddle.vx / 2500, -1, 1) * .35, -TB.W / 2 + .1, TB.W / 2 - .1);
    const tz = TB.NET + .3 + (TB.L - TB.NET - .6) * clamp(.4 + .45 * power - .25 * ny, 0, 1);
    ball.z = TB.HITZ + .01; ball.dir = 'out'; ball.bounced = false;
    launch(tx, tz, clamp(.98 - power * .3, .68, .98));
    game.rally++; updateHud(); hudMsg.classList.remove('show');
    skill.hit++; if (power > .5) skill.power++; if (Math.abs(nx) > .5) skill.aim++; if (red.on) skill.redHit++;
    addPulse(p.x, p.y, palettes[state.palette].b, 700);
    state.scrollImpulse += 5;
  }
  function opponentReturn() {
    game.rally++;
    ball.dir = 'in'; ball.bounced = false;
    launch(rand(-.55, .55), rand(.3, 1.1), Math.max(.66, .98 - game.rally * .02));
    updateHud();
  }
  function updateGame(dt, time) {
    if (mode === 'menu') return;
    if (mode === 'roulette') return updateRoulette(dt);
    updateRed(time); updateTips(time);
    if (game.phase === 'point') { if (mode === 'soccer') placeCam(dt); if (time > game.until) serve(); return; }
    if (mode === 'soccer') return updateSoccer(dt, time);
    const pz = ball.z;
    ball.vy -= TB.G * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
    { const rm = pongRoom(); if (wallBounce(ball, rm.hx, 0, TB.R)) skill.box++; }   // sem teto: só as paredes laterais
    const pr = project(ball.x, ball.y, ball.z);
    if (pr) { ball.trail.push({ x: pr.x, y: pr.y, s: pr.s }); if (ball.trail.length > 9) ball.trail.shift(); }

    if (ball.y <= 0 && ball.vy < 0) {
      if (Math.abs(ball.x) <= TB.W / 2 && ball.z >= 0 && ball.z <= TB.L) {
        ball.y = 0; ball.vy *= -.86;
        if (ball.dir === 'out' && !ball.bounced && ball.z < TB.NET) return scorePoint('cpu', 'a bola quicou do seu lado');
        ball.bounced = true;
      } else if (ball.y < -.4) {
        return scorePoint('cpu', ball.dir === 'out' ? 'bola fora da mesa' : 'você errou a bola');
      }
    }
    if (ball.dir === 'out') {
      if (pz < TB.NET && ball.z >= TB.NET && ball.y < TB.NETH && Math.abs(ball.x) < TB.W / 2 + .1) return scorePoint('cpu', 'na rede');
      if (ball.z > TB.L + .25) {
        if (!ball.bounced) return scorePoint('cpu', 'bola longa');
        if (Math.random() < Math.max(.3, .9 - game.rally * .035)) opponentReturn();
        else return scorePoint('you', 'o NEXUS errou');
      }
    } else {
      if (pz > TB.HITZ && ball.z <= TB.HITZ) tryHit(time);
      if (ball.dir === 'in' && ball.z < -.9) return scorePoint('cpu', 'você errou a bola');
    }
  }
  function drawGame() {
    if (mode === 'menu') return;
    if (mode === 'roulette') return drawRoulette();
    if (mode === 'soccer') return drawSoccer();
    const pal = palettes[state.palette];
    const hw = TB.W / 2;
    const poly = (pts, fill, stroke, lw = 1) => {
      const q = pts.map(p => project(...p));
      ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
    };
    const line = (a, b, stroke) => {
      const p = project(...a), q = project(...b);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
    };
    ctx.save();
    { const rm = pongRoom(); drawRoom(rm.hx, -2.2, TB.L + 1, rm.top, pal, false); }   // a casa: cerca a mesa, você e a bola
    ctx.shadowBlur = 16; ctx.shadowColor = rgba(pal.b, .45);
    poly([[-hw, 0, 0], [hw, 0, 0], [hw, 0, TB.L], [-hw, 0, TB.L]], rgba(pal.a, .17), rgba(pal.b, .75), 1.5);
    ctx.shadowBlur = 0;
    poly([[-hw, 0, 0], [hw, 0, 0], [hw, 0, TB.NET], [-hw, 0, TB.NET]], rgba(pal.b, .06));
    poly([[-hw, 0, 0], [hw, 0, 0], [hw, -.07, 0], [-hw, -.07, 0]], rgba(pal.a, .3), rgba(pal.b, .35));
    line([0, 0, 0], [0, 0, TB.L], rgba(pal.b, .28));
    line([-hw, 0, TB.NET], [hw, 0, TB.NET], rgba(pal.b, .18));

    const live = game.phase === 'rally';
    const drawBall = () => {
      if (!live) return;
      const shadow = project(ball.x, 0, ball.z);
      if (shadow && Math.abs(ball.x) <= hw && ball.z >= 0 && ball.z <= TB.L) {
        ctx.fillStyle = rgba(pal.b, .22);
        ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, shadow.s * TB.R * 1.3, shadow.s * TB.R * .45, 0, 0, Math.PI * 2); ctx.fill();
      }
      ball.trail.forEach((p, i) => {
        ctx.fillStyle = rgba(pal.b, (i / ball.trail.length) * .22);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.s * TB.R * (i / ball.trail.length)), 0, Math.PI * 2); ctx.fill();
      });
      const p = project(ball.x, ball.y, ball.z);
      if (!p) return;
      const r = Math.max(2.5, p.s * TB.R);
      const g = ctx.createRadialGradient(p.x - r * .3, p.y - r * .3, r * .1, p.x, p.y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.5, rgba(pal.b, 1)); g.addColorStop(1, rgba(pal.a, 1));
      ctx.shadowBlur = 20; ctx.shadowColor = rgba(pal.b, .9);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    };
    const drawNet = () => {
      const x0 = hw + .08;
      poly([[-x0, 0, TB.NET], [x0, 0, TB.NET], [x0, TB.NETH, TB.NET], [-x0, TB.NETH, TB.NET]], rgba(pal.c, .13), rgba(pal.c, .65));
      for (let i = -7; i <= 7; i++) line([i * x0 / 7, 0, TB.NET], [i * x0 / 7, TB.NETH, TB.NET], rgba(pal.c, .2));
    };
    [[TB.NET, drawNet], [ball.z, drawBall]].sort((u, v) => v[0] - u[0]).forEach(e => e[1]());
    ctx.restore();
  }

  // ================= MODO VERMELHO (controles invertidos) =================
  const red = { on: false, next: performance.now() + 16000, until: 0 };
  function setRed(on) {
    red.on = on; root.classList.toggle('red-mode', on);
    if (selecting) { selecting = null; paddle.rect = null; marquee.classList.remove('visible', 'settling'); }
    if (on) { tipCur = null; tipNext = 0; tipsEl.classList.remove('show'); }
    say(on ? (mode === 'pong' ? '⚠ MODO VERMELHO  ·  raquete = botão DIREITO' : '⚠ MODO VERMELHO  ·  SETAS movem, Z chuta') : 'Controles normais', 3000);
    flash();
  }
  // A CASA: o quadrado agora cerca o jogo inteiro (você, a mesa/campo e a bola ficam dentro). A bola quica nas paredes.
  function wallBounce(b, hx, top, R) {
    let hit = false;
    if (b.x > hx - R) { b.x = hx - R; b.vx = -Math.abs(b.vx) * .9; hit = true; }
    else if (b.x < -hx + R) { b.x = -hx + R; b.vx = Math.abs(b.vx) * .9; hit = true; }
    if (top && b.y > top - R) { b.y = top - R; b.vy = -Math.abs(b.vy) * .8; hit = true; }
    return hit;
  }
  function drawRoom(hx, z0, z1, h, pal, ceil) {
    const quad = (pts, fill, stroke) => {
      const q = pts.map(v => project(...v)); if (q.some(v => !v)) return;
      ctx.beginPath(); q.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
    };
    const n = Math.max(1, Math.round((z1 - z0) / .5)), dz = (z1 - z0) / n;
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = rgba(pal.c, .6);
    for (let i = 0; i < n; i++) {
      const za = z0 + i * dz, zb = za + dz;
      for (const s of [-1, 1]) quad([[s * hx, 0, za], [s * hx, 0, zb], [s * hx, h, zb], [s * hx, h, za]], null, rgba(pal.c, .5));
      if (ceil) quad([[-hx, h, za], [hx, h, za], [hx, h, zb], [-hx, h, zb]], null, rgba(pal.c, .35));
    }
    ctx.restore();
  }
  // A casa só oscila a partir do 3º turno (ping-pong 2, depois do futebol 1).
  // Quando oscila, fecha até ficar apertada (mais estreita que a mesa e baixa) e atrapalha o jogo.
  function pongRoom() {
    const osc = game.turn >= 3;                       // casa oscila a partir do 3º turno (2º ping-pong)
    const t = osc ? .5 + .5 * Math.sin(performance.now() * .0022) : 1;
    return { hx: .34 + (TB.W / 2 + .4 - .34) * t, top: 1.6 };   // top = só a altura visual das paredes (a casa não tem teto)
  }

  function updateRed(time) {
    if (!red.on && time > red.next) { setRed(true); red.until = time + rand(7000, 10000); }
    else if (red.on && time > red.until) { setRed(false); red.next = time + rand(12000, 22000); }
  }

  // ================= DICAS (somem quando você já aprendeu) =================
  const tipsEl = document.getElementById('tips'), tipText = document.getElementById('tipText');
  const TIPS = [
    { m: 'pong', t: 'Segure o botão ESQUERDO e arraste: o retângulo vira a sua raquete. Cubra a bola quando ela chegar perto.', ok: () => skill.hit >= 2 },
    { m: 'pong', t: 'Arraste mais rápido para bater mais forte e mandar a bola mais longe.', ok: () => skill.power >= 2 },
    { m: 'pong', t: 'Acerte a bola com a lateral do retângulo para angular a devolução.', ok: () => skill.aim >= 2 },
    { m: 'pong', t: 'Você joga DENTRO de uma casa: as paredes rebatem a bola. A partir do 3º turno (2º ping-pong) a casa fecha e abre, apertando o jogo: observe antes de mirar.', ok: () => skill.box >= 2 },
    { m: 'pong', red: 1, t: 'TELA VERMELHA: controles invertidos! Agora a raquete é o botão DIREITO.', ok: () => skill.redHit >= 2 },
    { m: 'soccer', t: 'W A S D movem o jogador e ESPAÇO chuta. Corra empurrando a bola e chute quando estiver colado nela.', ok: () => skill.kick >= 2 },
    { m: 'soccer', t: 'Segure A ou D ao chutar para mirar nos cantos: o goleiro cobre o meio do gol.', ok: () => skill.aimKick >= 2 },
    { m: 'soccer', t: 'O campo fica dentro de uma casa: a bola quica nas paredes laterais. Use o rebote para fugir do goleiro.', ok: () => skill.box >= 2 },
    { m: 'soccer', t: 'O ajudante do NEXUS corre atrás da bola e chuta no seu gol (o rosa): encoste na bola para bloquear.', ok: () => skill.blocks >= 1 },
    { m: 'soccer', spin: 1, t: 'VISÃO AÉREA: o CAMPO GIRA! Os controles seguem a TELA: W sempre sobe na tela, D vai para a direita.', ok: () => skill.spin >= 2 },
    { m: 'soccer', tp: 1, t: 'Agora é 3ª PESSOA: mexa o mouse para olhar (direita, esquerda, cima, baixo). W A S D andam para onde você olha e o chute vai na direção da visão.', ok: () => skill.tp >= 2 },
    { m: 'soccer', red: 1, t: 'TELA VERMELHA: use as SETAS para mover e Z para chutar.', ok: () => skill.redKick >= 2 }
  ];
  let tipCur = null, tipEnd = 0, tipNext = performance.now() + 4500;
  function updateTips(time) {
    if (tipCur) {
      if (tipCur.ok() || time > tipEnd || tipCur.m !== mode || (tipCur.red && !red.on)) { tipsEl.classList.remove('show'); tipCur = null; tipNext = time + 2500; }
      return;
    }
    if (time < tipNext) return;
    const t = TIPS.find(t => t.m === mode && !t.ok() && (!t.red || red.on) && (!t.spin || (isTP() && !is3P())) && (!t.tp || is3P()));
    if (t) { tipCur = t; tipText.textContent = t.t; tipsEl.classList.add('show'); tipEnd = time + 8000; }
  }

  // ================= FUTEBOL 3D ULTRA DIFÍCIL =================
  const SC = { L: 7, HW: 2, GW: 1.1, PGW: .8, GH: .6, TIME: 22 };   // GW = gol do NEXUS, PGW = gol do player (menor)
  const sc = { visits: hashSoccer ? (+hashSoccer[1] || 1) : 0, yaw: 0, pitch: .42, stun: 0, atk: false, t: 0, left: -1, pl: { x: 0, z: .5, vx: 0, vz: 0 }, b: { x: 0, y: .07, z: 1.1, vx: 0, vy: 0, vz: 0 }, gk: { x: 0 }, defs: [] };
  function kickoff() {
    Object.assign(sc.pl, { x: 0, z: .5, vx: 0, vz: 0 });
    Object.assign(sc.b, { x: 0, y: .07, z: 1.1, vx: 0, vy: 0, vz: 0 });
    sc.gk.x = 0; sc.t = 0; sc.left = -1; sc.atk = false; sc.stun = 0;
    sc.defs = [[-.8, 4.4]].map(([x, z]) => ({ x, z, face: Math.PI, mem: 0, pause: 0, wx: null, wz: 0, lx: 0, lz: 0 }));
    game.phase = 'rally'; game.rally = 0; hudMsg.classList.remove('show');
  }
  function kick() {
    if (mode !== 'soccer' || game.phase !== 'rally' || sc.atk) return;
    const b = sc.b, p = sc.pl;
    if (Math.hypot(b.x - p.x, b.z - p.z) > .42 || b.y > .3) return;
    const aim = (keys[red.on ? 'ArrowRight' : 'KeyD'] ? 1 : 0) - (keys[red.on ? 'ArrowLeft' : 'KeyA'] ? 1 : 0);
    let kx = aim * 1.7, kz = 6.4;
    if (isTP()) { const c = Math.cos(sc.yaw), s = Math.sin(sc.yaw); [kx, kz] = [kx * c + kz * s, -kx * s + kz * c]; }   // chute relativo à tela
    b.vx = kx; b.vz = kz; b.vy = .8;
    sc.gk.err = rand(-.4, .4);                          // o goleiro erra a leitura do chute
    skill.kick++; if (aim) skill.aimKick++; if (red.on) skill.redKick++;
    addPulse(project(b.x, b.y, b.z)?.x ?? width / 2, project(b.x, b.y, b.z)?.y ?? height / 2, palettes[state.palette].b, 600);
  }
  window.addEventListener('keydown', e => {
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    if (mode === 'menu') { if ((e.code === 'Enter' || e.code === 'Space') && document.activeElement !== document.getElementById('btnQuit')) startFromMenu(); return; }
    if (mode === 'roulette') { rouletteInput(e.code); return; }
    keys[e.code] = true;
    if (e.code === (red.on ? 'KeyZ' : 'Space')) kick();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function updateSoccer(dt) {
    const p = sc.pl, b = sc.b, R = red.on, spin = isTP(), a = spin ? sc.yaw : 0;
    sc.t += dt; sc.stun = Math.max(0, sc.stun - dt);
    const respawn = why => {                              // bola fora: cai do limbo e renasce no meio
      Object.assign(b, { x: 0, y: 6, z: SC.L / 2, vx: 0, vy: 0, vz: 0 }); sc.atk = false;
      say(why, 1600); placeCam(dt);
    };
    sc.nc = Math.max(0, (sc.nc || 0) - dt);
    if (sc.left !== 0) { sc.left = 0; document.getElementById('hudRally').textContent = `FUTEBOL${spin ? (is3P() ? '  ·  3ª PESSOA' : '  ·  GIRATÓRIO') : ''}`; }
    // jogador (na fase giratória o controle segue a tela)
    let ix = (keys[R ? 'ArrowRight' : 'KeyD'] ? 1 : 0) - (keys[R ? 'ArrowLeft' : 'KeyA'] ? 1 : 0);
    let iz = (keys[R ? 'ArrowUp' : 'KeyW'] ? 1 : 0) - (keys[R ? 'ArrowDown' : 'KeyS'] ? 1 : 0);
    const n = Math.hypot(ix, iz) || 1, spd = sc.stun > 0 ? .5 : 1.55;
    ix /= n; iz /= n;
    const mx = ix * Math.cos(a) + iz * Math.sin(a), mz = -ix * Math.sin(a) + iz * Math.cos(a);
    p.vx += (mx * spd - p.vx) * Math.min(1, dt * 9); p.vz += (mz * spd - p.vz) * Math.min(1, dt * 9);
    p.x = clamp(p.x + p.vx * dt, -SC.HW + .1, SC.HW - .1); p.z = clamp(p.z + p.vz * dt, 0, SC.L - .3);
    // bola
    b.vy -= 9 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y <= .07) { b.y = .07; b.vy = Math.abs(b.vy) > 1 ? -b.vy * .4 : 0; if (!sc.atk) { const f = Math.pow(.4, dt); b.vx *= f; b.vz *= f; } }
    if (wallBounce(b, SC.HW + .1, 0, .07)) skill.box++;
    const near = Math.hypot(b.x - p.x, b.z - p.z);
    if (sc.atk) {                                       // NEXUS atacando: você defende encostando na bola
      if (near < .27) {                                  // bloqueio: só rebate a bola pra longe, o jogo não para
        skill.blocks++; sc.atk = false; sc.nc = .4;
        b.vz = 4.5; b.vx = (b.x - p.x) * 6; b.vy = .3;
        say('Bloqueou!', 900);
      } else if (b.z <= .05 && Math.abs(b.x) < SC.PGW) return scorePoint('cpu', 'o NEXUS marcou');
    } else {
      if (near < .2 && b.y < .2 && !sc.nc) { b.vx = p.vx * 1.25 + (b.x - p.x) * 3; b.vz = p.vz * 1.25 + (b.z - p.z) * 3; }   // conduzir
      for (const d of sc.defs) {                        // o ajudante NÃO sabe onde a bola está: ele precisa ENCONTRAR
        const dx = b.x - d.x, dz = b.z - d.z, dd = Math.hypot(dx, dz) || 1;
        const sees = b.y < 1.2 && (dd < .8 || (dd < 2.6 && Math.abs(wrapAng(Math.atan2(dx, dz) - d.face)) < .95));   // cone de visão à frente + visão curta ao redor
        if (sees) { d.mem = 2.2; d.lx = b.x; d.lz = b.z; } else d.mem = Math.max(0, d.mem - dt);
        let tx = null, tz = null, spd = 0;
        if (sees) { tx = b.x; tz = b.z; spd = 1.1; }                                  // viu: corre na bola
        else if (d.mem > 0) {                                                          // perdeu de vista: vai até onde viu por último
          tx = d.lx; tz = d.lz; spd = 1;
          if (Math.hypot(tx - d.x, tz - d.z) < .25) { d.mem = 0; d.pause = .9; }
        }
        else if (d.pause > 0) { d.pause -= dt; d.face += dt * 2.8; }                    // parado, girando a cabeça para procurar
        else {                                                                         // procurando: patrulha o campo
          if (d.wx === null) { d.wx = rand(-SC.HW + .4, SC.HW - .4); d.wz = rand(1.2, SC.L - 1.4); }
          tx = d.wx; tz = d.wz; spd = .85;
          if (Math.hypot(tx - d.x, tz - d.z) < .25) { d.wx = null; d.pause = .9; }
        }
        if (tx !== null) {
          const mx = tx - d.x, mz = tz - d.z, md = Math.hypot(mx, mz);
          if (md > .05) { d.x += mx / md * spd * dt; d.z += mz / md * spd * dt; d.face = Math.atan2(mx, mz); }
        }
        if (dd < .2 && b.y < .3) {                      // achou e está em cima da bola: chuta no seu gol
          sc.atk = true;
          const kx = rand(-SC.PGW + .15, SC.PGW - .15);
          b.vz = -4.5; b.vy = 0; b.vx = clamp((kx - b.x) / (Math.max(b.z, .8) / 4.5), -4, 4);
          say('O NEXUS CHUTOU! Bloqueie a bola', 1500); break;
        }
      }
      // goleiro: prevê o chute, mas não é perfeito
      let target = clamp(b.x * .6, -.8, .8), gs = .5;
      if (b.vz > 1 && b.z > 2) { target = clamp(b.x + b.vx * (SC.L - b.z) / b.vz + (sc.gk.err || 0), -1, 1); gs = .95; }
      sc.gk.x += clamp(target - sc.gk.x, -gs * dt, gs * dt);
      if (b.vz > 0 && b.z > SC.L - .2 && Math.abs(b.x - sc.gk.x) < .2 && b.y < .5) {   // defesa: o goleiro só lança pro companheiro
        const d = sc.defs[0] || { x: 0, z: SC.L / 2 }, T = 1;
        b.x = sc.gk.x; b.z = SC.L - .35; b.y = .3;
        b.vx = (d.x - b.x) / T; b.vz = (d.z - b.z) / T; b.vy = (4.5 * T * T - .23) / T;
        say('DEFESA! O goleiro lança pro companheiro', 1500);
      }
      if (b.z >= SC.L) {
        if (Math.abs(b.x) < SC.GW && b.y < SC.GH) { skill.goals++; return scorePoint('you', 'GOOOL!'); }
        return respawn('BOLA FORA  ·  ela cai do limbo no meio');
      }
    }
    if (b.z < -.2) return respawn('BOLA FORA  ·  ela cai do limbo no meio');
    placeCam(dt);
  }
  function placeCam(dt) {
    const p = sc.pl;
    if (is3P()) {                                       // 3ª pessoa: o mouse controla a visão (direita/esquerda = gira, cima/baixo = inclina)
      const tx = (clamp(mouse.x / width, 0, 1) - .5) * 2.8, ty = (.5 - clamp(mouse.y / height, 0, 1)) * 2, k = Math.min(1, dt * 7);
      sc.yaw += (tx - sc.yaw) * k;
      sc.pitch += (clamp(.42 - ty * .55, -.15, 1) - sc.pitch) * k;
      Object.assign(cam, { x: p.x, y: 1.25, z: p.z - 1.7, c: Math.cos(sc.pitch), s: Math.sin(sc.pitch), yaw: sc.yaw, px: p.x, pz: p.z });
    }
    else if (isTP()) { sc.yaw += dt * .55; Object.assign(cam, { x: p.x, y: 5.5, z: p.z - 1.6, c: Math.cos(1), s: Math.sin(1), yaw: sc.yaw, px: p.x, pz: p.z }); }   // visão aérea giratória
    else Object.assign(cam, { x: p.x * .6, y: 1.7, z: p.z - 2.6, c: Math.cos(.5), s: Math.sin(.5), yaw: 0 });
  }
  function drawSoccer() {
    const pal = palettes[state.palette], { L, HW, GW, GH } = SC, p = sc.pl, b = sc.b;
    const poly = (pts, fill, stroke, lw = 1) => {
      const q = pts.map(v => project(...v)); if (q.some(v => !v)) return; ctx.beginPath(); q.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
    };
    const seg = (a, c, stroke, lw = 1) => { const u = project(...a), v = project(...c); if (!u || !v) return; ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(v.x, v.y); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); };
    ctx.save();
    drawRoom(HW + .1, -3.2, L + .5, 2.4, pal, false);   // a casa em volta do campo
    ctx.shadowBlur = 14; ctx.shadowColor = rgba(pal.b, .4);
    poly([[-HW, 0, 0], [HW, 0, 0], [HW, 0, L], [-HW, 0, L]], rgba(pal.a, .16), rgba(pal.b, .7), 1.5);
    ctx.shadowBlur = 0;
    seg([-HW, 0, L / 2], [HW, 0, L / 2], rgba(pal.b, .25));
    poly([[-1.3, 0, L - 1.3], [1.3, 0, L - 1.3], [1.3, 0, L], [-1.3, 0, L]], null, rgba(pal.b, .3));
    poly([[-GW, 0, L], [GW, 0, L], [GW, GH, L], [-GW, GH, L]], rgba(pal.c, .12), rgba(pal.c, .9), 2);
    poly([[-SC.PGW, 0, 0], [SC.PGW, 0, 0], [SC.PGW, GH, 0], [-SC.PGW, GH, 0]], 'rgba(255, 111, 156, .12)', 'rgba(255, 111, 156, .9)', 2);   // gol do player
    const py = (x, z) => project(x, 0, z)?.y ?? 0;
    const ents = [
      { z: py(sc.gk.x, L - .1), f: () => person(sc.gk.x, L - .1, rgba(pal.c, 1), .55, 2.2) },
      ...sc.defs.map(d => ({ z: py(d.x, d.z), f: () => person(d.x, d.z, '#ff6f9c', .4, 1) })),
      { z: py(p.x, p.z), f: () => person(p.x, p.z, '#eaffff', .4, 1) },
      { z: py(b.x, b.z), f: () => ball3() }
    ].sort((u, v) => u.z - v.z);
    function person(x, z, color, h, w) {
      const a = project(x, 0, z), c = project(x, h, z); if (!a || !c) return;
      const lw = a.s * .17 * w;
      ctx.fillStyle = rgba(pal.b, .2); ctx.beginPath(); ctx.ellipse(a.x, a.y, lw, lw * .35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.shadowBlur = 12; ctx.shadowColor = color;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.shadowBlur = 0;
    }
    function ball3() {
      const g = project(b.x, 0, b.z), q = project(b.x, b.y, b.z); if (!g || !q) return;
      ctx.fillStyle = rgba(pal.b, .25); ctx.beginPath(); ctx.ellipse(g.x, g.y, q.s * .08, q.s * .03, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 16; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2.5, q.s * .07), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    ents.forEach(e => e.f());
    ctx.restore();
  }


  // ================= ROLETA RUSSA (quem chega a 50 pontos primeiro muda o jogo todo) =================
  // Estilo Buckshot Roulette: uma espingarda com balas VIVAS e FALSAS embaralhadas. Na sua vez, você atira em SI ou no OPONENTE.
  //   FALSA em si mesmo = você joga de novo | VIVA em si mesmo = leva o tiro e passa a vez | em qualquer outro caso a vez passa.
  // Quem chegou a 50 primeiro começa atirando e JÁ SABE qual é a 1ª bala (só ele sabe).
  // HIT_WINS: false = quem LEVAR 3 tiros PERDE (Buckshot clássico: o adversário é quem precisa acertar). true = quem levar 3 tiros VENCE.
  const ROUL = { WIN_SCORE: 50, HITS: 3, HIT_WINS: false };
  const rr = { on: false, leader: 'you', turn: 'you', hits: { you: 0, cpu: 0 }, shells: [], idx: 0, live: 0, blank: 0, firstLoad: true, phase: 'pick', t: 0, clock: 0, msg: '', sub: '', last: null, resolved: false, winner: null, think: 0, btn: null, nextTurn: 'you' };
  const other = w => (w === 'you' ? 'cpu' : 'you');
  const fc = (h, sat, l, a = 1) => `hsla(${(h - 140 + 720) % 360}, ${sat}%, ${l}%, ${a})`;   // cor "como será vista" (a tela vermelha gira o matiz em 140°)
  function loadShells(first) {
    const total = 2 + Math.floor(Math.random() * 7), live = 1 + Math.floor(Math.random() * (total - 1));
    rr.shells = Array.from({ length: total }, (_, i) => (i < live ? 'live' : 'blank'));
    for (let i = total - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rr.shells[i], rr.shells[j]] = [rr.shells[j], rr.shells[i]]; }
    rr.idx = 0; rr.live = live; rr.blank = total - live;
    rr.msg = `CARGA ${first ? 'INICIAL' : 'NOVA'}: ${live} VIVA${live > 1 ? 'S' : ''} · ${total - live} FALSA${total - live > 1 ? 'S' : ''}`;
  }
  function startRoulette(leader) {
    Object.assign(rr, { on: true, leader, turn: leader, hits: { you: 0, cpu: 0 }, firstLoad: true, phase: 'countdown', count: 10, t: 0, last: null, resolved: false, winner: null, think: rand(1.4, 2) });
    loadShells(true);
    rr.sub = leader === 'you' ? 'VOCÊ chegou a 50 primeiro: já sabe a 1ª bala e começa atirando' : 'O NEXUS chegou a 50 primeiro: ele já sabe a 1ª bala e começa atirando';
    mode = 'roulette'; selecting = null; paddle.rect = null; marquee.classList.remove('visible', 'settling');
    root.classList.add('red-mode'); body.classList.add('roulette-mode');
    tipsEl.classList.remove('show'); tipCur = null; hudMsg.classList.remove('show'); flash();
  }
  function resetToStart() {
    rr.on = false; game.you = 0; game.cpu = 0; game.rounds = 0; game.turn = 1; game.rally = 0; game.best = 0;
    mode = 'pong'; root.classList.toggle('red-mode', red.on); body.classList.remove('roulette-mode');
    Object.assign(cam, { x: 0, y: .8, z: -1.55, c: Math.cos(.33), s: Math.sin(.33), yaw: 0 });
    game.phase = 'point'; game.until = performance.now() + 2600; updateHud(); say('Novo jogo… prepare-se', 2500); flash();
  }
  function rouletteFire(target) {                       // target: 'you' ou 'cpu' (quem vai levar o tiro)
    if (rr.phase !== 'pick' || rr.winner) return;
    const shooter = rr.turn, live = rr.shells[rr.idx++] === 'live';
    rr.last = { shooter, target, live, idx: rr.idx - 1 }; rr.phase = 'anim'; rr.t = 0; rr.resolved = false;
    rr.msg = shooter === 'you' ? (target === 'you' ? 'VOCÊ APONTA PRA SI MESMO…' : 'VOCÊ APONTA PRO NEXUS…') : (target === 'cpu' ? 'O NEXUS APONTA PRA SI MESMO…' : 'O NEXUS APONTA PRA VOCÊ…');
    rr.sub = '';
  }
  function cpuChoice() {
    if (ROUL.HIT_WINS) return 'cpu';                    // levar tiro é bom: atira em si mesmo
    const remaining = rr.shells.length - rr.idx, liveLeft = rr.shells.slice(rr.idx).filter(x => x === 'live').length;
    const known = rr.firstLoad && rr.idx === 0 && rr.leader === 'cpu' ? rr.shells[0] : null;   // só o líder sabe a 1ª bala
    const p = known ? (known === 'live' ? 1 : 0) : liveLeft / remaining;
    return p >= .5 ? 'you' : 'cpu';                     // provável viva: atira em você; provável falsa: em si (joga de novo)
  }
  function rouletteInput(code) {
    if (rr.phase === 'over') { if ((code === 'Space' || code === 'Enter') && rr.t > 1.2) resetToStart(); return; }
    if (rr.phase !== 'pick' || rr.turn !== 'you') return;
    if (code === 'Digit1' || code === 'Numpad1') rouletteFire('you');
    else if (code === 'Digit2' || code === 'Numpad2') rouletteFire('cpu');
  }
  window.addEventListener('pointerdown', e => {
    if (mode !== 'roulette' || e.button !== 0) return;
    if (rr.phase === 'over') { if (rr.t > 1.2) resetToStart(); return; }
    if (rr.phase !== 'pick' || rr.turn !== 'you' || !rr.btn) return;
    const hit = r => e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h;
    if (hit(rr.btn.self)) rouletteFire('you'); else if (hit(rr.btn.opp)) rouletteFire('cpu');
  });
  function updateRoulette(dt) {
    rr.clock += dt;
    if (rr.phase === 'countdown') {
      rr.count -= dt;
      if (rr.count <= 0) { rr.phase = 'pick'; rr.think = rand(1.4, 2); flash(); }
    } else if (rr.phase === 'pick') {
      if (rr.turn === 'cpu') { rr.think -= dt; if (rr.think <= 0) rouletteFire(cpuChoice()); }
    } else if (rr.phase === 'anim') {
      rr.t += dt;
      const L = rr.last, tName = L.target === 'you' ? 'VOCÊ' : 'O NEXUS';
      if (!rr.resolved && rr.t >= .6) {
        rr.resolved = true;
        if (L.live) {
          rr.hits[L.target]++; flash(); state.scrollImpulse = 22; addPulse(width / 2, height / 2);
          rr.msg = 'BANG! BALA VIVA'; rr.sub = `${tName === 'VOCÊ' ? 'VOCÊ levou' : 'O NEXUS levou'} um tiro (${rr.hits[L.target]}/${ROUL.HITS})`;
          if (rr.hits[L.target] >= ROUL.HITS) rr.winner = ROUL.HIT_WINS ? L.target : other(L.target);
        } else { rr.msg = 'click… BALA FALSA'; rr.sub = ''; }
        rr.nextTurn = (L.target === L.shooter && !L.live) ? L.shooter : other(L.shooter);
        if (!L.live) rr.sub = L.target === L.shooter ? 'falsa em si mesmo: a vez continua' : 'a vez passa';
        else if (!rr.winner) rr.sub += '  ·  a vez passa';
      }
      if (rr.t >= 1.9) {
        if (rr.winner) {
          rr.phase = 'over'; rr.t = 0; rr.msg = rr.winner === 'you' ? 'VOCÊ VENCEU' : 'O NEXUS VENCEU'; rr.sub = 'clique ou aperte ESPAÇO para recomeçar o jogo';
        } else {
          rr.turn = rr.nextTurn; rr.phase = 'pick'; rr.think = rand(1.1, 1.9);
          if (rr.idx >= rr.shells.length) { rr.firstLoad = false; loadShells(false); rr.sub = 'a espingarda foi recarregada'; }
          else rr.msg = rr.turn === 'you' ? 'SUA VEZ' : 'VEZ DO NEXUS';
        }
      }
    } else rr.t += dt;
  }
  function drawRoulette() {
    const W = width, H = height, cx = W / 2, S = Math.max(.6, Math.min(W / 1000, H / 720)), L = rr.last, anim = rr.phase === 'anim';
    const bang = anim && L && L.live && rr.t > .55;
    const text = (t, x, y, size, color, font = 'Space Grotesk') => { ctx.font = `500 ${size * S}px "${font}", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(t, x, y); };
    ctx.save();
    if (bang && rr.t < .9) ctx.translate((Math.random() - .5) * 12, (Math.random() - .5) * 12);
    ctx.fillStyle = 'rgba(2, 3, 10, .86)'; ctx.fillRect(-20, -20, W + 40, H + 40);
    const pulse = .5 + .5 * Math.sin(rr.clock * 2.2), vg = ctx.createRadialGradient(cx, H * .5, H * .08, cx, H * .5, H * .85);
    vg.addColorStop(0, fc(0, 90, 40, .22 + .08 * pulse)); vg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.shadowBlur = 18; ctx.shadowColor = fc(0, 100, 55, .8);
    text('ROLETA RUSSA', cx, H * .07, 30, fc(0, 95, 62));
    ctx.shadowBlur = 0;
    text(ROUL.HIT_WINS ? 'QUEM LEVAR 3 TIROS VENCE' : 'QUEM LEVAR 3 TIROS PERDE', cx, H * .07 + 30 * S, 12, fc(0, 40, 75), 'DM Mono');
    // os dois jogadores (losangos) e as 3 vidas/tiros
    const who = (id, y, label) => {
      const active = rr.turn === id && rr.phase !== 'over';
      ctx.save(); ctx.translate(cx, y);
      ctx.shadowBlur = active ? 28 : 8; ctx.shadowColor = fc(0, 100, 55, active ? .9 : .4);
      ctx.lineWidth = 2; ctx.strokeStyle = fc(0, 90, active ? 65 : 45, active ? 1 : .6); ctx.fillStyle = fc(0, 80, 20, .55);
      ctx.beginPath(); ctx.moveTo(0, -46 * S); ctx.lineTo(46 * S, 0); ctx.lineTo(0, 46 * S); ctx.lineTo(-46 * S, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      text(label, cx, y, 15, fc(0, 20, 92));
      for (let i = 0; i < ROUL.HITS; i++) {
        const px = cx + (i - 1) * 30 * S, py = y + 66 * S;
        ctx.beginPath(); ctx.arc(px, py, 9 * S, 0, 6.2832);
        if (i < rr.hits[id]) { ctx.fillStyle = fc(0, 100, 55); ctx.shadowBlur = 12; ctx.shadowColor = fc(0, 100, 55); ctx.fill(); ctx.shadowBlur = 0; }
        else { ctx.strokeStyle = fc(0, 60, 55, .7); ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    };
    who('cpu', H * .22, 'NEXUS'); who('you', H * .74, 'VOCÊ');
    // mensagem principal
    text(rr.msg, cx, H * .375, bang ? 34 : 22, bang ? fc(0, 100, 62) : fc(0, 30, 90));
    text(rr.sub, cx, H * .375 + 28 * S, 12, fc(0, 40, 75), 'DM Mono');
    // espingarda no centro
    const tgt = anim && L ? L.target : null, ease = anim ? 1 - Math.pow(1 - Math.min(1, rr.t / .45), 3) : 1;
    const ang = tgt ? (tgt === 'cpu' ? -Math.PI / 2 : Math.PI / 2) * ease : Math.sin(rr.clock * 1.3) * .12;
    const recoil = bang ? 14 * S * Math.max(0, 1 - (rr.t - .6) * 4) : 0;
    ctx.save(); ctx.translate(cx, H * .5); ctx.rotate(ang); ctx.translate(-recoil, 0);
    ctx.fillStyle = fc(0, 8, 60); ctx.fillRect(0, -5 * S, 170 * S, 10 * S);
    ctx.fillStyle = fc(0, 8, 45); ctx.fillRect(14 * S, 6 * S, 100 * S, 7 * S);
    ctx.fillStyle = fc(25, 55, 30);
    ctx.beginPath(); ctx.moveTo(0, -9 * S); ctx.lineTo(-92 * S, -20 * S); ctx.lineTo(-104 * S, 14 * S); ctx.lineTo(0, 9 * S); ctx.closePath(); ctx.fill();
    if (bang && rr.t < .82) {
      ctx.shadowBlur = 40; ctx.shadowColor = fc(45, 100, 65); ctx.fillStyle = fc(45, 100, 72, .95);
      ctx.beginPath(); ctx.arc(176 * S, 0, 34 * S * (1 - (rr.t - .55) * 2.2), 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.restore();
    // câmara: as balas (as já disparadas aparecem reveladas; só o líder vê a 1ª antes de atirar)
    const n = rr.shells.length, sw = 24 * S, gap = 10 * S, totalW = n * sw + (n - 1) * gap, y0 = H * .6;
    const leaderKnows = rr.firstLoad && rr.idx === 0;
    for (let i = 0; i < n; i++) {
      const x = cx - totalW / 2 + i * (sw + gap), shell = rr.shells[i], current = anim && L && i === L.idx && rr.t < .6;
      const revealed = i < rr.idx && !current, known = leaderKnows && rr.leader === 'you' && i === 0;
      const liveCol = fc(0, 100, 52), blankCol = fc(0, 0, 85);
      ctx.globalAlpha = revealed ? .55 : 1;
      ctx.fillStyle = revealed || known ? (shell === 'live' ? liveCol : blankCol) : fc(0, 30, 18);
      ctx.fillRect(x, y0, sw, 40 * S);
      ctx.lineWidth = known ? 2.5 : 1.2; ctx.strokeStyle = known ? fc(45, 100, 65) : fc(0, 50, 42, .8); ctx.strokeRect(x, y0, sw, 40 * S);
      ctx.globalAlpha = 1;
      if (!revealed && !known) text('?', x + sw / 2, y0 + 20 * S, 16, fc(0, 40, 70));
      if (i === rr.idx && rr.phase === 'pick') text('▲', x + sw / 2, y0 + 54 * S, 12, fc(0, 90, 65));
    }
    text(`${rr.live} VIVA${rr.live > 1 ? 'S' : ''} · ${rr.blank} FALSA${rr.blank > 1 ? 'S' : ''} NESTA CARGA`, cx, y0 + 76 * S, 12, fc(0, 40, 75), 'DM Mono');
    if (leaderKnows && rr.phase === 'pick') {
      if (rr.leader === 'you') text(`SÓ VOCÊ SABE: a 1ª bala é ${rr.shells[0] === 'live' ? 'VIVA' : 'FALSA'}`, cx, y0 + 98 * S, 14, fc(45, 100, 65));
      else text('O NEXUS sabe qual é a 1ª bala', cx, y0 + 98 * S, 12, fc(0, 40, 75), 'DM Mono');
    }
    // botões
    const bw = 280 * S, bh = 52 * S, by = H * .905 - bh / 2, canPick = rr.phase === 'pick' && rr.turn === 'you';
    rr.btn = { self: { x: cx - bw - 14 * S, y: by, w: bw, h: bh }, opp: { x: cx + 14 * S, y: by, w: bw, h: bh } };
    [['self', '1 · ATIRAR EM MIM'], ['opp', '2 · ATIRAR NO NEXUS']].forEach(([k, label]) => {
      const r = rr.btn[k], hot = canPick && mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
      ctx.fillStyle = fc(0, 80, hot ? 32 : 16, canPick ? .8 : .35); ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.lineWidth = 1.5; ctx.strokeStyle = fc(0, 90, hot ? 70 : 50, canPick ? .95 : .3); ctx.strokeRect(r.x, r.y, r.w, r.h);
      text(label, r.x + r.w / 2, r.y + r.h / 2, 16, fc(0, 20, 92, canPick ? 1 : .35));
    });
    if (rr.phase === 'pick' && rr.turn === 'cpu') text('O NEXUS está pensando…', cx, by - 16 * S, 12, fc(0, 40, 75), 'DM Mono');
    if (rr.phase === 'over') {
      ctx.fillStyle = 'rgba(0, 0, 0, .6)'; ctx.fillRect(0, 0, W, H);
      ctx.shadowBlur = 30; ctx.shadowColor = rr.winner === 'you' ? fc(130, 90, 55) : fc(0, 100, 55);
      text(rr.msg, cx, H * .45, 64, rr.winner === 'you' ? fc(130, 90, 62) : fc(0, 100, 62));
      ctx.shadowBlur = 0; text(rr.sub, cx, H * .45 + 56 * S, 16, fc(0, 30, 90));
    }
    if (rr.phase === 'countdown') {                     // pausa de 10 s antes de começar
      ctx.fillStyle = 'rgba(0, 0, 0, .66)'; ctx.fillRect(0, 0, W, H);
      const fr = rr.count - Math.floor(rr.count);
      text('A ROLETA RUSSA COMEÇA EM', cx, H * .3, 22, fc(0, 40, 85));
      ctx.shadowBlur = 40; ctx.shadowColor = fc(0, 100, 55);
      text(String(Math.max(1, Math.ceil(rr.count))), cx, H * .5, 150 * (.92 + .08 * fr), fc(0, 100, 62));
      ctx.shadowBlur = 0;
      text(rr.sub, cx, H * .7, 14, fc(0, 40, 80), 'DM Mono');
      text(ROUL.HIT_WINS ? 'quem levar 3 tiros vence' : 'quem levar 3 tiros perde', cx, H * .7 + 26 * S, 12, fc(0, 40, 70), 'DM Mono');
    }
    ctx.restore();
  }
  // atalhos de teste: index.html#roleta (você chegou a 50 primeiro) | index.html#roletacpu (o NEXUS chegou primeiro)
  if (/^#roleta/.test(location.hash)) { const cpuLead = /cpu/i.test(location.hash); game.you = cpuLead ? 12 : 50; game.cpu = cpuLead ? 50 : 12; startRoulette(cpuLead ? 'cpu' : 'you'); }


  // ================= MENU (JOGAR / SAIR) — o botão SAIR foge, é IMPOSSÍVEL sair =================
  const menuEl = document.getElementById('menu'), quitBtn = document.getElementById('btnQuit'), tauntEl = document.getElementById('taunt');
  const TAUNTS = ['Nem tenta.', 'Impossível sair.', 'Quase! …não.', 'Você é teimoso, hein?', 'Sair? Nunca.', 'O botão tem medo de você.', 'Tá achando que é fácil?', 'Aqui ninguém sai.'];
  let dodges = 0, lastDodge = 0;
  function startFromMenu() {
    if (mode !== 'menu') return;
    mode = 'pong'; menuEl.classList.add('hidden'); body.classList.remove('menu-mode');
    const now = performance.now();
    game.phase = 'point'; game.until = now + 2600; red.next = now + 16000; tipNext = now + 4500;
    say('Prepare-se… o NEXUS vai sacar'); flash();
  }
  function dodge(px, py) {                              // voa para o canto mais longe do mouse
    const now = performance.now(); if (now - lastDodge < 220) return; lastDodge = now;
    const r = quitBtn.getBoundingClientRect(), w = r.width, h = r.height, m = 24;
    if (!quitBtn.classList.contains('flying')) { quitBtn.style.left = `${r.left}px`; quitBtn.style.top = `${r.top}px`; quitBtn.classList.add('flying'); void quitBtn.offsetWidth; }
    const cur = [parseFloat(quitBtn.style.left) || 0, parseFloat(quitBtn.style.top) || 0];
    const spots = [[m, m], [width - w - m, m], [m, height - h - m], [width - w - m, height - h - m], [width / 2 - w / 2, m], [width / 2 - w / 2, height - h - m], [m, height / 2 - h / 2], [width - w - m, height / 2 - h / 2]];
    const best = spots.filter(q => Math.hypot(q[0] - cur[0], q[1] - cur[1]) > 40)
      .map(q => ({ q, d: Math.hypot(q[0] + w / 2 - px, q[1] + h / 2 - py) + Math.random() * 250 })).sort((a, b) => b.d - a.d)[0].q;
    quitBtn.style.left = `${best[0]}px`; quitBtn.style.top = `${best[1]}px`;
    tauntEl.textContent = TAUNTS[dodges++ % TAUNTS.length];
  }
  document.getElementById('btnPlay').addEventListener('click', startFromMenu);
  const flee = e => { if (e && e.preventDefault) e.preventDefault(); const r = quitBtn.getBoundingClientRect(); dodge(e && e.clientX !== undefined ? e.clientX : r.left + r.width / 2, e && e.clientY !== undefined ? e.clientY : r.top + r.height / 2); };
  ['pointerenter', 'pointerdown', 'click', 'touchstart', 'focus'].forEach(n => quitBtn.addEventListener(n, flee));
  window.addEventListener('pointermove', e => {          // nem chegar perto: ele foge antes do mouse alcançar
    if (mode !== 'menu') return;
    const r = quitBtn.getBoundingClientRect(), dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) < 70) dodge(e.clientX, e.clientY);
  }, { passive: true });
  if (mode !== 'menu') { menuEl.classList.add('hidden'); body.classList.remove('menu-mode'); }

  resize();
  if (reducedMotion) {
    document.querySelector('.cursor-glow').style.opacity = '.25';
    state.scrollImpulse = 0;
  }
  requestAnimationFrame(animate);
})();
