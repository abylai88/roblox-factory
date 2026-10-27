--[[
	Hud — minimal code-built HUD so the template is playable out of the box.
	Scales for phone and PC. Replace with your own UI (built here or in Studio).
]]

local Hud = {}

local function corner(parent: Instance)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 12)
	c.Parent = parent
end

local function makeButton(parent: Instance, name: string, text: string, color: Color3, order: number): TextButton
	local button = Instance.new("TextButton")
	button.Name = name
	button.Text = text
	button.LayoutOrder = order
	button.Size = UDim2.new(1, 0, 0, 52)
	button.BackgroundColor3 = color
	button.TextColor3 = Color3.new(1, 1, 1)
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.AutoButtonColor = true
	corner(button)

	local padding = Instance.new("UIPadding")
	padding.PaddingLeft = UDim.new(0, 10)
	padding.PaddingRight = UDim.new(0, 10)
	padding.PaddingTop = UDim.new(0, 8)
	padding.PaddingBottom = UDim.new(0, 8)
	padding.Parent = button

	button.Parent = parent
	return button
end

function Hud.create(playerGui: PlayerGui)
	local gui = Instance.new("ScreenGui")
	gui.Name = "Hud"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false

	local panel = Instance.new("Frame")
	panel.Name = "Panel"
	panel.AnchorPoint = Vector2.new(0, 0.5)
	panel.Position = UDim2.new(0, 16, 0.5, 0)
	panel.Size = UDim2.new(0.22, 0, 0.6, 0)
	panel.BackgroundTransparency = 1
	panel.Parent = gui

	local constraint = Instance.new("UISizeConstraint")
	constraint.MinSize = Vector2.new(170, 0)
	constraint.MaxSize = Vector2.new(260, math.huge)
	constraint.Parent = panel

	local layout = Instance.new("UIListLayout")
	layout.Padding = UDim.new(0, 8)
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Parent = panel

	local coins = Instance.new("TextLabel")
	coins.Name = "Coins"
	coins.LayoutOrder = 0
	coins.Size = UDim2.new(1, 0, 0, 56)
	coins.BackgroundColor3 = Color3.fromRGB(30, 30, 36)
	coins.BackgroundTransparency = 0.2
	coins.TextColor3 = Color3.fromRGB(255, 214, 92)
	coins.Font = Enum.Font.GothamBlack
	coins.TextScaled = true
	coins.Text = "🪙 0"
	corner(coins)
	coins.Parent = panel

	local hud = {
		Gui = gui,
		CoinsLabel = coins,
		Click = makeButton(panel, "Click", "Тап! +1", Color3.fromRGB(64, 160, 255), 1),
		Daily = makeButton(panel, "Daily", "Награда дня", Color3.fromRGB(90, 190, 110), 2),
		DoubleCoins = makeButton(panel, "DoubleCoins", "2x монеты", Color3.fromRGB(170, 90, 230), 3),
		Coins1000 = makeButton(panel, "Coins1000", "+1000 монет", Color3.fromRGB(240, 150, 50), 4),
	}

	local toast = Instance.new("TextLabel")
	toast.Name = "Toast"
	toast.AnchorPoint = Vector2.new(0.5, 0)
	toast.Position = UDim2.new(0.5, 0, 0, 16)
	toast.Size = UDim2.new(0.5, 0, 0, 44)
	toast.BackgroundColor3 = Color3.fromRGB(20, 20, 24)
	toast.BackgroundTransparency = 0.15
	toast.TextColor3 = Color3.new(1, 1, 1)
	toast.Font = Enum.Font.GothamMedium
	toast.TextScaled = true
	toast.Visible = false
	corner(toast)
	toast.Parent = gui
	hud.Toast = toast

	gui.Parent = playerGui
	return hud
end

return Hud
