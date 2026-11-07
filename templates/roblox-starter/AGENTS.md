# AGENTS.md — rules for AI agents working in this Roblox project

Read this file before changing anything.

## Layout (Rojo)

| Folder | In Roblox | What goes there |
|---|---|---|
| `src/server` | `ServerScriptService.Server` | `Main.server.luau` + `Services/*.luau` (game logic, data, money) |
| `src/server/Util` | `ServerScriptService.Server.Util` | helpers (`RateLimiter`) |
| `src/client` | `StarterPlayer.StarterPlayerScripts.Client` | `Main.client.luau` + `UI/*` (display only) |
| `src/shared` | `ReplicatedStorage.Shared` | `Config.luau`, `Remotes.luau`, content tables |

`*.server.luau` → Script, `*.client.luau` → LocalScript, `*.luau` → ModuleScript.

## Services

- `DataService` — the only way to read/write saved player data.
- `CurrencyService` — the only place that changes Coins during gameplay (logs analytics). One exception: developer-product grants in `MonetizationService`, because they need save-then-confirm with rollback.
- `MonetizationService` — game passes, dev products, the only `ProcessReceipt`.
- `DailyRewardService` — streak reward.
- `GameplayService` — EXAMPLE click loop; replace with the real game.
- `Analytics`, `Onboarding` — Creator Dashboard events and funnel.

Each service has `start()`. Register new ones in `Main.server.luau` (keep `DataService` last).

## Hard rules

1. Server decides, client asks. Never accept amounts/results from the client.
2. Every `OnServerEvent`: check argument types and ranges, rate-limit with `RateLimiter`.
3. Player data: only ADD fields to `Config.Data.Template`. Never rename/remove fields or change `StoreName`.
4. Purchases: grants are idempotent and saved before `PurchaseGranted`. Do not add a second `ProcessReceipt`.
5. All tunable numbers in `Config.luau`.
6. No paid random rewards without visible odds; no fake or misleading purchase prompts.

## Checks (run before saying "done")

```bash
rokit install                                   # once, installs rojo/selene/stylua from rokit.toml
rojo build default.project.json -o game.rbxlx
selene src
stylua --check src
```

## Working with Studio

- Live sync: `rojo serve` + Rojo plugin in Studio → Connect.
- Saving in Studio needs Game Settings → Security → "Enable Studio Access to API Services".
- Game pass / product IDs: create them in the Creator Dashboard, paste into `Config.Monetization`.
