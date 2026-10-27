--[[
	Client entry point. The client only DISPLAYS state and SENDS intents.
	All rewards, prices and checks happen on the server.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Hud = require(script.Parent.UI.Hud)

local player = Players.LocalPlayer
local hud = Hud.create(player:WaitForChild("PlayerGui"))

local toastToken = 0
local function showToast(message: string)
	toastToken += 1
	local token = toastToken
	hud.Toast.Text = message
	hud.Toast.Visible = true
	task.delay(2.5, function()
		if token == toastToken then
			hud.Toast.Visible = false
		end
	end)
end

local baseSizes: { [GuiObject]: UDim2 } = {}
local function pop(target: GuiObject)
	local base = baseSizes[target] or target.Size
	baseSizes[target] = base
	local grow = UDim2.new(base.X.Scale * 1.05, base.X.Offset, base.Y.Scale * 1.05, base.Y.Offset + 4)
	local tween = TweenService:Create(target, TweenInfo.new(0.06), { Size = grow })
	tween.Completed:Once(function()
		target.Size = base
	end)
	tween:Play()
end

Remotes.get("DataChanged").OnClientEvent:Connect(function(snapshot)
	hud.CoinsLabel.Text = "🪙 " .. tostring(snapshot.Coins)
	local ownsDouble = table.find(snapshot.Passes, "DoubleCoins") ~= nil
	hud.DoubleCoins.Text = if ownsDouble then "2x монеты ✓" else "2x монеты"
	hud.DoubleCoins.Active = not ownsDouble
	hud.Daily.Text = if snapshot.DailyReadyIn <= 0 then "Награда дня!" else "Награда дня"
end)

Remotes.get("Notify").OnClientEvent:Connect(showToast)

hud.Click.Activated:Connect(function()
	pop(hud.Click)
	Remotes.get("Click"):FireServer()
end)

hud.Daily.Activated:Connect(function()
	Remotes.get("ClaimDaily"):FireServer()
end)

hud.DoubleCoins.Activated:Connect(function()
	Remotes.get("RequestPurchase"):FireServer("pass", "DoubleCoins")
end)

hud.Coins1000.Activated:Connect(function()
	Remotes.get("RequestPurchase"):FireServer("product", "Coins1000")
end)
