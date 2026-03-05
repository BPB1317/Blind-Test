/* ═══════════════════════════════════════════
   BLIND TEST — SOIRÉE  •  script.js
   Logique complète du jeu, vanilla JS
═══════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   1. ÉTAT GLOBAL
────────────────────────────────────────── */

/** Paramètres de la partie */
let gameSettings = {
  totalRounds:           3,
  questionsPerRound:     10,
  timerDuration:         30,
  pointsPerCorrectAnswer: 1
};

/** Liste des joueurs */
let players = [];

/** État courant du jeu */
let state = {
  currentRound:    1,   // manche en cours (1-based)
  currentQuestion: 1,   // question dans la manche (1-based)
  timerValue:      0,   // secondes restantes
  timerInterval:   null,
  revealed:        false,
  gameOver:        false
};

/* Constante SVG timer : 2π × r (r=52) */
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 52; // ≈ 326.73

/* ──────────────────────────────────────────
   2. SÉLECTEURS DOM
────────────────────────────────────────── */
const $ = id => document.getElementById(id);

// Setup
const setupScreen     = $('screen-setup');
const cfgRounds       = $('cfg-rounds');
const cfgQuestions    = $('cfg-questions');
const cfgTimer        = $('cfg-timer');
const cfgPoints       = $('cfg-points');
const playersListEl   = $('players-list');
const newPlayerInput  = $('new-player-name');
const btnAddPlayer    = $('btn-add-player');
const btnStartGame    = $('btn-start-game');

// Game
const gameScreen      = $('screen-game');
const roundLabel      = $('round-label');
const questionLabel   = $('question-label');
const timerRing       = $('timer-ring');
const timerNumber     = $('timer-number');
const musicLabel      = $('music-label');
const answerBox       = $('answer-box');
const answerText      = $('answer-text');
const btnReveal       = $('btn-reveal');
const btnNext         = $('btn-next');
const scoreList       = $('score-list');
const adminPanel      = $('admin-panel');
const adminPlayers    = $('admin-players');
const btnToggleAdmin  = $('btn-toggle-admin');
const btnNextRound    = $('btn-next-round');
const btnReset        = $('btn-reset');

// Round-end
const roundEndScreen  = $('screen-round-end');
const roundEndMeta    = $('round-end-meta');
const roundEndScores  = $('round-end-scores');
const btnContinueRound = $('btn-continue-round');

// Finale
const finaleScreen    = $('screen-finale');
const finaleScores    = $('finale-scores');
const winnerBanner    = $('winner-banner');
const btnReplay       = $('btn-replay');
const confettiCanvas  = $('confetti-canvas');

/* ──────────────────────────────────────────
   3. NAVIGATION ENTRE ÉCRANS
────────────────────────────────────────── */
function showScreen(screenEl) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = '';
  });
  screenEl.classList.add('active');
}

/* ──────────────────────────────────────────
   4. SETUP — GESTION DES JOUEURS
────────────────────────────────────────── */
function renderSetupPlayers() {
  playersListEl.innerHTML = '';
  players.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'player-tag fade-in';
    div.innerHTML = `<span>${p.name}</span>
      <button data-index="${i}" title="Supprimer">✕</button>`;
    playersListEl.appendChild(div);
  });
}

function addPlayer() {
  const name = newPlayerInput.value.trim();
  if (!name) return;
  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    newPlayerInput.style.borderColor = '#e74c3c';
    setTimeout(() => newPlayerInput.style.borderColor = '', 1200);
    return;
  }
  players.push({ name, score: 0 });
  newPlayerInput.value = '';
  renderSetupPlayers();
}

btnAddPlayer.addEventListener('click', addPlayer);
newPlayerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

playersListEl.addEventListener('click', e => {
  const btn = e.target.closest('button[data-index]');
  if (!btn) return;
  players.splice(+btn.dataset.index, 1);
  renderSetupPlayers();
});

/* ──────────────────────────────────────────
   5. DÉMARRAGE DE LA PARTIE
────────────────────────────────────────── */
btnStartGame.addEventListener('click', () => {
  // Lire les paramètres
  gameSettings.totalRounds           = Math.max(1, +cfgRounds.value    || 3);
  gameSettings.questionsPerRound     = Math.max(1, +cfgQuestions.value || 10);
  gameSettings.timerDuration         = Math.max(5, +cfgTimer.value     || 30);
  gameSettings.pointsPerCorrectAnswer = Math.max(1, +cfgPoints.value   || 1);

  // Vérif : au moins 1 joueur
  if (players.length === 0) {
    alert('Ajoutez au moins un joueur !');
    return;
  }

  // Réinitialiser les scores
  players.forEach(p => p.score = 0);

  // Réinitialiser l'état
  state.currentRound    = 1;
  state.currentQuestion = 1;
  state.gameOver        = false;

  showScreen(gameScreen);
  startQuestion();
});

