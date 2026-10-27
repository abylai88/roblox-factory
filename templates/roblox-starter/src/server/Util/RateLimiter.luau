--[[
	RateLimiter — token bucket per player. Use it on every client→server remote.

	local limiter = RateLimiter.new(10, 10) -- burst 10, refill 10/s
	if not limiter:allow(player) then return end
]]

local Players = game:GetService("Players")

local RateLimiter = {}
RateLimiter.__index = RateLimiter

function RateLimiter.new(capacity: number, refillPerSecond: number)
	local self = setmetatable({
		capacity = capacity,
		refill = refillPerSecond,
		buckets = {} :: { [Player]: { tokens: number, last: number } },
	}, RateLimiter)

	Players.PlayerRemoving:Connect(function(player)
		self.buckets[player] = nil
	end)

	return self
end

function RateLimiter:allow(player: Player, cost: number?): boolean
	local price = cost or 1
	local now = os.clock()
	local bucket = self.buckets[player]
	if not bucket then
		bucket = { tokens = self.capacity, last = now }
		self.buckets[player] = bucket
	end

	bucket.tokens = math.min(self.capacity, bucket.tokens + (now - bucket.last) * self.refill)
	bucket.last = now

	if bucket.tokens < price then
		return false
	end
	bucket.tokens -= price
	return true
end

return RateLimiter
