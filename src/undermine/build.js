// Bundles shell.html + game.js + vex sprites + chirp sounds into one index.html.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const here = __dirname, out = path.join(here, "out");
const sprites = {};
for (const f of fs.readdirSync(path.join(out, "sprites")).filter((f) => f.endsWith(".svg")).sort())
  sprites[f.replace(".svg", "")] = fs.readFileSync(path.join(out, "sprites", f), "utf8").replace(/\s*\n\s*/g, " ").trim();
const sounds = {};
fs.mkdirSync(path.join(here, "mp3"), { recursive: true });
const enc = (src, name, br) => {
  const dst = path.join(here, "mp3", name + ".mp3");
  if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs)
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ac", name === "theme" ? "2" : "1", "-b:a", br, dst]);
  sounds[name] = "data:audio/mpeg;base64," + fs.readFileSync(dst).toString("base64");
};
for (const f of fs.readdirSync(path.join(out, "sfx")).filter((f) => f.endsWith(".wav")).sort()) enc(path.join(out, "sfx", f), f.replace(".wav", ""), "64k");
enc(path.join(out, "music", "theme.wav"), "theme", "96k");
let html = fs.readFileSync(path.join(here, "shell.html"), "utf8");
html = html.replace("<!--ASSETS-->", () => "<script>const ASSETS = " + JSON.stringify({ sprites, sounds }) + ";</script>");
html = html.replace("<!--GAME-->", () => "<script>\n" + fs.readFileSync(path.join(here, "game.js"), "utf8") + "</script>");
const dest = process.argv[2] || path.join(here, "..", "..", "docs", "experiments", "undermine", "index.html");
fs.writeFileSync(dest, html);
console.log("wrote", dest, (html.length / 1024).toFixed(0) + " KB");
