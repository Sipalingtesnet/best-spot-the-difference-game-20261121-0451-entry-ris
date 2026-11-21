// Twin Lanterns — mouse and keyboard input.
// One job: turn raw pointer/keyboard events into game intentions. It converts a
// click on either picture into shared picture coordinates, decides whether a
// difference sits there, and drives the crosshair. It never draws or plays sound
// itself; it reports outcomes through the handler callbacks bootstrap supplies.

import {
  PICTURE_WIDTH,
  PICTURE_HEIGHT,
  CROSSHAIR_STEP,
} from "./config.js";
import {
  gameState,
  startRound,
  markDifferenceFound,
  recordWrongClick,
  useHint,
  isRoundCleared,
  advanceRound,
  moveCrosshair,
  toggleSoundMuted,
  resetGame,
} from "./state.js";
import { spotsForRound } from "./scenes.js";

// Which picture the keyboard crosshair currently lives on.
let activeSide = "left";
export function getActiveSide() {
  return activeSide;
}

let handlers = null;
let leftCanvas = null;
let rightCanvas = null;

// Convert a pointer event on a canvas into shared 560x420 picture coordinates.
// Returns null when the point falls outside the picture (so we can ignore it).
function toPictureCoords(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = ((event.clientX - rect.left) / rect.width) * PICTURE_WIDTH;
  const y = ((event.clientY - rect.top) / rect.height) * PICTURE_HEIGHT;
  if (x < 0 || y < 0 || x > PICTURE_WIDTH || y > PICTURE_HEIGHT) return null;
  return { x, y };
}

// The first unfound difference whose circle contains the point, or null.
function spotAtPoint(x, y) {
  const spots = spotsForRound(gameState.roundIndex);
  for (const spot of spots) {
    if (gameState.foundSpotIds.includes(spot.id)) continue;
    const dx = x - spot.x;
    const dy = y - spot.y;
    if (dx * dx + dy * dy <= spot.r * spot.r) return spot;
  }
  return null;
}

// Pick a deterministic unfound spot to hint (first in scene order).
function firstUnfoundSpot() {
  const spots = spotsForRound(gameState.roundIndex);
  return spots.find((s) => !gameState.foundSpotIds.includes(s.id)) || null;
}

// Shared mark logic for both mouse clicks and the crosshair confirm key.
function attemptMark(x, y) {
  const spot = spotAtPoint(x, y);
  if (spot) {
    const earned = markDifferenceFound(spot.id);
    handlers.onFound(spot, earned);
    if (isRoundCleared()) {
      gameState.phase = "round-complete";
      handlers.onRoundComplete();
    }
  } else {
    recordWrongClick();
    handlers.onWrong();
  }
}

function startPlaying() {
  startRound(0);
  handlers.onStart();
}

function doAdvance() {
  const outcome = advanceRound();
  handlers.onAdvance(outcome);
}

function doHint() {
  const spot = firstUnfoundSpot();
  if (spot && useHint(spot.id)) handlers.onHint(spot);
}

function doRestart() {
  if (gameState.phase === "results" || gameState.phase === "title") {
    resetGame();
    handlers.onRestartToTitle();
  } else {
    startRound(gameState.roundIndex);
    handlers.onRestart();
  }
}

function doMute() {
  const muted = toggleSoundMuted();
  handlers.onMute(muted);
}

// A click on a picture: route by phase.
function onPictureClick(side, event) {
  activeSide = side;
  const point = toPictureCoords(side === "left" ? leftCanvas : rightCanvas, event);
  if (!point) return; // outside the picture: ignore entirely
  if (gameState.phase === "title") {
    startPlaying();
    return;
  }
  if (gameState.phase === "round-complete") {
    doAdvance();
    return;
  }
  if (gameState.phase === "results") {
    resetGame();
    handlers.onRestartToTitle();
    return;
  }
  // playing
  gameState.crosshair.x = point.x;
  gameState.crosshair.y = point.y;
  attemptMark(point.x, point.y);
}

function onKeyDown(event) {
  const key = event.key;
  const phase = gameState.phase;

  // Mute works in every phase.
  if (key === "m" || key === "M") {
    event.preventDefault();
    doMute();
    return;
  }

  if (phase === "title") {
    if (key === "Enter" || key === " " || key === "Spacebar") {
      event.preventDefault();
      startPlaying();
    }
    return;
  }

  if (phase === "results") {
    if (key === "Enter" || key === " " || key === "Spacebar" || key === "r" || key === "R") {
      event.preventDefault();
      resetGame();
      handlers.onRestartToTitle();
    }
    return;
  }

  if (phase === "round-complete") {
    if (key === "n" || key === "N" || key === "Enter" || key === " " || key === "Spacebar") {
      event.preventDefault();
      doAdvance();
    } else if (key === "r" || key === "R") {
      event.preventDefault();
      doRestart();
    }
    return;
  }

  // phase === "playing"
  switch (key) {
    case "ArrowLeft":
      event.preventDefault();
      moveCrosshair(-CROSSHAIR_STEP, 0);
      break;
    case "ArrowRight":
      event.preventDefault();
      moveCrosshair(CROSSHAIR_STEP, 0);
      break;
    case "ArrowUp":
      event.preventDefault();
      moveCrosshair(0, -CROSSHAIR_STEP);
      break;
    case "ArrowDown":
      event.preventDefault();
      moveCrosshair(0, CROSSHAIR_STEP);
      break;
    case "Enter":
    case " ":
    case "Spacebar":
      event.preventDefault();
      attemptMark(gameState.crosshair.x, gameState.crosshair.y);
      break;
    case "h":
    case "H":
      event.preventDefault();
      doHint();
      break;
    case "r":
    case "R":
      event.preventDefault();
      doRestart();
      break;
    case "Tab":
      // Let Tab flip the active picture for the crosshair without marking.
      activeSide = activeSide === "left" ? "right" : "left";
      break;
    default:
      break;
  }
}

// Wire up all listeners. `h` is the callback bundle from bootstrap.
export function initInput(h) {
  handlers = h;
  leftCanvas = document.getElementById("left-picture");
  rightCanvas = document.getElementById("right-picture");

  leftCanvas.addEventListener("click", (e) => onPictureClick("left", e));
  rightCanvas.addEventListener("click", (e) => onPictureClick("right", e));
  window.addEventListener("keydown", onKeyDown);

  document.getElementById("hint-button").addEventListener("click", () => {
    if (gameState.phase === "playing") doHint();
  });
  document.getElementById("restart-button").addEventListener("click", doRestart);
  document.getElementById("mute-button").addEventListener("click", doMute);
}
