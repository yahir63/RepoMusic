/* ============================================================
   script.js — Regalo Digital Romántico
   ============================================================ */

'use strict';

const STOP_TIME = 122;
const FADE_DURATION = 2500;

const lyrics = [
  { time:  0.0,  text: "♪  ♪  ♪",                                          color: "#fcd34d" },

  { time: 22.0,  text: "Nos quedamos solos",                                color: "#f472b6" },
  { time: 29.2,  text: "Como cada noche",                                   color: "#f472b6" },
  { time: 36.0,  text: "Hoy te siento triste",                              color: "#ec4899" },
  { time: 40.0,  text: "Y sé muy bien por qué",                             color: "#ec4899" },

  { time: 48.0,  text: "Tú querrás decirme",                                color: "#d946ef" },
  { time: 55.5,  text: "He cambiado mucho",                                 color: "#d946ef" },
  { time: 62.0,  text: "El amor se acaba",                                  color: "#f472b6" },
  { time: 66.0,  text: "Y quiero terminar",                                 color: "#f472b6" },

  { time: 73.0,  text: "Yo que ni un momento puedo estar lejos de ti",      color: "#ec4899" },
  { time: 78.5,  text: "Cómo soportar la vida entera ya sin ti",            color: "#ec4899" },
  { time: 85.5,  text: "Te quiero, te quiero, te juro que yo",              color: "#d946ef" },
  { time: 92.5,  text: "No puedo vivir sin tu amor",                        color: "#d946ef" },

  { time: 100.0, text: "Ven aquí, abrázame",                                color: "#fcd34d" },
  { time: 106.5, text: "Yo te amo tanto",                                   color: "#fcd34d" },
  { time: 113.0, text: "Y te pido por favor",                               color: "#f472b6" },
  { time: 117.5, text: "Que creas más en mí",                               color: "#ec4899" },
];

/* ============================================================
   REFERENCIAS AL DOM
   ============================================================ */
const introScreen  = document.getElementById('intro-screen');
const mainScreen   = document.getElementById('main-screen');
const audioPlayer  = document.getElementById('audio-player');
const lyricPrev    = document.getElementById('lyric-prev');
const lyricCurrent = document.getElementById('lyric-current');
const lyricNext    = document.getElementById('lyric-next');
const progressBar  = document.getElementById('progress-bar');
const timeElapsed  = document.getElementById('time-elapsed');
const timeTotal    = document.getElementById('time-total');
const heartsCanvas = document.getElementById('hearts-canvas');
const introHearts  = document.getElementById('intro-hearts');

/* ============================================================
   ESTADO INTERNO
   ============================================================ */
let currentLyricIndex = -1;
let canvasCtx;
let particles   = [];
let fadeStarted = false;

/* ============================================================
   PANTALLA INICIAL — corazones decorativos
   ============================================================ */
function spawnIntroHeart() {
  const emojis = ['❤️', '💖', '🌹', '✨', '💕', '💗'];
  const el = document.createElement('span');
  el.classList.add('intro-heart-particle');
  el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  el.style.left = `${Math.random() * 100}%`;
  const duration = 6 + Math.random() * 8;
  const delay    = Math.random() * 8;
  el.style.animationDuration = `${duration}s`;
  el.style.animationDelay    = `${delay}s`;
  el.style.fontSize = `${1 + Math.random() * 1.5}rem`;
  introHearts.appendChild(el);
  setTimeout(() => { el.remove(); }, (duration + delay) * 1000);
}

const introHeartInterval = setInterval(spawnIntroHeart, 800);
for (let i = 0; i < 5; i++) spawnIntroHeart();

/* ============================================================
   INICIO DE LA EXPERIENCIA
   ============================================================ */
function startExperience() {
  introScreen.classList.add('fade-out');

  setTimeout(() => {
    introScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    clearInterval(introHeartInterval);
    initCanvas();

    audioPlayer.play().catch(() => {
      // Safari bloqueó el audio — mostrar botón de play
      document.getElementById('play-overlay').classList.remove('hidden');
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
      timeTotal.textContent = formatTime(STOP_TIME);
    });

  }, 900);
}

/* ============================================================
   FORMATO DE TIEMPO  (segundos → "m:ss")
   ============================================================ */
