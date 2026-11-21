// Twin Lanterns — game bootstrap.
// One job: wire state, input, rendering and sound together, apply the
// deterministic screenshot setup, and run the animation + one-second clock.
// Gameplay rules live in state.js; this file only orchestrates.

import { gameState, tickOneSecond, endRoundOnTimeout } from "./state.js";
import { initInput, getActiveSide } from "./input.js";
import { initRender, renderFrame, setMessage, shakePanel } from "./render.js";
import {
  initSound,
  playFoundChime,
  playWrongBuzz,
  playButtonTick,
  playRoundFanfare,
} from "./sound.js";
import { applyShotSetup } from "./shots.js";
import { HINT_POINT_COST } from "./config.js";

// ---------- outcome handlers handed to the input module ----------

const handlers = {
  onStart() {
    playButtonTick();
    setMessage("Find all 7 differences. Click either picture, or use the arrow keys and Enter.");
  },
  onFound(spot, earned) {
    playFoundChime();
    setMessage(`Found: ${spot.name}! +${earned} points`, "good");
  },
  onWrong() {
    playWrongBuzz();
    shakePanel(getActiveSide());
    setMessage("Not there - 5 seconds lost. Keep looking!", "bad");
  },
  onRoundComplete() {
    playRoundFanfare();
    setMessage("Round complete! Press N to continue.", "good");
  },
  onAdvance(outcome) {
    playButtonTick();
    if (outcome === "results") {
      setMessage("All three rounds done - here are your results. Press R to play again.", "good");
    } else {
      setMessage(`Round ${gameState.roundIndex + 1}: find all 7 differences!`);
    }
  },
  onHint(spot) {
    playButtonTick();
    setMessage(`Hint: look near the ${spot.name.toLowerCase()} (-${HINT_POINT_COST} points)`, "bad");
  },
  onRestart() {
    playButtonTick();
    setMessage("Round restarted. Find all 7 differences.");
  },
  onRestartToTitle() {
    playButtonTick();
    setMessage("Click a difference on either picture, or steer the crosshair with the arrow keys and press Enter.");
  },
  onMute(muted) {
    // Deliberately silent: no tick when muting, a soft tick when unmuting.
    if (!muted) playButtonTick();
    setMessage(muted ? "Sound muted." : "Sound on.");
  },
};

// ---------- animation loop and one-second clock ----------

let lastFrameTime = null;
let secondAccumulator = 0;

function frame(now) {
  if (lastFrameTime === null) lastFrameTime = now;
  const elapsed = Math.min(0.25, (now - lastFrameTime) / 1000); // clamp tab-switch jumps
  lastFrameTime = now;

  if (gameState.phase === "playing") {
    secondAccumulator += elapsed;
    while (secondAccumulator >= 1) {
      secondAccumulator -= 1;
      const timedOut = tickOneSecond();
      if (timedOut) {
        secondAccumulator = 0;
        const outcome = endRoundOnTimeout();
        playWrongBuzz();
        if (outcome === "results") {
          setMessage("Time ran out on the last round - here are your results.", "bad");
        } else {
          setMessage(`Time ran out! Moving to round ${gameState.roundIndex + 1}.`, "bad");
        }
        break;
      }
    }
  } else {
    secondAccumulator = 0;
  }

  renderFrame();
  window.requestAnimationFrame(frame);
}

// ---------- start everything ----------

function boot() {
  initRender();
  initSound();
  initInput(handlers);

  const shot = applyShotSetup();
  if (shot === "play") {
    setMessage("Find the remaining 4 differences. Click either picture, or use the arrow keys and Enter.");
  } else if (shot === "end") {
    setMessage("All three rounds done - here are your results. Press R to play again.", "good");
  }

  renderFrame(); // paint immediately so screenshots never catch a blank canvas
  window.requestAnimationFrame(frame);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
