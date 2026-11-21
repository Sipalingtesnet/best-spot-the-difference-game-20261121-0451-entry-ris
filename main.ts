// Twin Lanterns — program entry file.
// One job: copy the game/ and screenshots/ folders from beside this file into
// the output folder named by MAKEFUN_OUTPUT_DIR (falling back to /output), then
// write dossier.json there with buildDossier from the vendored make.fun library.
// The caps below match the competition gate: a text cap of 163840 bytes, at most
// 4 screenshots of at most 262144 bytes each, at most 993 game files totalling
// at most 50331648 bytes, and game paths of at most 1000 bytes.

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// The folder this file lives in (the repository root).
const here = dirname(fileURLToPath(import.meta.url));

// The output folder: MAKEFUN_OUTPUT_DIR when set, else /output.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// The competition's dossier caps (see RULES.txt and the vendored library).
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Copy the game folder and the screenshots folder from beside this file.
mkdirSync(outputDir, { recursive: true });
cpSync(join(here, "game"), join(outputDir, "game"), { recursive: true });
cpSync(join(here, "screenshots"), join(outputDir, "screenshots"), { recursive: true });

// Write the dossier into the output folder.
const dossier = buildDossier(outputDir, caps);
writeFileSync(join(outputDir, "dossier.json"), dossier);