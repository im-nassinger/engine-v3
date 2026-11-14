# Lua example scripts

## TL;DR

Whole `.lua` files that show how the [Lua API](lua-api.md) reads in practice: a coin, a button and a door, walking, a turret, a score, health, and dragging with the mouse. Each is attached to an entity through its ScriptComponent.

## A coin

The coin is a sensor. It adds to a variable and disappears when the player touches it.

```lua
settings = {
    amount = number_field(1, { min = 1 }),
    score = variable_field("coins"),
}

on("touched", function(other)
    if not has_tag(other, "player") then
        return
    end

    local current_score = get_variable(settings.score)
    set_variable(settings.score, current_score + settings.amount)

    destroy(this)
end)
```

## A button that opens a door

The button doesn't know how the door works. It only fires `open` on it.

```lua
settings = {
    door = entity_field(),
}

on("touched", function(other)
    if not has_tag(other, "player") then
        return
    end

    fire_event(settings.door, "open")
end)
```

The door lets things through for a few seconds, then closes again.

```lua
settings = {
    open_seconds = number_field(3, { min = 0, unit = "s" }),
}

local surface = get_component(this, "SurfaceComponent")
local style = get_component(this, "StyleComponent")

local function set_open(is_open)
    set_attribute(surface, "sensor", is_open)

    if is_open then
        set_attribute(style, "opacity", 0.3)
    else
        set_attribute(style, "opacity", 1)
    end
end

on("open", function()
    set_open(true)
    wait(settings.open_seconds)
    set_open(false)
end)
```

## Walking left and right

```lua
settings = {
    speed = number_field(300, { min = 0, unit = "px/s" }),
}

local function read_direction()
    local direction = 0

    if is_down("left") then
        direction = direction - 1
    end
    if is_down("right") then
        direction = direction + 1
    end

    return direction
end

on("tick", function()
    local direction = read_direction()
    local _, fall_speed = get_velocity(this)

    set_velocity(this, direction * settings.speed, fall_speed)
end)
```

## A turret

```lua
settings = {
    bolt = asset_field("projectiles/bolt.entity"),
    shot_speed = number_field(800, { min = 0, unit = "px/s" }),
    cooldown = number_field(0.5, { min = 0.1, unit = "s" }),
}

local function fire_bolt()
    local bolt = spawn(settings.bolt)
    if bolt == nil then
        return
    end

    local turret_x, turret_y = get_position(this)
    set_position(bolt, turret_x, turret_y)
    set_velocity(bolt, settings.shot_speed, 0)
end

on("level_start", function()
    while true do
        fire_bolt()
        wait(settings.cooldown)
    end
end)
```

## Showing the score

The entity is a text. It shows the variable every time it changes.

```lua
settings = {
    score = variable_field("coins"),
}

local text = get_component(this, "TextComponent")

local function show_score()
    local current_score = get_variable(settings.score)
    set_attribute(text, "text", "Coins: " .. current_score)
end

on("level_start", show_score)

on("variable_changed", function(name)
    if name ~= settings.score then
        return
    end

    show_score()
end)
```

## Health

Each entity runs its own copy of a script, so `health` belongs to this entity only. Another script hurts it with `fire_event(enemy, "damage", 1)`.

```lua
settings = {
    max_health = number_field(3, { min = 1 }),
}

local health = settings.max_health

on("damage", function(sender, amount)
    health = health - amount
    if health > 0 then
        return
    end

    fire_event(this, "died")
end)

on("heal", function(sender, amount)
    local healed = health + amount
    health = clamp(healed, 0, settings.max_health)
end)
```

## Dragging with the mouse · v3

```lua
on("tick", function()
    if not is_mouse_down("left") then
        return
    end

    local mouse_x, mouse_y = mouse_position()
    set_position(this, mouse_x, mouse_y)
end)
```
