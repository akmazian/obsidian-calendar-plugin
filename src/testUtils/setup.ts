import moment from "moment";

import mockApp from "./mockApp";

// Plugin code reaches Obsidian through `window.app` / `window.moment`, which
// don't exist in Node. Alias `window` to the global object and populate both.
Object.assign(globalThis, { window: globalThis });
Object.assign(window, { app: mockApp, moment });
