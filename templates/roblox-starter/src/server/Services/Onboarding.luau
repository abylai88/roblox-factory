--[[
	Onboarding — reports the first-session funnel once per player.
	Steps are defined in Config.OnboardingSteps. Calling reach(player, 3) also
	reports any skipped earlier steps, so the funnel stays consistent.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Shared.Config)
local DataService = require(ServerScriptService.Server.Services.DataService)
local Analytics = require(ServerScriptService.Server.Services.Analytics)

local Onboarding = {}

function Onboarding.reach(player: Player, step: number)
	local data = DataService.get(player)
	if not data or data.Onboarding >= step then
		return
	end
	local from = data.Onboarding + 1
	DataService.update(player, function(d)
		d.Onboarding = step
	end)
	for _, entry in Config.OnboardingSteps do
		if entry.Step >= from and entry.Step <= step then
			Analytics.onboarding(player, entry.Step, entry.Name)
		end
	end
end

return Onboarding
