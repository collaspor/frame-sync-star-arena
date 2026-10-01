# Frame Sync Star Arena Implementation Plan

> **For agentic workers:** Execute the checked tasks in this session. The user authorized completion of the game and final review.

**Goal:** Build a playable two-player browser game with deterministic frame synchronization.

**Architecture:** A Node WebSocket server owns the frame clock and broadcasts both input masks. The server and browser import one pure integer simulation module; the browser renderer only consumes state.

**Tech Stack:** Node.js 24, `ws`, native JavaScript modules, Canvas 2D, `node:test`.

---

### Task 1: Deterministic game rules

**Files:** `shared/game.js`, `test/game.test.js`

- [x] Write tests for repeatable seed/input playback, integer state, collision scoring, bounds, and win conditions.
- [x] Run `npm test` and confirm the missing game module causes failure.
- [x] Implement a pure `createGame(seed)`, `step(state, inputs)`, and `checksum(state)` API using integer arithmetic and one xorshift32 seed in state.
- [x] Run `npm test` and confirm game tests pass.

### Task 2: Server protocol

**Files:** `server.js`, `test/server.test.js`

- [x] Write a real WebSocket test for two-player start, ordered input frames, third-player rejection, and disconnect reset.
- [x] Run the test and confirm it fails because server support is missing.
- [x] Implement static file serving, room lifecycle, input validation, a 20 Hz tick, and authoritative checksums.
- [x] Run `npm test` and confirm all tests pass.

### Task 3: Browser game

**Files:** `public/index.html`, `public/style.css`, `public/client.js`, `public/render.js`

- [x] Build a responsive arcade interface with two scores, Canvas arena, status, controls, frame number, and checksum.
- [x] Add keyboard input transport, ordered frame application, checksum comparison, and disconnect handling.
- [x] Keep all drawing in `render.js`, with no simulation or randomness in the UI.

### Task 4: Documentation and acceptance

**Files:** `README.md`, `package.json`

- [x] Document startup, two-window play, controls, synchronization rules, and test commands.
- [x] Run tests and syntax checks.
- [x] Exercise two browser pages, input, score display, responsive layout, and absence of console errors.
