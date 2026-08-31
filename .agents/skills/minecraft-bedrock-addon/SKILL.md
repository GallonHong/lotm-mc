---
name: minecraft-bedrock-addon
description: >-
  Comprehensive guide and best practices for developing, debugging, modeling, animating,
  and scripting Minecraft Bedrock Edition Add-ons (Behavior Packs, Resource Packs,
  Script API @minecraft/server, @minecraft/server-ui, 3D Attachables, Entities, Molang,
  Sound Definitions, and .mcaddon/.mcpack packaging). Use whenever creating, editing,
  debugging, or building Bedrock Addons.
---

# Minecraft Bedrock Add-on Development Skill

This skill provides complete guidelines, architectural blueprints, troubleshooting procedures, and standard APIs for building professional Minecraft Bedrock Edition Add-ons.

---

## 1. Directory Layout & Architecture

A standard Bedrock Add-on consists of a **Behavior Pack (BP)** and a **Resource Pack (RP)**:

```text
my_addon/
├── my_addon_bp/
│   ├── manifest.json              # BP Manifest (Data & Script Modules)
│   ├── entities/                  # Server entity behavior JSONs
│   ├── items/                     # Custom item behavior JSONs
│   ├── recipes/                   # Crafting & furnace recipes
│   └── scripts/                   # ES Module JavaScript/TypeScript files
│       ├── main.js                # Entry point
│       └── ...
├── my_addon_rp/
│   ├── manifest.json              # RP Manifest (Resources Module)
│   ├── attachables/               # 3D item attachable definitions
│   ├── entity/                    # Client entity definitions (player.entity.json)
│   ├── models/entity/             # Bedrock geometry models (.geo.json)
│   ├── textures/                  # Item textures, entity skins, UI
│   │   └── item_texture.json      # Item texture atlas dictionary
│   ├── animations/                # Custom animations
│   ├── animation_controllers/     # Animation state machines
│   ├── render_controllers/        # Render controllers & Molang conditions
│   ├── sounds/
│   │   └── sound_definitions.json # Sound mapping definitions
│   └── texts/
│       ├── zh_CN.lang             # Chinese translations
│       └── en_US.lang             # English translations
└── build.ps1 / build.sh           # Packaging script (.mcpack & .mcaddon)
```

---

## 2. Script API Best Practices (@minecraft/server & @minecraft/server-ui)

### Safe Event Subscription
Never subscribe to events directly without checking if the signal exists, because Bedrock versions promote or deprecate specific events across engine updates:

```javascript
import { world, system } from "@minecraft/server";

export function subscribeAfterEvent(eventName, handler) {
  try {
    const events = world.afterEvents;
    const signal = events ? events[eventName] : undefined;
    if (!signal || typeof signal.subscribe !== "function") return false;
    signal.subscribe(handler);
    return true;
  } catch (err) {
    console.warn(`[ScriptAPI] Failed to subscribe to afterEvent.${eventName}: ${err}`);
    return false;
  }
}

export function subscribeBeforeEvent(eventName, handler) {
  try {
    const events = world.beforeEvents;
    const signal = events ? events[eventName] : undefined;
    if (!signal || typeof signal.subscribe !== "function") return false;
    signal.subscribe(handler);
    return true;
  } catch (err) {
    console.warn(`[ScriptAPI] Failed to subscribe to beforeEvent.${eventName}: ${err}`);
    return false;
  }
}
```

### Item Hold & Use Lifecycle
To support holding right-click duration (guns, magic channels, bows, drills) without infinite firing bugs:
1. **Item Behavior Component**:
   ```json
   "minecraft:use_modifiers": {
     "use_duration": 99999,
     "movement_modifier": 0.65
   }
   ```
2. **Event Handling**:
   - `itemStartUse`: Start trigger / channel state.
   - `itemStopUse`: Primary stop event when the player releases right-click.
   - `itemReleaseUse`: Fallback stop event on charged item release.
   - `itemStopUseOn`: Stop event when interacting with blocks.
   - `itemUse`: Only for instant one-shot items (like workbench UI). Never mix with `itemStartUse`.
   - **Interruption Guard**: Automatically reset trigger state on slot change, weapon drop, empty ammo, broken durability, and player leave.

