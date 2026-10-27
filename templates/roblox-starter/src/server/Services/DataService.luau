--[[
	DataService — loads, caches and saves player data in a DataStore.

	Safety rules built in:
	  * If loading fails after retries, the data is NEVER saved over
	    (in a live server the player is kicked; in Studio they play with
	    temporary data). This prevents wiping a real save.
	  * Missing fields from Config.Data.Template are added to old saves.
	  * Autosave + save on leave + save on server shutdown (BindToClose).

	Limitation: there is no cross-server session lock. For a game with
	real money flowing, consider switching to ProfileStore (loleris).

	API:
	  DataService.get(player) -> data | nil
	  DataService.waitFor(player) -> data | nil (nil if the player left)
	  DataService.update(player, fn) -> boolean   fn(data) mutates data
	  DataService.saveNow(player) -> boolean
	  DataService.onLoaded(callback(player, data))
	  DataService.onChanged(callback(player, data))
]]

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.Shared.Config)

local DataService = {}

type Profile = {
	Data: { [string]: any },
	CanSave: boolean,
}

local profiles: { [Player]: Profile } = {}
local loadedCallbacks = {}
local changedCallbacks = {}
local started = false

local store: DataStore? = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(Config.Data.StoreName)
	end)
	if ok then
		store = result
	else
		warn("[DataService] DataStore unavailable:", result)
	end
end

local function deepCopy(value)
	if type(value) ~= "table" then
		return value
	end
	local copy = {}
	for k, v in value do
		copy[k] = deepCopy(v)
	end
	return copy
end

-- Fill in keys that exist in the template but not in the saved data.
local function reconcile(data, template)
	for key, default in template do
		if data[key] == nil then
			data[key] = deepCopy(default)
		elseif type(default) == "table" and type(data[key]) == "table" and next(default) ~= nil then
			reconcile(data[key], default)
		end
	end
end

local function withRetries(attempts: number, fn: () -> any): (boolean, any)
	local lastError
	for attempt = 1, attempts do
		local ok, result = pcall(fn)
		if ok then
			return true, result
		end
		lastError = result
		if attempt < attempts then
			task.wait(2 ^ attempt)
		end
	end
	return false, lastError
end

local function keyFor(player: Player): string
	return "player_" .. player.UserId
end

local function fire(callbacks, player: Player, data)
	for _, callback in callbacks do
		task.spawn(callback, player, data)
	end
end

local function loadPlayer(player: Player)
	local ok, saved
	if store then
		local activeStore = store
		ok, saved = withRetries(3, function()
			return activeStore:GetAsync(keyFor(player))
		end)
	else
		ok, saved = false, "no DataStore"
	end

	if not ok then
		if RunService:IsStudio() then
			warn(
				"[DataService] Could not load data in Studio — using temporary data that will NOT be saved. "
					.. "Enable 'Studio Access to API Services' in Game Settings → Security to test saving.",
				saved
			)
		else
			warn("[DataService] Load failed for", player.UserId, saved)
			player:Kick("Не удалось загрузить сохранение. Перезайди, пожалуйста. / Could not load your data, please rejoin.")
			return
		end
	end

	-- The player may have left while we were waiting on the DataStore.
	if player.Parent ~= Players then
		return
	end

	local data = if type(saved) == "table" then saved else {}
	reconcile(data, Config.Data.Template)

	profiles[player] = { Data = data, CanSave = ok }
	fire(loadedCallbacks, player, data)
	fire(changedCallbacks, player, data)
end

local function savePlayer(player: Player): boolean
	local profile = profiles[player]
	if not profile or not profile.CanSave or not store then
		return false
	end
	local activeStore = store
	local snapshot = deepCopy(profile.Data)
	local ok, err = withRetries(3, function()
		activeStore:UpdateAsync(keyFor(player), function()
			return snapshot
		end)
	end)
	if not ok then
		warn("[DataService] Save failed for", player.UserId, err)
	end
	return ok
end

function DataService.get(player: Player)
	local profile = profiles[player]
	return profile and profile.Data
end

function DataService.waitFor(player: Player)
	while player.Parent == Players and not profiles[player] do
		task.wait(0.1)
	end
	return DataService.get(player)
end

function DataService.update(player: Player, mutate: ({ [string]: any }) -> ()): boolean
	local profile = profiles[player]
	if not profile then
		return false
	end
	mutate(profile.Data)
	fire(changedCallbacks, player, profile.Data)
	return true
end

function DataService.saveNow(player: Player): boolean
	return savePlayer(player)
end

-- false when the player is on temporary (unsaved) Studio data.
function DataService.isPersistent(player: Player): boolean
	local profile = profiles[player]
	return profile ~= nil and profile.CanSave
end

function DataService.onLoaded(callback: (Player, { [string]: any }) -> ())
	table.insert(loadedCallbacks, callback)
end

function DataService.onChanged(callback: (Player, { [string]: any }) -> ())
	table.insert(changedCallbacks, callback)
end

function DataService.start()
	if started then
		return
	end
	started = true

	Players.PlayerAdded:Connect(loadPlayer)
	for _, player in Players:GetPlayers() do
		task.spawn(loadPlayer, player)
	end

	Players.PlayerRemoving:Connect(function(player)
		savePlayer(player)
		profiles[player] = nil
	end)

	task.spawn(function()
		while true do
			task.wait(Config.Data.AutosaveSeconds)
			for player in profiles do
				task.spawn(savePlayer, player)
			end
		end
	end)

	game:BindToClose(function()
		local pending = 0
		for player in profiles do
			pending += 1
			task.spawn(function()
				savePlayer(player)
				pending -= 1
			end)
		end
		local deadline = os.clock() + 25
		while pending > 0 and os.clock() < deadline do
			task.wait(0.1)
		end
	end)
end

return DataService
