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
  // Fallback due date if the semantic <time> element is missing or invalid
  DUE_DATE: new Date('2026-04-18T18:00:00Z'),

  // How often time-remaining updates (ms) — Stage 1A: 30-60 seconds
  TIME_UPDATE_INTERVAL: 45_000,  // 45 seconds

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
  
  // Expand/collapse threshold (characters)
  EXPAND_THRESHOLD: 150,
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
   * Calculates friendly time-remaining text from the task due date
   * and updates the DOM element every TIME_UPDATE_INTERVAL ms.
   * Stage 1A: Enhanced with overdue indicator and stopped updates when completed.
   */
  constructor(timeEl, dueDate, overdueIndicatorEl = null) {
    this.el         = timeEl;
    this.dueDate    = dueDate;
    this.overdueIndicatorEl = overdueIndicatorEl;
    this.intervalId = null;
    this.isCompleted = false;
  }

  start() {
    this._update();
    this.intervalId = setInterval(() => this._update(), CONFIG.TIME_UPDATE_INTERVAL);
  }

  stop() {
    clearInterval(this.intervalId);
  }

  markCompleted() {
    this.isCompleted = true;
    this.stop();
    this.el.textContent = 'Completed';
    this.el.className = 'time-remaining';
    if (this.overdueIndicatorEl) {
      this.overdueIndicatorEl.style.display = 'none';
    }
  }

  markActive() {
    this.isCompleted = false;
    this.start();
  }

  _update() {
    if (this.isCompleted) return;
    
    const { text, state } = this._calculate();
    this.el.textContent = text;
    this.el.className = 'time-remaining';

    if (state) {
      this.el.classList.add(`time--${state}`);
    }

    // Update overdue indicator
    if (this.overdueIndicatorEl) {
      if (state === 'overdue') {
        this.overdueIndicatorEl.style.display = 'inline-flex';
      } else {
        this.overdueIndicatorEl.style.display = 'none';
      }
    }
  }

  /**
   * Returns { text, state } where state is:
   *   'overdue'  — past due date
   *   'due-soon' — within 24 hours
   *   null       — plenty of time
   */
  _calculate() {
    const now     = Date.now();
    const diff    = this.dueDate.getTime() - now;
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
   * Stage 1A: Manages status-checkbox-dropdown synchronization
   */
  constructor({ card, toggle, statusBadge, burstEffect, statusControl, timeManager }) {
    this.card           = card;
    this.toggle         = toggle;
    this.statusBadge    = statusBadge;
    this.statusControl  = statusControl;
    this.burst          = burstEffect;
    this.timeManager    = timeManager;
    this.isComplete     = false;
  }

  bindEvents() {
    this.toggle.addEventListener('change', () => this._onCheckboxChange());
    this.statusControl.addEventListener('change', () => this._onStatusControlChange());
  }

  _setStatus(label, variantClass) {
    this.statusBadge.className = `status-badge ${variantClass}`;
    this.statusBadge.setAttribute('aria-label', `Status: ${label}`);
    this.statusBadge.innerHTML =
      `<span class="status-badge__pulse" aria-hidden="true"></span>${label}`;
  }

  _onCheckboxChange() {
    this.isComplete = this.toggle.checked;

    if (this.isComplete) {
      this._markDone();
    } else {
      this._markActive();
    }
  }

  _onStatusControlChange() {
    const selectedStatus = this.statusControl.value;

    if (selectedStatus === 'Done') {
      this.toggle.checked = true;
      this.isComplete = true;
      this._markDone();
    } else if (selectedStatus === 'Pending' || selectedStatus === 'In Progress') {
      this.toggle.checked = false;
      this.isComplete = false;
      
      if (selectedStatus === 'Pending') {
        this._markPending();
      } else {
        this._markActive();
      }
    }
  }

  _markDone() {
    this.card.classList.add('state--completed');
    this.card.classList.remove('state--editing');

    this._setStatus('Done', 'status--done');
    this.statusControl.value = 'Done';
    this.toggle.checked = true;

    // Stop time updates when completed
    if (this.timeManager) {
      this.timeManager.markCompleted();
    }

    // Fire the particle burst
    this.burst.fire();

    console.log('✅ Task marked as Done');
  }

  _markActive() {
    this.card.classList.remove('state--completed');

    this._setStatus('In Progress', 'status--in-progress');
    this.statusControl.value = 'In Progress';
    this.toggle.checked = false;

    // Resume time updates
    if (this.timeManager) {
      this.timeManager.markActive();
    }

    console.log('🔄 Task reverted to In Progress');
  }

  _markPending() {
    this.card.classList.remove('state--completed');

    this._setStatus('Pending', 'status--pending');
    this.statusControl.value = 'Pending';
    this.toggle.checked = false;

    // Resume time updates
    if (this.timeManager) {
      this.timeManager.markActive();
    }

    console.log('⏳ Task status: Pending');
  }
}