/* ──────────────────────────────────────────
   6. LOGIQUE DE QUESTION
────────────────────────────────────────── */
function startQuestion() {
  state.revealed = false;

  // Mettre à jour les labels
  roundLabel.textContent    = `Manche ${state.currentRound} / ${gameSettings.totalRounds}`;
  questionLabel.textContent = `Question ${state.currentQuestion} / ${gameSettings.questionsPerRound}`;

  // Reset zone centrale
  musicLabel.textContent = '🎵 En cours…';
  musicLabel.style.opacity = '1';
  answerBox.classList.add('hidden');
  answerText.textContent = '—';
  btnReveal.classList.remove('hidden');
  btnNext.classList.add('hidden');

  // Démarrer le timer
  startTimer();

  // Mettre à jour les panneaux
  renderScoreboard();
  renderAdminPanel();
}

/* ──────────────────────────────────────────
   7. TIMER
────────────────────────────────────────── */
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerValue = gameSettings.timerDuration;
  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.timerValue--;
    updateTimerDisplay();

    if (state.timerValue <= 0) {
      clearInterval(state.timerInterval);
      onTimerEnd();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const t   = state.timerValue;
  const max = gameSettings.timerDuration;

  // Chiffre
  timerNumber.textContent = t;

  // Arc SVG : dashoffset va de 0 (plein) à CIRCUMFERENCE (vide)
  const ratio  = t / max;
  const offset = TIMER_CIRCUMFERENCE * (1 - ratio);
  timerRing.style.strokeDashoffset = offset;

  // Urgence (≤ 5s)
  const urgent = t <= 5 && t > 0;
  timerRing.classList.toggle('urgent', urgent);
  timerNumber.classList.toggle('urgent', urgent);
}

function onTimerEnd() {
  timerNumber.textContent = '0';
  timerRing.style.strokeDashoffset = TIMER_CIRCUMFERENCE;
  timerRing.classList.remove('urgent');
  timerNumber.classList.remove('urgent');
  musicLabel.style.opacity = '0.4';
  // Afficher bouton révéler si pas encore fait
  if (!state.revealed) {
    btnReveal.classList.remove('hidden');
  }
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

/* ──────────────────────────────────────────
   8. RÉVÉLATION DE LA RÉPONSE
────────────────────────────────────────── */
btnReveal.addEventListener('click', () => {
  stopTimer();
  state.revealed = true;

  // Afficher le placeholder de réponse
  answerBox.classList.remove('hidden');
  answerText.textContent = '✓ Réponse validée — mettez à jour les scores';

  btnReveal.classList.add('hidden');
  btnNext.classList.remove('hidden');
});

/* ──────────────────────────────────────────
   9. QUESTION SUIVANTE / MANCHE / FINALE
────────────────────────────────────────── */
btnNext.addEventListener('click', () => {
  stopTimer();
  advanceQuestion();
});

function advanceQuestion() {
  if (state.currentQuestion < gameSettings.questionsPerRound) {
    // Question suivante dans la même manche
    state.currentQuestion++;
    startQuestion();
  } else {
    // Fin de manche
    if (state.currentRound < gameSettings.totalRounds) {
      showRoundEnd();
    } else {
      showFinale();
    }
  }
}

/* ──────────────────────────────────────────
   10. CLASSEMENT
────────────────────────────────────────── */
function renderScoreboard() {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  scoreList.innerHTML = '';
  sorted.forEach((p, i) => {
    const li = document.createElement('li');
    li.classList.toggle('leader', i === 0 && p.score > 0);
    li.innerHTML = `<span class="s-name">${p.name}</span>
                    <span class="s-pts">${p.score}</span>`;
    scoreList.appendChild(li);
  });
}

/* ──────────────────────────────────────────
   11. PANNEAU ADMIN
────────────────────────────────────────── */
function renderAdminPanel() {
  adminPlayers.innerHTML = '';
  players.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'admin-player-row';
    row.innerHTML = `
      <span class="ap-name">${p.name}</span>
      <button class="btn-ap" data-action="minus" data-index="${i}">−</button>
      <span class="ap-score" id="ap-score-${i}">${p.score}</span>
      <button class="btn-ap" data-action="plus"  data-index="${i}">+</button>
      <input  type="number" class="ap-input" data-index="${i}"
              value="${p.score}" min="0" style="width:52px;padding:5px 6px;font-size:.8rem;" />
    `;
    adminPlayers.appendChild(row);
  });
}

// Délégation d'événements sur le panneau admin
adminPanel.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = +btn.dataset.index;
  if (btn.dataset.action === 'plus') {
    players[i].score += gameSettings.pointsPerCorrectAnswer;
  } else if (btn.dataset.action === 'minus') {
    players[i].score = Math.max(0, players[i].score - gameSettings.pointsPerCorrectAnswer);
  }
  refreshScores();
});

