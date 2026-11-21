// Twin Lanterns — scene painters and difference definitions.
// One job: paint each round's two pictures with canvas shapes and gradients,
// and record where the 7 differences sit on the shared 560x420 picture grid.
// Every painter is deterministic: same input, same pixels, no randomness.

import { PICTURE_WIDTH, PICTURE_HEIGHT } from "./config.js";

// ---------- small shared shape helpers ----------

function fillSkyGradient(ctx, stops) {
  const sky = ctx.createLinearGradient(0, 0, 0, PICTURE_HEIGHT);
  for (const [offset, color] of stops) sky.addColorStop(offset, color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, PICTURE_WIDTH, PICTURE_HEIGHT);
}

function drawCircle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEllipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawTriangle(ctx, x1, y1, x2, y2, x3, y3, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

function drawFivePointStar(ctx, cx, cy, outerRadius, color) {
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

function drawGlow(ctx, x, y, radius, color) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// A hanging paper lantern with a string, ribs and a warm glow.
function drawLantern(ctx, x, bodyY, color) {
  ctx.strokeStyle = "#d9b98a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 150);
  ctx.lineTo(x, bodyY - 22);
  ctx.stroke();
  drawGlow(ctx, x, bodyY, 34, "rgba(255,190,110,0.5)");
  drawEllipse(ctx, x, bodyY, 16, 20, color);
  ctx.strokeStyle = "rgba(60,20,20,0.4)";
  ctx.lineWidth = 1.5;
  for (const ribOffset of [-8, 0, 8]) {
    ctx.beginPath();
    ctx.ellipse(x + ribOffset * 0.6, bodyY, Math.abs(16 - Math.abs(ribOffset)), 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawRect(ctx, x - 6, bodyY - 24, 12, 5, "#7a4a2a");
  drawRect(ctx, x - 6, bodyY + 19, 12, 5, "#7a4a2a");
  ctx.strokeStyle = "#e5b93c";
  ctx.beginPath();
  ctx.moveTo(x, bodyY + 24);
  ctx.lineTo(x, bodyY + 32);
  ctx.stroke();
}

// A little sitting cat, seen from the side.
function drawCat(ctx, x, baseY) {
  const fur = "#2e2233";
  ctx.strokeStyle = fur;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 12, baseY - 6);
  ctx.quadraticCurveTo(x + 26, baseY - 10, x + 24, baseY - 26);
  ctx.stroke();
  drawEllipse(ctx, x, baseY - 16, 13, 17, fur);
  drawCircle(ctx, x, baseY - 38, 10, fur);
  drawTriangle(ctx, x - 9, baseY - 44, x - 3, baseY - 46, x - 8, baseY - 54, fur);
  drawTriangle(ctx, x + 9, baseY - 44, x + 3, baseY - 46, x + 8, baseY - 54, fur);
  drawCircle(ctx, x - 4, baseY - 39, 1.8, "#ffcf7d");
  drawCircle(ctx, x + 4, baseY - 39, 1.8, "#ffcf7d");
}

// A distant bird: two curved wing strokes.
function drawBird(ctx, x, y) {
  ctx.strokeStyle = "#3a2f45";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x - 6, y, 6, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 6, y, 6, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

function drawCloud(ctx, x, y, scale) {
  const puff = "rgba(255,240,230,0.92)";
  drawCircle(ctx, x - 20 * scale, y + 4 * scale, 15 * scale, puff);
  drawCircle(ctx, x, y - 4 * scale, 21 * scale, puff);
  drawCircle(ctx, x + 22 * scale, y + 5 * scale, 14 * scale, puff);
  drawEllipse(ctx, x, y + 9 * scale, 34 * scale, 10 * scale, puff);
}

function drawFlower(ctx, x, headY, petalColor) {
  ctx.strokeStyle = "#3e6e2e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, headY + 6);
  ctx.lineTo(x, headY + 36);
  ctx.stroke();
  drawEllipse(ctx, x - 6, headY + 24, 6, 3, "#4c8a3a");
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = (petal * Math.PI * 2) / 5;
    drawCircle(ctx, x + Math.cos(angle) * 7, headY + Math.sin(angle) * 7, 5.5, petalColor);
  }
  drawCircle(ctx, x, headY, 4.5, "#ffcf7d");
}

function drawButterfly(ctx, x, y) {
  drawEllipse(ctx, x - 8, y - 5, 8, 6, "#f28cb1");
  drawEllipse(ctx, x + 8, y - 5, 8, 6, "#f28cb1");
  drawEllipse(ctx, x - 6, y + 5, 6, 5, "#ffcf7d");
  drawEllipse(ctx, x + 6, y + 5, 6, 5, "#ffcf7d");
  drawEllipse(ctx, x, y, 2.5, 8, "#4a2545");
}

// ---------- round 1: night-market lantern stall ----------

const LANTERN_XS = [140, 200, 260, 320, 380, 440];
const MARKET_STARS = [
  [30, 30], [110, 45], [180, 25], [240, 55], [310, 30], [370, 48],
  [420, 22], [470, 90], [530, 40], [40, 100], [520, 130], [260, 80],
];

function paintMarketScene(ctx, altered) {
  fillSkyGradient(ctx, [[0, "#1a1030"], [0.55, "#3a1f4d"], [1, "#6b2f4a"]]);
  for (const [sx, sy] of MARKET_STARS) drawCircle(ctx, sx, sy, 1.6, "#ffe9c8");

  // Difference 6: the big gold star is missing on the right picture.
  if (!altered) drawFivePointStar(ctx, 70, 60, 14, "#ffcf7d");

  // Crescent moon, same on both sides.
  drawCircle(ctx, 505, 62, 20, "#ffe9c8");
  drawCircle(ctx, 513, 56, 17, "#241539");

  // Ground.
  const ground = ctx.createLinearGradient(0, 340, 0, PICTURE_HEIGHT);
  ground.addColorStop(0, "#3a2030");
  ground.addColorStop(1, "#241522");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 340, PICTURE_WIDTH, PICTURE_HEIGHT - 340);
  for (const [cx, cy] of [[80, 380], [200, 400], [330, 375], [460, 398], [520, 370]]) {
    drawEllipse(ctx, cx, cy, 22, 7, "rgba(255,220,180,0.08)");
  }

  // Stall posts.
  drawRect(ctx, 104, 140, 14, 210, "#5a3a28");
  drawRect(ctx, 442, 140, 14, 210, "#5a3a28");

  // Striped awning. Difference 5: stripe 4 changes gold to purple.
  for (let stripe = 0; stripe < 8; stripe += 1) {
    const topX = 80 + stripe * 50;
    const bottomX = 100 + stripe * 45;
    let color = stripe % 2 === 0 ? "#e5484d" : "#ffcf7d";
    if (stripe === 4 && altered) color = "#7a4fd0";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(topX, 105);
    ctx.lineTo(topX + 50, 105);
    ctx.lineTo(bottomX + 45, 150);
    ctx.lineTo(bottomX, 150);
    ctx.closePath();
    ctx.fill();
    // Matching scallop under each stripe.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bottomX + 22.5, 150, 22.5, 0, Math.PI);
    ctx.fill();
  }
  drawRect(ctx, 78, 98, 404, 9, "#7a4a2a");

  // Hanging lanterns. Difference 1: lantern 4 missing. Difference 2: lantern 2 recoloured.
  for (let lantern = 0; lantern < LANTERN_XS.length; lantern += 1) {
    if (altered && lantern === 3) continue;
    let color = "#ffb347";
    if (lantern === 1) color = altered ? "#3fb8af" : "#e5484d";
    drawLantern(ctx, LANTERN_XS[lantern], 175, color);
  }

  // Hanging sign. Difference 3: the sign hangs 40px further right.
  const signLeftX = altered ? 155 : 115;
  ctx.strokeStyle = "#d9b98a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(signLeftX + 10, 150);
  ctx.lineTo(signLeftX + 10, 215);
  ctx.moveTo(signLeftX + 50, 150);
  ctx.lineTo(signLeftX + 50, 215);
  ctx.stroke();
  drawRect(ctx, signLeftX, 215, 60, 40, "#f4e3c2");
  ctx.strokeStyle = "#7a4a2a";
  ctx.lineWidth = 3;
  ctx.strokeRect(signLeftX, 215, 60, 40);
  ctx.strokeStyle = "#a0522d";
  ctx.lineWidth = 3;
  for (let line = 0; line < 3; line += 1) {
    ctx.beginPath();
    ctx.moveTo(signLeftX + 10, 226 + line * 10);
    ctx.lineTo(signLeftX + 50 - line * 8, 226 + line * 10);
    ctx.stroke();
  }

  // Counter with buns.
  const wood = ctx.createLinearGradient(0, 280, 0, 340);
  wood.addColorStop(0, "#8a5a34");
  wood.addColorStop(1, "#5a3a28");
  ctx.fillStyle = wood;
  ctx.fillRect(100, 280, 360, 60);
  drawRect(ctx, 96, 272, 368, 10, "#a06a3c");
  for (const bunX of [180, 215, 250]) {
    drawCircle(ctx, bunX, 264, 10, "#e8b04a");
    drawCircle(ctx, bunX - 3, 261, 3, "#f7d488");
  }

  // Difference 4: an extra cat sits on the counter, right picture only.
  if (altered) drawCat(ctx, 405, 272);

  // Post lamp. Difference 7: lit on the left, dark on the right.
  if (!altered) drawGlow(ctx, 449, 240, 26, "rgba(255,217,138,0.55)");
  drawCircle(ctx, 449, 240, 9, altered ? "#4a4a55" : "#ffd98a");
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(449, 240, 9, 0, Math.PI * 2);
  ctx.stroke();
}

const MARKET_SPOTS = [
  { id: "market-missing-lantern", name: "Missing lantern", x: 320, y: 175, r: 28 },
  { id: "market-lantern-colour", name: "Lantern changed colour", x: 200, y: 175, r: 26 },
  { id: "market-moved-sign", name: "Sign moved along the stall", x: 165, y: 235, r: 52 },
  { id: "market-extra-cat", name: "Extra cat on the counter", x: 405, y: 244, r: 32 },
  { id: "market-awning-stripe", name: "Awning stripe changed colour", x: 302, y: 128, r: 28 },
  { id: "market-missing-star", name: "Missing gold star", x: 70, y: 60, r: 22 },
  { id: "market-lamp-off", name: "Post lamp gone dark", x: 449, y: 240, r: 20 },
];

// ---------- round 2: lighthouse at dawn ----------

function paintLighthouseScene(ctx, altered) {
  fillSkyGradient(ctx, [[0, "#2c2a5e"], [0.45, "#b06a8f"], [0.72, "#ffc98a"], [1, "#ffc98a"]]);

  // Rising sun, same on both sides (the sea covers its lower half).
  drawGlow(ctx, 430, 300, 80, "rgba(255,233,168,0.6)");
  drawCircle(ctx, 430, 300, 38, "#ffe9a8");

  // Difference 6: the puffy cloud is missing on the right picture.
  if (!altered) drawCloud(ctx, 450, 110, 1);
  drawCloud(ctx, 520, 205, 0.55);

  // Difference 7: the lamp beam shines left on the left picture only.
  if (!altered) {
    const beam = ctx.createLinearGradient(134, 110, 8, 110);
    beam.addColorStop(0, "rgba(255,233,168,0.55)");
    beam.addColorStop(1, "rgba(255,233,168,0.05)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(134, 104);
    ctx.lineTo(8, 68);
    ctx.lineTo(8, 152);
    ctx.lineTo(134, 118);
    ctx.closePath();
    ctx.fill();
  }

  // Birds. Difference 3: the middle bird is missing on the right.
  drawBird(ctx, 260, 100);
  if (!altered) drawBird(ctx, 300, 120);
  drawBird(ctx, 340, 90);

  // Sea.
  const sea = ctx.createLinearGradient(0, 300, 0, PICTURE_HEIGHT);
  sea.addColorStop(0, "#8a5a8f");
  sea.addColorStop(1, "#3a2f5e");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 300, PICTURE_WIDTH, PICTURE_HEIGHT - 300);
  ctx.strokeStyle = "rgba(255,220,180,0.35)";
  ctx.lineWidth = 2;
  for (const [waveX, waveY, waveW] of [[60, 330, 60], [220, 350, 80], [330, 320, 50], [480, 345, 60], [150, 385, 70], [420, 395, 90]]) {
    ctx.beginPath();
    ctx.moveTo(waveX, waveY);
    ctx.quadraticCurveTo(waveX + waveW / 2, waveY - 5, waveX + waveW, waveY);
    ctx.stroke();
  }
  // Sun reflection.
  ctx.fillStyle = "rgba(255,233,168,0.3)";
  ctx.fillRect(414, 302, 32, 100);

  // Difference 5: a little sailboat appears on the right picture only.
  if (altered) {
    ctx.fillStyle = "#4a2f28";
    ctx.beginPath();
    ctx.moveTo(375, 352);
    ctx.lineTo(425, 352);
    ctx.lineTo(413, 366);
    ctx.lineTo(387, 366);
    ctx.closePath();
    ctx.fill();
    drawRect(ctx, 398, 322, 3, 30, "#3a2a1a");
    drawTriangle(ctx, 401, 324, 401, 350, 423, 348, "#fff3e0");
  }

  // Rocks under the lighthouse.
  drawTriangle(ctx, 20, 420, 90, 348, 170, 420, "#3a2f45");
  drawTriangle(ctx, 100, 420, 165, 360, 240, 420, "#4a3f55");

  // Tower: white with three bands. Difference 4: middle band red to blue.
  ctx.fillStyle = "#f2ece0";
  ctx.beginPath();
  ctx.moveTo(115, 340);
  ctx.lineTo(128, 130);
  ctx.lineTo(172, 130);
  ctx.lineTo(185, 340);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(115, 340);
  ctx.lineTo(128, 130);
  ctx.lineTo(172, 130);
  ctx.lineTo(185, 340);
  ctx.closePath();
  ctx.clip();
  drawRect(ctx, 110, 150, 80, 30, "#e5484d");
  drawRect(ctx, 110, 212, 80, 30, altered ? "#3f6fb5" : "#e5484d");
  drawRect(ctx, 110, 274, 80, 30, "#e5484d");
  ctx.restore();

  // Tower window. Difference 2: lit on the left, dark on the right.
  drawRect(ctx, 143, 184, 14, 18, altered ? "#2c2438" : "#ffd98a");
  ctx.strokeStyle = "#7a4a2a";
  ctx.lineWidth = 2;
  ctx.strokeRect(143, 184, 14, 18);

  // Lamp room, roof and flag pole.
  drawRect(ctx, 126, 126, 48, 6, "#3a2f45");
  drawRect(ctx, 132, 100, 36, 26, "#3a2f45");
  drawRect(ctx, 136, 104, 28, 18, "#ffe9a8");
  drawTriangle(ctx, 128, 100, 172, 100, 150, 78, "#e5484d");
  drawRect(ctx, 148, 50, 4, 30, "#3a2a1a");

  // Difference 1: the flag changes from red to gold.
  drawTriangle(ctx, 152, 52, 188, 61, 152, 70, altered ? "#ffcf7d" : "#e5484d");
}

const LIGHTHOUSE_SPOTS = [
  { id: "light-flag-colour", name: "Flag changed colour", x: 166, y: 61, r: 22 },
  { id: "light-window-dark", name: "Tower window gone dark", x: 150, y: 193, r: 16 },
  { id: "light-missing-bird", name: "Missing bird", x: 300, y: 118, r: 20 },
  { id: "light-band-colour", name: "Tower band changed colour", x: 150, y: 227, r: 28 },
  { id: "light-extra-boat", name: "Extra sailboat", x: 400, y: 344, r: 32 },
  { id: "light-missing-cloud", name: "Missing cloud", x: 450, y: 110, r: 34 },
  { id: "light-missing-beam", name: "Lamp beam missing", x: 72, y: 110, r: 42 },
];

// ---------- round 3: garden tea party ----------

// Bunting pennants hang from a sagging string; positions are computed once
// so the painter and the difference spot always agree.
const BUNTING_START = { x: 150, y: 40 };
const BUNTING_CONTROL = { x: 345, y: 95 };
const BUNTING_END = { x: 540, y: 70 };
const PENNANT_TS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
const PENNANT_COLORS = ["#e5484d", "#ffcf7d", "#3fb8af", "#f28cb1", "#e5484d", "#ffcf7d"];

function buntingPoint(t) {
  const u = 1 - t;
  return {
    x: u * u * BUNTING_START.x + 2 * u * t * BUNTING_CONTROL.x + t * t * BUNTING_END.x,
    y: u * u * BUNTING_START.y + 2 * u * t * BUNTING_CONTROL.y + t * t * BUNTING_END.y,
  };
}

const PENNANT_POINTS = PENNANT_TS.map(buntingPoint);
const CHANGED_PENNANT = PENNANT_POINTS[2];

function paintGardenScene(ctx, altered) {
  fillSkyGradient(ctx, [[0, "#ffd9a8"], [0.6, "#ffe9c8"], [1, "#ffe9c8"]]);
  drawGlow(ctx, 500, 60, 46, "rgba(255,220,150,0.7)");
  drawCircle(ctx, 500, 60, 24, "#ffe9a8");

  // Grass and hedge.
  const grass = ctx.createLinearGradient(0, 300, 0, PICTURE_HEIGHT);
  grass.addColorStop(0, "#7fae5a");
  grass.addColorStop(1, "#4c7a3a");
  ctx.fillStyle = grass;
  ctx.fillRect(0, 300, PICTURE_WIDTH, PICTURE_HEIGHT - 300);
  for (const hedgeX of [30, 110, 190, 270, 350, 430, 510]) {
    drawCircle(ctx, hedgeX, 302, 26, "#3e6e2e");
  }

  // Tree with apples. Difference 6: one apple is missing on the right.
  drawRect(ctx, 72, 180, 20, 140, "#6a4a2a");
  drawCircle(ctx, 82, 128, 52, "#4c8a3a");
  drawCircle(ctx, 52, 158, 34, "#5a9a46");
  drawCircle(ctx, 116, 152, 36, "#4c8a3a");
  drawCircle(ctx, 60, 140, 6, "#e5484d");
  if (!altered) drawCircle(ctx, 110, 150, 6, "#e5484d");
  drawCircle(ctx, 85, 175, 6, "#e5484d");

  // Bunting. Difference 4: the third pennant changes teal to purple.
  ctx.strokeStyle = "#7a4a2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BUNTING_START.x, BUNTING_START.y);
  ctx.quadraticCurveTo(BUNTING_CONTROL.x, BUNTING_CONTROL.y, BUNTING_END.x, BUNTING_END.y);
  ctx.stroke();
  for (let pennant = 0; pennant < PENNANT_POINTS.length; pennant += 1) {
    const point = PENNANT_POINTS[pennant];
    let color = PENNANT_COLORS[pennant];
    if (pennant === 2 && altered) color = "#7a4fd0";
    drawTriangle(ctx, point.x - 11, point.y, point.x + 11, point.y, point.x, point.y + 24, color);
  }

  // Difference 5: a butterfly visits the right picture only.
  if (altered) drawButterfly(ctx, 180, 190);

  // Tea table.
  drawRect(ctx, 220, 292, 12, 70, "#8a5a34");
  drawRect(ctx, 368, 292, 12, 70, "#8a5a34");
  drawEllipse(ctx, 300, 285, 130, 22, "#c98a4b");
  drawEllipse(ctx, 300, 281, 130, 20, "#e0a866");

  // Teapot. Difference 2: blue on the left, rose on the right.
  const potColor = altered ? "#d96a8b" : "#4f7fc9";
  ctx.strokeStyle = potColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(226, 254, 10, Math.PI * 0.6, Math.PI * 1.6);
  ctx.stroke();
  drawTriangle(ctx, 272, 250, 288, 242, 274, 262, potColor);
  drawEllipse(ctx, 250, 258, 24, 18, potColor);
  drawEllipse(ctx, 250, 242, 12, 5, potColor);
  drawCircle(ctx, 250, 237, 4, "#ffcf7d");

  // Cups. Difference 3: the middle cup is missing on the right.
  for (const cupX of [315, 350, 385]) {
    if (altered && cupX === 350) continue;
    drawRect(ctx, cupX - 8, 264, 16, 12, "#fff3e0");
    ctx.strokeStyle = "#fff3e0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cupX + 10, 269, 4, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    drawEllipse(ctx, cupX, 264, 8, 3, "#c98a4b");
  }
  drawEllipse(ctx, 295, 280, 14, 5, "#fff3e0");
  drawCircle(ctx, 291, 276, 4, "#e8b04a");
  drawCircle(ctx, 299, 276, 4, "#e8b04a");

  // Chair with a cushion. Difference 7: cushion red to purple.
  drawRect(ctx, 430, 240, 10, 62, "#8a5a34");
  drawRect(ctx, 462, 240, 10, 62, "#8a5a34");
  drawRect(ctx, 430, 248, 42, 8, "#8a5a34");
  drawRect(ctx, 424, 296, 54, 10, "#a06a3c");
  drawRect(ctx, 428, 306, 8, 44, "#8a5a34");
  drawRect(ctx, 466, 306, 8, 44, "#8a5a34");
  drawRect(ctx, 426, 286, 50, 12, altered ? "#7a4fd0" : "#e5484d");

  // Flower bed. Difference 1: one flower is missing on the right (4 become 3).
  drawFlower(ctx, 430, 362, "#f28cb1");
  if (!altered) drawFlower(ctx, 465, 356, "#e5484d");
  drawFlower(ctx, 500, 364, "#f28cb1");
  drawFlower(ctx, 530, 358, "#ffcf7d");
}

const GARDEN_SPOTS = [
  { id: "garden-flower-count", name: "One flower fewer", x: 465, y: 356, r: 20 },
  { id: "garden-teapot-colour", name: "Teapot changed colour", x: 250, y: 254, r: 28 },
  { id: "garden-cup-count", name: "One cup fewer", x: 350, y: 269, r: 18 },
  { id: "garden-pennant-colour", name: "Pennant changed colour", x: CHANGED_PENNANT.x, y: CHANGED_PENNANT.y + 12, r: 22 },
  { id: "garden-extra-butterfly", name: "Extra butterfly", x: 180, y: 190, r: 22 },
  { id: "garden-missing-apple", name: "Missing apple", x: 110, y: 150, r: 16 },
  { id: "garden-cushion-colour", name: "Cushion changed colour", x: 451, y: 292, r: 24 },
];

// ---------- public scene table ----------

export const SCENES = [
  { id: "night-market", name: "Night-Market Lantern Stall", paint: paintMarketScene, spots: MARKET_SPOTS },
  { id: "lighthouse", name: "Lighthouse at Dawn", paint: paintLighthouseScene, spots: LIGHTHOUSE_SPOTS },
  { id: "garden", name: "Garden Tea Party", paint: paintGardenScene, spots: GARDEN_SPOTS },
];

// Paint one full picture. side is "left" (original) or "right" (7 differences applied).
export function paintPicture(ctx, roundIndex, side) {
  const scene = SCENES[roundIndex];
  ctx.save();
  ctx.clearRect(0, 0, PICTURE_WIDTH, PICTURE_HEIGHT);
  scene.paint(ctx, side === "right");
  ctx.restore();
}

// The difference spots for a round, on the shared picture coordinate system.
export function spotsForRound(roundIndex) {
  return SCENES[roundIndex].spots;
}
