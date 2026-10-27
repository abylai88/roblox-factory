--[[
	Remotes — the single list of client↔server events.

	The server creates them, the client waits for them. Add a name to EVENTS
	to add a new remote. Never trust anything the client sends: validate types,
	ranges and rate on the server for every OnServerEvent handler.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local FOLDER_NAME = "Remotes"

local EVENTS = {
	"DataChanged", -- server → client: public snapshot of the player's data
	"Notify", -- server → client: short message to show in the HUD
	"Click", -- client → server: core-loop action (example)
	"ClaimDaily", -- client → server: claim daily reward
	"RequestPurchase", -- client → server: (kind: "pass" | "product", key: string)
}

local Remotes = {}

local folder
if RunService:IsServer() then
	folder = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = FOLDER_NAME
	end
	for _, name in EVENTS do
		if not folder:FindFirstChild(name) then
			local remote = Instance.new("RemoteEvent")
			remote.Name = name
			remote.Parent = folder
		end
	end
	folder.Parent = ReplicatedStorage
else
	folder = ReplicatedStorage:WaitForChild(FOLDER_NAME)
end

function Remotes.get(name: string): RemoteEvent
	local remote = folder:WaitForChild(name, 10)
	assert(remote and remote:IsA("RemoteEvent"), "Unknown remote: " .. name)
	return remote
end

return Remotes
