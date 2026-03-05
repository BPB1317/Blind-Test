/* ============================================================
   BLIND TEST — SOIRÉE
   script.js — Logique complète du jeu
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   1. ÉTAT DU JEU
──────────────────────────────────────────────────────────── */

/**
 * Paramètres globaux de la partie.
 * questionsPerRound est maintenant un tableau :
 * index 0 = manche 1, index 1 = manche 2, etc.
 */
let gameSettings = {
  totalRounds: 3,
  questionsPerRound: [10, 10, 30], // ← tableau, un nombre par manche
  timerDuration: 30,
  pointsPerCorrectAnswer: 1
};

/** Liste des joueurs avec leurs scores. */
let players = [
  { name: 'Alice', score: 0 },
  { name: 'Thomas', score: 0 }
];

/** État de la partie en cours. */
let gameState = {
  currentRound: 0,        // index 0-based
  currentQuestion: 0,     // index 0-based
  timerInterval: null,    // référence setInterval
  timeLeft: 30,           // secondes restantes
  isAnswerRevealed: false
};

/* ────────────────────────────────────────────────────────────
   2. SÉLECTEURS DOM
──────────────────────────────────────────────────────────── */

const screens = {
  config:   document.getElementById('screen-config'),
  game:     document.getElementById('screen-game'),
  roundEnd: document.getElementById('screen-round-end'),
  finale:   document.getElementById('screen-finale')
};

// Config
const inputRounds    = document.getElementById('input-rounds');
const inputTimer     = document.getElementById('input-timer');
const inputPoints    = document.getElementById('input-points');
const playersList    = document.getElementById('players-list');
const roundsConfig   = document.getElementById('rounds-config');
const btnAddPlayer   = document.getElementById('btn-add-player');
const btnApplyRounds = document.getElementById('btn-apply-rounds');
const btnStart       = document.getElementById('btn-start');

// Jeu
const displayRound    = document.getElementById('display-round');
const displayQuestion = document.getElementById('display-question');
const timerCircle     = document.getElementById('timer-circle');
const timerDisplay    = document.getElementById('timer-display');
const timerWrapper    = document.querySelector('.timer-wrapper');
const gameStatus      = document.getElementById('game-status');
const answerReveal    = document.getElementById('answer-reveal');
const btnReveal       = document.getElementById('btn-reveal');
const btnNextQuestion = document.getElementById('btn-next-question');
const scoreboard      = document.getElementById('scoreboard');

// Admin
const btnToggleAdmin  = document.getElementById('btn-toggle-admin');
const adminContent    = document.getElementById('admin-content');
const adminPlayers    = document.getElementById('admin-players');
const btnNextRound    = document.getElementById('btn-next-round');
const btnReset        = document.getElementById('btn-reset');

// Fin de manche
const roundEndTitle      = document.getElementById('round-end-title');
const roundEndScoreboard = document.getElementById('round-end-scoreboard');
const btnContinueRound   = document.getElementById('btn-continue-round');

// Finale
const confettiCanvas    = document.getElementById('confetti-canvas');
const winnerName        = document.getElementById('winner-name');
const finaleScoreboard  = document.getElementById('finale-scoreboard');
const btnRestart        = document.getElementById('btn-restart');

/* ────────────────────────────────────────────────────────────
   3. NAVIGATION ENTRE ÉCRANS
──────────────────────────────────────────────────────────── */

/**
 * Affiche un écran et masque tous les autres.
 * @param {string} id - Clé de l'objet `screens`
 */
function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[id].classList.add('active');
}

/* ────────────────────────────────────────────────────────────
   4. ÉCRAN DE CONFIGURATION
──────────────────────────────────────────────────────────── */

/** Crée une ligne de saisie pour un joueur. */
function createPlayerEntry(name = '') {
  const div = document.createElement('div');
  div.className = 'player-entry';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Prénom du joueur';
  input.value = name;
  input.maxLength = 20;

  const btnRemove = document.createElement('button');
  btnRemove.className = 'btn-remove-player';
  btnRemove.textContent = '✕';
  btnRemove.title = 'Supprimer ce joueur';
  btnRemove.addEventListener('click', () => {
    div.remove();
  });

  div.appendChild(input);
  div.appendChild(btnRemove);
  playersList.appendChild(div);
}

