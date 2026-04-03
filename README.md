# 🐥 Buddy Reroller

A Bun-based web app for customizing your Claude Code `/buddy` companion pet. Find the perfect companion through targeted search, preview before applying, and build your collection.

## Features

- **🔍 Targeted Search** — Filter by species, rarity, eye, hat, shiny status with real-time WebSocket progress
- **📦 Collection** — Save favorites with AES-256-GCM encrypted local storage, no limit
- **📖 Encyclopedia** — Browse all 18 species, 5 rarities, stats, hats, and eyes
- **🎨 Dark Game Theme** — Clean UI with ASCII art sprites and animated companion display
- **🔒 Pro Module** — Perfect legendary search (separate module, not included)

## Quick Start

```bash
# Install dependencies
bun install

# Run dev server (http://localhost:17840)
bun run dev

# Build single-file executable
bun run build

# Run tests
bun test
```

## How It Works

The companion for each `userID` is **deterministically generated** using a mulberry32 PRNG seeded with `Bun.hash(userID + salt)`. This means:

- Same userID always produces the same companion
- Changing your userID changes your companion
- The app searches by generating random userIDs until one matches your criteria

Once found, the new `userID` is written to `~/.claude.json`. Restart Claude Code and run `/buddy` to see your new companion.

## Companion System

| Rarity | Chance | Stat Floor |
|--------|--------|------------|
| Common | 60% | 5 |
| Uncommon | 25% | 15 |
| Rare | 10% | 25 |
| Epic | 4% | 35 |
| Legendary | 1% | 50 |

- **18 Species**: duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk
- **6 Eyes**: · ✦ × ◉ @ °
- **8 Hats**: none, crown, tophat, propeller, halo, wizard, beanie, tinyduck
- **5 Stats**: DEBUGGING, PATIENCE, CHAOS, WISDOM, SNACK (each companion has a peak and dump stat)

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) (HTTP Server, WebSocket, `bun build --compile`)
- **Frontend**: React 19 with dark game-themed CSS
- **Crypto**: AES-256-GCM for collection storage (SHA-256 key derivation from machine fingerprint)
- **Build**: Single-file executable via `bun build --compile`

## Project Structure

```
src/
├── core/           # PRNG, companion rolling, sprites, config, crypto
├── pro/            # Pro module (interface + noop fallback + loader)
├── api/            # HTTP handlers + WebSocket search engine
└── server.ts       # Bun HTTP server entry point
frontend/
├── components/     # React components (Search, Collection, Encyclopedia)
├── App.tsx         # Main app with tabs
└── styles.css      # Dark game theme
tests/              # 34 tests (buddy, sprites, crypto, claude-config)
scripts/
└── build.ts        # Build script for single-file exe
```

## Pro Feature

The Pro module enables **perfect legendary search** — finding companions where all stats hit their exact theoretical maximums for legendary rarity. This feature uses a separate `pro-impl.ts` module that is **not included** in this repository.

The open-source version includes full functionality for:
- Normal search with all criteria (species, rarity, eye, hat, shiny)
- Unlimited collection storage
- Companion preview and apply
- Species encyclopedia

## License

MIT
