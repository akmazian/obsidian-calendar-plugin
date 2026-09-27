# Calendar Revived

An Obsidian plugin that shows a calendar of your daily and weekly notes. It's a maintained fork of [liamcain/obsidian-calendar-plugin](https://github.com/liamcain/obsidian-calendar-plugin), which stopped being updated in 2021.

- `origin` is `akmazian/obsidian-calendar-plugin` (this fork, default branch `main`). `upstream` is liamcain's repo (branch `master`, abandoned).
- Plugin id is `calendar-revived`, name "Calendar Revived", author "Akmazian, adapted from Liam Cain". The first fork release was **1.6.0** (2026-09-27), with `minAppVersion` 1.7.2.
- **No PRs.** There's one maintainer, so commit directly to `main` and push, in small commits split by concern. CI on `main` is the check. If you do use `gh` against this fork (issues, releases, runs), pass `--repo akmazian/obsidian-calendar-plugin`, because otherwise it may target the upstream repo.

## Commands

The package manager is pnpm. It's pinned through `packageManager`, so don't use npm or yarn.

```bash
pnpm install
pnpm run lint          # svelte-check && tsc --noEmit && eslint .
pnpm test              # vitest run
pnpm run test:watch    # vitest
pnpm exec rollup -c    # build main.js only
pnpm run build         # lint, then build
```

CI (`.github/workflows/main.yml`, Node 22) runs lint, test and build on every push to `main`. Run the same three commands locally before pushing.

## Layout

- `src/main.ts`: the plugin class. It registers the view, the commands, the settings tab and the hover-link source.
- `src/view.ts`: `CalendarView` (an `ItemView`). It mounts the Svelte component, handles vault and workspace events, and opens or creates notes.
- `src/ui/Calendar.svelte`: a wrapper around `obsidian-calendar-ui`'s `Calendar` component.
- `src/ui/stores.ts`: Svelte stores for settings, the daily and weekly note indexes, and the active file.
- `src/ui/sources/`: the dot and tag sources (word count, tasks, tags, streak). Other plugins can add sources through the `calendar:open` workspace event.
- `src/io/`: creating daily and weekly notes, with an optional confirmation modal.
- Tests sit next to their sources as `*.test.ts`. Test helpers are in `src/testUtils/`, and the `obsidian` stub is `src/ui/__mocks__/obsidian.ts`.

## Conventions

- **TypeScript `strict` is on.** Keep it on. The idioms in use:
  - Calendar sources are written `export const x = {...} satisfies ICalendarSource`, which keeps their methods non-optional.
  - Fields assigned by a synchronous store subscription use `!` definite assignment, with a comment.
  - Vault event handlers take `TAbstractFile` and check `file instanceof TFile`, because vault events also fire for folders.
  - Helpers that already handle `null` should declare `TFile | null`.
- **Use type-only imports** (`import { type App }`) for anything that's only a type. `verbatimModuleSyntax` requires it.
- **Use current Obsidian APIs, not the deprecated ones:**
  - `workspace.getLeaf(false | "split")`, not `splitActiveLeaf` or `getUnpinnedLeaf`.
  - `getActiveViewOfType(FileView)`, not `activeLeaf`.
  - `onLayoutReady()`.
  - `new Menu()` with no arguments.
  - `leaf.openFile(file, { active, state: { mode } })`.
- **Sidebar views are deferred** (Obsidian 1.7+): a view isn't built until its tab is shown. Never cache the view instance in the plugin. Get it through `getCalendarView()` in `main.ts`, which calls `leaf.loadIfDeferred()`.
- **Hover previews** use the `"hover-link"` event with `{ event, source, hoverParent, targetEl, linktext, sourcePath }`. The legacy `"link-hover"` event has no listeners in current Obsidian.
  - The library doesn't pass the pointer event to hover handlers, so `CalendarView` records it with a capture-phase `pointerover` listener.
  - Obsidian's page-preview settings decide whether the modifier key is needed, based on the source registered in `main.ts`.
- **Clean up everything a view registers.** Wrap store subscriptions and DOM listeners in `this.register(...)`, `registerEvent` or `registerDomEvent`, so they're removed when the view closes. A subscription left behind on a closed view once broke settings updates.
- **Don't detach leaves in `onunload`**, per Obsidian's plugin guidelines.
- **Keep the identifiers distinct from the original plugin:** the view type is `"calendar-revived"`, so both plugins can be installed at once. Keep the `calendar:open` event name unchanged, because other plugins listen for it.
- **Match the existing style:** 2-space indent, double quotes, trailing commas, lines of about 80 characters. There's no Prettier config, so follow the surrounding code.
- **Commit messages:** an imperative subject line, then a body explaining *why*. Split changes into commits by concern, and commit straight to `main`.

