# Midnight Machinations

Midnight Machinations is a browser-based multiplayer social deduction game. The Rust server owns live room and game state. The SvelteKit client provides the game UI and a prerendered, searchable wiki.

## Getting started

Clone the repository and enter the workspace:

```bash
git clone https://github.com/TB516/midnight-machinations.git
cd midnight-machinations
```

Use separate terminals for the client and server while developing.

## Client setup

The client uses TypeScript 6, Svelte 5, SvelteKit, Vite 8, and pnpm. The root `mise.toml` declares the expected Node, pnpm, and Rust versions.

Install the workspace tools and client dependencies:

```bash
mise install
cd client
pnpm install
```

Create `client/.env` with the WebSocket server address:

```bash
VITE_WS_ADDRESS=ws://localhost:9000
```

Start the development server:

```bash
pnpm dev
```

Validate production changes with:

```bash
pnpm check
pnpm build
```

The home, credits, settings, game-mode, and wiki routes are prerendered. Every wiki article is emitted as a static HTML page. The room browser and lobby use SSR for their initial shell, then hydrate for WebSocket data. Only `/game` disables SSR.

The production build uses SvelteKit's Node adapter and starts with:

```bash
node build
```

## Server setup

The Rust toolchain is installed by the earlier `mise install` command.

Build and start the server:

```bash
cd server
cargo build
cargo run
```

On Linux, the server build may also require the OpenSSL development libraries supplied by the operating system.

## VS Code

The workspace recommends extensions for Svelte, Rust, TOML, dependency management, diagnostics, Git history, and spelling. VS Code will offer them when the repository opens.