function formatTime(secs) {
  if (!isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ============================================================
   FUNDIDO Y PARADA DEL AUDIO
   ============================================================ */
function fadeOutAndStop() {
  if (fadeStarted) return;
  fadeStarted = true;

  const steps    = 30;
  const interval = FADE_DURATION / steps;
  const volStep  = audioPlayer.volume / steps;

  const fade = setInterval(() => {
    if (audioPlayer.volume > volStep) {
      audioPlayer.volume -= volStep;
    } else {
      audioPlayer.volume = 0;
      audioPlayer.pause();
      clearInterval(fade);
      showFinalMessage();
    }
  }, interval);
}

/* ============================================================
   MENSAJE FINAL
   ============================================================ */
function showFinalMessage() {
  lyricPrev.textContent = '';
  lyricNext.textContent = '';

  setTimeout(() => {
    lyricCurrent.textContent = '❤️';
    lyricCurrent.style.color = '#fcd34d';
    lyricCurrent.style.textShadow = '0 0 40px rgba(252,211,77,0.9)';
    lyricCurrent.style.animation  = 'none';
    void lyricCurrent.offsetWidth;
    lyricCurrent.style.animation  = 'lyricIn 1.2s ease both';
    progressBar.style.width = '100%';
  }, 400);
}

/* ============================================================
   SINCRONIZACIÓN DE LETRA
   ============================================================ */
function getActiveLyricIndex(currentTime) {
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

function updateLyrics(currentTime) {
  const idx = getActiveLyricIndex(currentTime);
  if (idx === currentLyricIndex) return;
  currentLyricIndex = idx;

  // Línea anterior
  lyricPrev.textContent = (idx > 0) ? lyrics[idx - 1].text : '';

  // Línea activa — crossfade suave estilo PowerPoint
  if (idx >= 0) {
    const line = lyrics[idx];

    // 1. Fundido de salida (solo opacidad, sin movimiento)
    lyricCurrent.style.transition = 'opacity 0.5s ease';
    lyricCurrent.style.opacity    = '0';

    // 2. Cuando termina el fundido de salida, cambiar el texto y entrar
    setTimeout(() => {
      lyricCurrent.textContent      = line.text;
      lyricCurrent.style.color      = line.color;
      lyricCurrent.style.textShadow =
        `0 0 24px ${line.color}99, 0 0 60px ${line.color}55`;

      // Forzar reflow antes de activar la transición de entrada
      void lyricCurrent.offsetWidth;

      // 3. Fundido de entrada (solo opacidad)
      lyricCurrent.style.transition = 'opacity 0.6s ease';
      lyricCurrent.style.opacity    = '1';

    }, 500); // coincide exactamente con la duración del fundido de salida

  } else {
    lyricCurrent.style.transition = 'opacity 0.5s ease';
    lyricCurrent.style.opacity    = '0';
    setTimeout(() => {
      lyricCurrent.textContent      = '';
      lyricCurrent.style.color      = '';
      lyricCurrent.style.textShadow = '';
    }, 500);
  }

  // Línea siguiente
  lyricNext.textContent =
    (idx < lyrics.length - 1) ? lyrics[idx + 1].text : '';
}

/* ============================================================
   BARRA DE PROGRESO Y TIEMPO
   ============================================================ */
function updateProgress() {
  const current = audioPlayer.currentTime;
  timeElapsed.textContent = formatTime(current);
  const pct = Math.min((current / STOP_TIME) * 100, 100);
  progressBar.style.width = `${pct}%`;
}

/* ============================================================
   BUCLE PRINCIPAL — timeupdate del audio
   ============================================================ */
audioPlayer.addEventListener('timeupdate', () => {
  const t = audioPlayer.currentTime;

  if (t >= STOP_TIME && !fadeStarted) {
    fadeOutAndStop();
    return;
  }

  if (!fadeStarted) {
    updateLyrics(t);
    updateProgress();
  }
});

audioPlayer.addEventListener('ended', () => {
  if (!fadeStarted) showFinalMessage();
});

/* ============================================================
   CANVAS — CORAZONES FLOTANTES
   ============================================================ */
class HeartParticle {
  constructor(w, h) { this.reset(w, h); }

  reset(w, h) {
    this.x      = Math.random() * w;
    this.y      = h + Math.random() * 80;
    this.size   = 8 + Math.random() * 18;
    this.speed  = 0.3 + Math.random() * 0.7;
    this.drift  = (Math.random() - 0.5) * 0.6;
    this.alpha  = 0.08 + Math.random() * 0.25;
    this.angle  = Math.random() * Math.PI * 2;
    this.spin   = (Math.random() - 0.5) * 0.02;
    const palette = ['#f472b6','#ec4899','#d946ef','#fcd34d','#ffffff'];
    this.color  = palette[Math.floor(Math.random() * palette.length)];
    this.canvasW = w;
    this.canvasH = h;
  }

  update() {
    this.y     -= this.speed;
    this.x     += this.drift;
    this.angle += this.spin;
    if (this.y < -30 || this.x < -30 || this.x > this.canvasW + 30) {
      this.reset(this.canvasW, this.canvasH);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle   = this.color;
    const s = this.size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.25);
    ctx.bezierCurveTo( s*0.5, -s*0.7,  s,  s*0.1,  0,  s*0.55);
    ctx.bezierCurveTo(-s,      s*0.1, -s*0.5, -s*0.7, 0, -s*0.25);
    ctx.fill();
    ctx.restore();
  }
}

function initCanvas() {
  canvasCtx = heartsCanvas.getContext('2d');
  resizeCanvas();
  const count = Math.min(40,
    Math.floor((window.innerWidth * window.innerHeight) / 18000));
  particles = [];
  for (let i = 0; i < count; i++) {
    const p = new HeartParticle(heartsCanvas.width, heartsCanvas.height);
    p.y = Math.random() * heartsCanvas.height;
    particles.push(p);
  }
  animateCanvas();
}

function resizeCanvas() {
  heartsCanvas.width  = window.innerWidth;
  heartsCanvas.height = window.innerHeight;
  particles.forEach(p => {
    p.canvasW = heartsCanvas.width;
    p.canvasH = heartsCanvas.height;
  });
}

function animateCanvas() {
  canvasCtx.clearRect(0, 0, heartsCanvas.width, heartsCanvas.height);
  particles.forEach(p => { p.update(); p.draw(canvasCtx); });
  requestAnimationFrame(animateCanvas);
}

window.addEventListener('resize', () => { if (canvasCtx) resizeCanvas(); });

/* Desbloquea el audio en Safari cuando el usuario toca el botón ▶ */
function unlockAudio() {
  document.getElementById('play-overlay').classList.add('hidden');
  audioPlayer.play().catch(() => {
    console.warn('No se pudo reproducir el audio.');
  });
}

window.startExperience = startExperience;
window.unlockAudio     = unlockAudio;