### Invulnerability Frame Bypass (High-Rate Fire & Damage)
Minecraft vanilla entities gain ~10 ticks of damage invulnerability (`hurt_time`) after taking damage. For high-RPM firearms or multi-hit magic:
- Directly deduct target's `minecraft:health` component current value:
  ```javascript
  const health = target.getComponent("minecraft:health");
  if (health) {
    const newHp = Math.max(0, health.currentValue - finalDamage);
    health.setCurrentValue(newHp);
    if (newHp <= 0) {
      // Trigger fatal damage to credit the attacker
      target.applyDamage(100000, {
        damagingEntity: player,
        cause: "entityAttack"
      });
    }
  }
  ```

### Transactional Crafting & Inventory Operations
Always perform a two-phase check before deducting items:
1. **Pre-check Phase**: Verify all required materials exist and at least 1 inventory slot is free.
2. **Execution Phase**: Atomically consume exact materials and grant the output item.
3. If pre-check fails: abort with 0 material loss.

### UI Form Deferrals
Always open new forms or follow-up dialogs using `system.run()` to defer to the next tick, avoiding stack overflow in nested UI callbacks:
```javascript
form.show(player).then(res => {
  if (res.canceled) return;
  system.run(() => {
    // Open next form or execute game action
  });
});
```

---

## 3. 3D Modeling, Attachables & Visual Rendering

### Model Chain Checklist
Every 3D held item or weapon must satisfy the complete chain:
```text
BP Item ID (e.g. survival:akm)
  -> RP Attachable (attachables/survival_akm.json)
  -> Geometry ID (geometry.ak47)
  -> Geometry JSON (models/entity/ak47.geo.json)
  -> Texture Path (textures/entity/guns/ak47.png)
  -> Animation Controller (animation_controllers/...)
  -> Animations (animations/...)
  -> Render Controller (render_controllers/...)
```

### Attachable Configuration
```json
{
  "format_version": "1.10.0",
  "minecraft:attachable": {
    "description": {
      "identifier": "survival:akm",
      "materials": { "default": "entity_alphatest" },
      "textures": { "default": "textures/entity/guns/ak47" },
      "geometry": { "default": "geometry.ak47" },
      "animations": {
        "gun": "controller.animation.ak47.person",
        "guns.draw": "animation.guns.draw",
        "guns.hold": "animation.guns.hold",
        "guns.sprint": "animation.guns.sprint"
      },
      "scripts": {
        "animate": [ { "gun": "c.is_first_person" } ]
      },
      "sound_effects": { "draw.sound": "gun.draw" },
      "render_controllers": [ "controller.render.default" ]
    }
  }
}
```

### Sound Definitions
- `sound_definitions.json` **MUST** be placed directly under `sounds/sound_definitions.json` (never in `animation_controllers/`).
- Never reference non-existent `.ogg` files (e.g. `dry2.ogg`).

---

## 4. Packaging, Cache Busting & Deployment

### Critical Packaging Rule: Forward Slashes ONLY
Bedrock resource engine uses forward slashes `/` for internal paths. **Never use Windows backslashes `\` inside `.mcpack` or `.mcaddon` zip files**, otherwise models and textures will silently fail to render.

### Cache Invalidation
When testing changes in Minecraft Bedrock:
1. Increment the version numbers in both BP and RP `manifest.json` (e.g. `[1, 1, 0]`);
2. Clear and replace the directories in `development_behavior_packs/` and `development_resource_packs/`;
3. Exit the world to the title screen and re-enter, or run `/reload` in game chat.

---

## 5. Verification Checklist

Before releasing or pushing Bedrock Add-ons:
1. **Strict JSON Parsing**: Run `jq empty` or `JSON.parse` across all JSON files (no `//` comments or trailing commas).
2. **JS Syntax Check**: Run `node --check` across all `.js` scripts.
3. **ZIP Path Validation**: Verify no `\` exists inside `.mcpack` / `.mcaddon`.
4. **UUID & Version Matching**: Ensure BP dependency UUID matches RP header UUID.
