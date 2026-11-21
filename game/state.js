// Twin Lanterns — game state.
// One job: hold the mutable game state and change it through named functions.
// No drawing, no DOM, no sound here; other modules read this and react.

import {
  ROUND_SECONDS,
  DIFFERENCES_PER_ROUND,
  WRONG_CLICK_TIME_COST_SECONDS,
  HINT_POINT_COST,
  HINT_CIRCLE_SECONDS,
  POINTS_PER_DIFFERENCE,
  STREAK_BONUS_POINTS,
  ROUND_CLEAR_TIME_BONUS_PER_SECOND,
  CROSSHAIR_START_X,
  CROSSHAIR_START_Y,
  PICTURE_WIDTH,
  PICTURE_HEIGHT,
  ROUND_COUNT,
} from "./config.js";

export const gameState = {
  phase: "title", // title | playing | round-complete | results
  roundIndex: 0,
  foundSpotIds: [], // ids of differences found this round
  remainingSeconds: ROUND_SECONDS,
  score: 0,
  streak: 0,
  correctClicks: 0,
  wrongClicks: 0,
  hintsUsed: 0,
  soundMuted: false,
  crosshair: { x: CROSSHAIR_START_X, y: CROSSHAIR_START_Y },
  hintSpotId: null,
  hintSecondsLeft: 0,
  totalTimeSeconds: 0, // seconds actually spent across finished rounds
  lastRoundBonus: 0,
};

function clampCrosshair() {
  gameState.crosshair.x = Math.min(PICTURE_WIDTH, Math.max(0, gameState.crosshair.x));
  gameState.crosshair.y = Math.min(PICTURE_HEIGHT, Math.max(0, gameState.crosshair.y));
}

// Begin (or restart) the given round. Keeps score, accuracy and mute setting.
export function startRound(roundIndex) {
  gameState.phase = "playing";
  gameState.roundIndex = roundIndex;
  gameState.foundSpotIds = [];
  gameState.remainingSeconds = ROUND_SECONDS;
  gameState.streak = 0;
  gameState.hintSpotId = null;
  gameState.hintSecondsLeft = 0;
  gameState.lastRoundBonus = 0;
  gameState.crosshair = { x: CROSSHAIR_START_X, y: CROSSHAIR_START_Y };
}

// Mark one difference found. Returns points earned, or 0 if already found.
export function markDifferenceFound(spotId) {
  if (gameState.foundSpotIds.includes(spotId)) return 0;
  gameState.foundSpotIds.push(spotId);
  gameState.correctClicks += 1;
  gameState.streak += 1;
  const earned = POINTS_PER_DIFFERENCE + STREAK_BONUS_POINTS * (gameState.streak - 1);
  gameState.score += earned;
  if (gameState.hintSpotId === spotId) {
    gameState.hintSpotId = null;
    gameState.hintSecondsLeft = 0;
  }
  return earned;
}

// A click that hit no difference: cost time, break the streak.
export function recordWrongClick() {
  gameState.wrongClicks += 1;
  gameState.streak = 0;
  gameState.remainingSeconds = Math.max(0, gameState.remainingSeconds - WRONG_CLICK_TIME_COST_SECONDS);
}

// Spend points to faintly circle one unfound difference. Returns true if a hint fired.
export function useHint(unfoundSpotId) {
  if (gameState.phase !== "playing" || !unfoundSpotId) return false;
  gameState.hintsUsed += 1;
  gameState.score = Math.max(0, gameState.score - HINT_POINT_COST);
  gameState.hintSpotId = unfoundSpotId;
  gameState.hintSecondsLeft = HINT_CIRCLE_SECONDS;
  return true;
}

// Called once per second while playing. Returns true when time just ran out.
export function tickOneSecond() {
  if (gameState.phase !== "playing") return false;
  gameState.remainingSeconds = Math.max(0, gameState.remainingSeconds - 1);
  if (gameState.hintSecondsLeft > 0) {
    gameState.hintSecondsLeft -= 1;
    if (gameState.hintSecondsLeft === 0) gameState.hintSpotId = null;
  }
  return gameState.remainingSeconds === 0;
}

export function isRoundCleared() {
  return gameState.foundSpotIds.length >= DIFFERENCES_PER_ROUND;
}

// Finish the current round: bank the time bonus, then move on.
// Returns "next-round" or "results".
export function advanceRound() {
  const timeBonus = gameState.remainingSeconds * ROUND_CLEAR_TIME_BONUS_PER_SECOND;
  gameState.score += timeBonus;
  gameState.totalTimeSeconds += ROUND_SECONDS - gameState.remainingSeconds;
  if (gameState.roundIndex + 1 < ROUND_COUNT) {
    startRound(gameState.roundIndex + 1);
    gameState.lastRoundBonus = timeBonus; // startRound zeroes it; keep the earned bonus visible
    return "next-round";
  }
  gameState.phase = "results";
  gameState.lastRoundBonus = timeBonus;
  return "results";
}

// Time ran out before all 7 were found: bank no bonus, still move on.
export function endRoundOnTimeout() {
  gameState.totalTimeSeconds += ROUND_SECONDS;
  gameState.lastRoundBonus = 0;
  if (gameState.roundIndex + 1 < ROUND_COUNT) {
    startRound(gameState.roundIndex + 1);
    return "next-round";
  }
  gameState.phase = "results";
  return "results";
}

export function moveCrosshair(dx, dy) {
  gameState.crosshair.x += dx;
  gameState.crosshair.y += dy;
  clampCrosshair();
}

export function toggleSoundMuted() {
  gameState.soundMuted = !gameState.soundMuted;
  return gameState.soundMuted;
}

export function accuracyPercent() {
  const attempts = gameState.correctClicks + gameState.wrongClicks;
  if (attempts === 0) return 100;
  return Math.round((gameState.correctClicks / attempts) * 100);
}

// Full reset back to the title screen: everything zeroed except the mute setting.
export function resetGame() {
  const keepMuted = gameState.soundMuted;
  gameState.phase = "title";
  gameState.roundIndex = 0;
  gameState.foundSpotIds = [];
  gameState.remainingSeconds = ROUND_SECONDS;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.correctClicks = 0;
  gameState.wrongClicks = 0;
  gameState.hintsUsed = 0;
  gameState.soundMuted = keepMuted;
  gameState.crosshair = { x: CROSSHAIR_START_X, y: CROSSHAIR_START_Y };
  gameState.hintSpotId = null;
  gameState.hintSecondsLeft = 0;
  gameState.totalTimeSeconds = 0;
  gameState.lastRoundBonus = 0;
}
