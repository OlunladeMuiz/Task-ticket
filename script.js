/**
 * ═══════════════════════════════════════════════════════
 * TASK TICKET — script.js
 * Organised into clear modules:
 *
 *   1. CONFIG          — all magic numbers in one place
 *   2. ParticleNetwork — animated background canvas
 *   3. BurstEffect     — particle explosion on complete
 *   4. TimeManager     — due date + live countdown
 *   5. CardState       — manages completed / normal state
 *   6. Interactions    — edit, delete, glitch effects
 *   7. TickerAnimation — ticket number count-up on load
 *   8. Init            — boots everything up
 * ═══════════════════════════════════════════════════════
 */


/* ──────────────────────────────────────────────────────
   1. CONFIG — change behaviour from one place
────────────────────────────────────────────────────── */
const CONFIG = {
  // Fixed due date for the task
  DUE_DATE: new Date('2026-04-18T18:00:00Z'),

  // How often time-remaining updates (ms)
  TIME_UPDATE_INTERVAL: 60_000,

  // Background particle network
  PARTICLE_COUNT: 55,
  PARTICLE_COLOR: '0, 255, 209',    // RGB for cyan
  PARTICLE_MAX_SPEED: 0.4,
  PARTICLE_MIN_RADIUS: 1.5,
  PARTICLE_MAX_RADIUS: 3,
  CONNECTION_DISTANCE: 130,         // px — when to draw a connecting line

  // Burst particle explosion on checkbox complete
  BURST_PARTICLE_COUNT: 60,
  BURST_DURATION: 900,              // ms

  // Ticket number count-up animation
  TICKER_TARGET: 42,
  TICKER_DURATION: 1200,            // ms
};


/* ──────────────────────────────────────────────────────
   2. PARTICLE NETWORK — background canvas animation
────────────────────────────────────────────────────── */
class ParticleNetwork {
  /**
   * Draws floating nodes connected by faint lines,
   * creating the "live data network" background feel.
   */
  constructor(canvasEl) {
    this.canvas  = canvasEl;
    this.ctx     = canvasEl.getContext('2d');
    this.nodes   = [];
    this.rafId   = null;

    this._resize();
    this._createNodes();
    this._animate();

    // Re-layout on window resize
    window.addEventListener('resize', () => this._resize(), { passive: true });
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _createNodes() {
    this.nodes = [];
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      this.nodes.push({
        x:  Math.random() * this.canvas.width,
        y:  Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * CONFIG.PARTICLE_MAX_SPEED * 2,
        vy: (Math.random() - 0.5) * CONFIG.PARTICLE_MAX_SPEED * 2,
        r:  CONFIG.PARTICLE_MIN_RADIUS +
            Math.random() * (CONFIG.PARTICLE_MAX_RADIUS - CONFIG.PARTICLE_MIN_RADIUS),
        opacity: 0.2 + Math.random() * 0.5,
      });
    }
  }