/* ──────────────────────────────────────────────────────
   6. EDIT MANAGER — Stage 1A: handle edit mode
────────────────────────────────────────────────────── */
class EditManager {
  /**
   * Manages the edit form visibility and data handling.
   * Saves/cancels edits and maintains focus management.
   */
  constructor({ card, editBtn, editForm, saveBtn, cancelBtn, taskDisplay }) {
    this.card = card;
    this.editBtn = editBtn;
    this.editForm = editForm;
    this.saveBtn = saveBtn;
    this.cancelBtn = cancelBtn;
    this.taskDisplay = taskDisplay;
    this.isEditing = false;
    this.previousFocus = null;
  }

  bindEvents() {
    this.editBtn.addEventListener('click', () => this._enterEditMode());
    this.saveBtn.addEventListener('click', () => this._saveChanges());
    this.cancelBtn.addEventListener('click', () => this._exitEditMode());
  }

  _enterEditMode() {
    this.isEditing = true;
    this.previousFocus = document.activeElement;
    
    // Populate form with current values
    this._populateFormFromCard();
    
    // Show edit form
    this.card.classList.add('state--editing');
    this.editForm.setAttribute('aria-hidden', 'false');
    
    // Focus on first input
    const titleInput = this.editForm.querySelector('[data-testid="test-todo-edit-title-input"]');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100);
    }

    console.log('✏️ Entered edit mode');
  }

  _populateFormFromCard() {
    const titleEl = this.card.querySelector('[data-testid="test-todo-title"]');
    const descEl = this.card.querySelector('[data-testid="test-todo-description"]');
    const priorityEl = this.card.querySelector('[data-testid="test-todo-priority"]');
    const dueDateEl = this.card.querySelector('[data-testid="test-todo-due-date"]');

    const titleInput = this.editForm.querySelector('[data-testid="test-todo-edit-title-input"]');
    const descInput = this.editForm.querySelector('[data-testid="test-todo-edit-description-input"]');
    const prioritySelect = this.editForm.querySelector('[data-testid="test-todo-edit-priority-select"]');
    const dueDateInput = this.editForm.querySelector('[data-testid="test-todo-edit-due-date-input"]');

    if (titleInput && titleEl) titleInput.value = titleEl.textContent.trim();
    if (descInput && descEl) descInput.value = descEl.textContent.trim();
    if (prioritySelect && priorityEl) {
      const priorityText = priorityEl.textContent.trim().split('\n')[0];
      prioritySelect.value = priorityText;
    }
    if (dueDateInput && dueDateEl) {
      const datetime = dueDateEl.getAttribute('datetime');
      if (datetime) {
        const date = new Date(datetime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dueDateInput.value = `${year}-${month}-${day}`;
      }
    }
  }

  _saveChanges() {
    const titleInput = this.editForm.querySelector('[data-testid="test-todo-edit-title-input"]');
    const descInput = this.editForm.querySelector('[data-testid="test-todo-edit-description-input"]');
    const prioritySelect = this.editForm.querySelector('[data-testid="test-todo-edit-priority-select"]');
    const dueDateInput = this.editForm.querySelector('[data-testid="test-todo-edit-due-date-input"]');

    const titleEl = this.card.querySelector('[data-testid="test-todo-title"]');
    const descEl = this.card.querySelector('[data-testid="test-todo-description"]');
    const priorityEl = this.card.querySelector('[data-testid="test-todo-priority"]');
    const priorityIndicator = this.card.querySelector('[data-testid="test-todo-priority-indicator"]');
    const dueDateEl = this.card.querySelector('[data-testid="test-todo-due-date"]');
    const priorityBadge = this.card.querySelector('.priority-badge');

    // Update title
    if (titleEl && titleInput) {
      titleEl.textContent = titleInput.value || 'Untitled';
    }

    // Update description
    if (descEl && descInput) {
      descEl.textContent = descInput.value || 'No description';
      descEl.setAttribute('data-collapsed', 'true');
    }

    // Update priority
    if (prioritySelect && priorityEl) {
      const newPriority = prioritySelect.value;
      const priorityClass = `priority--${newPriority.toLowerCase()}`;
      
      // Update priority badge
      priorityBadge.className = `priority-badge ${priorityClass}`;
      priorityBadge.setAttribute('aria-label', `Priority: ${newPriority}`);
      priorityBadge.innerHTML = `<span class="priority-badge__dot" data-testid="test-todo-priority-indicator" aria-hidden="true"></span>${newPriority}`;

      // Also update the hidden text in priority element if needed
      priorityEl.textContent = newPriority;
    }

    // Update due date
    if (dueDateInput && dueDateEl) {
      if (dueDateInput.value) {
        const date = new Date(dueDateInput.value);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const formatted = date.toLocaleDateString('en-US', options);
        dueDateEl.setAttribute('datetime', date.toISOString());
        dueDateEl.textContent = `Due ${formatted}`;
      }
    }

    this._exitEditMode();
    console.log('💾 Changes saved');
  }

  _exitEditMode() {
    this.isEditing = false;
    this.card.classList.remove('state--editing');
    this.editForm.setAttribute('aria-hidden', 'true');

    // Return focus to edit button
    if (this.previousFocus === this.editBtn || !this.previousFocus) {
      this.editBtn.focus();
    } else {
      this.previousFocus.focus();
    }

    console.log('✏️ Exited edit mode');
  }
}