/** Initialise la liste des joueurs avec les données par défaut. */
function initPlayersList() {
  playersList.innerHTML = '';
  players.forEach(p => createPlayerEntry(p.name));
}

/**
 * Génère les champs de configuration par manche.
 * Utilise le nombre de manches saisi et conserve
 * les valeurs déjà définies dans gameSettings.questionsPerRound.
 */
function buildRoundsConfig() {
  const n = parseInt(inputRounds.value, 10) || 3;
  roundsConfig.innerHTML = '';

  for (let i = 0; i < n; i++) {
    const current = gameSettings.questionsPerRound[i] ?? 10;

    const row = document.createElement('div');
    row.className = 'round-field';

    const label = document.createElement('span');
    label.className = 'round-field-label';
    label.innerHTML = `<strong>Manche ${i + 1}</strong> — nombre de questions`;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '100';
    input.value = current;
    input.dataset.round = i; // index 0-based

    row.appendChild(label);
    row.appendChild(input);
    roundsConfig.appendChild(row);
  }
}

/** Synchronise gameSettings.questionsPerRound avec les inputs affichés. */
function applyRoundsConfig() {
  const n = parseInt(inputRounds.value, 10) || 3;
  // Réinitialise le tableau à la bonne longueur
  gameSettings.questionsPerRound = [];

  const inputs = roundsConfig.querySelectorAll('input[type="number"]');
  inputs.forEach((inp, i) => {
    gameSettings.questionsPerRound[i] = Math.max(1, parseInt(inp.value, 10) || 10);
  });

  // S'il manque des valeurs (si buildRoundsConfig n'a pas encore été appelé)
  for (let i = gameSettings.questionsPerRound.length; i < n; i++) {
    gameSettings.questionsPerRound[i] = 10;
  }
}

/** Lit toute la configuration et prépare la partie. */
function collectConfig() {
  // Joueurs
  const entries = playersList.querySelectorAll('.player-entry input');
  players = [];
  entries.forEach(inp => {
    const name = inp.value.trim();
    if (name) players.push({ name, score: 0 });
  });

  if (players.length === 0) {
    alert('Ajoutez au moins un joueur !');
    return false;
  }

  // Paramètres globaux
  gameSettings.totalRounds   = Math.max(1, parseInt(inputRounds.value, 10) || 3);
  gameSettings.timerDuration = Math.max(5, parseInt(inputTimer.value, 10) || 30);
  gameSettings.pointsPerCorrectAnswer = Math.max(1, parseInt(inputPoints.value, 10) || 1);

  // Questions par manche (depuis les inputs affichés)
  applyRoundsConfig();

  return true;
}

/* ────────────────────────────────────────────────────────────
   5. TIMER
──────────────────────────────────────────────────────────── */

const CIRCUMFERENCE = 2 * Math.PI * 54; // rayon = 54 (cf. SVG)

/** Initialise le cercle SVG du timer. */
function initTimerCircle() {
  timerCircle.style.strokeDasharray  = CIRCUMFERENCE;
  timerCircle.style.strokeDashoffset = 0;
}

/**
 * Met à jour l'affichage du timer.
 * @param {number} timeLeft  - Secondes restantes
 * @param {number} total     - Durée totale
 */
function updateTimerDisplay(timeLeft, total) {
  const ratio  = timeLeft / total;
  const offset = CIRCUMFERENCE * (1 - ratio);

  timerCircle.style.strokeDashoffset = offset;
  timerDisplay.textContent = timeLeft;

  // Effet urgence à 5 secondes
  if (timeLeft <= 5) {
    timerWrapper.classList.add('timer-urgent');
  } else {
    timerWrapper.classList.remove('timer-urgent');
  }
}

