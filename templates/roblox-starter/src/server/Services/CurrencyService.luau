--[[
	CurrencyService — the ONLY place that changes Coins.
	Every change is logged to Analytics as an economy source/sink.

	API:
	  CurrencyService.add(player, amount, transactionType, sku?, applyMultiplier?) -> newBalance | nil
	  CurrencyService.spend(player, amount, transactionType, sku?) -> boolean
	  CurrencyService.setMultiplier(fn(player) -> number)  -- e.g. 2x Coins pass
]]

local ServerScriptService = game:GetService("ServerScriptService")

local DataService = require(ServerScriptService.Server.Services.DataService)
local Analytics = require(ServerScriptService.Server.Services.Analytics)

local CURRENCY = "Coins"

local CurrencyService = {}

local multiplierFn: (Player) -> number = function()
	return 1
end

function CurrencyService.setMultiplier(fn: (Player) -> number)
	multiplierFn = fn
end

function CurrencyService.add(
	player: Player,
	amount: number,
	transactionType: string,
	sku: string?,
	applyMultiplier: boolean?
): number?
	if type(amount) ~= "number" or amount <= 0 or amount ~= amount or amount == math.huge then
		return nil
	end
	local total = math.floor(amount * (if applyMultiplier then multiplierFn(player) else 1))

	local balance
	local ok = DataService.update(player, function(data)
		data.Coins += total
		balance = data.Coins
	end)
	if not ok then
		return nil
	end
	Analytics.earn(player, CURRENCY, total, balance, transactionType, sku)
	return balance
end

function CurrencyService.spend(player: Player, amount: number, transactionType: string, sku: string?): boolean
	local data = DataService.get(player)
	if not data or type(amount) ~= "number" or amount <= 0 or data.Coins < amount then
		return false
	end
	local balance
	DataService.update(player, function(d)
		d.Coins -= amount
		balance = d.Coins
	end)
	Analytics.spend(player, CURRENCY, amount, balance, transactionType, sku)
	return true
end

-- Leaderboard in the player list.
local function syncLeaderstats(player: Player, data)
	local stats = player:FindFirstChild("leaderstats")
	if not stats then
		stats = Instance.new("Folder")
		stats.Name = "leaderstats"
		local coins = Instance.new("IntValue")
		coins.Name = CURRENCY
		coins.Parent = stats
		stats.Parent = player
	end
	local coins = stats:FindFirstChild(CURRENCY)
	if coins then
		coins.Value = data.Coins
	end
end

function CurrencyService.start()
	DataService.onChanged(syncLeaderstats)
end

return CurrencyService
