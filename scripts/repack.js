// Repack src/ into app.asar inside an unpacked BackWhenTV install (the folder that holds BackWhenTV.exe).
// Usage: node scripts/repack.js "C:\path\to\BackWhenTV-install-folder"
// Get a folder to patch by extracting BackWhenTV-Setup-x.y.z.exe with 7-Zip, or by installing the app and pointing at its folder.
const path = require("path");
const fs = require("fs");
const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "resources"))) { console.error("Pass the install folder (the one with BackWhenTV.exe and resources/)."); process.exit(1); }
const src = path.join(__dirname, "..", "src");
if (!fs.existsSync(path.join(src, "node_modules", "hls.js"))) { console.error("Run `npm install` in src/ first."); process.exit(1); }
require("@electron/asar").createPackage(src, path.join(dir, "resources", "app.asar")).then(() => console.log("Wrote", path.join(dir, "resources", "app.asar")));
