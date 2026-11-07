--[[
	DailyRewardService — streak-based daily reward (a reason to come back tomorrow).
	Timing uses server os.time(), never anything the client sends.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Shared.Config)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local DataService = require(ServerScriptService.Server.Services.DataService)
local CurrencyService = require(ServerScriptService.Server.Services.CurrencyService)
local Onboarding = require(ServerScriptService.Server.Services.Onboarding)
local RateLimiter = require(ServerScriptService.Server.Util.RateLimiter)

local DailyRewardService = {}

local limiter = RateLimiter.new(2, 0.5)

function DailyRewardService.secondsUntilNext(data): number
	local elapsed = os.time() - data.LastDailyClaim
	return math.max(0, Config.Daily.CooldownSeconds - elapsed)
end

function DailyRewardService.claim(player: Player): (boolean, string)
	local data = DataService.get(player)
	if not data then
		return false, "Данные ещё загружаются"
	end

	local waitSeconds = DailyRewardService.secondsUntilNext(data)
	if waitSeconds > 0 then
		return false,
			string.format(
				"Следующая награда через %d ч %d мин",
				waitSeconds // 3600,
				(waitSeconds % 3600) // 60
			)
	end

	local now = os.time()
	local keepsStreak = data.LastDailyClaim > 0 and (now - data.LastDailyClaim) <= Config.Daily.StreakWindowSeconds
	local streak = if keepsStreak then data.DailyStreak + 1 else 1
	local rewards = Config.Daily.Rewards
	local reward = rewards[math.min(streak, #rewards)]

	DataService.update(player, function(d)
		d.DailyStreak = streak
		d.LastDailyClaim = now
	end)
	CurrencyService.add(player, reward, Enum.AnalyticsEconomyTransactionType.TimedReward.Name, "DailyReward")
	Onboarding.reach(player, 4)

	return true, string.format("День %d: +%d монет", streak, reward)
end

function DailyRewardService.start()
	Remotes.get("ClaimDaily").OnServerEvent:Connect(function(player)
		if not limiter:allow(player) then
			return
		end
		local _, message = DailyRewardService.claim(player)
		Remotes.get("Notify"):FireClient(player, message)
	end)
end

return DailyRewardService