/** Démarre le compte à rebours. */
function startTimer() {
  stopTimer(); // s'assure qu'il n'y a pas de timer parallèle

  const total = gameSettings.timerDuration;
  gameState.timeLeft = total;
  initTimerCircle();
  updateTimerDisplay(total, total);

  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft--;
    updateTimerDisplay(gameState.timeLeft, total);

    if (gameState.timeLeft <= 0) {
      stopTimer();
      onTimerEnd();
    }
  }, 1000);
}

/** Arrête le compte à rebours. */
function stopTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
}

/** Appelé quand le timer atteint 0. */
function onTimerEnd() {
  timerWrapper.classList.add('timer-urgent');
  // On peut ajouter un effet supplémentaire ici si besoin
}

/* ────────────────────────────────────────────────────────────
   6. CLASSEMENT (SCOREBOARD)
──────────────────────────────────────────────────────────── */

/**
 * Retourne les joueurs triés par score décroissant.
 * @returns {Array}
 */
function getSortedPlayers() {
  return [...players].sort((a, b) => b.score - a.score);
}

/** Met à jour l'affichage du classement dans l'écran de jeu. */
function renderScoreboard() {
  const sorted = getSortedPlayers();
  scoreboard.innerHTML = '';

  sorted.forEach((player, index) => {
    const li = document.createElement('li');
    li.className = 'scoreboard-item' + (index === 0 ? ' leader' : '');

    li.innerHTML = `
      <span class="player-score-rank">${index + 1}</span>
      <span class="player-score-name">${player.name}</span>
      <span class="player-score-pts">${player.score} pt${player.score > 1 ? 's' : ''}</span>
    `;

    scoreboard.appendChild(li);
  });
}

/* ────────────────────────────────────────────────────────────
   7. ADMIN PANEL
──────────────────────────────────────────────────────────── */

/** Construit les lignes du panel admin (une par joueur). */
function renderAdminPanel() {
  adminPlayers.innerHTML = '';

  players.forEach((player, index) => {
    const row = document.createElement('div');
    row.className = 'admin-player-row';

    // Nom
    const nameSpan = document.createElement('span');
    nameSpan.className = 'admin-player-name';
    nameSpan.textContent = player.name;

    // Bouton -1
    const btnMinus = document.createElement('button');
    btnMinus.className = 'btn-score';
    btnMinus.textContent = '−';
    btnMinus.title = '-1 point';
    btnMinus.addEventListener('click', () => {
      players[index].score = Math.max(0, players[index].score - 1);
      syncAdminScore(index, scoreInput);
      renderScoreboard();
    });

    // Champ score manuel
    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.className = 'admin-score-input';
    scoreInput.value = player.score;
    scoreInput.min = '0';
    scoreInput.addEventListener('change', () => {
      const val = parseInt(scoreInput.value, 10);
      players[index].score = isNaN(val) ? 0 : Math.max(0, val);
      scoreInput.value = players[index].score;
      renderScoreboard();
    });

    // Bouton +1
    const btnPlus = document.createElement('button');
    btnPlus.className = 'btn-score';
    btnPlus.textContent = '+';
    btnPlus.title = '+1 point';
    btnPlus.addEventListener('click', () => {
      players[index].score += gameSettings.pointsPerCorrectAnswer;
      syncAdminScore(index, scoreInput);
      renderScoreboard();
    });

    row.appendChild(nameSpan);
    row.appendChild(btnMinus);
    row.appendChild(scoreInput);
    row.appendChild(btnPlus);
    adminPlayers.appendChild(row);
  });
}

/**
 * Synchronise la valeur affichée dans l'input admin.
 * @param {number} index      - Index du joueur
 * @param {HTMLInputElement} input
 */
function syncAdminScore(index, input) {
  input.value = players[index].score;
}

/* ────────────────────────────────────────────────────────────
   8. LOGIQUE DU JEU
──────────────────────────────────────────────────────────── */

/** Démarre la partie depuis le début. */
function startGame() {
  if (!collectConfig()) return;

  // Réinitialise l'état
  gameState.currentRound    = 0;
  gameState.currentQuestion = 0;

  showScreen('game');
  startRound();
}

/** Initialise et affiche la manche courante. */
function startRound() {
  gameState.currentQuestion = 0;
  renderAdminPanel();
  startQuestion();
}