// Modification manuelle via l'input
adminPanel.addEventListener('change', e => {
  const input = e.target.closest('.ap-input');
  if (!input) return;
  const i = +input.dataset.index;
  const v = parseInt(input.value, 10);
  if (!isNaN(v) && v >= 0) {
    players[i].score = v;
    refreshScores();
  }
});

/** Met à jour l'affichage des scores (scoreboard + admin) */
function refreshScores() {
  renderScoreboard();
  // Mettre à jour uniquement les valeurs dans l'admin sans re-render complet
  players.forEach((p, i) => {
    const span = $(`ap-score-${i}`);
    if (span) span.textContent = p.score;
    const input = adminPanel.querySelector(`.ap-input[data-index="${i}"]`);
    if (input) input.value = p.score;
  });
}

/* Toggle admin panel */
btnToggleAdmin.addEventListener('click', () => {
  adminPanel.classList.toggle('hidden');
});

/* Passer à la manche suivante depuis l'admin */
btnNextRound.addEventListener('click', () => {
  stopTimer();
  if (state.currentRound < gameSettings.totalRounds) {
    showRoundEnd();
  } else {
    showFinale();
  }
});

/* Réinitialiser */
btnReset.addEventListener('click', () => {
  if (!confirm('Réinitialiser la partie ? Tous les scores seront effacés.')) return;
  stopTimer();
  players.forEach(p => p.score = 0);
  state.currentRound    = 1;
  state.currentQuestion = 1;
  state.gameOver        = false;
  adminPanel.classList.add('hidden');
  showScreen(setupScreen);
});

/* ──────────────────────────────────────────
   12. FIN DE MANCHE
────────────────────────────────────────── */
function showRoundEnd() {
  roundEndMeta.textContent = `Fin de la Manche ${state.currentRound} sur ${gameSettings.totalRounds}`;
  renderEndScores(roundEndScores);
  showScreen(roundEndScreen);
}

btnContinueRound.addEventListener('click', () => {
  state.currentRound++;
  state.currentQuestion = 1;
  showScreen(gameScreen);
  startQuestion();
});

/* ──────────────────────────────────────────
   13. FINALE
────────────────────────────────────────── */
function showFinale() {
  state.gameOver = true;
  renderEndScores(finaleScores);

  // Déterminer le(s) gagnant(s)
  const maxScore = Math.max(...players.map(p => p.score));
  const winners  = players.filter(p => p.score === maxScore);
  if (winners.length === 1) {
    winnerBanner.textContent = `🏆 Félicitations ${winners[0].name} !`;
  } else {
    winnerBanner.textContent = `🤝 Égalité : ${winners.map(w => w.name).join(' & ')} !`;
  }

  showScreen(finaleScreen);
  launchConfetti();
}

btnReplay.addEventListener('click', () => {
  stopConfetti();
  players.forEach(p => p.score = 0);
  showScreen(setupScreen);
});

/* ── Utilitaire : remplir une liste de scores ── */
function renderEndScores(listEl) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  listEl.innerHTML = '';
  sorted.forEach((p, i) => {
    const li = document.createElement('li');
    li.classList.toggle('top', i === 0);
    li.style.animationDelay = `${i * 0.08}s`;
    li.innerHTML = `<span class="rank">${i + 1}.</span>
                    <span class="e-name">${p.name}</span>
                    <span class="e-pts">${p.score} pt${p.score > 1 ? 's' : ''}</span>`;
    listEl.appendChild(li);
  });
}

/* ──────────────────────────────────────────
   14. CONFETTI (canvas léger)
────────────────────────────────────────── */
let confettiAnimId = null;
const confettiParticles = [];

function launchConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiParticles.length = 0;

  const colors = ['#c9a84c','#e2c97e','#f0ede6','#ffffff','#7a7870'];

  // Créer 120 particules
  for (let i = 0; i < 120; i++) {
    confettiParticles.push({
      x:    Math.random() * confettiCanvas.width,
      y:    -20 - Math.random() * confettiCanvas.height * .5,
      w:    4 + Math.random() * 8,
      h:    6 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot:  Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - .5) * .1,
      vx:   (Math.random() - .5) * 2,
      vy:   1.5 + Math.random() * 2,
      alpha: 1
    });
  }

  function draw() {
    const ctx = confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;

    confettiParticles.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.rotSpeed;
      if (p.y > confettiCanvas.height * .7) p.alpha -= .012;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (alive) {
      confettiAnimId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  confettiAnimId = requestAnimationFrame(draw);
}

function stopConfetti() {
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  const ctx = confettiCanvas.getContext('2d');
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

/* ──────────────────────────────────────────
   15. INIT — pré-peupler 2 joueurs démo
────────────────────────────────────────── */
players = [
  { name: 'Alice',  score: 0 },
  { name: 'Thomas', score: 0 }
];
renderSetupPlayers();
