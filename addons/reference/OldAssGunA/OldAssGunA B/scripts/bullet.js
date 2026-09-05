import { ActionFormData, ModalFormData, MessageFormData} from "@minecraft/server-ui";

import { world, system, Player, MolangVariableMap, Direction} from "@minecraft/server";
import * as mc from "@minecraft/server";

world.afterEvents.entityDie.subscribe(({deadEntity, damageSource}) => system.run(() => {
    if (!(damageSource.damagingEntity instanceof Player)) return;
    damageSource.damagingEntity.triggerEvent("kill");
}));

world.afterEvents.entityHitEntity.subscribe(({hitEntity, entity}) => 
system.run(() => {
    if (hitEntity && entity instanceof Player) entity.playSound("hit.sound", {
        location: entity.location,
        volume: 1,
        pitch: 1
    });
}));

world.afterEvents.projectileHitEntity.subscribe(function({location, source: atacker}) {
    const entityHit = arguments[0].getEntityHit();
    if (entityHit && atacker instanceof Player) {
        atacker.triggerEvent("hit");
        const {entity} = entityHit,
              p1 = location,
              { location: p2 } = atacker;
        atacker.onScreenDisplay.setActionBar(`§aYou hit §e${entity.name ?? entity.typeId.replace("minecraft:", "").split("_").map(v => v[0].toUpperCase() + v.slice(1)).join(" ")} §b(${Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2).toFixed(0)}blocks far away)`);
    }
});