/**
 * Renvoie le nombre de questions pour la manche courante.
 * @returns {number}
 */
function getQuestionsForCurrentRound() {
  return gameSettings.questionsPerRound[gameState.currentRound] ?? 10;
}

/** Affiche et démarre la question courante. */
function startQuestion() {
  const round    = gameState.currentRound + 1;
  const question = gameState.currentQuestion + 1;
  const total    = getQuestionsForCurrentRound();

  // Mise à jour de l'en-tête
  displayRound.textContent    = `Manche ${round}`;
  displayQuestion.textContent = `Question ${question} / ${total}`;

  // Réinitialise l'affichage
  answerReveal.classList.add('hidden');
  gameStatus.classList.remove('hidden');
  gameState.isAnswerRevealed = false;

  // Démarre le timer
  startTimer();

  // Classement
  renderScoreboard();
}

/** Passe à la question suivante ou à la fin de manche. */
function nextQuestion() {
  stopTimer();

  gameState.currentQuestion++;
  const totalQuestions = getQuestionsForCurrentRound();

  if (gameState.currentQuestion >= totalQuestions) {
    // Fin de manche
    showRoundEnd();
  } else {
    startQuestion();
  }
}

/** Passe à la manche suivante (depuis le panel admin). */
function nextRound() {
  stopTimer();
  showRoundEnd();
}

/* ────────────────────────────────────────────────────────────
   9. ÉCRAN FIN DE MANCHE
──────────────────────────────────────────────────────────── */

/** Affiche l'écran de fin de manche avec le classement. */
function showRoundEnd() {
  const roundNumber = gameState.currentRound + 1;
  roundEndTitle.textContent = `Manche ${roundNumber}`;

  // Classement
  const sorted = getSortedPlayers();
  roundEndScoreboard.innerHTML = '';

  sorted.forEach((player, index) => {
    const li = document.createElement('li');
    li.className = 'end-score-item' + (index === 0 ? ' first-place' : '');
    li.style.setProperty('--i', index);

    li.innerHTML = `
      <span class="end-rank">${index + 1}</span>
      <span class="end-name">${player.name}</span>
      <span class="end-pts">${player.score} pt${player.score > 1 ? 's' : ''}</span>
    `;

    roundEndScoreboard.appendChild(li);
  });

  showScreen('roundEnd');
}

/** Appelé au clic sur "Continuer" depuis la fin de manche. */
function continueAfterRound() {
  gameState.currentRound++;

  if (gameState.currentRound >= gameSettings.totalRounds) {
    // Toutes les manches sont terminées → finale
    showFinale();
  } else {
    // Prochaine manche
    showScreen('game');
    startRound();
  }
}

/* ────────────────────────────────────────────────────────────
   10. ÉCRAN FINALE
──────────────────────────────────────────────────────────── */

/** Affiche l'écran de fin de partie avec le gagnant. */
function showFinale() {
  const sorted = getSortedPlayers();
  const winner = sorted[0];

  winnerName.textContent = winner.name;

  // Classement final
  finaleScoreboard.innerHTML = '';
  sorted.forEach((player, index) => {
    const li = document.createElement('li');
    li.className = 'end-score-item' + (index === 0 ? ' first-place' : '');
    li.style.setProperty('--i', index);

    li.innerHTML = `
      <span class="end-rank">${index + 1}</span>
      <span class="end-name">${player.name}</span>
      <span class="end-pts">${player.score} pt${player.score > 1 ? 's' : ''}</span>
    `;

    finaleScoreboard.appendChild(li);
  });

  showScreen('finale');
  launchConfetti();
}

/* ────────────────────────────────────────────────────────────
   11. CONFETTIS (canvas, sans librairie)
──────────────────────────────────────────────────────────── */

let confettiActive = false;

/**
 * Lance une animation de confettis en teintes dorées.
 * Dessinés sur un canvas, aucune librairie requise.
 */
