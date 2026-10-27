--[[
	Server entry point. Starts every service in a fixed order and wires the
	small amount of glue between them. Add new services to SERVICES.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Services = script.Parent.Services

local DataService = require(Services.DataService)
local CurrencyService = require(Services.CurrencyService)
local MonetizationService = require(Services.MonetizationService)
local DailyRewardService = require(Services.DailyRewardService)
local GameplayService = require(Services.GameplayService)
local Onboarding = require(Services.Onboarding)

-- 2x Coins game pass doubles coins earned from gameplay.
CurrencyService.setMultiplier(function(player)
	return if MonetizationService.hasPass(player, "DoubleCoins") then 2 else 1
end)

-- Public snapshot sent to the client. Never send internal fields.
local function publicSnapshot(player: Player, data)
	return {
		Coins = data.Coins,
		DailyStreak = data.DailyStreak,
		DailyReadyIn = DailyRewardService.secondsUntilNext(data),
		Passes = MonetizationService.ownedList(player),
	}
end

local dataChanged = Remotes.get("DataChanged")

DataService.onChanged(function(player, data)
	dataChanged:FireClient(player, publicSnapshot(player, data))
end)

DataService.onLoaded(function(player)
	Onboarding.reach(player, 1)
end)

MonetizationService.onPassOwned(function(player)
	local data = DataService.get(player)
	if data then
		dataChanged:FireClient(player, publicSnapshot(player, data))
	end
end)

-- DataService starts LAST so every onLoaded/onChanged listener is already
-- registered when the first player's data arrives.
local SERVICES = {
	CurrencyService,
	MonetizationService,
	DailyRewardService,
	GameplayService,
	DataService,
}

for _, service in SERVICES do
	service.start()
end

print("[Server] started")
