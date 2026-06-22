const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.join(__dirname, "..");
const themeSource = fs.readFileSync(path.join(rootDir, "theme.js"), "utf8");

function createClassList() {
  const values = new Set();

  return {
    contains(name) {
      return values.has(name);
    },
    toggle(name, force) {
      if (force) {
        values.add(name);
      } else {
        values.delete(name);
      }
    },
  };
}

function createToggle() {
  const attributes = new Map();
  const listeners = new Map();
  const icon = { className: "" };

  return {
    classList: createClassList(),
    dataset: {},
    title: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get("click")();
    },
    getAttribute(name) {
      return attributes.get(name);
    },
    querySelector(selector) {
      return selector === "[data-acadia-theme-toggle-icon]" ? icon : null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
}

function runThemeScript({ storage, systemDark = true } = {}) {
  const rootAttributes = new Map([
    ["data-acadia-theme", "system"],
    ["data-acadia-theme-storage-key", "pulse-theme"],
  ]);
  const root = {
    dataset: {
      acadiaThemeStorageKey: "pulse-theme",
    },
    getAttribute(name) {
      return rootAttributes.get(name);
    },
    hasAttribute(name) {
      return rootAttributes.has(name);
    },
    setAttribute(name, value) {
      rootAttributes.set(name, value);
    },
  };
  const toggle = createToggle();
  const document = {
    documentElement: root,
    readyState: "complete",
    addEventListener() {},
    querySelectorAll(selector) {
      if (selector === "[data-acadia-theme-toggle]") {
        return [toggle];
      }

      return [];
    },
  };
  const window = {
    localStorage: storage,
    matchMedia() {
      return {
        matches: systemDark,
        addEventListener() {},
      };
    },
  };

  vm.runInNewContext(themeSource, { document, window });

  return {
    root,
    toggle,
  };
}

test("theme toggle keeps working when localStorage is unavailable", () => {
  const storage = {
    getItem() {
      throw new Error("storage blocked");
    },
    setItem() {
      throw new Error("storage blocked");
    },
    removeItem() {
      throw new Error("storage blocked");
    },
  };
  const { root, toggle } = runThemeScript({ storage });

  assert.equal(root.getAttribute("data-acadia-theme"), "system");
  assert.equal(toggle.getAttribute("aria-label"), "Switch to light mode");

  toggle.click();

  assert.equal(root.getAttribute("data-acadia-theme"), "light");
  assert.equal(toggle.getAttribute("aria-label"), "Switch to dark mode");

  toggle.click();

  assert.equal(root.getAttribute("data-acadia-theme"), "dark");
  assert.equal(toggle.getAttribute("aria-label"), "Switch to light mode");
});