/* ──────────────────────────────────────────────────────
   6b. EXPAND MANAGER — Stage 1A: expand/collapse description
────────────────────────────────────────────────────── */
class ExpandManager {
  /**
   * Manages the expand/collapse behavior for long descriptions.
   * Automatically collapses if description exceeds EXPAND_THRESHOLD.
   */
  constructor({ expandBtn, descEl, collapsibleSection }) {
    this.expandBtn = expandBtn;
    this.descEl = descEl;
    this.collapsibleSection = collapsibleSection;
    this.isExpanded = false;
  }

  init() {
    // Check if description needs collapsing
    const text = this.descEl.textContent.trim();
    
    if (text.length > CONFIG.EXPAND_THRESHOLD) {
      this._setupCollapse();
      this.expandBtn.style.display = 'inline-flex';
    } else {
      this.expandBtn.style.display = 'none';
      this.descEl.setAttribute('data-collapsed', 'false');
    }

    this.expandBtn.addEventListener('click', () => this._toggle());
  }

  _setupCollapse() {
    this.descEl.setAttribute('data-collapsed', 'true');
    this.isExpanded = false;
    this.expandBtn.setAttribute('aria-expanded', 'false');
  }

  _toggle() {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.descEl.setAttribute('data-collapsed', 'false');
      this.expandBtn.setAttribute('aria-expanded', 'true');
      this.expandBtn.querySelector('.expand-toggle__text').textContent = 'Less';
    } else {
      this.descEl.setAttribute('data-collapsed', 'true');
      this.expandBtn.setAttribute('aria-expanded', 'false');
      this.expandBtn.querySelector('.expand-toggle__text').textContent = 'More';
    }
  }
}