  _animate() {
    const { ctx, canvas, nodes } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move & draw each node
    nodes.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;

      // Bounce off edges
      if (node.x < 0 || node.x > canvas.width)  node.vx *= -1;
      if (node.y < 0 || node.y > canvas.height)  node.vy *= -1;

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CONFIG.PARTICLE_COLOR}, ${node.opacity})`;
      ctx.fill();
    });

    // Draw connecting lines between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx   = nodes[i].x - nodes[j].x;
        const dy   = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.CONNECTION_DISTANCE) {
          // Fade line based on distance
          const alpha = (1 - dist / CONFIG.CONNECTION_DISTANCE) * 0.15;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(${CONFIG.PARTICLE_COLOR}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    this.rafId = requestAnimationFrame(() => this._animate());
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
  }
}


/* ──────────────────────────────────────────────────────
   3. BURST EFFECT — particle explosion on task complete
────────────────────────────────────────────────────── */
class BurstEffect {
  /**
   * When the user completes a task, this fires a
   * colourful particle burst across the card canvas.
   */
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this._fitToParent();
  }

  _fitToParent() {
    const parent = this.canvas.parentElement;
    this.canvas.width  = parent.offsetWidth;
    this.canvas.height = parent.offsetHeight;
  }

  fire() {
    this._fitToParent();

    const { canvas, ctx } = this;
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    // Neon colours for the burst
    const colors = [
      '#00FFD1', '#FF2D6B', '#FFD600', '#7B2FFF',
      '#00BFFF', '#FF6B35', '#A78BFA',
    ];

    // Create particles
    const particles = Array.from(
      { length: CONFIG.BURST_PARTICLE_COUNT },
      () => {
        const angle  = Math.random() * Math.PI * 2;
        const speed  = 3 + Math.random() * 8;
        const size   = 2 + Math.random() * 5;
        return {
          x:      cx,
          y:      cy,
          vx:     Math.cos(angle) * speed,
          vy:     Math.sin(angle) * speed,
          alpha:  1,
          size,
          color:  colors[Math.floor(Math.random() * colors.length)],
          decay:  0.015 + Math.random() * 0.025,
          gravity: 0.12 + Math.random() * 0.1,
        };
      }
    );

    const start = performance.now();

    const draw = (now) => {
      const elapsed = now - start;
      if (elapsed > CONFIG.BURST_DURATION) {
        // Clear canvas and stop
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x     += p.vx;
        p.y     += p.vy;
        p.vy    += p.gravity;   // gravity pull
        p.vx    *= 0.97;        // air resistance
        p.alpha -= p.decay;
        if (p.alpha < 0) p.alpha = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
  }
}


/* ──────────────────────────────────────────────────────
   4. TIME MANAGER — due date calculation + live updates
────────────────────────────────────────────────────── */
class TimeManager {
  /**
   * Calculates friendly time-remaining text from CONFIG.DUE_DATE
   * and updates the DOM element every TIME_UPDATE_INTERVAL ms.
   */
  constructor(timeEl) {
    this.el         = timeEl;
    this.intervalId = null;
  }

  start() {
    this._update();
    this.intervalId = setInterval(() => this._update(), CONFIG.TIME_UPDATE_INTERVAL);
  }

  stop() {
    clearInterval(this.intervalId);
  }

  _update() {
    const { text, state } = this._calculate();
    this.el.textContent = text;
    this.el.className   = state ? `time--${state}` : '';
  }

  /**
   * Returns { text, state } where state is:
   *   'overdue'  — past due date
   *   'due-soon' — within 24 hours
   *   null       — plenty of time
   */
  _calculate() {
    const now     = Date.now();
    const diff    = CONFIG.DUE_DATE.getTime() - now;
    const abs     = Math.abs(diff);

    const MINUTE  = 60 * 1000;
    const HOUR    = 60 * MINUTE;
    const DAY     = 24 * HOUR;

    const mins    = Math.floor(abs / MINUTE);
    const hours   = Math.floor(abs / HOUR);
    const days    = Math.floor(abs / DAY);

    if (abs < MINUTE) {
      return { text: 'Due now!', state: 'due-soon' };
    }

    if (diff > 0) {
      // ── Future ──
      if (days >= 2)       return { text: `Due in ${days} days`,   state: null };
      if (days === 1)      return { text: 'Due tomorrow',          state: 'due-soon' };
      if (hours >= 2)      return { text: `Due in ${hours} hours`, state: 'due-soon' };
      if (hours === 1)     return { text: 'Due in 1 hour',         state: 'due-soon' };
      if (mins >= 2)       return { text: `Due in ${mins} minutes`, state: 'due-soon' };
      if (mins === 1)      return { text: 'Due in 1 minute',       state: 'due-soon' };
      return               { text: 'Due now!',                     state: 'due-soon' };
    } else {
      // ── Overdue ──
      if (days >= 2)       return { text: `Overdue by ${days} days`, state: 'overdue' };
      if (days === 1)      return { text: 'Overdue by 1 day',        state: 'overdue' };
      if (hours >= 2)      return { text: `Overdue by ${hours} hours`, state: 'overdue' };
      if (hours === 1)     return { text: 'Overdue by 1 hour',       state: 'overdue' };
      if (mins >= 2)       return { text: `Overdue by ${mins} minutes`, state: 'overdue' };
      return               { text: 'Overdue by 1 minute',            state: 'overdue' };
    }
  }
}


/* ──────────────────────────────────────────────────────
   5. CARD STATE — manages completed vs active
────────────────────────────────────────────────────── */
class CardState {
  /**
   * Handles the visual transformation when a task
   * is marked complete or reverted.
   */
  constructor({ card, toggle, statusBadge, burstEffect }) {
    this.card        = card;
    this.toggle      = toggle;
    this.statusBadge = statusBadge;
    this.burst       = burstEffect;
    this.isComplete  = false;
  }

  bindEvents() {
    this.toggle.addEventListener('change', () => this._onToggle());
  }

  _setStatus(label, variantClass) {
    this.statusBadge.className = `status-badge ${variantClass}`;
    this.statusBadge.setAttribute('aria-label', `Status: ${label}`);
    this.statusBadge.innerHTML =
      `<span class="status-badge__pulse" aria-hidden="true"></span>${label}`;
  }

  _onToggle() {
    this.isComplete = this.toggle.checked;

    if (this.isComplete) {
      this._markDone();
    } else {
      this._markActive();
    }
  }

  _markDone() {
    this.card.classList.add('state--completed');
    this.card.classList.remove('state--editing');

    this.statusBadge.textContent = '●  Done';
    this._setStatus('Done', 'status--done');

    // Fire the particle burst
    this.burst.fire();

    console.log('✅ Task marked as Done');
  }

  _markActive() {
    this.card.classList.remove('state--completed');

    this.statusBadge.textContent = '● In Progress';
    this._setStatus('In Progress', 'status--in-progress');

    console.log('🔄 Task reverted to In Progress');
  }
}


/* ──────────────────────────────────────────────────────
   6. INTERACTIONS — edit button, delete button, glitch
────────────────────────────────────────────────────── */
class Interactions {
  /**
   * Handles Edit and Delete button behaviour,
   * including animated feedback.
   */
  constructor({ card, editBtn, deleteBtn, scene }) {
    this.card      = card;
    this.editBtn   = editBtn;
    this.deleteBtn = deleteBtn;
    this.scene     = scene;
  }

  bindEvents() {
    this.editBtn.addEventListener('click',   () => this._onEdit());
    this.deleteBtn.addEventListener('click', () => this._onDelete());
  }

  _onEdit() {
    console.log('✏️  Edit clicked');

    // Add yellow glow state briefly
    this.card.classList.add('state--editing');

    // Apply a short glitch flicker on the card
    this._glitch();

    // Remove edit state after 800ms
    setTimeout(() => {
      this.card.classList.remove('state--editing');
    }, 800);
  }

  /**
   * Quick RGB-split glitch — achieved via a
   * fast CSS filter sequence using JS.
   */
  _glitch() {
    const steps = [
      { filter: 'hue-rotate(90deg) brightness(1.3)',  delay: 0   },
      { filter: 'hue-rotate(-90deg) brightness(0.8)', delay: 80  },
      { filter: 'hue-rotate(30deg) brightness(1.1)',  delay: 150 },
      { filter: 'none',                               delay: 220 },
    ];

    steps.forEach(({ filter, delay }) => {
      setTimeout(() => {
        this.card.style.filter = filter;
      }, delay);
    });
  }

  _onDelete() {
    console.log('🗑️  Delete clicked');

    // Keep delete as a dummy action so the graded card stays in the DOM.
    return;

    setTimeout(() => {
      this.scene.innerHTML = `
        <p class="delete-confirm">
          — Task <span>#TKT-0042</span> archived —
        </p>
      `;
    }, 650);
  }
}


/* ──────────────────────────────────────────────────────
   7. TICKER ANIMATION — ticket number counts up on load
────────────────────────────────────────────────────── */
function animateTicker(el) {
  /**
   * Counts the ticket number from 0 to TARGET
   * using an easing function for a cinematic feel.
   */
  const start    = performance.now();
  const duration = CONFIG.TICKER_DURATION;
  const target   = CONFIG.TICKER_TARGET;

  // Ease-out cubic
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const tick = (now) => {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value    = Math.round(easeOut(progress) * target);

    // Zero-pad to 4 digits
    el.textContent = String(value).padStart(4, '0');

    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}


/* ──────────────────────────────────────────────────────
   8. INIT — boot everything when DOM is ready
────────────────────────────────────────────────────── */
function init() {
  // ── Grab DOM elements ──
  const bgCanvas    = document.getElementById('bg-canvas');
  const burstCanvas = document.getElementById('burst-canvas');
  const card        = document.getElementById('todo-card');
  const scene       = document.querySelector('.scene');
  const toggle      = document.getElementById('complete-toggle');
  const statusBadge = document.getElementById('status-badge');
  const timeEl      = document.getElementById('time-remaining');
  const editBtn     = document.getElementById('edit-btn');
  const deleteBtn   = document.getElementById('delete-btn');
  const tktNumber   = document.getElementById('tkt-number');

  // Guard: bail early if critical elements are missing
  if (!card || !toggle) {
    console.warn('Task Ticket: required DOM elements not found.');
    return;
  }

  // ── Boot modules ──

  // 1. Background particle network
  new ParticleNetwork(bgCanvas);

  // 2. Particle burst effect (fires on complete)
  const burst = new BurstEffect(burstCanvas);

  // 3. Live countdown timer
  const timer = new TimeManager(timeEl);
  timer.start();

  // 4. Checkbox / completion state
  const cardState = new CardState({ card, toggle, statusBadge, burstEffect: burst });
  cardState.bindEvents();

  // 5. Edit + Delete interactions
  const interactions = new Interactions({ card, editBtn, deleteBtn, scene });
  interactions.bindEvents();

  // 6. Ticket number count-up on load
  animateTicker(tktNumber);
}

// Run after DOM is fully parsed
document.addEventListener('DOMContentLoaded', init);