function launchConfetti() {
  const canvas = confettiCanvas;
  const ctx    = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  confettiActive = true;

  // Palette sobre : or, blanc cassé, beige
  const COLORS = ['#c9a84c', '#e8c97e', '#f0ece4', '#a07830', '#d4b86a'];

  // Création des particules
  const particles = Array.from({ length: 80 }, () => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * -canvas.height,
    w:    Math.random() * 8 + 4,
    h:    Math.random() * 4 + 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    speed: Math.random() * 2 + 1.5,
    angle: Math.random() * Math.PI * 2,
    spin:  (Math.random() - 0.5) * 0.15,
    drift: (Math.random() - 0.5) * 1
  }));

  let frame = 0;
  const MAX_FRAMES = 300; // ~5 secondes à 60fps

  function draw() {
    if (!confettiActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.y     += p.speed;
      p.x     += p.drift;
      p.angle += p.spin;

      // Repositionne en haut si la particule sort en bas
      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    frame++;
    if (frame < MAX_FRAMES) {
      requestAnimationFrame(draw);
    } else {
      // Fondu de sortie
      let alpha = 1;
      const fade = setInterval(() => {
        alpha -= 0.05;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = alpha;
        if (alpha <= 0) {
          clearInterval(fade);
          confettiActive = false;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 50);
    }
  }

  draw();
}

/* ────────────────────────────────────────────────────────────
   12. RÉINITIALISATION
──────────────────────────────────────────────────────────── */

/** Remet tout à zéro et retourne à l'écran de configuration. */
function resetGame() {
  stopTimer();
  confettiActive = false;

  // Remet les scores à 0
  players.forEach(p => { p.score = 0; });

  gameState.currentRound    = 0;
  gameState.currentQuestion = 0;

  showScreen('config');
  initPlayersList();
  buildRoundsConfig();
}

/* ────────────────────────────────────────────────────────────
   13. ÉVÉNEMENTS
──────────────────────────────────────────────────────────── */

// Config : ajouter un joueur
btnAddPlayer.addEventListener('click', () => {
  createPlayerEntry('');
  // Focus sur le nouveau champ
  const entries = playersList.querySelectorAll('.player-entry input');
  entries[entries.length - 1].focus();
});

// Config : mettre à jour l'affichage des manches
btnApplyRounds.addEventListener('click', () => {
  applyRoundsConfig();       // sauvegarde les valeurs courantes
  buildRoundsConfig();       // reconstruit avec le bon nombre de lignes
});

// Le nombre de manches change → on reconstruit les champs
inputRounds.addEventListener('change', () => {
  applyRoundsConfig();
  buildRoundsConfig();
});

// Lancer la partie
btnStart.addEventListener('click', startGame);

// Révéler la réponse
btnReveal.addEventListener('click', () => {
  if (!gameState.isAnswerRevealed) {
    stopTimer();
    gameStatus.classList.add('hidden');
    answerReveal.classList.remove('hidden');
    gameState.isAnswerRevealed = true;
  }
});

// Question suivante
btnNextQuestion.addEventListener('click', nextQuestion);

// Admin : toggle panel
btnToggleAdmin.addEventListener('click', () => {
  adminContent.classList.toggle('hidden');
  btnToggleAdmin.textContent = adminContent.classList.contains('hidden')
    ? '⚙ Admin'
    : '✕ Fermer';
});

// Admin : manche suivante
btnNextRound.addEventListener('click', () => {
  if (confirm('Passer à la manche suivante ?')) {
    nextRound();
  }
});

// Admin : réinitialiser
btnReset.addEventListener('click', () => {
  if (confirm('Réinitialiser la partie ?')) {
    resetGame();
  }
});

// Fin de manche : continuer
btnContinueRound.addEventListener('click', continueAfterRound);

// Finale : nouvelle partie
btnRestart.addEventListener('click', resetGame);

// Redimensionnement du canvas confettis
window.addEventListener('resize', () => {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

/* ────────────────────────────────────────────────────────────
   14. INITIALISATION
──────────────────────────────────────────────────────────── */

/** Point d'entrée : prépare l'interface au chargement de la page. */
function init() {
  // Pré-remplit la liste des joueurs
  initPlayersList();

  // Construit les champs de questions par manche
  buildRoundsConfig();

  // Affiche l'écran de configuration
  showScreen('config');
}

init();