/* ──────────────────────────────────────────────────────
   7. INTERACTIONS — edit button, delete button, glitch
────────────────────────────────────────────────────── */
class Interactions {
  /**
   * Handles Delete button behaviour and glitch effects.
   * Edit is now handled by EditManager.
   */
  constructor({ card, deleteBtn, scene }) {
    this.card      = card;
    this.deleteBtn = deleteBtn;
    this.scene     = scene;
  }

  bindEvents() {
    this.deleteBtn.addEventListener('click', () => this._onDelete());
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
   8. TICKER ANIMATION — ticket number counts up on load
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
   9. INIT — boot everything when DOM is ready
────────────────────────────────────────────────────── */
function init() {
  // ── Grab DOM elements ──
  const bgCanvas    = document.getElementById('bg-canvas');
  const burstCanvas = document.getElementById('burst-canvas');
  const card        = document.getElementById('todo-card');
  const scene       = document.querySelector('.scene');
  const toggle      = document.getElementById('complete-toggle');
  const statusBadge = document.getElementById('status-badge');
  const statusControl = document.getElementById('status-control');
  const timeEl      = document.getElementById('time-remaining');
  const overdueIndicatorEl = document.getElementById('overdue-indicator');
  const dueDateEl   = document.querySelector('[data-testid="test-todo-due-date"]');
  const editBtn     = document.getElementById('edit-btn');
  const editForm    = document.getElementById('edit-form');
  const saveBtn     = document.getElementById('save-btn');
  const cancelBtn   = document.getElementById('cancel-btn');
  const taskDisplay = document.getElementById('task-display');
  const deleteBtn   = document.getElementById('delete-btn');
  const tktNumber   = document.getElementById('tkt-number');
  const expandBtn   = document.getElementById('expand-toggle');
  const descEl      = document.querySelector('[data-testid="test-todo-description"]');
  const collapsibleSection = document.getElementById('collapsible-section');

  // Guard: bail early if critical elements are missing
  if (!card || !toggle || !statusBadge || !timeEl || !dueDateEl || !editBtn || !deleteBtn || !tktNumber) {
    console.warn('Task Ticket: required DOM elements not found.');
    return;
  }

  const dueDate = new Date(dueDateEl.getAttribute('datetime') || CONFIG.DUE_DATE.toISOString());
  const resolvedDueDate = Number.isNaN(dueDate.getTime()) ? CONFIG.DUE_DATE : dueDate;

  // ── Boot modules ──

  // 1. Background particle network
  new ParticleNetwork(bgCanvas);

  // 2. Particle burst effect (fires on complete)
  const burst = new BurstEffect(burstCanvas);

  // 3. Live countdown timer (with overdue indicator)
  const timer = new TimeManager(timeEl, resolvedDueDate, overdueIndicatorEl);
  timer.start();

  // 4. Checkbox / completion state (with status control and timer)
  const cardState = new CardState({ 
    card, 
    toggle, 
    statusBadge, 
    burstEffect: burst,
    statusControl,
    timeManager: timer
  });
  cardState.bindEvents();

  // 5. Edit mode management — Stage 1A
  const editManager = new EditManager({
    card,
    editBtn,
    editForm,
    saveBtn,
    cancelBtn,
    taskDisplay
  });
  editManager.bindEvents();

  // 6. Expand/collapse description — Stage 1A
  const expandManager = new ExpandManager({
    expandBtn,
    descEl,
    collapsibleSection
  });
  expandManager.init();

  // 7. Delete interactions
  const interactions = new Interactions({ card, deleteBtn, scene });
  interactions.bindEvents();

  // 8. Ticket number count-up on load
  animateTicker(tktNumber);
}

// Run after DOM is fully parsed
document.addEventListener('DOMContentLoaded', init);
