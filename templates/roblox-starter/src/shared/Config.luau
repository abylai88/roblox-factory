--[[
	Config — every tunable number of the game lives here.
	Agents: change values here instead of hard-coding them in services.

	Monetization IDs are 0 until you create the items in the Creator Dashboard
	(Monetization → Passes / Developer Products) and paste the real IDs here.
	Items with Id = 0 are ignored safely.
]]

local Config = {}

Config.Data = {
	-- Changing the name starts everyone from scratch. Bump only on purpose.
	StoreName = "PlayerData_v1",
	AutosaveSeconds = 120,
	-- Default data for a new player. New fields are added to old saves
	-- automatically (reconcile), so only ever ADD fields here.
	Template = {
		Coins = 0,
		TotalClicks = 0,
		DailyStreak = 0,
		LastDailyClaim = 0,
		Onboarding = 0,
		-- Processed developer-product PurchaseIds (prevents double grants).
		ProcessedPurchases = {},
	},
	MaxStoredPurchaseIds = 50,
}

-- Example core loop: click → earn coins. Replace with your game's loop.
Config.Gameplay = {
	CoinsPerClick = 1,
	MaxClicksPerSecond = 12,
}

Config.Daily = {
	CooldownSeconds = 20 * 60 * 60,
	-- Streak resets if the player misses this window after the cooldown.
	StreakWindowSeconds = 48 * 60 * 60,
	-- Reward by streak day; the last value repeats after the list ends.
	Rewards = { 100, 150, 200, 300, 400, 600, 1000 },
}

Config.Monetization = {
	GamePasses = {
		DoubleCoins = { Id = 0, Name = "2x Coins" },
		VIP = { Id = 0, Name = "VIP" },
	},
	Products = {
		Coins1000 = { Id = 0, Name = "1 000 Coins", Grant = { Coins = 1000 } },
		Coins5000 = { Id = 0, Name = "5 000 Coins", Grant = { Coins = 5000 } },
	},
}

-- Onboarding funnel steps reported to Roblox Analytics (Creator Dashboard).
Config.OnboardingSteps = {
	{ Step = 1, Name = "Joined" },
	{ Step = 2, Name = "FirstClick" },
	{ Step = 3, Name = "Reached100Coins" },
	{ Step = 4, Name = "FirstDailyReward" },
}

return Config
