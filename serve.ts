// Twin Lanterns — small static server for local play-testing.
// One job: serve the game/ folder on port 8080 on localhost only, with the right
// content types for html, javascript, css, json, png, jpeg and wav files, refuse
// any path outside the game folder, and print the address it serves on.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(join(here, "game"));

const HOST = "127.0.0.1";
const PORT = 8080;

// Content types for the file kinds the game uses.
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".wav": "audio/wav",
};

function contentTypeFor(path) {
  return CONTENT_TYPES[extname(path).toLowerCase()] || "application/octet-stream";
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    // Only GET and HEAD are served; anything else is refused.
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }

    // A directory request serves index.html.
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || pathname === "") pathname = "/index.html";

    // Resolve against the game folder and refuse anything that climbs out of it.
    const target = resolve(join(gameDir, pathname));
    if (target !== gameDir && !target.startsWith(gameDir + sep)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    let fileStat;
    try {
      fileStat = await stat(target);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    if (fileStat.isDirectory()) {
      const indexTarget = join(target, "index.html");
      const indexStat = await stat(indexTarget).catch(() => null);
      if (indexStat && indexStat.isFile()) {
        const body = await readFile(indexTarget);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(body);
        return;
      }
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    const body = await readFile(target);
    res.writeHead(200, { "Content-Type": contentTypeFor(target) });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Server error: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Twin Lanterns is served at http://${HOST}:${PORT}`);
});