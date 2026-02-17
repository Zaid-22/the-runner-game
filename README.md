# The Runner (ITZone Edition)

Fast-paced arena FPS survival game built with a custom Three.js + cannon-es stack.

You fight through **6 waves**, each with a different boss, mixed enemy compositions, movement abilities, weapon variety, and power-ups.

## Gameplay Scope

- 6 total waves
- 6 unique bosses:
  - Wave 1: Obsidian Titan
  - Wave 2: Void Reaper
  - Wave 3: Nightfang Executioner
  - Wave 4: Rift Judicator
  - Wave 5: Eclipse Warden
  - Wave 6: Abyss Sovereign (final)
- Mixed enemy roster: arachnid, specter, stalker, harpy, sentinel, kamikaze, brute, titan
- Dynamic arena phases and trap sets as waves progress
- Wave flow state machine: `STARTING -> ACTIVE -> COMPLETE -> VICTORY`

## Technology Stack

- Language/runtime:
  - JavaScript (ES Modules)
  - HTML5
  - CSS3
  - Node.js (for tooling and QA scripts)
- 3D rendering and scene systems:
  - `three` core
  - Three.js addons:
    - `PointerLockControls`
    - `EffectComposer`
    - `RenderPass`
    - `UnrealBloomPass`
    - `OutputPass`
- Physics:
  - `cannon-es`
  - Solvers/config used: `World`, `Body`, `GSSolver`, `SplitSolver`, collision groups/masks
- Audio:
  - Web Audio API (`AudioContext`, oscillators, filters, gain, noise buffers)
  - Procedural SFX generation in `SoundManager`
- Build and packaging:
  - `vite` 5
  - Rollup chunking via Vite config (`vendor-three-core`, `vendor-three-addons`, `vendor-physics`)
- Automated QA:
  - `scripts/smoke-preview.mjs` (build + preview reachability)
  - `scripts/release-sanity.mjs` (static/config and collision sanity)
  - `scripts/gameplay-flow-sanity.mjs` (wave/restart/win-lose flow checks)
- CI:
  - GitHub Actions workflow: `.github/workflows/smoke.yml`

## Requirements

- Node.js 18+ recommended
- npm

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Dev server default: `http://localhost:5173`

## Build And QA

```bash
npm run build
npm run preview
npm run qa:smoke
npm run qa:release
```

Script meanings:

- `dev`: run Vite dev server
- `build`: production build to `dist/`
- `preview`: preview built output
- `qa:smoke`: build + preview reachability check
- `qa:release`: smoke + release sanity + gameplay flow sanity

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move |
| `Mouse` | Aim / look |
| `Left Click` | Fire |
| `Space` | Jump |
| `Shift` | Dash |
| `C` | Slide |
| `1 / 2 / 3` | Switch weapon |
| `Esc` or `P` | Pause / resume |
| `F3` | Toggle performance overlay |

## Weapons

| Weapon | Type | Base Damage | Starting Ammo | Max Ammo |
| --- | --- | --- | --- | --- |
| Pistol | Hitscan | 24 | 110 | 160 |
| Shotgun | Multi-pellet + splash | 11 per pellet | 28 | 56 |
| Rocket | Projectile explosive | 120 | 8 | 14 |

Notes:

- Shotgun includes pellet spread, range falloff, and splash damage.
- Rocket is high-impact with low ammo economy.

## Power-Ups

- `health`: restores HP
- `ammo`: refills weapon ammo
- `speed`: temporary movement speed boost
- `damage`: temporary damage boost

Drops are weighted by player state (low health/ammo increases relevant drop chance).

## Architecture And Structure

```text
The runner/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
├── scripts/
│   ├── smoke-preview.mjs
│   ├── release-sanity.mjs
│   └── gameplay-flow-sanity.mjs
├── src/
│   ├── main.js
│   ├── style.css
│   ├── core/
│   │   ├── Game.js
│   │   ├── Level.js
│   │   ├── Input.js
│   │   ├── SoundManager.js
│   │   └── ParticleSystem.js
│   ├── entities/
│   │   ├── Player.js
│   │   ├── Enemy.js
│   │   ├── MonsterFactory.js
│   │   ├── Projectile.js
│   │   ├── PowerUp.js
│   │   ├── WeaponModel.js
│   │   ├── FloatingCredits.js
│   │   └── *Model.js boss/monster model builders
│   └── utils/
│       ├── TextureGenerator.js
│       ├── MeshCache.js
│       └── HealthBar.js
└── .github/workflows/
    └── smoke.yml
```

Component responsibilities:

- `index.html`: HUD/menu DOM + global start/pause/restart hooks
- `src/main.js`: lazy boot and singleton game instance wiring
- `src/core/Game.js`: main loop, waves, spawning, restart flow, combat/game states
- `src/core/Level.js`: arena geometry, traps, dynamic phase visuals/physics colliders
- `src/entities/*.js`: gameplay actors and model generation
- `src/utils/*.js`: shared support systems (textures, caching, health bars)
- `scripts/*.mjs`: automated publish checks
- `.github/workflows/smoke.yml`: CI smoke gate on push/PR

## Release Checklist

Before publish, run:

```bash
npm run qa:release
```

Then do a short manual playtest:

- Start game from menu for each difficulty
- Complete at least one wave transition
- Validate boss spawn, movement, and laser attack behavior
- Validate death/victory and restart behavior
- Validate weapon switching, ammo HUD, hit feedback, and power-up pickup flow

## Credits

- Developed by Zaid Asaireh (ITZone Edition)
- Core stack: Three.js, cannon-es, Vite
