import VehicleGuide from "../openMenu.js";

const Menu = {
    onUse(event) {
        // Ensure the event source is a player
        const player = event.source;
        const item = event.itemStack;


        if (!player || player.typeId !== 'minecraft:player' || !item) {
            return;
        }

        VehicleGuide.openMenu(player);
    }
};

export default Menu;