## Things not to "fix"

- **The `as unknown as BaseHandlers` cast in `Calendar.svelte` is intentional.** `obsidian-calendar-ui`'s `.d.ts` declares hover handlers with 2 parameters, but at runtime they're called with 3 (`date, targetEl, isMetaPressed`). The cast keeps that mismatch in one place.
- **`obsidian-daily-notes-interface` types say `getDailyNote` and `getWeeklyNote` return `TFile`,** but they return `null` when no note exists. Tests use `null as unknown as TFile` for that case.
- **The test `App` stub (`src/testUtils/mockApp.ts`) is cast with `as unknown as App`.** It's deliberately partial.
- **Don't add `baseUrl` back to `tsconfig.json`.** It's deprecated. The `paths` entry `"src/*": ["./src/*"]` handles `src/...` imports.
- **The bundle contains two Svelte runtimes.** Ours is Svelte 4, and `obsidian-calendar-ui` ships its own precompiled copy of Svelte 3. That's expected.

## Version ceilings (checked 2026-09; don't re-investigate without new information)

- **svelte 4.2.x, not 5.** `obsidian-calendar-ui` is a precompiled Svelte 3 bundle, and a Svelte 5 parent can't mount its class components. Moving to Svelte 5 would mean vendoring and porting that library.
- **typescript 6.0.x, not 7.** `typescript-eslint`, `svelte-check` and `svelte-preprocess` don't support TypeScript 7 yet.
- **obsidian-calendar-ui 0.3.12, not 0.4.0.** 0.4.0 is a complete API redesign, so moving to it means rewriting every source and all the event wiring. The library has been abandoned since 2022.
- **vitest 4.1.x, not 5.** Vitest 5 needs Node 22, and local development is still on Node 20. CI already uses Node 22.
- **Jest was removed on purpose.** Svelte 4 is ESM-only, so Jest can't load anything that imports `svelte/store`. Use Vitest.

## Testing

- **Unit tests use Vitest.** `vitest.config.mts` points `obsidian` (a types-only package) at the stub, and inlines `obsidian-daily-notes-interface` so its own `obsidian` import uses the stub too. `src/testUtils/setup.ts` provides `window.app` and `window.moment`. Mock `obsidian-daily-notes-interface` with `vi.mock` instead of simulating Obsidian's internals.
- **Testing in real Obsidian** (macOS, as done for 1.6.0):
  1. Build a scratch vault that contains `.obsidian/plugins/calendar-revived/{main.js,manifest.json,styles.css}`, a `community-plugins.json` listing `["calendar-revived"]`, Daily Notes enabled, and some notes in `daily/`.
  2. Register the vault by editing `~/Library/Application Support/obsidian/obsidian.json` while Obsidian is closed. Back up that file first and restore it afterwards.
  3. Launch `/Applications/Obsidian.app/Contents/MacOS/Obsidian --remote-debugging-port=9222` directly. `open -a Obsidian --args` drops the flag.
  4. Drive Obsidian through the Chrome DevTools Protocol (`http://localhost:9222/json`). Node 20 needs `--experimental-websocket` for this.
- Things to know when testing in Obsidian:
  - **Context menus:** macOS uses native menus, so menu items don't appear in the DOM. Capture them through the `file-menu` workspace event instead.
  - **Hover previews:** they need real input (CDP `Input.dispatchMouseEvent` with the Meta modifier), not synthetic DOM events.
  - **Leave other Obsidian instances alone:** other sessions may have their own Obsidian running, so only quit the instance you started.
- **Mobile has never been tested.**

## Releasing

1. Bump the version in `manifest.json`, `package.json` and `versions.json`. `versions.json` maps each plugin version to its `minAppVersion`.
2. Commit and push to `main`, and wait for CI to go green.
3. Tag `main` with exactly the version number, with no `v` prefix, and push the tag: `git tag 1.6.1 && git push origin 1.6.1`.
4. `.github/workflows/publish.yml` checks that the tag equals the manifest version, runs lint, tests and build, then publishes a GitHub release with `main.js`, `manifest.json` and `styles.css`.

Users install it through BRAT (`akmazian/obsidian-calendar-plugin`) or by copying the release files by hand. It hasn't been submitted to Obsidian's community plugin directory (`obsidianmd/obsidian-releases`) yet. Ask before submitting, because it's a public submission.

## Open follow-ups

- Test on mobile. The manifest says `isDesktopOnly: false`.
- The GitHub Actions in both workflows (`checkout`, `setup-node`, `pnpm/action-setup` v4) target the deprecated Node 20 runtime. Bump them to newer major versions.
- Decide whether to submit to the community plugin directory.
