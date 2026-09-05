import { ActionFormData } from "@minecraft/server-ui";
import { system } from "@minecraft/server";
import * as VC from './VehicleConstants.js';

class VehicleGuide {
    static openMenu(source) {
        this.showMainMenu(source);
    }



    
    static showMainMenu(player) {
        const menuForm = new ActionFormData()
            .title("§lVehicles - Info Guide")
            .body("Welcome to §6Vehicles Add-On§r, navigate through the pages to learn how to obtain, and use the vehicles.\n\n§6Wrench:§7 You can open the upgrade menu using the wrench on any vehicle. §o(Craftable Using: Iron Ingots)")
            .button("Ground Vehicles", "textures/asiagobagels/vehicles/items/common_car.png")
            .button("Water Vehicles", "textures/asiagobagels/vehicles/items/speedboat.png")
            .button("Air Vehicles", "textures/asiagobagels/vehicles/items/common_plane.png");

        menuForm.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.showGroundVehiclesPage(player);
                    break;
                case 1:
                    this.showWaterVehiclesPage(player);
                    break;
                case 2:
                    this.showAirVehiclesPage(player);
                    break;
            }
        });
    }

    static showGroundVehiclesPage(player) {
        const groundVehicleForm = new ActionFormData()
            .title("§lGround Vehicles")
            .body("Choose a vehicle to learn more about it!");

        // Dynamically add buttons for each vehicle
        Object.keys(VC.groundVehicleData).forEach((vehicleName) => {
            const vehicle = VC.groundVehicleData[vehicleName];
            groundVehicleForm.button(vehicleName, vehicle.image);
        });

        groundVehicleForm.button("Go Back", "textures/asiagobagels/vehicles/ui/back.png");

        groundVehicleForm.show(player).then((response) => {
            if (response.canceled || response.selection === Object.keys(VC.groundVehicleData).length) {
                this.showMainMenu(player); // Adjust this function to go back to your main menu
            } else {
                const selectedVehicleName = Object.keys(VC.groundVehicleData)[response.selection];
                this.showGroundVehicleSpecificPage(player, selectedVehicleName);
            }
        });
    }

    static showGroundVehicleSpecificPage(player, vehicleName) {
        const vehicle = VC.groundVehicleData[vehicleName] || {
            description: "Details not available.",
            specials: "No specials available.",
            howToGet: "How to obtain this vehicle is not provided.",
            image: "textures/asiagobagels/vehicles/ui/default.png",
        };

        const vehicleForm = new ActionFormData()
            .title(`§l${vehicleName}`)
            .body(`§6Description:§r\n${vehicle.description}\n\n§6Specials:§r\n${vehicle.specials}\n\n§6How to Get:§r\n${vehicle.howToGet}`)
            .button("Go Back", vehicle.image);

        vehicleForm.show(player).then((response) => {
            if (!response.canceled) {
                this.showGroundVehiclesPage(player); // Go back to the ground vehicles page
            }
        });
    }

    static showWaterVehiclesPage(player) {
        const waterVehicleForm = new ActionFormData()
            .title("§lWater Vehicles")
            .body("Choose a vehicle to learn more about it!");

        // Dynamically add buttons for each vehicle
        Object.keys(VC.waterVehicleData).forEach((vehicleName) => {
            const vehicle = VC.waterVehicleData[vehicleName];
            waterVehicleForm.button(vehicleName, vehicle.image);
        });

        waterVehicleForm.button("Go Back", "textures/asiagobagels/vehicles/ui/back.png");

        waterVehicleForm.show(player).then((response) => {
            if (response.canceled || response.selection === Object.keys(VC.waterVehicleData).length) {
                this.showMainMenu(player); // Adjust this function to go back to your main menu
            } else {
                const selectedVehicleName = Object.keys(VC.waterVehicleData)[response.selection];
                this.showWaterVehicleSpecificPage(player, selectedVehicleName);
            }
        });
    }

    static showWaterVehicleSpecificPage(player, vehicleName) {
        const vehicle = VC.waterVehicleData[vehicleName] || {
            description: "Details not available.",
            specials: "No specials available.",
            howToGet: "How to obtain this vehicle is not provided.",
            image: "textures/asiagobagels/vehicles/ui/default.png",
        };

        const vehicleForm = new ActionFormData()
            .title(`§l${vehicleName}`)
            .body(`§6Description:§r\n${vehicle.description}\n\n§6Specials:§r\n${vehicle.specials}\n\n§6How to Get:§r\n${vehicle.howToGet}`)
            .button("Go Back", vehicle.image);

        vehicleForm.show(player).then((response) => {
            if (!response.canceled) {
                this.showWaterVehiclesPage(player); // Go back to the water vehicles page
            }
        });
    }

    static showAirVehiclesPage(player) {
        const airVehicleForm = new ActionFormData()
            .title("§lAir Vehicles")
            .body("Choose a vehicle to learn more about it!");

        // Dynamically add buttons for each vehicle
        Object.keys(VC.airVehicleData).forEach((vehicleName) => {
            const vehicle = VC.airVehicleData[vehicleName];
            airVehicleForm.button(vehicleName, vehicle.image);
        });

        airVehicleForm.button("Go Back", "textures/asiagobagels/vehicles/ui/back.png");

        airVehicleForm.show(player).then((response) => {
            if (response.canceled || response.selection === Object.keys(VC.airVehicleData).length) {
                this.showMainMenu(player); // Adjust this function to go back to your main menu
            } else {
                const selectedVehicleName = Object.keys(VC.airVehicleData)[response.selection];
                this.showAirVehicleSpecificPage(player, selectedVehicleName);
            }
        });
    }

    static showAirVehicleSpecificPage(player, vehicleName) {
        const vehicle = VC.airVehicleData[vehicleName] || {
            description: "Details not available.",
            specials: "No specials available.",
            howToGet: "How to obtain this vehicle is not provided.",
            image: "textures/asiagobagels/vehicles/ui/default.png",
        };

        const vehicleForm = new ActionFormData()
            .title(`§l${vehicleName}`)
            .body(`§6Description:§r\n${vehicle.description}\n\n§6Specials:§r\n${vehicle.specials}\n\n§6How to Get:§r\n${vehicle.howToGet}`)
            .button("Go Back", vehicle.image);

        vehicleForm.show(player).then((response) => {
            if (!response.canceled) {
                this.showAirVehiclesPage(player); // Go back to the air vehicles page
            }
        });
    }
}

export default VehicleGuide;
