--[[
	Analytics — thin, never-throwing wrapper around Roblox AnalyticsService.
	Results appear in the Creator Dashboard (Analytics → Economy / Funnels / Custom).

	Keep event names stable: renaming them splits the history in the dashboard.
]]

local AnalyticsService = game:GetService("AnalyticsService")

local Analytics = {}

local function safe(label: string, fn: () -> ())
	local ok, err = pcall(fn)
	if not ok then
		warn("[Analytics] " .. label .. " failed:", err)
	end
end

-- Currency earned (source). transactionType: Enum.AnalyticsEconomyTransactionType name.
function Analytics.earn(player: Player, currency: string, amount: number, balance: number, transactionType: string, sku: string?)
	safe("earn", function()
		AnalyticsService:LogEconomyEvent(
			player,
			Enum.AnalyticsEconomyFlowType.Source,
			currency,
			amount,
			balance,
			transactionType,
			sku
		)
	end)
end

-- Currency spent (sink).
function Analytics.spend(player: Player, currency: string, amount: number, balance: number, transactionType: string, sku: string?)
	safe("spend", function()
		AnalyticsService:LogEconomyEvent(
			player,
			Enum.AnalyticsEconomyFlowType.Sink,
			currency,
			amount,
			balance,
			transactionType,
			sku
		)
	end)
end

function Analytics.onboarding(player: Player, step: number, stepName: string)
	safe("onboarding", function()
		AnalyticsService:LogOnboardingFunnelStepEvent(player, step, stepName)
	end)
end

function Analytics.custom(player: Player, eventName: string, value: number?)
	safe("custom", function()
		AnalyticsService:LogCustomEvent(player, eventName, value or 1)
	end)
end

return Analytics
