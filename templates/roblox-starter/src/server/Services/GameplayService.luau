--[[
	GameplayService — EXAMPLE core loop (click → coins).
	Replace this with your game's real loop, keeping the same rules:
	  * the client only sends an intent ("I clicked"), never an amount;
	  * the server checks the rate and decides the reward.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Shared.Config)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local DataService = require(ServerScriptService.Server.Services.DataService)
local CurrencyService = require(ServerScriptService.Server.Services.CurrencyService)
local Onboarding = require(ServerScriptService.Server.Services.Onboarding)
local RateLimiter = require(ServerScriptService.Server.Util.RateLimiter)

local GameplayService = {}

local clickLimiter = RateLimiter.new(Config.Gameplay.MaxClicksPerSecond, Config.Gameplay.MaxClicksPerSecond)

local function onClick(player: Player)
	if not clickLimiter:allow(player) then
		return
	end
	if not DataService.get(player) then
		return
	end

	DataService.update(player, function(d)
		d.TotalClicks += 1
	end)
	local balance = CurrencyService.add(
		player,
		Config.Gameplay.CoinsPerClick,
		Enum.AnalyticsEconomyTransactionType.Gameplay.Name,
		"Click",
		true
	)

	Onboarding.reach(player, 2)
	if balance and balance >= 100 then
		Onboarding.reach(player, 3)
	end
end

function GameplayService.start()
	Remotes.get("Click").OnServerEvent:Connect(onClick)
end

return GameplayService
