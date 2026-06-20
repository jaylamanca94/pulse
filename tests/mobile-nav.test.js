const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.join(__dirname, "..");
const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
const pageFiles = [
  "index.html",
  "environment.html",
  "disease.html",
  "sources.html",
  "model.html",
];

function readPage(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

test("mobile dock is outside the sticky header on every page", () => {
  for (const file of pageFiles) {
    const html = readPage(file);

    assert.match(html, /styles\.css\?v=20260620-dock-placement/);
    assert.match(html, /<nav class="acadia-nav pulse-primary-nav" aria-label="Pulse pages">/);
    assert.match(html, /<\/header>\s*<nav class="acadia-nav pulse-primary-nav acadia-mobile-dock" aria-label="Pulse pages">/);
  }
});

test("mobile dock stays viewport-bottom anchored", () => {
  assert.match(styles, /\.pulse-primary-nav\.acadia-mobile-dock\s*{[^}]*display: none;/s);
  assert.match(
    styles,
    /@media \(max-width: 767\.98px\)[\s\S]*\.acadia-chrome \.pulse-primary-nav:not\(\.acadia-mobile-dock\)\s*{[^}]*display: none;/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 767\.98px\)[\s\S]*\.pulse-primary-nav\.acadia-mobile-dock\s*{[^}]*bottom: var\(--acadia-mobile-tabbar-bottom, 1\.25rem\);[^}]*bottom: calc\(var\(--acadia-mobile-tabbar-bottom, 1\.25rem\) \+ env\(safe-area-inset-bottom\)\);[^}]*position: fixed;[^}]*top: auto;/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 767\.98px\)[\s\S]*\.pulse-shell\s*{[^}]*padding-bottom: calc\(6\.5rem \+ env\(safe-area-inset-bottom\)\);/s,
  );
});
