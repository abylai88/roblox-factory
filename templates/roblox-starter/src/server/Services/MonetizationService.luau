--[[
	MonetizationService — game passes and developer products.

	Game passes: ownership is checked on join and updated live after purchase.
	Developer products: ProcessReceipt grants the reward exactly once.
	  * The PurchaseId is stored in the player's data (ProcessedPurchases).
	  * The grant is saved to the DataStore BEFORE Roblox is told it succeeded.
	  * If the save fails, the grant is rolled back and Roblox retries later.

	Only ONE script in the whole game may set MarketplaceService.ProcessReceipt.

	API:
	  MonetizationService.hasPass(player, passKey) -> boolean
	  MonetizationService.prompt(player, kind: "pass" | "product", key)
	  MonetizationService.onPassOwned(callback(player, passKey))
]]

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Shared.Config)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local DataService = require(ServerScriptService.Server.Services.DataService)
local Analytics = require(ServerScriptService.Server.Services.Analytics)
local RateLimiter = require(ServerScriptService.Server.Util.RateLimiter)

local PASSES = Config.Monetization.GamePasses
local PRODUCTS = Config.Monetization.Products

local MonetizationService = {}

local ownedPasses: { [Player]: { [string]: boolean } } = {}
local passOwnedCallbacks = {}
local promptLimiter = RateLimiter.new(3, 0.5)

local passKeyById: { [number]: string } = {}
for key, pass in PASSES do
	if pass.Id ~= 0 then
		passKeyById[pass.Id] = key
	end
end

local productKeyById: { [number]: string } = {}
for key, product in PRODUCTS do
	if product.Id ~= 0 then
		productKeyById[product.Id] = key
	end
end

local function setOwned(player: Player, key: string)
	local owned = ownedPasses[player]
	if not owned or owned[key] then
		return
	end
	owned[key] = true
	for _, callback in passOwnedCallbacks do
		task.spawn(callback, player, key)
	end
end

local function loadPasses(player: Player)
	ownedPasses[player] = {}
	for key, pass in PASSES do
		if pass.Id ~= 0 then
			local ok, owns = pcall(function()
				return MarketplaceService:UserOwnsGamePassAsync(player.UserId, pass.Id)
			end)
			if ok and owns then
				setOwned(player, key)
			end
		end
	end
end

function MonetizationService.hasPass(player: Player, key: string): boolean
	local owned = ownedPasses[player]
	return owned ~= nil and owned[key] == true
end

function MonetizationService.ownedList(player: Player): { string }
	local list = {}
	for key, isOwned in ownedPasses[player] or {} do
		if isOwned then
			table.insert(list, key)
		end
	end
	table.sort(list)
	return list
end

function MonetizationService.onPassOwned(callback: (Player, string) -> ())
	table.insert(passOwnedCallbacks, callback)
end

function MonetizationService.prompt(player: Player, kind: string, key: string)
	if kind == "pass" then
		local pass = PASSES[key]
		if not pass or MonetizationService.hasPass(player, key) then
			return
		end
		if pass.Id == 0 then
			Remotes.get("Notify"):FireClient(player, "Game pass не настроен: впиши Id в Config.Monetization")
			return
		end
		Analytics.custom(player, "PromptPass_" .. key)
		MarketplaceService:PromptGamePassPurchase(player, pass.Id)
	elseif kind == "product" then
		local product = PRODUCTS[key]
		if not product then
			return
		end
		if product.Id == 0 then
			Remotes.get("Notify"):FireClient(player, "Продукт не настроен: впиши Id в Config.Monetization")
			return
		end
		Analytics.custom(player, "PromptProduct_" .. key)
		MarketplaceService:PromptProductPurchase(player, product.Id)
	end
end

local function processReceipt(receipt)
	local player = Players:GetPlayerByUserId(receipt.PlayerId)
	local key = productKeyById[receipt.ProductId]
	local product = key and PRODUCTS[key]
	local data = player and DataService.get(player)

	if not product then
		warn("[Monetization] Unknown product", receipt.ProductId)
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	if not player or not data then
		-- Player left or data not loaded yet: Roblox will retry on next join.
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	if table.find(data.ProcessedPurchases, receipt.PurchaseId) then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	-- Apply the grant and remember the previous values for rollback.
	local previous = {}
	DataService.update(player, function(d)
		for field, amount in product.Grant do
			previous[field] = d[field]
			d[field] = (d[field] or 0) + amount
		end
		table.insert(d.ProcessedPurchases, receipt.PurchaseId)
		while #d.ProcessedPurchases > Config.Data.MaxStoredPurchaseIds do
			table.remove(d.ProcessedPurchases, 1)
		end
	end)

	-- Studio without API access keeps temporary data: allow test purchases there.
	local saved = DataService.saveNow(player)
	if not saved and RunService:IsStudio() and not DataService.isPersistent(player) then
		saved = true
	end
	if not saved then
		DataService.update(player, function(d)
			for field, value in previous do
				d[field] = value
			end
			local index = table.find(d.ProcessedPurchases, receipt.PurchaseId)
			if index then
				table.remove(d.ProcessedPurchases, index)
			end
		end)
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	for field, amount in product.Grant do
		Analytics.earn(
			player,
			field,
			amount,
			data[field],
			Enum.AnalyticsEconomyTransactionType.IAP.Name,
			key
		)
	end
	Remotes.get("Notify"):FireClient(player, "Спасибо за покупку! +" .. product.Name)
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

function MonetizationService.start()
	MarketplaceService.ProcessReceipt = processReceipt

	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
		local key = passKeyById[passId]
		if purchased and key then
			setOwned(player, key)
			Analytics.custom(player, "BoughtPass_" .. key)
			Remotes.get("Notify"):FireClient(player, "Спасибо! Открыто: " .. PASSES[key].Name)
		end
	end)

	Remotes.get("RequestPurchase").OnServerEvent:Connect(function(player, kind, key)
		if type(kind) ~= "string" or type(key) ~= "string" then
			return
		end
		if not promptLimiter:allow(player) then
			return
		end
		MonetizationService.prompt(player, kind, key)
	end)

	Players.PlayerAdded:Connect(loadPasses)
	for _, player in Players:GetPlayers() do
		task.spawn(loadPasses, player)
	end
	Players.PlayerRemoving:Connect(function(player)
		ownedPasses[player] = nil
	end)
end

return MonetizationService
