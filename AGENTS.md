# AGENTS.md

Pac-Man-like game: vanilla JS + HTML + CSS, no build system, no package.json, no tests, no linter.

## Run

- Serve `src/` statically (e.g. `npx serve src` or `python3 -m http.server -d src`) and open it in a browser. There is no build or compile step.

## Architecture (load-order dependent)

Entry point is `src/index.html`, which loads classic scripts **in this exact order**:

1. `js/maze.js` — defines `MAZE`, `PACMAN_START`, `GHOST_STARTS`, `TUNNEL_ROW` (parsed from `MAZE_STR`)
2. `js/game.js` — state + rules; `createGame()` / `update()`; depends on maze.js globals
3. `js/render.js` — canvas drawing; `draw()`; reads `game.grid` (a mutable copy), never `MAZE` directly
4. `js/main.js` — rAF loop, keyboard, overlay; depends on the other three

These are plain scripts sharing globals — no modules/imports. If a new file is added, it must be appended to `index.html` in dependency order, or functions will be undefined at runtime.

## Conventions

- Spanish is the working language: README, code comments, UI text (`index.html`, overlay strings). Write new comments/UI in Spanish.
- Style: spaces inside parentheses and after commas — `foo( x, y )`, `grid[ y ][ x ]` (see all files in `src/js/`).
- Coordinates are cell-based `(x, y)` on a 28×31 grid; `TILE = 20` in render.js must stay consistent with the canvas size (560×620) in `index.html`.

## Spec-driven workflow

Features are designed via the `/spec` skill and implemented via `/spec-impl` (see `.agents/skills/`). Specs live in `specs/` (folder created on first spec), written in Spanish, following the section structure in `.agents/skills/spec/template.md`. Don't write feature code without a spec approved by the user.
