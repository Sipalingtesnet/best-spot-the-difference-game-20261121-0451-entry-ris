// Twin Lanterns — game configuration.
// One job: every tunable number and name the rest of the game reads.

export const GAME_TITLE = "Twin Lanterns";

// Shared picture coordinate system: both canvases paint into this size.
export const PICTURE_WIDTH = 560;
export const PICTURE_HEIGHT = 420;

// Desktop play area the layout is designed around.
export const PLAY_AREA_WIDTH = 1280;
export const PLAY_AREA_HEIGHT = 720;

export const ROUND_SECONDS = 180;
export const DIFFERENCES_PER_ROUND = 7;

// Penalties and costs.
export const WRONG_CLICK_TIME_COST_SECONDS = 5;
export const HINT_POINT_COST = 50;
export const HINT_CIRCLE_SECONDS = 4;

// Scoring.
export const POINTS_PER_DIFFERENCE = 100;
export const STREAK_BONUS_POINTS = 25; // added per consecutive find, streak - 1 times
export const ROUND_CLEAR_TIME_BONUS_PER_SECOND = 2;

// Crosshair keyboard movement, in picture units per key press.
export const CROSSHAIR_STEP = 12;
export const CROSSHAIR_START_X = PICTURE_WIDTH / 2;
export const CROSSHAIR_START_Y = PICTURE_HEIGHT / 2;

// The three rounds, in play order.
export const ROUND_NAMES = [
  "Night-Market Lantern Stall",
  "Lighthouse at Dawn",
  "Garden Tea Party",
];

export const ROUND_COUNT = ROUND_NAMES.length;
