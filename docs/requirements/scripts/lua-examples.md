# Lua example scripts

## TL;DR

Whole `.lua` files that show how the [Lua API](lua-api.md) reads in practice: a coin, a button and a door, walking, a turret, a score, health, and dragging with the mouse. Each is attached to an entity through its ScriptComponent, and the variables at its top live on that entity's VariablesComponent.

## A coin

The coin is a sensor. It adds to a variable and disappears when the player touches it.

```lua
variables = {
    amount = number_variable(1, { min = 1 }),
}

on("touched", function(other)
    if not has_tag(other, "player") then
        return
    end

    local current_score = get_variable("coins")
    set_variable("coins", current_score + variables.amount)

    destroy(this)
end)
```

## A button that opens a door

The button doesn't know how the door works. It only fires `open` on it.

```lua
variables = {
    door = entity_variable(),
}

on("touched", function(other)
    if not has_tag(other, "player") then
        return
    end

    fire_event(variables.door, "open")
end)
```

The door lets things through for a few seconds, then closes again.

```lua
variables = {
    open_seconds = number_variable(3, { min = 0, unit = "s" }),
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
    wait(variables.open_seconds)
    set_open(false)
end)
```

## Walking left and right

```lua
variables = {
    speed = number_variable(300, { min = 0, unit = "px/s" }),
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

    set_velocity(this, direction * variables.speed, fall_speed)
end)
```

## A turret

```lua
variables = {
    bolt = asset_variable("projectiles/bolt.entity"),
    shot_speed = number_variable(800, { min = 0, unit = "px/s" }),
    cooldown = number_variable(0.5, { min = 0.1, unit = "s" }),
}

local function fire_bolt()
    local bolt = spawn(variables.bolt)
    if bolt == nil then
        return
    end

    local turret_x, turret_y = get_position(this)
    set_position(bolt, turret_x, turret_y)
    set_velocity(bolt, variables.shot_speed, 0)
end

on("level_start", function()
    while true do
        fire_bolt()
        wait(variables.cooldown)
    end
end)
```

## Showing the score

The entity is a text. It shows the variable every time it changes.

```lua
local text = get_component(this, "TextComponent")

local function show_score()
    local current_score = get_variable("coins")
    set_attribute(text, "text", "Coins: " .. current_score)
end

on("level_start", show_score)

on("variable_changed", function(name)
    if name ~= "coins" then
        return
    end

    show_score()
end)
```

## Health

`health` is a variable on this entity, so a trigger can check it too, and Restart puts it back. Another script hurts it with `fire_event(enemy, "damage", 1)`.

```lua
variables = {
    health = number_variable(3, { min = 0 }),
    max_health = number_variable(3, { min = 1 }),
}

on("damage", function(sender, amount)
    variables.health = variables.health - amount
    if variables.health > 0 then
        return
    end

    fire_event(this, "died")
end)

on("heal", function(sender, amount)
    local healed = variables.health + amount
    variables.health = clamp(healed, 0, variables.max_health)
end)
```

## Dragging with the mouse · Later

```lua
on("tick", function()
    if not is_mouse_down("left") then
        return
    end

    local mouse_x, mouse_y = mouse_position()
    set_position(this, mouse_x, mouse_y)
end)
```
