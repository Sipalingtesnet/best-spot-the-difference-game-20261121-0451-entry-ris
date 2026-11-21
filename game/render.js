// Twin Lanterns — rendering.
// One job: put pixels and text on screen. It paints both pictures through the
// scene painters, draws found markers, the hint circle and the crosshair, keeps
// the top bar counters fresh, shakes a panel on a wrong click, and draws the
// title, round-complete and results screens. It only reads state (plus the
// active picture side reported by the input module); it never changes gameplay.

import {
  GAME_TITLE,
  PICTURE_WIDTH,
  PICTURE_HEIGHT,
  DIFFERENCES_PER_ROUND,
  ROUND_NAMES,
  ROUND_COUNT,
  HINT_POINT_COST,
  ROUND_CLEAR_TIME_BONUS_PER_SECOND,
} from "./config.js";
import { gameState, accuracyPercent } from "./state.js";
import { paintPicture, spotsForRound } from "./scenes.js";
import { getActiveSide } from "./input.js";

// ---------- element handles ----------

let leftCanvas = null;
let rightCanvas = null;
let leftCtx = null;
let rightCtx = null;
let roundNameEl = null;
let foundCountEl = null;
let remainCountEl = null;
let timerEl = null;
let timerStatEl = null;
let scoreEl = null;
let streakEl = null;
let muteButtonEl = null;
let messageEl = null;
let leftPanelEl = null;
let rightPanelEl = null;

// Offscreen copies of the two paintings, so the animation loop only re-runs the
// scene painters when the round actually changes, not sixty times a second.
let leftBase = null;
let rightBase = null;
let cachedRoundIndex = -1;

// ---------- small drawing helpers ----------

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function centeredText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, PICTURE_WIDTH / 2, y);
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function starCount() {
  const accuracy = accuracyPercent();
  if (accuracy >= 90 && gameState.hintsUsed === 0) return 3;
  if (accuracy >= 70 && gameState.hintsUsed <= 2) return 2;
  return 1;
}

