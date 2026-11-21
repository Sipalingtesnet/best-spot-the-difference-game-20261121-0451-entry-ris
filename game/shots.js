// Twin Lanterns — deterministic screenshot setup.
// One job: read ?shot= and ?seed= from the page address and arrange a fixed,
// repeatable game state so the three official screenshots always render the
// same pixels. shot=start -> title screen, shot=play -> round 1 with exactly
// three differences already found, shot=end -> the final results screen.

import {
  ROUND_SECONDS,
  HINT_POINT_COST,
  ROUND_CLEAR_TIME_BONUS_PER_SECOND,
} from "./config.js";
import { gameState, startRound, markDifferenceFound } from "./state.js";
import { spotsForRound } from "./scenes.js";

// The layout seed. The scene painters are fully deterministic (no randomness
// anywhere), so any fixed seed always yields the identical layout; seed 1 is
// the canonical screenshot layout. The value is parsed and validated here so
// the address query is honoured and available to anything seed-driven later.
export const DEFAULT_SEED = 1;

export function readShotParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const shot = (params.get("shot") || "").toLowerCase();
  const rawSeed = params.get("seed");
  const parsedSeed = rawSeed === null ? DEFAULT_SEED : Number.parseInt(rawSeed, 10);
  const seed = Number.isFinite(parsedSeed) ? parsedSeed : DEFAULT_SEED;
  return { shot, seed };
}

// Mark spots found exactly as if the player had clicked them in scene order,
// so the streak scoring in state.js does all the maths consistently.
function findSpots(roundIndex, count) {
  const spots = spotsForRound(roundIndex);
  for (let i = 0; i < count && i < spots.length; i += 1) {
    markDifferenceFound(spots[i].id);
  }
}

// A believable mid-round position for the "play" screenshot: round 1 with
// 3 of 7 found (counter reads "4 remain"), 71 seconds spent, no hints used.
function setupPlayShot() {
  startRound(0);
  findSpots(0, 3);
  gameState.remainingSeconds = ROUND_SECONDS - 71;
  gameState.hintsUsed = 0;
}

// A believable finished game for the "end" screenshot: all three rounds
// cleared with fixed per-round times, one wrong click and one hint overall.
function setupEndShot() {
  const roundSecondsSpent = [96, 118, 84];
  gameState.score = 0;
  gameState.correctClicks = 0;
  gameState.wrongClicks = 0;
  gameState.hintsUsed = 0;
  gameState.totalTimeSeconds = 0;
  for (let round = 0; round < roundSecondsSpent.length; round += 1) {
    startRound(round);
    findSpots(round, spotsForRound(round).length);
    const spent = roundSecondsSpent[round];
    gameState.remainingSeconds = ROUND_SECONDS - spent;
    gameState.totalTimeSeconds += spent;
    gameState.score += (ROUND_SECONDS - spent) * ROUND_CLEAR_TIME_BONUS_PER_SECOND;
  }
  gameState.wrongClicks = 1;
  gameState.hintsUsed = 1;
  gameState.score = Math.max(0, gameState.score - HINT_POINT_COST);
  gameState.roundIndex = roundSecondsSpent.length - 1;
  gameState.foundSpotIds = spotsForRound(gameState.roundIndex).map((s) => s.id);
  gameState.phase = "results";
}

// Apply the requested shot. Returns the shot name actually applied ("" when
// the address asked for none, meaning: normal play from the title screen).
export function applyShotSetup() {
  const { shot } = readShotParams();
  if (shot === "start") {
    gameState.phase = "title";
    return "start";
  }
  if (shot === "play") {
    setupPlayShot();
    return "play";
  }
  if (shot === "end") {
    setupEndShot();
    return "end";
  }
  return "";
}
