# Roblox Starter (Roblox Factory template)

A playable starting point for a Roblox experience, managed with Rojo:
player data saving, coins with leaderboard, game passes, developer products,
daily reward streak, onboarding analytics and a simple mobile-friendly HUD.

## Run it

```bash
rokit install          # installs rojo, selene, stylua (versions in rokit.toml)
rojo serve             # then in Roblox Studio: Rojo plugin → Connect
```

Or build a place file and open it in Studio:

```bash
rojo build default.project.json -o game.rbxlx
```

## Before publishing

1. Publish the place from Studio (File → Publish to Roblox).
2. Game Settings → Security → enable **Studio Access to API Services** (to test saving).
3. Create game passes and developer products in the Creator Dashboard and paste their IDs into `src/shared/Config.luau` (`Config.Monetization`).
4. Replace the example click loop in `GameplayService` with your game.

Rules for AI agents: see `AGENTS.md`.
