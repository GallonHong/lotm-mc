import { world, system } from "@minecraft/server";

const DIMENSION_ID = "apoc_extract:city";
const HEARTBEAT_KEY = "interop:apoc_extraction_dimension_bootstrap:v1";
const ERROR_KEY = "interop:apoc_extraction_dimension_error:v1";
let registrationError = "";

const startup = system.beforeEvents?.startup;
if (startup && typeof startup.subscribe === "function") {
  startup.subscribe(event => {
    try {
      event.dimensionRegistry.registerCustomDimension(DIMENSION_ID);
      registrationError = "";
      console.warn(`[ExtractionBootstrap] registered ${DIMENSION_ID}.`);
    } catch (error) {
      registrationError = String(error);
      console.error(`[ExtractionBootstrap] registration failed: ${error}`);
    }
  });
} else {
  registrationError = "system.beforeEvents.startup / DimensionRegistry unavailable";
  console.error(`[ExtractionBootstrap] ${registrationError}`);
}

function publishStatus() {
  try {
    world.setDynamicProperty(HEARTBEAT_KEY, Date.now());
    world.setDynamicProperty(ERROR_KEY, registrationError || undefined);
  } catch {}
}

system.run(publishStatus);
system.runInterval(publishStatus, 100);
console.warn("[ExtractionBootstrap] v0.1.0 initialized.");
