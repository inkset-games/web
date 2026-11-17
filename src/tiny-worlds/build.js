// Bundles shell.html + packs.js + game.js into one index.html (no external scripts, nothing fetched at runtime).
// Usage: node build.js [out.html]   (default: docs/experiments/tiny-worlds/index.html)
const fs = require("fs"), path = require("path");
const here = __dirname;
let html = fs.readFileSync(path.join(here, "shell.html"), "utf8");
html = html.replace("<!--PACKS-->", () => "<script>\n" + fs.readFileSync(path.join(here, "packs.js"), "utf8") + "</script>");
html = html.replace("<!--GAME-->", () => "<script>\n" + fs.readFileSync(path.join(here, "game.js"), "utf8") + "</script>");
const dest = process.argv[2] || path.join(here, "..", "..", "docs", "experiments", "tiny-worlds", "index.html");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, html);
console.log("wrote", path.relative(process.cwd(), dest), (html.length / 1024).toFixed(0) + " KB");
