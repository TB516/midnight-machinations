# GitHub Copilot Instructions

## Project overview

Midnight Machinations is a browser-based multiplayer social deduction game.

- The Rust server owns rooms and authoritative game state over WebSockets.
- The TypeScript 6 frontend uses Svelte 5, SvelteKit, and Vite 8.
- pnpm manages the client; Cargo manages the server.

## Repository structure

```text
.
├── client/                    # SvelteKit frontend
│   ├── src/lib/game/           # Typed protocol, reducer, and WebSocket session
│   ├── src/lib/components/     # Svelte UI components
│   ├── src/lib/wiki/           # Wiki catalog and markdown pipeline
│   └── src/routes/             # SvelteKit routes
├── server/                    # Rust backend
└── generate/                  # Code-generation utilities
```

## Build and validation

Use the tool versions declared in the root `mise.toml`.

```bash
cd client
pnpm install
pnpm dev
pnpm check
pnpm build
```

```bash
cd server
cargo build --verbose
cargo test --verbose
cargo clippy --verbose
```

Run `pnpm check` and `pnpm build` after frontend changes. Run the relevant Cargo checks after backend changes.

## Frontend rendering model

- Keep informational pages and the wiki prerenderable.
- Wiki article routes must keep `prerender = true` and expose every article through `entries`.
- Lobby and room routes use SSR for their initial shell, then open WebSockets in the browser.
- `/game` is the only CSR-only route. Do not disable SSR globally or on other routes.
- Browser-only APIs and persistent storage belong behind `browser` checks or in `onMount`.

## Adding a role

On the server, add the role module under `server/src/game/role/`, register it in the role macros and sets, and add any related tags, chat variants, or packets.

On the client:

- Add the role data to `client/src/resources/roles.json` and its English strings to `client/src/resources/lang/en_us.json`.
- Update types in `client/src/lib/game/` when the role adds protocol state, packets, controllers, or chat variants.
- Format new chat variants in `client/src/lib/live/format.ts` and assign their presentation in `client/src/resources/styling/chatMessage.json`.
- Add specialized controls to `client/src/lib/components/live/AbilitiesPanel.svelte` only when generic controller fields cannot express the role.
- Include role-specific chat keys in the role's `chatMessages` list so the generated wiki article documents them.

The wiki catalog discovers role resources and emits SSG routes, so avoid maintaining a duplicate route list.

## Adding a chat message

Rust enum variants use `UpperCamelCase` and snake_case fields. Use `#[serde(rename_all = "camelCase")]` where needed so serialized fields match the TypeScript protocol.

The corresponding frontend variant uses `lowerCamelCase` in `client/src/lib/game/chat.ts`. Also update:

- `client/src/lib/live/format.ts` for readable message content;
- `client/src/resources/lang/en_us.json` for localized text;
- `client/src/resources/styling/chatMessage.json` for semantic styling;
- the relevant role entry in `client/src/resources/roles.json` when the message belongs in that role's wiki page.

Prefer exhaustive discriminated unions and keep the Rust and TypeScript packet shapes aligned.
