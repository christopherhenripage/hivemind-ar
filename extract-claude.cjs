const fs = require("fs");
const path = require("path");

const jsonPath = path.join(process.cwd(), "claude-output.json");
if (!fs.existsSync(jsonPath)) {
  console.error("❌ claude-output.json not found in:", process.cwd());
  process.exit(1);
}

const raw = fs.readFileSync(jsonPath, "utf8");

function grabObj(key) {
  const i = raw.indexOf("\"" + key + "\"");
  if (i < 0) return null;

  const c = raw.indexOf("{", i);
  if (c < 0) return null;

  let depth = 0, inStr = false, esc = false;
  for (let p = c; p < raw.length; p++) {
    const ch = raw[p];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === "\"") inStr = false;
    } else {
      if (ch === "\"") inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return raw.slice(c, p + 1);
      }
    }
  }
  return null;
}

function parseLoose(objText) {
  if (!objText) return {};
  try {
    return JSON.parse(objText);
  } catch (_) {
    // fallthrough
  }

  // fallback: extract "key":"value" pairs safely (handles \n escapes)
  const out = {};
  const re = /\"([^\"\\]*(?:\\.[^\"\\]*)*)\"\s*:\s*\"((?:\\.|[^\"\\])*)\"/gs;
  let m;
  while ((m = re.exec(objText))) {
    let k = m[1], v = m[2];
    k = JSON.parse("\"" + k + "\"");
    v = JSON.parse("\"" + v + "\"");
    out[k] = v;
  }
  return out;
}

const files = parseLoose(grabObj("files"));
const more = parseLoose(grabObj("files_continued"));
const merged = Object.assign({}, files, more);
const keys = Object.keys(merged);

if (!keys.length) {
  console.error("❌ No files found. Your claude-output.json must contain 'files' and/or 'files_continued'.");
  process.exit(1);
}

for (const rel of keys) {
  const full = path.join(process.cwd(), rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, merged[rel], "utf8");
}

console.log("✅ Wrote " + keys.length + " files into " + process.cwd());