function drawStarShape(ctx, cx, cy, outerRadius, color) {
  const innerRadius = outerRadius * 0.45;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// ---------- init ----------

export function initRender() {
  leftCanvas = document.getElementById("left-picture");
  rightCanvas = document.getElementById("right-picture");
  leftCtx = leftCanvas.getContext("2d");
  rightCtx = rightCanvas.getContext("2d");
  roundNameEl = document.getElementById("round-name");
  foundCountEl = document.getElementById("found-count");
  remainCountEl = document.getElementById("remain-count");
  timerEl = document.getElementById("timer");
  timerStatEl = timerEl.closest(".stat-timer");
  scoreEl = document.getElementById("score");
  streakEl = document.getElementById("streak");
  muteButtonEl = document.getElementById("mute-button");
  messageEl = document.getElementById("message-line");
  leftPanelEl = document.getElementById("left-panel");
  rightPanelEl = document.getElementById("right-panel");
  cachedRoundIndex = -1;
}

// ---------- message line ----------

export function setMessage(text, tone = "") {
  messageEl.textContent = text;
  messageEl.classList.toggle("is-good", tone === "good");
  messageEl.classList.toggle("is-bad", tone === "bad");
}

// ---------- wrong-click shake ----------

export function shakePanel(side) {
  const panel = side === "right" ? rightPanelEl : leftPanelEl;
  // Force the CSS animation to restart even on rapid consecutive wrong clicks.
  panel.classList.remove("is-shaking");
  void panel.offsetWidth;
  panel.classList.add("is-shaking");
  panel.addEventListener("animationend", () => panel.classList.remove("is-shaking"), { once: true });
}

// ---------- top bar ----------

function updateTopBar() {
  const found = gameState.foundSpotIds.length;
  const remain = DIFFERENCES_PER_ROUND - found;
  roundNameEl.textContent =
    gameState.phase === "title"
      ? "Three rounds - seven differences each"
      : `Round ${gameState.roundIndex + 1} of ${ROUND_COUNT} - ${ROUND_NAMES[gameState.roundIndex]}`;
  foundCountEl.textContent = `${found} / ${DIFFERENCES_PER_ROUND}`;
  remainCountEl.textContent = remain === 1 ? "1 remains" : `${remain} remain`;
  timerEl.textContent = formatClock(gameState.remainingSeconds);
  timerStatEl.classList.toggle("is-low", gameState.phase === "playing" && gameState.remainingSeconds <= 30);
  scoreEl.textContent = String(gameState.score);
  streakEl.textContent = `streak ${gameState.streak}`;
  muteButtonEl.textContent = gameState.soundMuted ? "Muted (M)" : "Sound on (M)";
  muteButtonEl.setAttribute("aria-pressed", String(gameState.soundMuted));
}

// ---------- scene caching ----------

function refreshSceneCache() {
  if (cachedRoundIndex === gameState.roundIndex) return;
  if (!leftBase) {
    leftBase = document.createElement("canvas");
    rightBase = document.createElement("canvas");
    leftBase.width = PICTURE_WIDTH;
    leftBase.height = PICTURE_HEIGHT;
    rightBase.width = PICTURE_WIDTH;
    rightBase.height = PICTURE_HEIGHT;
  }
  paintPicture(leftBase.getContext("2d"), gameState.roundIndex, "left");
  paintPicture(rightBase.getContext("2d"), gameState.roundIndex, "right");
  cachedRoundIndex = gameState.roundIndex;
}

// ---------- markers, hint, crosshair ----------

function drawFoundMarkers(ctx) {
  const spots = spotsForRound(gameState.roundIndex);
  for (const spot of spots) {
    if (!gameState.foundSpotIds.includes(spot.id)) continue;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#e5484d";
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHintCircle(ctx) {
  if (!gameState.hintSpotId || gameState.hintSecondsLeft <= 0) return;
  const spot = spotsForRound(gameState.roundIndex).find((s) => s.id === gameState.hintSpotId);
  if (!spot) return;
  const fade = Math.min(1, gameState.hintSecondsLeft / 2);
  ctx.save();
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = `rgba(255,207,125,${0.35 + 0.4 * fade})`;
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, spot.r + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCrosshair(ctx) {
  const { x, y } = gameState.crosshair;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(58,36,48,0.85)";
  crosshairStrokes(ctx, x, y);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "#fff3e0";
  crosshairStrokes(ctx, x, y);
  ctx.restore();
}

function crosshairStrokes(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.moveTo(x - 20, y);
  ctx.lineTo(x - 5, y);
  ctx.moveTo(x + 5, y);
  ctx.lineTo(x + 20, y);
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x, y - 5);
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x, y + 20);
  ctx.stroke();
}

// ---------- overlay screens ----------

function dimPicture(ctx, alpha) {
  ctx.fillStyle = `rgba(26,14,38,${alpha})`;
  ctx.fillRect(0, 0, PICTURE_WIDTH, PICTURE_HEIGHT);
}

function drawTitleScreen(ctx) {
  dimPicture(ctx, 0.66);
  // Two little lanterns flanking the title, echoing the game's name.
  for (const lx of [PICTURE_WIDTH / 2 - 150, PICTURE_WIDTH / 2 + 150]) {
    const glow = ctx.createRadialGradient(lx, 120, 0, lx, 120, 42);
    glow.addColorStop(0, "rgba(255,190,110,0.55)");
    glow.addColorStop(1, "rgba(255,190,110,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 42, 78, 84, 84);
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.ellipse(lx, 120, 15, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a4a2a";
    ctx.fillRect(lx - 6, 97, 12, 5);
    ctx.fillRect(lx - 6, 138, 12, 5);
  }
  centeredText(ctx, GAME_TITLE, 170, "800 46px 'Trebuchet MS', Verdana, sans-serif", "#ffcf7d");
  centeredText(ctx, "A spot-the-difference game in three rounds", 208, "700 19px 'Trebuchet MS', Verdana, sans-serif", "#fff3e0");

  roundedRectPath(ctx, 90, 238, PICTURE_WIDTH - 180, 96, 14);
  ctx.fillStyle = "rgba(255,243,224,0.12)";
  ctx.fill();
  centeredText(ctx, "Click a difference on either picture - or steer the crosshair", 262, "700 16px 'Trebuchet MS', Verdana, sans-serif", "#ffe9c8");
  centeredText(ctx, "with the arrow keys and press Enter / Space to mark it.", 284, "700 16px 'Trebuchet MS', Verdana, sans-serif", "#ffe9c8");
  centeredText(ctx, `H hint (-${HINT_POINT_COST} pts)   R restart   N next round   M mute`, 312, "700 15px 'Trebuchet MS', Verdana, sans-serif", "#ffcf7d");

  centeredText(ctx, "Press Enter or click a picture to begin", 372, "800 21px 'Trebuchet MS', Verdana, sans-serif", "#9fe6b0");
}

function drawRoundCompleteOverlay(ctx) {
  dimPicture(ctx, 0.6);
  // The bonus is banked by advanceRound(); until then it is still pending,
  // computed from the frozen timer so the overlay shows the same number.
  const pendingBonus = gameState.remainingSeconds * ROUND_CLEAR_TIME_BONUS_PER_SECOND;
  roundedRectPath(ctx, 80, 110, PICTURE_WIDTH - 160, 200, 18);
  ctx.fillStyle = "rgba(43,27,61,0.92)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffcf7d";
  ctx.stroke();
  centeredText(ctx, `Round ${gameState.roundIndex + 1} complete!`, 150, "800 30px 'Trebuchet MS', Verdana, sans-serif", "#ffcf7d");
  centeredText(ctx, "All 7 differences found", 186, "700 18px 'Trebuchet MS', Verdana, sans-serif", "#fff3e0");
  centeredText(ctx, `Time bonus +${pendingBonus}   Score ${gameState.score}`, 218, "700 18px 'Trebuchet MS', Verdana, sans-serif", "#9fe6b0");
  const nextLine =
    gameState.roundIndex + 1 < ROUND_COUNT
      ? `Press N for round ${gameState.roundIndex + 2}: ${ROUND_NAMES[gameState.roundIndex + 1]}`
      : "Press N to see your results";
  centeredText(ctx, nextLine, 268, "800 17px 'Trebuchet MS', Verdana, sans-serif", "#ffe9c8");
}

function drawResultsScreen(ctx) {
  dimPicture(ctx, 0.72);
  centeredText(ctx, "Results", 84, "800 40px 'Trebuchet MS', Verdana, sans-serif", "#ffcf7d");
  const stars = starCount();
  for (let i = 0; i < 3; i += 1) {
    const cx = PICTURE_WIDTH / 2 + (i - 1) * 70;
    drawStarShape(ctx, cx, 140, 26, i < stars ? "#ffcf7d" : "rgba(255,243,224,0.22)");
  }
  centeredText(ctx, `Total score: ${gameState.score}`, 208, "800 26px 'Trebuchet MS', Verdana, sans-serif", "#fff3e0");
  centeredText(ctx, `Total time: ${formatClock(gameState.totalTimeSeconds)}`, 244, "700 20px 'Trebuchet MS', Verdana, sans-serif", "#ffe9c8");
  centeredText(ctx, `Accuracy: ${accuracyPercent()}%   Hints used: ${gameState.hintsUsed}`, 276, "700 20px 'Trebuchet MS', Verdana, sans-serif", "#ffe9c8");
  const verdict = stars === 3 ? "Lantern master!" : stars === 2 ? "Sharp eyes!" : "Keep looking!";
  centeredText(ctx, verdict, 318, "800 22px 'Trebuchet MS', Verdana, sans-serif", "#9fe6b0");
  centeredText(ctx, "Press R or Enter to play again", 372, "700 18px 'Trebuchet MS', Verdana, sans-serif", "#ffcf7d");
}

// ---------- per-frame entry point ----------

export function renderFrame() {
  refreshSceneCache();
  const phase = gameState.phase;
  const activeSide = getActiveSide();

  for (const [ctx, base, side] of [[leftCtx, leftBase, "left"], [rightCtx, rightBase, "right"]]) {
    ctx.drawImage(base, 0, 0);
    drawFoundMarkers(ctx);
    if (phase === "playing") {
      drawHintCircle(ctx);
      if (side === activeSide) drawCrosshair(ctx);
    } else if (phase === "title") {
      drawTitleScreen(ctx);
    } else if (phase === "round-complete") {
      drawRoundCompleteOverlay(ctx);
    } else if (phase === "results") {
      drawResultsScreen(ctx);
    }
  }
  updateTopBar();
}
