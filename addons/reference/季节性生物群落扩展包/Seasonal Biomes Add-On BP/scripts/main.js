var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/@minecraft/math/lib/general/clamp.js
function clampNumber(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
var init_clamp = __esm({
  "../../node_modules/@minecraft/math/lib/general/clamp.js"() {
  }
});

// ../../node_modules/@minecraft/math/lib/vector3/coreHelpers.js
var Vector3Utils;
var init_coreHelpers = __esm({
  "../../node_modules/@minecraft/math/lib/vector3/coreHelpers.js"() {
    init_clamp();
    Vector3Utils = class _Vector3Utils {
      /**
       * equals
       *
       * Check the equality of two vectors
       */
      static equals(v1, v2) {
        return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
      }
      /**
       * add
       *
       * Add two vectors to produce a new vector
       */
      static add(v1, v2) {
        return { x: v1.x + (v2.x ?? 0), y: v1.y + (v2.y ?? 0), z: v1.z + (v2.z ?? 0) };
      }
      /**
       * subtract
       *
       * Subtract two vectors to produce a new vector (v1-v2)
       */
      static subtract(v1, v2) {
        return { x: v1.x - (v2.x ?? 0), y: v1.y - (v2.y ?? 0), z: v1.z - (v2.z ?? 0) };
      }
      /** scale
       *
       * Multiple all entries in a vector by a single scalar value producing a new vector
       */
      static scale(v1, scale) {
        return { x: v1.x * scale, y: v1.y * scale, z: v1.z * scale };
      }
      /**
       * dot
       *
       * Calculate the dot product of two vectors
       */
      static dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
      }
      /**
       * cross
       *
       * Calculate the cross product of two vectors. Returns a new vector.
       */
      static cross(a, b) {
        return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
      }
      /**
       * magnitude
       *
       * The magnitude of a vector
       */
      static magnitude(v) {
        return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
      }
      /**
       * distance
       *
       * Calculate the distance between two vectors
       */
      static distance(a, b) {
        return _Vector3Utils.magnitude(_Vector3Utils.subtract(a, b));
      }
      /**
       * normalize
       *
       * Takes a vector 3 and normalizes it to a unit vector
       */
      static normalize(v) {
        const mag = _Vector3Utils.magnitude(v);
        return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
      }
      /**
       * floor
       *
       * Floor the components of a vector to produce a new vector
       */
      static floor(v) {
        return { x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) };
      }
      /**
       * toString
       *
       * Create a string representation of a vector3
       */
      static toString(v, options) {
        const decimals = options?.decimals ?? 2;
        const str = [v.x.toFixed(decimals), v.y.toFixed(decimals), v.z.toFixed(decimals)];
        return str.join(options?.delimiter ?? ", ");
      }
      /**
       * fromString
       *
       * Gets a Vector3 from the string representation produced by {@link Vector3Utils.toString}. If any numeric value is not a number
       * or the format is invalid, undefined is returned.
       * @param str - The string to parse
       * @param delimiter - The delimiter used to separate the components. Defaults to the same as the default for {@link Vector3Utils.toString}
       */
      static fromString(str, delimiter = ",") {
        const parts = str.split(delimiter);
        if (parts.length !== 3) {
          return void 0;
        }
        const output = parts.map((part) => parseFloat(part));
        if (output.some((part) => isNaN(part))) {
          return void 0;
        }
        return { x: output[0], y: output[1], z: output[2] };
      }
      /**
       * clamp
       *
       * Clamps the components of a vector to limits to produce a new vector
       */
      static clamp(v, limits) {
        return {
          x: clampNumber(v.x, limits?.min?.x ?? Number.MIN_SAFE_INTEGER, limits?.max?.x ?? Number.MAX_SAFE_INTEGER),
          y: clampNumber(v.y, limits?.min?.y ?? Number.MIN_SAFE_INTEGER, limits?.max?.y ?? Number.MAX_SAFE_INTEGER),
          z: clampNumber(v.z, limits?.min?.z ?? Number.MIN_SAFE_INTEGER, limits?.max?.z ?? Number.MAX_SAFE_INTEGER)
        };
      }
      /**
       * lerp
       *
       * Constructs a new vector using linear interpolation on each component from two vectors.
       */
      static lerp(a, b, t) {
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
      }
      /**
       * slerp
       *
       * Constructs a new vector using spherical linear interpolation on each component from two vectors.
       */
      static slerp(a, b, t) {
        const theta = Math.acos(_Vector3Utils.dot(a, b));
        const sinTheta = Math.sin(theta);
        const ta = Math.sin((1 - t) * theta) / sinTheta;
        const tb = Math.sin(t * theta) / sinTheta;
        return _Vector3Utils.add(_Vector3Utils.scale(a, ta), _Vector3Utils.scale(b, tb));
      }
      /**
       * multiply
       *
       * Element-wise multiplication of two vectors together.
       * Not to be confused with {@link Vector3Utils.dot} product or {@link Vector3Utils.cross} product
       */
      static multiply(a, b) {
        return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
      }
      /**
       * rotateX
       *
       * Rotates the vector around the x axis counterclockwise (left hand rule)
       * @param a - Angle in radians
       */
      static rotateX(v, a) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        return { x: v.x, y: v.y * cos - v.z * sin, z: v.z * cos + v.y * sin };
      }
      /**
       * rotateY
       *
       * Rotates the vector around the y axis counterclockwise (left hand rule)
       * @param a - Angle in radians
       */
      static rotateY(v, a) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        return { x: v.x * cos + v.z * sin, y: v.y, z: v.z * cos - v.x * sin };
      }
      /**
       * rotateZ
       *
       * Rotates the vector around the z axis counterclockwise (left hand rule)
       * @param a - Angle in radians
       */
      static rotateZ(v, a) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        return { x: v.x * cos - v.y * sin, y: v.y * cos + v.x * sin, z: v.z };
      }
    };
  }
});

// ../../node_modules/@minecraft/math/lib/vector3/vectorWrapper.js
var Vector3Builder;
var init_vectorWrapper = __esm({
  "../../node_modules/@minecraft/math/lib/vector3/vectorWrapper.js"() {
    init_coreHelpers();
    Vector3Builder = class {
      x;
      y;
      z;
      constructor(first, second, z) {
        if (typeof first === "object") {
          this.x = first.x;
          this.y = first.y;
          this.z = first.z;
        } else if (typeof first === "string") {
          const parsed = Vector3Utils.fromString(first, second ?? ",");
          if (!parsed) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            return;
          }
          this.x = parsed.x;
          this.y = parsed.y;
          this.z = parsed.z;
        } else {
          this.x = first;
          this.y = second ?? 0;
          this.z = z ?? 0;
        }
      }
      /**
       * Assigns the values of the passed in vector to this vector. Returns itself.
       */
      assign(vec) {
        this.x = vec.x;
        this.y = vec.y;
        this.z = vec.z;
        return this;
      }
      /**
       * equals
       *
       * Check the equality of two vectors
       */
      equals(v) {
        return Vector3Utils.equals(this, v);
      }
      /**
       * add
       *
       * Adds the vector v to this, returning itself.
       */
      add(v) {
        return this.assign(Vector3Utils.add(this, v));
      }
      /**
       * subtract
       *
       * Subtracts the vector v from this, returning itself.
       */
      subtract(v) {
        return this.assign(Vector3Utils.subtract(this, v));
      }
      /** scale
       *
       * Scales this by the passed in value, returning itself.
       */
      scale(val) {
        return this.assign(Vector3Utils.scale(this, val));
      }
      /**
       * dot
       *
       * Computes the dot product of this and the passed in vector.
       */
      dot(vec) {
        return Vector3Utils.dot(this, vec);
      }
      /**
       * cross
       *
       * Computes the cross product of this and the passed in vector, returning itself.
       */
      cross(vec) {
        return this.assign(Vector3Utils.cross(this, vec));
      }
      /**
       * magnitude
       *
       * The magnitude of the vector
       */
      magnitude() {
        return Vector3Utils.magnitude(this);
      }
      /**
       * distance
       *
       * Calculate the distance between two vectors
       */
      distance(vec) {
        return Vector3Utils.distance(this, vec);
      }
      /**
       * normalize
       *
       * Normalizes this vector, returning itself.
       */
      normalize() {
        return this.assign(Vector3Utils.normalize(this));
      }
      /**
       * floor
       *
       * Floor the components of a vector to produce a new vector
       */
      floor() {
        return this.assign(Vector3Utils.floor(this));
      }
      /**
       * toString
       *
       * Create a string representation of a vector
       */
      toString(options) {
        return Vector3Utils.toString(this, options);
      }
      /**
       * clamp
       *
       * Clamps the components of a vector to limits to produce a new vector
       */
      clamp(limits) {
        return this.assign(Vector3Utils.clamp(this, limits));
      }
      /**
       * lerp
       *
       * Constructs a new vector using linear interpolation on each component from two vectors.
       */
      lerp(vec, t) {
        return this.assign(Vector3Utils.lerp(this, vec, t));
      }
      /**
       * slerp
       *
       * Constructs a new vector using spherical linear interpolation on each component from two vectors.
       */
      slerp(vec, t) {
        return this.assign(Vector3Utils.slerp(this, vec, t));
      }
      /**
       * multiply
       *
       * Element-wise multiplication of two vectors together.
       * Not to be confused with {@link Vector3Builder.dot} product or {@link Vector3Builder.cross} product
       */
      multiply(vec) {
        return this.assign(Vector3Utils.multiply(this, vec));
      }
      /**
       * rotateX
       *
       * Rotates the vector around the x axis counterclockwise (left hand rule)
       * @param a - Angle in radians
       */
      rotateX(a) {
        return this.assign(Vector3Utils.rotateX(this, a));
      }
      /**
       * rotateY
       *
       * Rotates the vector around the y axis counterclockwise (left hand rule)
       * @param a - Angle in radians
       */
      rotateY(a) {
        return this.assign(Vector3Utils.rotateY(this, a));
      }
      /**
       * rotateZ
       *
       * Rotates the vector around the z axis counterclockwise (left hand rule)
       * @param a - Angle in radians
       */
      rotateZ(a) {
        return this.assign(Vector3Utils.rotateZ(this, a));
      }
    };
  }
});

// ../../node_modules/@minecraft/math/lib/vector3/index.js
var init_vector3 = __esm({
  "../../node_modules/@minecraft/math/lib/vector3/index.js"() {
    init_coreHelpers();
    init_vectorWrapper();
  }
});

// ../../node_modules/@minecraft/math/lib/general/index.js
var init_general = __esm({
  "../../node_modules/@minecraft/math/lib/general/index.js"() {
    init_clamp();
  }
});

// ../../node_modules/@minecraft/math/lib/index.js
var init_lib = __esm({
  "../../node_modules/@minecraft/math/lib/index.js"() {
    init_vector3();
    init_general();
  }
});

// ../../node_modules/@minecraft/vanilla-data/lib/index.js
var MinecraftBiomeTypes, MinecraftBlockTypes, MinecraftCameraPresetsTypes, MinecraftCooldownCategoryTypes, MinecraftDimensionTypes, MinecraftEffectTypes, MinecraftEnchantmentTypes, MinecraftEntityTypes, MinecraftFeatureTypes, MinecraftItemTypes, MinecraftPotionDeliveryTypes, MinecraftPotionEffectTypes;
var init_lib2 = __esm({
  "../../node_modules/@minecraft/vanilla-data/lib/index.js"() {
    MinecraftBiomeTypes = ((MinecraftBiomeTypes2) => {
      MinecraftBiomeTypes2["BambooJungle"] = "minecraft:bamboo_jungle";
      MinecraftBiomeTypes2["BambooJungleHills"] = "minecraft:bamboo_jungle_hills";
      MinecraftBiomeTypes2["BasaltDeltas"] = "minecraft:basalt_deltas";
      MinecraftBiomeTypes2["Beach"] = "minecraft:beach";
      MinecraftBiomeTypes2["BirchForest"] = "minecraft:birch_forest";
      MinecraftBiomeTypes2["BirchForestHills"] = "minecraft:birch_forest_hills";
      MinecraftBiomeTypes2["BirchForestHillsMutated"] = "minecraft:birch_forest_hills_mutated";
      MinecraftBiomeTypes2["BirchForestMutated"] = "minecraft:birch_forest_mutated";
      MinecraftBiomeTypes2["CherryGrove"] = "minecraft:cherry_grove";
      MinecraftBiomeTypes2["ColdBeach"] = "minecraft:cold_beach";
      MinecraftBiomeTypes2["ColdOcean"] = "minecraft:cold_ocean";
      MinecraftBiomeTypes2["ColdTaiga"] = "minecraft:cold_taiga";
      MinecraftBiomeTypes2["ColdTaigaHills"] = "minecraft:cold_taiga_hills";
      MinecraftBiomeTypes2["ColdTaigaMutated"] = "minecraft:cold_taiga_mutated";
      MinecraftBiomeTypes2["CrimsonForest"] = "minecraft:crimson_forest";
      MinecraftBiomeTypes2["DeepColdOcean"] = "minecraft:deep_cold_ocean";
      MinecraftBiomeTypes2["DeepDark"] = "minecraft:deep_dark";
      MinecraftBiomeTypes2["DeepFrozenOcean"] = "minecraft:deep_frozen_ocean";
      MinecraftBiomeTypes2["DeepLukewarmOcean"] = "minecraft:deep_lukewarm_ocean";
      MinecraftBiomeTypes2["DeepOcean"] = "minecraft:deep_ocean";
      MinecraftBiomeTypes2["DeepWarmOcean"] = "minecraft:deep_warm_ocean";
      MinecraftBiomeTypes2["Desert"] = "minecraft:desert";
      MinecraftBiomeTypes2["DesertHills"] = "minecraft:desert_hills";
      MinecraftBiomeTypes2["DesertMutated"] = "minecraft:desert_mutated";
      MinecraftBiomeTypes2["DripstoneCaves"] = "minecraft:dripstone_caves";
      MinecraftBiomeTypes2["ExtremeHills"] = "minecraft:extreme_hills";
      MinecraftBiomeTypes2["ExtremeHillsEdge"] = "minecraft:extreme_hills_edge";
      MinecraftBiomeTypes2["ExtremeHillsMutated"] = "minecraft:extreme_hills_mutated";
      MinecraftBiomeTypes2["ExtremeHillsPlusTrees"] = "minecraft:extreme_hills_plus_trees";
      MinecraftBiomeTypes2["ExtremeHillsPlusTreesMutated"] = "minecraft:extreme_hills_plus_trees_mutated";
      MinecraftBiomeTypes2["FlowerForest"] = "minecraft:flower_forest";
      MinecraftBiomeTypes2["Forest"] = "minecraft:forest";
      MinecraftBiomeTypes2["ForestHills"] = "minecraft:forest_hills";
      MinecraftBiomeTypes2["FrozenOcean"] = "minecraft:frozen_ocean";
      MinecraftBiomeTypes2["FrozenPeaks"] = "minecraft:frozen_peaks";
      MinecraftBiomeTypes2["FrozenRiver"] = "minecraft:frozen_river";
      MinecraftBiomeTypes2["Grove"] = "minecraft:grove";
      MinecraftBiomeTypes2["Hell"] = "minecraft:hell";
      MinecraftBiomeTypes2["IceMountains"] = "minecraft:ice_mountains";
      MinecraftBiomeTypes2["IcePlains"] = "minecraft:ice_plains";
      MinecraftBiomeTypes2["IcePlainsSpikes"] = "minecraft:ice_plains_spikes";
      MinecraftBiomeTypes2["JaggedPeaks"] = "minecraft:jagged_peaks";
      MinecraftBiomeTypes2["Jungle"] = "minecraft:jungle";
      MinecraftBiomeTypes2["JungleEdge"] = "minecraft:jungle_edge";
      MinecraftBiomeTypes2["JungleEdgeMutated"] = "minecraft:jungle_edge_mutated";
      MinecraftBiomeTypes2["JungleHills"] = "minecraft:jungle_hills";
      MinecraftBiomeTypes2["JungleMutated"] = "minecraft:jungle_mutated";
      MinecraftBiomeTypes2["LegacyFrozenOcean"] = "minecraft:legacy_frozen_ocean";
      MinecraftBiomeTypes2["LukewarmOcean"] = "minecraft:lukewarm_ocean";
      MinecraftBiomeTypes2["LushCaves"] = "minecraft:lush_caves";
      MinecraftBiomeTypes2["MangroveSwamp"] = "minecraft:mangrove_swamp";
      MinecraftBiomeTypes2["Meadow"] = "minecraft:meadow";
      MinecraftBiomeTypes2["MegaTaiga"] = "minecraft:mega_taiga";
      MinecraftBiomeTypes2["MegaTaigaHills"] = "minecraft:mega_taiga_hills";
      MinecraftBiomeTypes2["Mesa"] = "minecraft:mesa";
      MinecraftBiomeTypes2["MesaBryce"] = "minecraft:mesa_bryce";
      MinecraftBiomeTypes2["MesaPlateau"] = "minecraft:mesa_plateau";
      MinecraftBiomeTypes2["MesaPlateauMutated"] = "minecraft:mesa_plateau_mutated";
      MinecraftBiomeTypes2["MesaPlateauStone"] = "minecraft:mesa_plateau_stone";
      MinecraftBiomeTypes2["MesaPlateauStoneMutated"] = "minecraft:mesa_plateau_stone_mutated";
      MinecraftBiomeTypes2["MushroomIsland"] = "minecraft:mushroom_island";
      MinecraftBiomeTypes2["MushroomIslandShore"] = "minecraft:mushroom_island_shore";
      MinecraftBiomeTypes2["Ocean"] = "minecraft:ocean";
      MinecraftBiomeTypes2["PaleGarden"] = "minecraft:pale_garden";
      MinecraftBiomeTypes2["Plains"] = "minecraft:plains";
      MinecraftBiomeTypes2["RedwoodTaigaHillsMutated"] = "minecraft:redwood_taiga_hills_mutated";
      MinecraftBiomeTypes2["RedwoodTaigaMutated"] = "minecraft:redwood_taiga_mutated";
      MinecraftBiomeTypes2["River"] = "minecraft:river";
      MinecraftBiomeTypes2["RoofedForest"] = "minecraft:roofed_forest";
      MinecraftBiomeTypes2["RoofedForestMutated"] = "minecraft:roofed_forest_mutated";
      MinecraftBiomeTypes2["Savanna"] = "minecraft:savanna";
      MinecraftBiomeTypes2["SavannaMutated"] = "minecraft:savanna_mutated";
      MinecraftBiomeTypes2["SavannaPlateau"] = "minecraft:savanna_plateau";
      MinecraftBiomeTypes2["SavannaPlateauMutated"] = "minecraft:savanna_plateau_mutated";
      MinecraftBiomeTypes2["SnowySlopes"] = "minecraft:snowy_slopes";
      MinecraftBiomeTypes2["SoulsandValley"] = "minecraft:soulsand_valley";
      MinecraftBiomeTypes2["StoneBeach"] = "minecraft:stone_beach";
      MinecraftBiomeTypes2["StonyPeaks"] = "minecraft:stony_peaks";
      MinecraftBiomeTypes2["SunflowerPlains"] = "minecraft:sunflower_plains";
      MinecraftBiomeTypes2["Swampland"] = "minecraft:swampland";
      MinecraftBiomeTypes2["SwamplandMutated"] = "minecraft:swampland_mutated";
      MinecraftBiomeTypes2["Taiga"] = "minecraft:taiga";
      MinecraftBiomeTypes2["TaigaHills"] = "minecraft:taiga_hills";
      MinecraftBiomeTypes2["TaigaMutated"] = "minecraft:taiga_mutated";
      MinecraftBiomeTypes2["TheEnd"] = "minecraft:the_end";
      MinecraftBiomeTypes2["WarmOcean"] = "minecraft:warm_ocean";
      MinecraftBiomeTypes2["WarpedForest"] = "minecraft:warped_forest";
      return MinecraftBiomeTypes2;
    })(MinecraftBiomeTypes || {});
    MinecraftBlockTypes = ((MinecraftBlockTypes2) => {
      MinecraftBlockTypes2["AcaciaButton"] = "minecraft:acacia_button";
      MinecraftBlockTypes2["AcaciaDoor"] = "minecraft:acacia_door";
      MinecraftBlockTypes2["AcaciaDoubleSlab"] = "minecraft:acacia_double_slab";
      MinecraftBlockTypes2["AcaciaFence"] = "minecraft:acacia_fence";
      MinecraftBlockTypes2["AcaciaFenceGate"] = "minecraft:acacia_fence_gate";
      MinecraftBlockTypes2["AcaciaHangingSign"] = "minecraft:acacia_hanging_sign";
      MinecraftBlockTypes2["AcaciaLeaves"] = "minecraft:acacia_leaves";
      MinecraftBlockTypes2["AcaciaLog"] = "minecraft:acacia_log";
      MinecraftBlockTypes2["AcaciaPlanks"] = "minecraft:acacia_planks";
      MinecraftBlockTypes2["AcaciaPressurePlate"] = "minecraft:acacia_pressure_plate";
      MinecraftBlockTypes2["AcaciaSapling"] = "minecraft:acacia_sapling";
      MinecraftBlockTypes2["AcaciaShelf"] = "minecraft:acacia_shelf";
      MinecraftBlockTypes2["AcaciaSlab"] = "minecraft:acacia_slab";
      MinecraftBlockTypes2["AcaciaStairs"] = "minecraft:acacia_stairs";
      MinecraftBlockTypes2["AcaciaStandingSign"] = "minecraft:acacia_standing_sign";
      MinecraftBlockTypes2["AcaciaTrapdoor"] = "minecraft:acacia_trapdoor";
      MinecraftBlockTypes2["AcaciaWallSign"] = "minecraft:acacia_wall_sign";
      MinecraftBlockTypes2["AcaciaWood"] = "minecraft:acacia_wood";
      MinecraftBlockTypes2["ActivatorRail"] = "minecraft:activator_rail";
      MinecraftBlockTypes2["Air"] = "minecraft:air";
      MinecraftBlockTypes2["Allium"] = "minecraft:allium";
      MinecraftBlockTypes2["Allow"] = "minecraft:allow";
      MinecraftBlockTypes2["AmethystBlock"] = "minecraft:amethyst_block";
      MinecraftBlockTypes2["AmethystCluster"] = "minecraft:amethyst_cluster";
      MinecraftBlockTypes2["AncientDebris"] = "minecraft:ancient_debris";
      MinecraftBlockTypes2["Andesite"] = "minecraft:andesite";
      MinecraftBlockTypes2["AndesiteDoubleSlab"] = "minecraft:andesite_double_slab";
      MinecraftBlockTypes2["AndesiteSlab"] = "minecraft:andesite_slab";
      MinecraftBlockTypes2["AndesiteStairs"] = "minecraft:andesite_stairs";
      MinecraftBlockTypes2["AndesiteWall"] = "minecraft:andesite_wall";
      MinecraftBlockTypes2["Anvil"] = "minecraft:anvil";
      MinecraftBlockTypes2["Azalea"] = "minecraft:azalea";
      MinecraftBlockTypes2["AzaleaLeaves"] = "minecraft:azalea_leaves";
      MinecraftBlockTypes2["AzaleaLeavesFlowered"] = "minecraft:azalea_leaves_flowered";
      MinecraftBlockTypes2["AzureBluet"] = "minecraft:azure_bluet";
      MinecraftBlockTypes2["Bamboo"] = "minecraft:bamboo";
      MinecraftBlockTypes2["BambooBlock"] = "minecraft:bamboo_block";
      MinecraftBlockTypes2["BambooButton"] = "minecraft:bamboo_button";
      MinecraftBlockTypes2["BambooDoor"] = "minecraft:bamboo_door";
      MinecraftBlockTypes2["BambooDoubleSlab"] = "minecraft:bamboo_double_slab";
      MinecraftBlockTypes2["BambooFence"] = "minecraft:bamboo_fence";
      MinecraftBlockTypes2["BambooFenceGate"] = "minecraft:bamboo_fence_gate";
      MinecraftBlockTypes2["BambooHangingSign"] = "minecraft:bamboo_hanging_sign";
      MinecraftBlockTypes2["BambooMosaic"] = "minecraft:bamboo_mosaic";
      MinecraftBlockTypes2["BambooMosaicDoubleSlab"] = "minecraft:bamboo_mosaic_double_slab";
      MinecraftBlockTypes2["BambooMosaicSlab"] = "minecraft:bamboo_mosaic_slab";
      MinecraftBlockTypes2["BambooMosaicStairs"] = "minecraft:bamboo_mosaic_stairs";
      MinecraftBlockTypes2["BambooPlanks"] = "minecraft:bamboo_planks";
      MinecraftBlockTypes2["BambooPressurePlate"] = "minecraft:bamboo_pressure_plate";
      MinecraftBlockTypes2["BambooSapling"] = "minecraft:bamboo_sapling";
      MinecraftBlockTypes2["BambooShelf"] = "minecraft:bamboo_shelf";
      MinecraftBlockTypes2["BambooSlab"] = "minecraft:bamboo_slab";
      MinecraftBlockTypes2["BambooStairs"] = "minecraft:bamboo_stairs";
      MinecraftBlockTypes2["BambooStandingSign"] = "minecraft:bamboo_standing_sign";
      MinecraftBlockTypes2["BambooTrapdoor"] = "minecraft:bamboo_trapdoor";
      MinecraftBlockTypes2["BambooWallSign"] = "minecraft:bamboo_wall_sign";
      MinecraftBlockTypes2["Barrel"] = "minecraft:barrel";
      MinecraftBlockTypes2["Barrier"] = "minecraft:barrier";
      MinecraftBlockTypes2["Basalt"] = "minecraft:basalt";
      MinecraftBlockTypes2["Beacon"] = "minecraft:beacon";
      MinecraftBlockTypes2["Bed"] = "minecraft:bed";
      MinecraftBlockTypes2["Bedrock"] = "minecraft:bedrock";
      MinecraftBlockTypes2["BeeNest"] = "minecraft:bee_nest";
      MinecraftBlockTypes2["Beehive"] = "minecraft:beehive";
      MinecraftBlockTypes2["Beetroot"] = "minecraft:beetroot";
      MinecraftBlockTypes2["Bell"] = "minecraft:bell";
      MinecraftBlockTypes2["BigDripleaf"] = "minecraft:big_dripleaf";
      MinecraftBlockTypes2["BirchButton"] = "minecraft:birch_button";
      MinecraftBlockTypes2["BirchDoor"] = "minecraft:birch_door";
      MinecraftBlockTypes2["BirchDoubleSlab"] = "minecraft:birch_double_slab";
      MinecraftBlockTypes2["BirchFence"] = "minecraft:birch_fence";
      MinecraftBlockTypes2["BirchFenceGate"] = "minecraft:birch_fence_gate";
      MinecraftBlockTypes2["BirchHangingSign"] = "minecraft:birch_hanging_sign";
      MinecraftBlockTypes2["BirchLeaves"] = "minecraft:birch_leaves";
      MinecraftBlockTypes2["BirchLog"] = "minecraft:birch_log";
      MinecraftBlockTypes2["BirchPlanks"] = "minecraft:birch_planks";
      MinecraftBlockTypes2["BirchPressurePlate"] = "minecraft:birch_pressure_plate";
      MinecraftBlockTypes2["BirchSapling"] = "minecraft:birch_sapling";
      MinecraftBlockTypes2["BirchShelf"] = "minecraft:birch_shelf";
      MinecraftBlockTypes2["BirchSlab"] = "minecraft:birch_slab";
      MinecraftBlockTypes2["BirchStairs"] = "minecraft:birch_stairs";
      MinecraftBlockTypes2["BirchStandingSign"] = "minecraft:birch_standing_sign";
      MinecraftBlockTypes2["BirchTrapdoor"] = "minecraft:birch_trapdoor";
      MinecraftBlockTypes2["BirchWallSign"] = "minecraft:birch_wall_sign";
      MinecraftBlockTypes2["BirchWood"] = "minecraft:birch_wood";
      MinecraftBlockTypes2["BlackCandle"] = "minecraft:black_candle";
      MinecraftBlockTypes2["BlackCandleCake"] = "minecraft:black_candle_cake";
      MinecraftBlockTypes2["BlackCarpet"] = "minecraft:black_carpet";
      MinecraftBlockTypes2["BlackConcrete"] = "minecraft:black_concrete";
      MinecraftBlockTypes2["BlackConcretePowder"] = "minecraft:black_concrete_powder";
      MinecraftBlockTypes2["BlackGlazedTerracotta"] = "minecraft:black_glazed_terracotta";
      MinecraftBlockTypes2["BlackShulkerBox"] = "minecraft:black_shulker_box";
      MinecraftBlockTypes2["BlackStainedGlass"] = "minecraft:black_stained_glass";
      MinecraftBlockTypes2["BlackStainedGlassPane"] = "minecraft:black_stained_glass_pane";
      MinecraftBlockTypes2["BlackTerracotta"] = "minecraft:black_terracotta";
      MinecraftBlockTypes2["BlackWool"] = "minecraft:black_wool";
      MinecraftBlockTypes2["Blackstone"] = "minecraft:blackstone";
      MinecraftBlockTypes2["BlackstoneDoubleSlab"] = "minecraft:blackstone_double_slab";
      MinecraftBlockTypes2["BlackstoneSlab"] = "minecraft:blackstone_slab";
      MinecraftBlockTypes2["BlackstoneStairs"] = "minecraft:blackstone_stairs";
      MinecraftBlockTypes2["BlackstoneWall"] = "minecraft:blackstone_wall";
      MinecraftBlockTypes2["BlastFurnace"] = "minecraft:blast_furnace";
      MinecraftBlockTypes2["BlueCandle"] = "minecraft:blue_candle";
      MinecraftBlockTypes2["BlueCandleCake"] = "minecraft:blue_candle_cake";
      MinecraftBlockTypes2["BlueCarpet"] = "minecraft:blue_carpet";
      MinecraftBlockTypes2["BlueConcrete"] = "minecraft:blue_concrete";
      MinecraftBlockTypes2["BlueConcretePowder"] = "minecraft:blue_concrete_powder";
      MinecraftBlockTypes2["BlueGlazedTerracotta"] = "minecraft:blue_glazed_terracotta";
      MinecraftBlockTypes2["BlueIce"] = "minecraft:blue_ice";
      MinecraftBlockTypes2["BlueOrchid"] = "minecraft:blue_orchid";
      MinecraftBlockTypes2["BlueShulkerBox"] = "minecraft:blue_shulker_box";
      MinecraftBlockTypes2["BlueStainedGlass"] = "minecraft:blue_stained_glass";
      MinecraftBlockTypes2["BlueStainedGlassPane"] = "minecraft:blue_stained_glass_pane";
      MinecraftBlockTypes2["BlueTerracotta"] = "minecraft:blue_terracotta";
      MinecraftBlockTypes2["BlueWool"] = "minecraft:blue_wool";
      MinecraftBlockTypes2["BoneBlock"] = "minecraft:bone_block";
      MinecraftBlockTypes2["Bookshelf"] = "minecraft:bookshelf";
      MinecraftBlockTypes2["BorderBlock"] = "minecraft:border_block";
      MinecraftBlockTypes2["BrainCoral"] = "minecraft:brain_coral";
      MinecraftBlockTypes2["BrainCoralBlock"] = "minecraft:brain_coral_block";
      MinecraftBlockTypes2["BrainCoralFan"] = "minecraft:brain_coral_fan";
      MinecraftBlockTypes2["BrainCoralWallFan"] = "minecraft:brain_coral_wall_fan";
      MinecraftBlockTypes2["BrewingStand"] = "minecraft:brewing_stand";
      MinecraftBlockTypes2["BrickBlock"] = "minecraft:brick_block";
      MinecraftBlockTypes2["BrickDoubleSlab"] = "minecraft:brick_double_slab";
      MinecraftBlockTypes2["BrickSlab"] = "minecraft:brick_slab";
      MinecraftBlockTypes2["BrickStairs"] = "minecraft:brick_stairs";
      MinecraftBlockTypes2["BrickWall"] = "minecraft:brick_wall";
      MinecraftBlockTypes2["BrownCandle"] = "minecraft:brown_candle";
      MinecraftBlockTypes2["BrownCandleCake"] = "minecraft:brown_candle_cake";
      MinecraftBlockTypes2["BrownCarpet"] = "minecraft:brown_carpet";
      MinecraftBlockTypes2["BrownConcrete"] = "minecraft:brown_concrete";
      MinecraftBlockTypes2["BrownConcretePowder"] = "minecraft:brown_concrete_powder";
      MinecraftBlockTypes2["BrownGlazedTerracotta"] = "minecraft:brown_glazed_terracotta";
      MinecraftBlockTypes2["BrownMushroom"] = "minecraft:brown_mushroom";
      MinecraftBlockTypes2["BrownMushroomBlock"] = "minecraft:brown_mushroom_block";
      MinecraftBlockTypes2["BrownShulkerBox"] = "minecraft:brown_shulker_box";
      MinecraftBlockTypes2["BrownStainedGlass"] = "minecraft:brown_stained_glass";
      MinecraftBlockTypes2["BrownStainedGlassPane"] = "minecraft:brown_stained_glass_pane";
      MinecraftBlockTypes2["BrownTerracotta"] = "minecraft:brown_terracotta";
      MinecraftBlockTypes2["BrownWool"] = "minecraft:brown_wool";
      MinecraftBlockTypes2["BubbleColumn"] = "minecraft:bubble_column";
      MinecraftBlockTypes2["BubbleCoral"] = "minecraft:bubble_coral";
      MinecraftBlockTypes2["BubbleCoralBlock"] = "minecraft:bubble_coral_block";
      MinecraftBlockTypes2["BubbleCoralFan"] = "minecraft:bubble_coral_fan";
      MinecraftBlockTypes2["BubbleCoralWallFan"] = "minecraft:bubble_coral_wall_fan";
      MinecraftBlockTypes2["BuddingAmethyst"] = "minecraft:budding_amethyst";
      MinecraftBlockTypes2["Bush"] = "minecraft:bush";
      MinecraftBlockTypes2["Cactus"] = "minecraft:cactus";
      MinecraftBlockTypes2["CactusFlower"] = "minecraft:cactus_flower";
      MinecraftBlockTypes2["Cake"] = "minecraft:cake";
      MinecraftBlockTypes2["Calcite"] = "minecraft:calcite";
      MinecraftBlockTypes2["CalibratedSculkSensor"] = "minecraft:calibrated_sculk_sensor";
      MinecraftBlockTypes2["Camera"] = "minecraft:camera";
      MinecraftBlockTypes2["Campfire"] = "minecraft:campfire";
      MinecraftBlockTypes2["Candle"] = "minecraft:candle";
      MinecraftBlockTypes2["CandleCake"] = "minecraft:candle_cake";
      MinecraftBlockTypes2["Carrots"] = "minecraft:carrots";
      MinecraftBlockTypes2["CartographyTable"] = "minecraft:cartography_table";
      MinecraftBlockTypes2["CarvedPumpkin"] = "minecraft:carved_pumpkin";
      MinecraftBlockTypes2["Cauldron"] = "minecraft:cauldron";
      MinecraftBlockTypes2["CaveVines"] = "minecraft:cave_vines";
      MinecraftBlockTypes2["CaveVinesBodyWithBerries"] = "minecraft:cave_vines_body_with_berries";
      MinecraftBlockTypes2["CaveVinesHeadWithBerries"] = "minecraft:cave_vines_head_with_berries";
      MinecraftBlockTypes2["ChainCommandBlock"] = "minecraft:chain_command_block";
      MinecraftBlockTypes2["ChemicalHeat"] = "minecraft:chemical_heat";
      MinecraftBlockTypes2["CherryButton"] = "minecraft:cherry_button";
      MinecraftBlockTypes2["CherryDoor"] = "minecraft:cherry_door";
      MinecraftBlockTypes2["CherryDoubleSlab"] = "minecraft:cherry_double_slab";
      MinecraftBlockTypes2["CherryFence"] = "minecraft:cherry_fence";
      MinecraftBlockTypes2["CherryFenceGate"] = "minecraft:cherry_fence_gate";
      MinecraftBlockTypes2["CherryHangingSign"] = "minecraft:cherry_hanging_sign";
      MinecraftBlockTypes2["CherryLeaves"] = "minecraft:cherry_leaves";
      MinecraftBlockTypes2["CherryLog"] = "minecraft:cherry_log";
      MinecraftBlockTypes2["CherryPlanks"] = "minecraft:cherry_planks";
      MinecraftBlockTypes2["CherryPressurePlate"] = "minecraft:cherry_pressure_plate";
      MinecraftBlockTypes2["CherrySapling"] = "minecraft:cherry_sapling";
      MinecraftBlockTypes2["CherryShelf"] = "minecraft:cherry_shelf";
      MinecraftBlockTypes2["CherrySlab"] = "minecraft:cherry_slab";
      MinecraftBlockTypes2["CherryStairs"] = "minecraft:cherry_stairs";
      MinecraftBlockTypes2["CherryStandingSign"] = "minecraft:cherry_standing_sign";
      MinecraftBlockTypes2["CherryTrapdoor"] = "minecraft:cherry_trapdoor";
      MinecraftBlockTypes2["CherryWallSign"] = "minecraft:cherry_wall_sign";
      MinecraftBlockTypes2["CherryWood"] = "minecraft:cherry_wood";
      MinecraftBlockTypes2["Chest"] = "minecraft:chest";
      MinecraftBlockTypes2["ChippedAnvil"] = "minecraft:chipped_anvil";
      MinecraftBlockTypes2["ChiseledBookshelf"] = "minecraft:chiseled_bookshelf";
      MinecraftBlockTypes2["ChiseledCopper"] = "minecraft:chiseled_copper";
      MinecraftBlockTypes2["ChiseledDeepslate"] = "minecraft:chiseled_deepslate";
      MinecraftBlockTypes2["ChiseledNetherBricks"] = "minecraft:chiseled_nether_bricks";
      MinecraftBlockTypes2["ChiseledPolishedBlackstone"] = "minecraft:chiseled_polished_blackstone";
      MinecraftBlockTypes2["ChiseledQuartzBlock"] = "minecraft:chiseled_quartz_block";
      MinecraftBlockTypes2["ChiseledRedSandstone"] = "minecraft:chiseled_red_sandstone";
      MinecraftBlockTypes2["ChiseledResinBricks"] = "minecraft:chiseled_resin_bricks";
      MinecraftBlockTypes2["ChiseledSandstone"] = "minecraft:chiseled_sandstone";
      MinecraftBlockTypes2["ChiseledStoneBricks"] = "minecraft:chiseled_stone_bricks";
      MinecraftBlockTypes2["ChiseledTuff"] = "minecraft:chiseled_tuff";
      MinecraftBlockTypes2["ChiseledTuffBricks"] = "minecraft:chiseled_tuff_bricks";
      MinecraftBlockTypes2["ChorusFlower"] = "minecraft:chorus_flower";
      MinecraftBlockTypes2["ChorusPlant"] = "minecraft:chorus_plant";
      MinecraftBlockTypes2["Clay"] = "minecraft:clay";
      MinecraftBlockTypes2["ClosedEyeblossom"] = "minecraft:closed_eyeblossom";
      MinecraftBlockTypes2["CoalBlock"] = "minecraft:coal_block";
      MinecraftBlockTypes2["CoalOre"] = "minecraft:coal_ore";
      MinecraftBlockTypes2["CoarseDirt"] = "minecraft:coarse_dirt";
      MinecraftBlockTypes2["CobbledDeepslate"] = "minecraft:cobbled_deepslate";
      MinecraftBlockTypes2["CobbledDeepslateDoubleSlab"] = "minecraft:cobbled_deepslate_double_slab";
      MinecraftBlockTypes2["CobbledDeepslateSlab"] = "minecraft:cobbled_deepslate_slab";
      MinecraftBlockTypes2["CobbledDeepslateStairs"] = "minecraft:cobbled_deepslate_stairs";
      MinecraftBlockTypes2["CobbledDeepslateWall"] = "minecraft:cobbled_deepslate_wall";
      MinecraftBlockTypes2["Cobblestone"] = "minecraft:cobblestone";
      MinecraftBlockTypes2["CobblestoneDoubleSlab"] = "minecraft:cobblestone_double_slab";
      MinecraftBlockTypes2["CobblestoneSlab"] = "minecraft:cobblestone_slab";
      MinecraftBlockTypes2["CobblestoneWall"] = "minecraft:cobblestone_wall";
      MinecraftBlockTypes2["Cocoa"] = "minecraft:cocoa";
      MinecraftBlockTypes2["ColoredTorchBlue"] = "minecraft:colored_torch_blue";
      MinecraftBlockTypes2["ColoredTorchGreen"] = "minecraft:colored_torch_green";
      MinecraftBlockTypes2["ColoredTorchPurple"] = "minecraft:colored_torch_purple";
      MinecraftBlockTypes2["ColoredTorchRed"] = "minecraft:colored_torch_red";
      MinecraftBlockTypes2["CommandBlock"] = "minecraft:command_block";
      MinecraftBlockTypes2["Composter"] = "minecraft:composter";
      MinecraftBlockTypes2["CompoundCreator"] = "minecraft:compound_creator";
      MinecraftBlockTypes2["Conduit"] = "minecraft:conduit";
      MinecraftBlockTypes2["CopperBars"] = "minecraft:copper_bars";
      MinecraftBlockTypes2["CopperBlock"] = "minecraft:copper_block";
      MinecraftBlockTypes2["CopperBulb"] = "minecraft:copper_bulb";
      MinecraftBlockTypes2["CopperChain"] = "minecraft:copper_chain";
      MinecraftBlockTypes2["CopperChest"] = "minecraft:copper_chest";
      MinecraftBlockTypes2["CopperDoor"] = "minecraft:copper_door";
      MinecraftBlockTypes2["CopperGolemStatue"] = "minecraft:copper_golem_statue";
      MinecraftBlockTypes2["CopperGrate"] = "minecraft:copper_grate";
      MinecraftBlockTypes2["CopperLantern"] = "minecraft:copper_lantern";
      MinecraftBlockTypes2["CopperOre"] = "minecraft:copper_ore";
      MinecraftBlockTypes2["CopperTorch"] = "minecraft:copper_torch";
      MinecraftBlockTypes2["CopperTrapdoor"] = "minecraft:copper_trapdoor";
      MinecraftBlockTypes2["Cornflower"] = "minecraft:cornflower";
      MinecraftBlockTypes2["CrackedDeepslateBricks"] = "minecraft:cracked_deepslate_bricks";
      MinecraftBlockTypes2["CrackedDeepslateTiles"] = "minecraft:cracked_deepslate_tiles";
      MinecraftBlockTypes2["CrackedNetherBricks"] = "minecraft:cracked_nether_bricks";
      MinecraftBlockTypes2["CrackedPolishedBlackstoneBricks"] = "minecraft:cracked_polished_blackstone_bricks";
      MinecraftBlockTypes2["CrackedStoneBricks"] = "minecraft:cracked_stone_bricks";
      MinecraftBlockTypes2["Crafter"] = "minecraft:crafter";
      MinecraftBlockTypes2["CraftingTable"] = "minecraft:crafting_table";
      MinecraftBlockTypes2["CreakingHeart"] = "minecraft:creaking_heart";
      MinecraftBlockTypes2["CreeperHead"] = "minecraft:creeper_head";
      MinecraftBlockTypes2["CrimsonButton"] = "minecraft:crimson_button";
      MinecraftBlockTypes2["CrimsonDoor"] = "minecraft:crimson_door";
      MinecraftBlockTypes2["CrimsonDoubleSlab"] = "minecraft:crimson_double_slab";
      MinecraftBlockTypes2["CrimsonFence"] = "minecraft:crimson_fence";
      MinecraftBlockTypes2["CrimsonFenceGate"] = "minecraft:crimson_fence_gate";
      MinecraftBlockTypes2["CrimsonFungus"] = "minecraft:crimson_fungus";
      MinecraftBlockTypes2["CrimsonHangingSign"] = "minecraft:crimson_hanging_sign";
      MinecraftBlockTypes2["CrimsonHyphae"] = "minecraft:crimson_hyphae";
      MinecraftBlockTypes2["CrimsonNylium"] = "minecraft:crimson_nylium";
      MinecraftBlockTypes2["CrimsonPlanks"] = "minecraft:crimson_planks";
      MinecraftBlockTypes2["CrimsonPressurePlate"] = "minecraft:crimson_pressure_plate";
      MinecraftBlockTypes2["CrimsonRoots"] = "minecraft:crimson_roots";
      MinecraftBlockTypes2["CrimsonShelf"] = "minecraft:crimson_shelf";
      MinecraftBlockTypes2["CrimsonSlab"] = "minecraft:crimson_slab";
      MinecraftBlockTypes2["CrimsonStairs"] = "minecraft:crimson_stairs";
      MinecraftBlockTypes2["CrimsonStandingSign"] = "minecraft:crimson_standing_sign";
      MinecraftBlockTypes2["CrimsonStem"] = "minecraft:crimson_stem";
      MinecraftBlockTypes2["CrimsonTrapdoor"] = "minecraft:crimson_trapdoor";
      MinecraftBlockTypes2["CrimsonWallSign"] = "minecraft:crimson_wall_sign";
      MinecraftBlockTypes2["CryingObsidian"] = "minecraft:crying_obsidian";
      MinecraftBlockTypes2["CutCopper"] = "minecraft:cut_copper";
      MinecraftBlockTypes2["CutCopperSlab"] = "minecraft:cut_copper_slab";
      MinecraftBlockTypes2["CutCopperStairs"] = "minecraft:cut_copper_stairs";
      MinecraftBlockTypes2["CutRedSandstone"] = "minecraft:cut_red_sandstone";
      MinecraftBlockTypes2["CutRedSandstoneDoubleSlab"] = "minecraft:cut_red_sandstone_double_slab";
      MinecraftBlockTypes2["CutRedSandstoneSlab"] = "minecraft:cut_red_sandstone_slab";
      MinecraftBlockTypes2["CutSandstone"] = "minecraft:cut_sandstone";
      MinecraftBlockTypes2["CutSandstoneDoubleSlab"] = "minecraft:cut_sandstone_double_slab";
      MinecraftBlockTypes2["CutSandstoneSlab"] = "minecraft:cut_sandstone_slab";
      MinecraftBlockTypes2["CyanCandle"] = "minecraft:cyan_candle";
      MinecraftBlockTypes2["CyanCandleCake"] = "minecraft:cyan_candle_cake";
      MinecraftBlockTypes2["CyanCarpet"] = "minecraft:cyan_carpet";
      MinecraftBlockTypes2["CyanConcrete"] = "minecraft:cyan_concrete";
      MinecraftBlockTypes2["CyanConcretePowder"] = "minecraft:cyan_concrete_powder";
      MinecraftBlockTypes2["CyanGlazedTerracotta"] = "minecraft:cyan_glazed_terracotta";
      MinecraftBlockTypes2["CyanShulkerBox"] = "minecraft:cyan_shulker_box";
      MinecraftBlockTypes2["CyanStainedGlass"] = "minecraft:cyan_stained_glass";
      MinecraftBlockTypes2["CyanStainedGlassPane"] = "minecraft:cyan_stained_glass_pane";
      MinecraftBlockTypes2["CyanTerracotta"] = "minecraft:cyan_terracotta";
      MinecraftBlockTypes2["CyanWool"] = "minecraft:cyan_wool";
      MinecraftBlockTypes2["DamagedAnvil"] = "minecraft:damaged_anvil";
      MinecraftBlockTypes2["Dandelion"] = "minecraft:dandelion";
      MinecraftBlockTypes2["DarkOakButton"] = "minecraft:dark_oak_button";
      MinecraftBlockTypes2["DarkOakDoor"] = "minecraft:dark_oak_door";
      MinecraftBlockTypes2["DarkOakDoubleSlab"] = "minecraft:dark_oak_double_slab";
      MinecraftBlockTypes2["DarkOakFence"] = "minecraft:dark_oak_fence";
      MinecraftBlockTypes2["DarkOakFenceGate"] = "minecraft:dark_oak_fence_gate";
      MinecraftBlockTypes2["DarkOakHangingSign"] = "minecraft:dark_oak_hanging_sign";
      MinecraftBlockTypes2["DarkOakLeaves"] = "minecraft:dark_oak_leaves";
      MinecraftBlockTypes2["DarkOakLog"] = "minecraft:dark_oak_log";
      MinecraftBlockTypes2["DarkOakPlanks"] = "minecraft:dark_oak_planks";
      MinecraftBlockTypes2["DarkOakPressurePlate"] = "minecraft:dark_oak_pressure_plate";
      MinecraftBlockTypes2["DarkOakSapling"] = "minecraft:dark_oak_sapling";
      MinecraftBlockTypes2["DarkOakShelf"] = "minecraft:dark_oak_shelf";
      MinecraftBlockTypes2["DarkOakSlab"] = "minecraft:dark_oak_slab";
      MinecraftBlockTypes2["DarkOakStairs"] = "minecraft:dark_oak_stairs";
      MinecraftBlockTypes2["DarkOakTrapdoor"] = "minecraft:dark_oak_trapdoor";
      MinecraftBlockTypes2["DarkOakWood"] = "minecraft:dark_oak_wood";
      MinecraftBlockTypes2["DarkPrismarine"] = "minecraft:dark_prismarine";
      MinecraftBlockTypes2["DarkPrismarineDoubleSlab"] = "minecraft:dark_prismarine_double_slab";
      MinecraftBlockTypes2["DarkPrismarineSlab"] = "minecraft:dark_prismarine_slab";
      MinecraftBlockTypes2["DarkPrismarineStairs"] = "minecraft:dark_prismarine_stairs";
      MinecraftBlockTypes2["DarkoakStandingSign"] = "minecraft:darkoak_standing_sign";
      MinecraftBlockTypes2["DarkoakWallSign"] = "minecraft:darkoak_wall_sign";
      MinecraftBlockTypes2["DaylightDetector"] = "minecraft:daylight_detector";
      MinecraftBlockTypes2["DaylightDetectorInverted"] = "minecraft:daylight_detector_inverted";
      MinecraftBlockTypes2["DeadBrainCoral"] = "minecraft:dead_brain_coral";
      MinecraftBlockTypes2["DeadBrainCoralBlock"] = "minecraft:dead_brain_coral_block";
      MinecraftBlockTypes2["DeadBrainCoralFan"] = "minecraft:dead_brain_coral_fan";
      MinecraftBlockTypes2["DeadBrainCoralWallFan"] = "minecraft:dead_brain_coral_wall_fan";
      MinecraftBlockTypes2["DeadBubbleCoral"] = "minecraft:dead_bubble_coral";
      MinecraftBlockTypes2["DeadBubbleCoralBlock"] = "minecraft:dead_bubble_coral_block";
      MinecraftBlockTypes2["DeadBubbleCoralFan"] = "minecraft:dead_bubble_coral_fan";
      MinecraftBlockTypes2["DeadBubbleCoralWallFan"] = "minecraft:dead_bubble_coral_wall_fan";
      MinecraftBlockTypes2["DeadFireCoral"] = "minecraft:dead_fire_coral";
      MinecraftBlockTypes2["DeadFireCoralBlock"] = "minecraft:dead_fire_coral_block";
      MinecraftBlockTypes2["DeadFireCoralFan"] = "minecraft:dead_fire_coral_fan";
      MinecraftBlockTypes2["DeadFireCoralWallFan"] = "minecraft:dead_fire_coral_wall_fan";
      MinecraftBlockTypes2["DeadHornCoral"] = "minecraft:dead_horn_coral";
      MinecraftBlockTypes2["DeadHornCoralBlock"] = "minecraft:dead_horn_coral_block";
      MinecraftBlockTypes2["DeadHornCoralFan"] = "minecraft:dead_horn_coral_fan";
      MinecraftBlockTypes2["DeadHornCoralWallFan"] = "minecraft:dead_horn_coral_wall_fan";
      MinecraftBlockTypes2["DeadTubeCoral"] = "minecraft:dead_tube_coral";
      MinecraftBlockTypes2["DeadTubeCoralBlock"] = "minecraft:dead_tube_coral_block";
      MinecraftBlockTypes2["DeadTubeCoralFan"] = "minecraft:dead_tube_coral_fan";
      MinecraftBlockTypes2["DeadTubeCoralWallFan"] = "minecraft:dead_tube_coral_wall_fan";
      MinecraftBlockTypes2["Deadbush"] = "minecraft:deadbush";
      MinecraftBlockTypes2["DecoratedPot"] = "minecraft:decorated_pot";
      MinecraftBlockTypes2["Deepslate"] = "minecraft:deepslate";
      MinecraftBlockTypes2["DeepslateBrickDoubleSlab"] = "minecraft:deepslate_brick_double_slab";
      MinecraftBlockTypes2["DeepslateBrickSlab"] = "minecraft:deepslate_brick_slab";
      MinecraftBlockTypes2["DeepslateBrickStairs"] = "minecraft:deepslate_brick_stairs";
      MinecraftBlockTypes2["DeepslateBrickWall"] = "minecraft:deepslate_brick_wall";
      MinecraftBlockTypes2["DeepslateBricks"] = "minecraft:deepslate_bricks";
      MinecraftBlockTypes2["DeepslateCoalOre"] = "minecraft:deepslate_coal_ore";
      MinecraftBlockTypes2["DeepslateCopperOre"] = "minecraft:deepslate_copper_ore";
      MinecraftBlockTypes2["DeepslateDiamondOre"] = "minecraft:deepslate_diamond_ore";
      MinecraftBlockTypes2["DeepslateEmeraldOre"] = "minecraft:deepslate_emerald_ore";
      MinecraftBlockTypes2["DeepslateGoldOre"] = "minecraft:deepslate_gold_ore";
      MinecraftBlockTypes2["DeepslateIronOre"] = "minecraft:deepslate_iron_ore";
      MinecraftBlockTypes2["DeepslateLapisOre"] = "minecraft:deepslate_lapis_ore";
      MinecraftBlockTypes2["DeepslateRedstoneOre"] = "minecraft:deepslate_redstone_ore";
      MinecraftBlockTypes2["DeepslateTileDoubleSlab"] = "minecraft:deepslate_tile_double_slab";
      MinecraftBlockTypes2["DeepslateTileSlab"] = "minecraft:deepslate_tile_slab";
      MinecraftBlockTypes2["DeepslateTileStairs"] = "minecraft:deepslate_tile_stairs";
      MinecraftBlockTypes2["DeepslateTileWall"] = "minecraft:deepslate_tile_wall";
      MinecraftBlockTypes2["DeepslateTiles"] = "minecraft:deepslate_tiles";
      MinecraftBlockTypes2["Deny"] = "minecraft:deny";
      MinecraftBlockTypes2["DetectorRail"] = "minecraft:detector_rail";
      MinecraftBlockTypes2["DiamondBlock"] = "minecraft:diamond_block";
      MinecraftBlockTypes2["DiamondOre"] = "minecraft:diamond_ore";
      MinecraftBlockTypes2["Diorite"] = "minecraft:diorite";
      MinecraftBlockTypes2["DioriteDoubleSlab"] = "minecraft:diorite_double_slab";
      MinecraftBlockTypes2["DioriteSlab"] = "minecraft:diorite_slab";
      MinecraftBlockTypes2["DioriteStairs"] = "minecraft:diorite_stairs";
      MinecraftBlockTypes2["DioriteWall"] = "minecraft:diorite_wall";
      MinecraftBlockTypes2["Dirt"] = "minecraft:dirt";
      MinecraftBlockTypes2["DirtWithRoots"] = "minecraft:dirt_with_roots";
      MinecraftBlockTypes2["Dispenser"] = "minecraft:dispenser";
      MinecraftBlockTypes2["DoubleCutCopperSlab"] = "minecraft:double_cut_copper_slab";
      MinecraftBlockTypes2["DragonEgg"] = "minecraft:dragon_egg";
      MinecraftBlockTypes2["DragonHead"] = "minecraft:dragon_head";
      MinecraftBlockTypes2["DriedGhast"] = "minecraft:dried_ghast";
      MinecraftBlockTypes2["DriedKelpBlock"] = "minecraft:dried_kelp_block";
      MinecraftBlockTypes2["DripstoneBlock"] = "minecraft:dripstone_block";
      MinecraftBlockTypes2["Dropper"] = "minecraft:dropper";
      MinecraftBlockTypes2["Element0"] = "minecraft:element_0";
      MinecraftBlockTypes2["Element1"] = "minecraft:element_1";
      MinecraftBlockTypes2["Element10"] = "minecraft:element_10";
      MinecraftBlockTypes2["Element100"] = "minecraft:element_100";
      MinecraftBlockTypes2["Element101"] = "minecraft:element_101";
      MinecraftBlockTypes2["Element102"] = "minecraft:element_102";
      MinecraftBlockTypes2["Element103"] = "minecraft:element_103";
      MinecraftBlockTypes2["Element104"] = "minecraft:element_104";
      MinecraftBlockTypes2["Element105"] = "minecraft:element_105";
      MinecraftBlockTypes2["Element106"] = "minecraft:element_106";
      MinecraftBlockTypes2["Element107"] = "minecraft:element_107";
      MinecraftBlockTypes2["Element108"] = "minecraft:element_108";
      MinecraftBlockTypes2["Element109"] = "minecraft:element_109";
      MinecraftBlockTypes2["Element11"] = "minecraft:element_11";
      MinecraftBlockTypes2["Element110"] = "minecraft:element_110";
      MinecraftBlockTypes2["Element111"] = "minecraft:element_111";
      MinecraftBlockTypes2["Element112"] = "minecraft:element_112";
      MinecraftBlockTypes2["Element113"] = "minecraft:element_113";
      MinecraftBlockTypes2["Element114"] = "minecraft:element_114";
      MinecraftBlockTypes2["Element115"] = "minecraft:element_115";
      MinecraftBlockTypes2["Element116"] = "minecraft:element_116";
      MinecraftBlockTypes2["Element117"] = "minecraft:element_117";
      MinecraftBlockTypes2["Element118"] = "minecraft:element_118";
      MinecraftBlockTypes2["Element12"] = "minecraft:element_12";
      MinecraftBlockTypes2["Element13"] = "minecraft:element_13";
      MinecraftBlockTypes2["Element14"] = "minecraft:element_14";
      MinecraftBlockTypes2["Element15"] = "minecraft:element_15";
      MinecraftBlockTypes2["Element16"] = "minecraft:element_16";
      MinecraftBlockTypes2["Element17"] = "minecraft:element_17";
      MinecraftBlockTypes2["Element18"] = "minecraft:element_18";
      MinecraftBlockTypes2["Element19"] = "minecraft:element_19";
      MinecraftBlockTypes2["Element2"] = "minecraft:element_2";
      MinecraftBlockTypes2["Element20"] = "minecraft:element_20";
      MinecraftBlockTypes2["Element21"] = "minecraft:element_21";
      MinecraftBlockTypes2["Element22"] = "minecraft:element_22";
      MinecraftBlockTypes2["Element23"] = "minecraft:element_23";
      MinecraftBlockTypes2["Element24"] = "minecraft:element_24";
      MinecraftBlockTypes2["Element25"] = "minecraft:element_25";
      MinecraftBlockTypes2["Element26"] = "minecraft:element_26";
      MinecraftBlockTypes2["Element27"] = "minecraft:element_27";
      MinecraftBlockTypes2["Element28"] = "minecraft:element_28";
      MinecraftBlockTypes2["Element29"] = "minecraft:element_29";
      MinecraftBlockTypes2["Element3"] = "minecraft:element_3";
      MinecraftBlockTypes2["Element30"] = "minecraft:element_30";
      MinecraftBlockTypes2["Element31"] = "minecraft:element_31";
      MinecraftBlockTypes2["Element32"] = "minecraft:element_32";
      MinecraftBlockTypes2["Element33"] = "minecraft:element_33";
      MinecraftBlockTypes2["Element34"] = "minecraft:element_34";
      MinecraftBlockTypes2["Element35"] = "minecraft:element_35";
      MinecraftBlockTypes2["Element36"] = "minecraft:element_36";
      MinecraftBlockTypes2["Element37"] = "minecraft:element_37";
      MinecraftBlockTypes2["Element38"] = "minecraft:element_38";
      MinecraftBlockTypes2["Element39"] = "minecraft:element_39";
      MinecraftBlockTypes2["Element4"] = "minecraft:element_4";
      MinecraftBlockTypes2["Element40"] = "minecraft:element_40";
      MinecraftBlockTypes2["Element41"] = "minecraft:element_41";
      MinecraftBlockTypes2["Element42"] = "minecraft:element_42";
      MinecraftBlockTypes2["Element43"] = "minecraft:element_43";
      MinecraftBlockTypes2["Element44"] = "minecraft:element_44";
      MinecraftBlockTypes2["Element45"] = "minecraft:element_45";
      MinecraftBlockTypes2["Element46"] = "minecraft:element_46";
      MinecraftBlockTypes2["Element47"] = "minecraft:element_47";
      MinecraftBlockTypes2["Element48"] = "minecraft:element_48";
      MinecraftBlockTypes2["Element49"] = "minecraft:element_49";
      MinecraftBlockTypes2["Element5"] = "minecraft:element_5";
      MinecraftBlockTypes2["Element50"] = "minecraft:element_50";
      MinecraftBlockTypes2["Element51"] = "minecraft:element_51";
      MinecraftBlockTypes2["Element52"] = "minecraft:element_52";
      MinecraftBlockTypes2["Element53"] = "minecraft:element_53";
      MinecraftBlockTypes2["Element54"] = "minecraft:element_54";
      MinecraftBlockTypes2["Element55"] = "minecraft:element_55";
      MinecraftBlockTypes2["Element56"] = "minecraft:element_56";
      MinecraftBlockTypes2["Element57"] = "minecraft:element_57";
      MinecraftBlockTypes2["Element58"] = "minecraft:element_58";
      MinecraftBlockTypes2["Element59"] = "minecraft:element_59";
      MinecraftBlockTypes2["Element6"] = "minecraft:element_6";
      MinecraftBlockTypes2["Element60"] = "minecraft:element_60";
      MinecraftBlockTypes2["Element61"] = "minecraft:element_61";
      MinecraftBlockTypes2["Element62"] = "minecraft:element_62";
      MinecraftBlockTypes2["Element63"] = "minecraft:element_63";
      MinecraftBlockTypes2["Element64"] = "minecraft:element_64";
      MinecraftBlockTypes2["Element65"] = "minecraft:element_65";
      MinecraftBlockTypes2["Element66"] = "minecraft:element_66";
      MinecraftBlockTypes2["Element67"] = "minecraft:element_67";
      MinecraftBlockTypes2["Element68"] = "minecraft:element_68";
      MinecraftBlockTypes2["Element69"] = "minecraft:element_69";
      MinecraftBlockTypes2["Element7"] = "minecraft:element_7";
      MinecraftBlockTypes2["Element70"] = "minecraft:element_70";
      MinecraftBlockTypes2["Element71"] = "minecraft:element_71";
      MinecraftBlockTypes2["Element72"] = "minecraft:element_72";
      MinecraftBlockTypes2["Element73"] = "minecraft:element_73";
      MinecraftBlockTypes2["Element74"] = "minecraft:element_74";
      MinecraftBlockTypes2["Element75"] = "minecraft:element_75";
      MinecraftBlockTypes2["Element76"] = "minecraft:element_76";
      MinecraftBlockTypes2["Element77"] = "minecraft:element_77";
      MinecraftBlockTypes2["Element78"] = "minecraft:element_78";
      MinecraftBlockTypes2["Element79"] = "minecraft:element_79";
      MinecraftBlockTypes2["Element8"] = "minecraft:element_8";
      MinecraftBlockTypes2["Element80"] = "minecraft:element_80";
      MinecraftBlockTypes2["Element81"] = "minecraft:element_81";
      MinecraftBlockTypes2["Element82"] = "minecraft:element_82";
      MinecraftBlockTypes2["Element83"] = "minecraft:element_83";
      MinecraftBlockTypes2["Element84"] = "minecraft:element_84";
      MinecraftBlockTypes2["Element85"] = "minecraft:element_85";
      MinecraftBlockTypes2["Element86"] = "minecraft:element_86";
      MinecraftBlockTypes2["Element87"] = "minecraft:element_87";
      MinecraftBlockTypes2["Element88"] = "minecraft:element_88";
      MinecraftBlockTypes2["Element89"] = "minecraft:element_89";
      MinecraftBlockTypes2["Element9"] = "minecraft:element_9";
      MinecraftBlockTypes2["Element90"] = "minecraft:element_90";
      MinecraftBlockTypes2["Element91"] = "minecraft:element_91";
      MinecraftBlockTypes2["Element92"] = "minecraft:element_92";
      MinecraftBlockTypes2["Element93"] = "minecraft:element_93";
      MinecraftBlockTypes2["Element94"] = "minecraft:element_94";
      MinecraftBlockTypes2["Element95"] = "minecraft:element_95";
      MinecraftBlockTypes2["Element96"] = "minecraft:element_96";
      MinecraftBlockTypes2["Element97"] = "minecraft:element_97";
      MinecraftBlockTypes2["Element98"] = "minecraft:element_98";
      MinecraftBlockTypes2["Element99"] = "minecraft:element_99";
      MinecraftBlockTypes2["ElementConstructor"] = "minecraft:element_constructor";
      MinecraftBlockTypes2["EmeraldBlock"] = "minecraft:emerald_block";
      MinecraftBlockTypes2["EmeraldOre"] = "minecraft:emerald_ore";
      MinecraftBlockTypes2["EnchantingTable"] = "minecraft:enchanting_table";
      MinecraftBlockTypes2["EndBrickStairs"] = "minecraft:end_brick_stairs";
      MinecraftBlockTypes2["EndBricks"] = "minecraft:end_bricks";
      MinecraftBlockTypes2["EndPortal"] = "minecraft:end_portal";
      MinecraftBlockTypes2["EndPortalFrame"] = "minecraft:end_portal_frame";
      MinecraftBlockTypes2["EndRod"] = "minecraft:end_rod";
      MinecraftBlockTypes2["EndStone"] = "minecraft:end_stone";
      MinecraftBlockTypes2["EndStoneBrickDoubleSlab"] = "minecraft:end_stone_brick_double_slab";
      MinecraftBlockTypes2["EndStoneBrickSlab"] = "minecraft:end_stone_brick_slab";
      MinecraftBlockTypes2["EndStoneBrickWall"] = "minecraft:end_stone_brick_wall";
      MinecraftBlockTypes2["EnderChest"] = "minecraft:ender_chest";
      MinecraftBlockTypes2["ExposedChiseledCopper"] = "minecraft:exposed_chiseled_copper";
      MinecraftBlockTypes2["ExposedCopper"] = "minecraft:exposed_copper";
      MinecraftBlockTypes2["ExposedCopperBars"] = "minecraft:exposed_copper_bars";
      MinecraftBlockTypes2["ExposedCopperBulb"] = "minecraft:exposed_copper_bulb";
      MinecraftBlockTypes2["ExposedCopperChain"] = "minecraft:exposed_copper_chain";
      MinecraftBlockTypes2["ExposedCopperChest"] = "minecraft:exposed_copper_chest";
      MinecraftBlockTypes2["ExposedCopperDoor"] = "minecraft:exposed_copper_door";
      MinecraftBlockTypes2["ExposedCopperGolemStatue"] = "minecraft:exposed_copper_golem_statue";
      MinecraftBlockTypes2["ExposedCopperGrate"] = "minecraft:exposed_copper_grate";
      MinecraftBlockTypes2["ExposedCopperLantern"] = "minecraft:exposed_copper_lantern";
      MinecraftBlockTypes2["ExposedCopperTrapdoor"] = "minecraft:exposed_copper_trapdoor";
      MinecraftBlockTypes2["ExposedCutCopper"] = "minecraft:exposed_cut_copper";
      MinecraftBlockTypes2["ExposedCutCopperSlab"] = "minecraft:exposed_cut_copper_slab";
      MinecraftBlockTypes2["ExposedCutCopperStairs"] = "minecraft:exposed_cut_copper_stairs";
      MinecraftBlockTypes2["ExposedDoubleCutCopperSlab"] = "minecraft:exposed_double_cut_copper_slab";
      MinecraftBlockTypes2["ExposedLightningRod"] = "minecraft:exposed_lightning_rod";
      MinecraftBlockTypes2["Farmland"] = "minecraft:farmland";
      MinecraftBlockTypes2["FenceGate"] = "minecraft:fence_gate";
      MinecraftBlockTypes2["Fern"] = "minecraft:fern";
      MinecraftBlockTypes2["Fire"] = "minecraft:fire";
      MinecraftBlockTypes2["FireCoral"] = "minecraft:fire_coral";
      MinecraftBlockTypes2["FireCoralBlock"] = "minecraft:fire_coral_block";
      MinecraftBlockTypes2["FireCoralFan"] = "minecraft:fire_coral_fan";
      MinecraftBlockTypes2["FireCoralWallFan"] = "minecraft:fire_coral_wall_fan";
      MinecraftBlockTypes2["FireflyBush"] = "minecraft:firefly_bush";
      MinecraftBlockTypes2["FletchingTable"] = "minecraft:fletching_table";
      MinecraftBlockTypes2["FlowerPot"] = "minecraft:flower_pot";
      MinecraftBlockTypes2["FloweringAzalea"] = "minecraft:flowering_azalea";
      MinecraftBlockTypes2["FlowingLava"] = "minecraft:flowing_lava";
      MinecraftBlockTypes2["FlowingWater"] = "minecraft:flowing_water";
      MinecraftBlockTypes2["Frame"] = "minecraft:frame";
      MinecraftBlockTypes2["FrogSpawn"] = "minecraft:frog_spawn";
      MinecraftBlockTypes2["FrostedIce"] = "minecraft:frosted_ice";
      MinecraftBlockTypes2["Furnace"] = "minecraft:furnace";
      MinecraftBlockTypes2["GildedBlackstone"] = "minecraft:gilded_blackstone";
      MinecraftBlockTypes2["Glass"] = "minecraft:glass";
      MinecraftBlockTypes2["GlassPane"] = "minecraft:glass_pane";
      MinecraftBlockTypes2["GlowFrame"] = "minecraft:glow_frame";
      MinecraftBlockTypes2["GlowLichen"] = "minecraft:glow_lichen";
      MinecraftBlockTypes2["Glowstone"] = "minecraft:glowstone";
      MinecraftBlockTypes2["GoldBlock"] = "minecraft:gold_block";
      MinecraftBlockTypes2["GoldOre"] = "minecraft:gold_ore";
      MinecraftBlockTypes2["GoldenRail"] = "minecraft:golden_rail";
      MinecraftBlockTypes2["Granite"] = "minecraft:granite";
      MinecraftBlockTypes2["GraniteDoubleSlab"] = "minecraft:granite_double_slab";
      MinecraftBlockTypes2["GraniteSlab"] = "minecraft:granite_slab";
      MinecraftBlockTypes2["GraniteStairs"] = "minecraft:granite_stairs";
      MinecraftBlockTypes2["GraniteWall"] = "minecraft:granite_wall";
      MinecraftBlockTypes2["GrassBlock"] = "minecraft:grass_block";
      MinecraftBlockTypes2["GrassPath"] = "minecraft:grass_path";
      MinecraftBlockTypes2["Gravel"] = "minecraft:gravel";
      MinecraftBlockTypes2["GrayCandle"] = "minecraft:gray_candle";
      MinecraftBlockTypes2["GrayCandleCake"] = "minecraft:gray_candle_cake";
      MinecraftBlockTypes2["GrayCarpet"] = "minecraft:gray_carpet";
      MinecraftBlockTypes2["GrayConcrete"] = "minecraft:gray_concrete";
      MinecraftBlockTypes2["GrayConcretePowder"] = "minecraft:gray_concrete_powder";
      MinecraftBlockTypes2["GrayGlazedTerracotta"] = "minecraft:gray_glazed_terracotta";
      MinecraftBlockTypes2["GrayShulkerBox"] = "minecraft:gray_shulker_box";
      MinecraftBlockTypes2["GrayStainedGlass"] = "minecraft:gray_stained_glass";
      MinecraftBlockTypes2["GrayStainedGlassPane"] = "minecraft:gray_stained_glass_pane";
      MinecraftBlockTypes2["GrayTerracotta"] = "minecraft:gray_terracotta";
      MinecraftBlockTypes2["GrayWool"] = "minecraft:gray_wool";
      MinecraftBlockTypes2["GreenCandle"] = "minecraft:green_candle";
      MinecraftBlockTypes2["GreenCandleCake"] = "minecraft:green_candle_cake";
      MinecraftBlockTypes2["GreenCarpet"] = "minecraft:green_carpet";
      MinecraftBlockTypes2["GreenConcrete"] = "minecraft:green_concrete";
      MinecraftBlockTypes2["GreenConcretePowder"] = "minecraft:green_concrete_powder";
      MinecraftBlockTypes2["GreenGlazedTerracotta"] = "minecraft:green_glazed_terracotta";
      MinecraftBlockTypes2["GreenShulkerBox"] = "minecraft:green_shulker_box";
      MinecraftBlockTypes2["GreenStainedGlass"] = "minecraft:green_stained_glass";
      MinecraftBlockTypes2["GreenStainedGlassPane"] = "minecraft:green_stained_glass_pane";
      MinecraftBlockTypes2["GreenTerracotta"] = "minecraft:green_terracotta";
      MinecraftBlockTypes2["GreenWool"] = "minecraft:green_wool";
      MinecraftBlockTypes2["Grindstone"] = "minecraft:grindstone";
      MinecraftBlockTypes2["HangingRoots"] = "minecraft:hanging_roots";
      MinecraftBlockTypes2["HardBlackStainedGlass"] = "minecraft:hard_black_stained_glass";
      MinecraftBlockTypes2["HardBlackStainedGlassPane"] = "minecraft:hard_black_stained_glass_pane";
      MinecraftBlockTypes2["HardBlueStainedGlass"] = "minecraft:hard_blue_stained_glass";
      MinecraftBlockTypes2["HardBlueStainedGlassPane"] = "minecraft:hard_blue_stained_glass_pane";
      MinecraftBlockTypes2["HardBrownStainedGlass"] = "minecraft:hard_brown_stained_glass";
      MinecraftBlockTypes2["HardBrownStainedGlassPane"] = "minecraft:hard_brown_stained_glass_pane";
      MinecraftBlockTypes2["HardCyanStainedGlass"] = "minecraft:hard_cyan_stained_glass";
      MinecraftBlockTypes2["HardCyanStainedGlassPane"] = "minecraft:hard_cyan_stained_glass_pane";
      MinecraftBlockTypes2["HardGlass"] = "minecraft:hard_glass";
      MinecraftBlockTypes2["HardGlassPane"] = "minecraft:hard_glass_pane";
      MinecraftBlockTypes2["HardGrayStainedGlass"] = "minecraft:hard_gray_stained_glass";
      MinecraftBlockTypes2["HardGrayStainedGlassPane"] = "minecraft:hard_gray_stained_glass_pane";
      MinecraftBlockTypes2["HardGreenStainedGlass"] = "minecraft:hard_green_stained_glass";
      MinecraftBlockTypes2["HardGreenStainedGlassPane"] = "minecraft:hard_green_stained_glass_pane";
      MinecraftBlockTypes2["HardLightBlueStainedGlass"] = "minecraft:hard_light_blue_stained_glass";
      MinecraftBlockTypes2["HardLightBlueStainedGlassPane"] = "minecraft:hard_light_blue_stained_glass_pane";
      MinecraftBlockTypes2["HardLightGrayStainedGlass"] = "minecraft:hard_light_gray_stained_glass";
      MinecraftBlockTypes2["HardLightGrayStainedGlassPane"] = "minecraft:hard_light_gray_stained_glass_pane";
      MinecraftBlockTypes2["HardLimeStainedGlass"] = "minecraft:hard_lime_stained_glass";
      MinecraftBlockTypes2["HardLimeStainedGlassPane"] = "minecraft:hard_lime_stained_glass_pane";
      MinecraftBlockTypes2["HardMagentaStainedGlass"] = "minecraft:hard_magenta_stained_glass";
      MinecraftBlockTypes2["HardMagentaStainedGlassPane"] = "minecraft:hard_magenta_stained_glass_pane";
      MinecraftBlockTypes2["HardOrangeStainedGlass"] = "minecraft:hard_orange_stained_glass";
      MinecraftBlockTypes2["HardOrangeStainedGlassPane"] = "minecraft:hard_orange_stained_glass_pane";
      MinecraftBlockTypes2["HardPinkStainedGlass"] = "minecraft:hard_pink_stained_glass";
      MinecraftBlockTypes2["HardPinkStainedGlassPane"] = "minecraft:hard_pink_stained_glass_pane";
      MinecraftBlockTypes2["HardPurpleStainedGlass"] = "minecraft:hard_purple_stained_glass";
      MinecraftBlockTypes2["HardPurpleStainedGlassPane"] = "minecraft:hard_purple_stained_glass_pane";
      MinecraftBlockTypes2["HardRedStainedGlass"] = "minecraft:hard_red_stained_glass";
      MinecraftBlockTypes2["HardRedStainedGlassPane"] = "minecraft:hard_red_stained_glass_pane";
      MinecraftBlockTypes2["HardWhiteStainedGlass"] = "minecraft:hard_white_stained_glass";
      MinecraftBlockTypes2["HardWhiteStainedGlassPane"] = "minecraft:hard_white_stained_glass_pane";
      MinecraftBlockTypes2["HardYellowStainedGlass"] = "minecraft:hard_yellow_stained_glass";
      MinecraftBlockTypes2["HardYellowStainedGlassPane"] = "minecraft:hard_yellow_stained_glass_pane";
      MinecraftBlockTypes2["HardenedClay"] = "minecraft:hardened_clay";
      MinecraftBlockTypes2["HayBlock"] = "minecraft:hay_block";
      MinecraftBlockTypes2["HeavyCore"] = "minecraft:heavy_core";
      MinecraftBlockTypes2["HeavyWeightedPressurePlate"] = "minecraft:heavy_weighted_pressure_plate";
      MinecraftBlockTypes2["HoneyBlock"] = "minecraft:honey_block";
      MinecraftBlockTypes2["HoneycombBlock"] = "minecraft:honeycomb_block";
      MinecraftBlockTypes2["Hopper"] = "minecraft:hopper";
      MinecraftBlockTypes2["HornCoral"] = "minecraft:horn_coral";
      MinecraftBlockTypes2["HornCoralBlock"] = "minecraft:horn_coral_block";
      MinecraftBlockTypes2["HornCoralFan"] = "minecraft:horn_coral_fan";
      MinecraftBlockTypes2["HornCoralWallFan"] = "minecraft:horn_coral_wall_fan";
      MinecraftBlockTypes2["Ice"] = "minecraft:ice";
      MinecraftBlockTypes2["InfestedChiseledStoneBricks"] = "minecraft:infested_chiseled_stone_bricks";
      MinecraftBlockTypes2["InfestedCobblestone"] = "minecraft:infested_cobblestone";
      MinecraftBlockTypes2["InfestedCrackedStoneBricks"] = "minecraft:infested_cracked_stone_bricks";
      MinecraftBlockTypes2["InfestedDeepslate"] = "minecraft:infested_deepslate";
      MinecraftBlockTypes2["InfestedMossyStoneBricks"] = "minecraft:infested_mossy_stone_bricks";
      MinecraftBlockTypes2["InfestedStone"] = "minecraft:infested_stone";
      MinecraftBlockTypes2["InfestedStoneBricks"] = "minecraft:infested_stone_bricks";
      MinecraftBlockTypes2["IronBars"] = "minecraft:iron_bars";
      MinecraftBlockTypes2["IronBlock"] = "minecraft:iron_block";
      MinecraftBlockTypes2["IronChain"] = "minecraft:iron_chain";
      MinecraftBlockTypes2["IronDoor"] = "minecraft:iron_door";
      MinecraftBlockTypes2["IronOre"] = "minecraft:iron_ore";
      MinecraftBlockTypes2["IronTrapdoor"] = "minecraft:iron_trapdoor";
      MinecraftBlockTypes2["Jigsaw"] = "minecraft:jigsaw";
      MinecraftBlockTypes2["Jukebox"] = "minecraft:jukebox";
      MinecraftBlockTypes2["JungleButton"] = "minecraft:jungle_button";
      MinecraftBlockTypes2["JungleDoor"] = "minecraft:jungle_door";
      MinecraftBlockTypes2["JungleDoubleSlab"] = "minecraft:jungle_double_slab";
      MinecraftBlockTypes2["JungleFence"] = "minecraft:jungle_fence";
      MinecraftBlockTypes2["JungleFenceGate"] = "minecraft:jungle_fence_gate";
      MinecraftBlockTypes2["JungleHangingSign"] = "minecraft:jungle_hanging_sign";
      MinecraftBlockTypes2["JungleLeaves"] = "minecraft:jungle_leaves";
      MinecraftBlockTypes2["JungleLog"] = "minecraft:jungle_log";
      MinecraftBlockTypes2["JunglePlanks"] = "minecraft:jungle_planks";
      MinecraftBlockTypes2["JunglePressurePlate"] = "minecraft:jungle_pressure_plate";
      MinecraftBlockTypes2["JungleSapling"] = "minecraft:jungle_sapling";
      MinecraftBlockTypes2["JungleShelf"] = "minecraft:jungle_shelf";
      MinecraftBlockTypes2["JungleSlab"] = "minecraft:jungle_slab";
      MinecraftBlockTypes2["JungleStairs"] = "minecraft:jungle_stairs";
      MinecraftBlockTypes2["JungleStandingSign"] = "minecraft:jungle_standing_sign";
      MinecraftBlockTypes2["JungleTrapdoor"] = "minecraft:jungle_trapdoor";
      MinecraftBlockTypes2["JungleWallSign"] = "minecraft:jungle_wall_sign";
      MinecraftBlockTypes2["JungleWood"] = "minecraft:jungle_wood";
      MinecraftBlockTypes2["Kelp"] = "minecraft:kelp";
      MinecraftBlockTypes2["LabTable"] = "minecraft:lab_table";
      MinecraftBlockTypes2["Ladder"] = "minecraft:ladder";
      MinecraftBlockTypes2["Lantern"] = "minecraft:lantern";
      MinecraftBlockTypes2["LapisBlock"] = "minecraft:lapis_block";
      MinecraftBlockTypes2["LapisOre"] = "minecraft:lapis_ore";
      MinecraftBlockTypes2["LargeAmethystBud"] = "minecraft:large_amethyst_bud";
      MinecraftBlockTypes2["LargeFern"] = "minecraft:large_fern";
      MinecraftBlockTypes2["Lava"] = "minecraft:lava";
      MinecraftBlockTypes2["LeafLitter"] = "minecraft:leaf_litter";
      MinecraftBlockTypes2["Lectern"] = "minecraft:lectern";
      MinecraftBlockTypes2["Lever"] = "minecraft:lever";
      MinecraftBlockTypes2["LightBlock0"] = "minecraft:light_block_0";
      MinecraftBlockTypes2["LightBlock1"] = "minecraft:light_block_1";
      MinecraftBlockTypes2["LightBlock10"] = "minecraft:light_block_10";
      MinecraftBlockTypes2["LightBlock11"] = "minecraft:light_block_11";
      MinecraftBlockTypes2["LightBlock12"] = "minecraft:light_block_12";
      MinecraftBlockTypes2["LightBlock13"] = "minecraft:light_block_13";
      MinecraftBlockTypes2["LightBlock14"] = "minecraft:light_block_14";
      MinecraftBlockTypes2["LightBlock15"] = "minecraft:light_block_15";
      MinecraftBlockTypes2["LightBlock2"] = "minecraft:light_block_2";
      MinecraftBlockTypes2["LightBlock3"] = "minecraft:light_block_3";
      MinecraftBlockTypes2["LightBlock4"] = "minecraft:light_block_4";
      MinecraftBlockTypes2["LightBlock5"] = "minecraft:light_block_5";
      MinecraftBlockTypes2["LightBlock6"] = "minecraft:light_block_6";
      MinecraftBlockTypes2["LightBlock7"] = "minecraft:light_block_7";
      MinecraftBlockTypes2["LightBlock8"] = "minecraft:light_block_8";
      MinecraftBlockTypes2["LightBlock9"] = "minecraft:light_block_9";
      MinecraftBlockTypes2["LightBlueCandle"] = "minecraft:light_blue_candle";
      MinecraftBlockTypes2["LightBlueCandleCake"] = "minecraft:light_blue_candle_cake";
      MinecraftBlockTypes2["LightBlueCarpet"] = "minecraft:light_blue_carpet";
      MinecraftBlockTypes2["LightBlueConcrete"] = "minecraft:light_blue_concrete";
      MinecraftBlockTypes2["LightBlueConcretePowder"] = "minecraft:light_blue_concrete_powder";
      MinecraftBlockTypes2["LightBlueGlazedTerracotta"] = "minecraft:light_blue_glazed_terracotta";
      MinecraftBlockTypes2["LightBlueShulkerBox"] = "minecraft:light_blue_shulker_box";
      MinecraftBlockTypes2["LightBlueStainedGlass"] = "minecraft:light_blue_stained_glass";
      MinecraftBlockTypes2["LightBlueStainedGlassPane"] = "minecraft:light_blue_stained_glass_pane";
      MinecraftBlockTypes2["LightBlueTerracotta"] = "minecraft:light_blue_terracotta";
      MinecraftBlockTypes2["LightBlueWool"] = "minecraft:light_blue_wool";
      MinecraftBlockTypes2["LightGrayCandle"] = "minecraft:light_gray_candle";
      MinecraftBlockTypes2["LightGrayCandleCake"] = "minecraft:light_gray_candle_cake";
      MinecraftBlockTypes2["LightGrayCarpet"] = "minecraft:light_gray_carpet";
      MinecraftBlockTypes2["LightGrayConcrete"] = "minecraft:light_gray_concrete";
      MinecraftBlockTypes2["LightGrayConcretePowder"] = "minecraft:light_gray_concrete_powder";
      MinecraftBlockTypes2["LightGrayShulkerBox"] = "minecraft:light_gray_shulker_box";
      MinecraftBlockTypes2["LightGrayStainedGlass"] = "minecraft:light_gray_stained_glass";
      MinecraftBlockTypes2["LightGrayStainedGlassPane"] = "minecraft:light_gray_stained_glass_pane";
      MinecraftBlockTypes2["LightGrayTerracotta"] = "minecraft:light_gray_terracotta";
      MinecraftBlockTypes2["LightGrayWool"] = "minecraft:light_gray_wool";
      MinecraftBlockTypes2["LightWeightedPressurePlate"] = "minecraft:light_weighted_pressure_plate";
      MinecraftBlockTypes2["LightningRod"] = "minecraft:lightning_rod";
      MinecraftBlockTypes2["Lilac"] = "minecraft:lilac";
      MinecraftBlockTypes2["LilyOfTheValley"] = "minecraft:lily_of_the_valley";
      MinecraftBlockTypes2["LimeCandle"] = "minecraft:lime_candle";
      MinecraftBlockTypes2["LimeCandleCake"] = "minecraft:lime_candle_cake";
      MinecraftBlockTypes2["LimeCarpet"] = "minecraft:lime_carpet";
      MinecraftBlockTypes2["LimeConcrete"] = "minecraft:lime_concrete";
      MinecraftBlockTypes2["LimeConcretePowder"] = "minecraft:lime_concrete_powder";
      MinecraftBlockTypes2["LimeGlazedTerracotta"] = "minecraft:lime_glazed_terracotta";
      MinecraftBlockTypes2["LimeShulkerBox"] = "minecraft:lime_shulker_box";
      MinecraftBlockTypes2["LimeStainedGlass"] = "minecraft:lime_stained_glass";
      MinecraftBlockTypes2["LimeStainedGlassPane"] = "minecraft:lime_stained_glass_pane";
      MinecraftBlockTypes2["LimeTerracotta"] = "minecraft:lime_terracotta";
      MinecraftBlockTypes2["LimeWool"] = "minecraft:lime_wool";
      MinecraftBlockTypes2["LitBlastFurnace"] = "minecraft:lit_blast_furnace";
      MinecraftBlockTypes2["LitDeepslateRedstoneOre"] = "minecraft:lit_deepslate_redstone_ore";
      MinecraftBlockTypes2["LitFurnace"] = "minecraft:lit_furnace";
      MinecraftBlockTypes2["LitPumpkin"] = "minecraft:lit_pumpkin";
      MinecraftBlockTypes2["LitRedstoneLamp"] = "minecraft:lit_redstone_lamp";
      MinecraftBlockTypes2["LitRedstoneOre"] = "minecraft:lit_redstone_ore";
      MinecraftBlockTypes2["LitSmoker"] = "minecraft:lit_smoker";
      MinecraftBlockTypes2["Lodestone"] = "minecraft:lodestone";
      MinecraftBlockTypes2["Loom"] = "minecraft:loom";
      MinecraftBlockTypes2["MagentaCandle"] = "minecraft:magenta_candle";
      MinecraftBlockTypes2["MagentaCandleCake"] = "minecraft:magenta_candle_cake";
      MinecraftBlockTypes2["MagentaCarpet"] = "minecraft:magenta_carpet";
      MinecraftBlockTypes2["MagentaConcrete"] = "minecraft:magenta_concrete";
      MinecraftBlockTypes2["MagentaConcretePowder"] = "minecraft:magenta_concrete_powder";
      MinecraftBlockTypes2["MagentaGlazedTerracotta"] = "minecraft:magenta_glazed_terracotta";
      MinecraftBlockTypes2["MagentaShulkerBox"] = "minecraft:magenta_shulker_box";
      MinecraftBlockTypes2["MagentaStainedGlass"] = "minecraft:magenta_stained_glass";
      MinecraftBlockTypes2["MagentaStainedGlassPane"] = "minecraft:magenta_stained_glass_pane";
      MinecraftBlockTypes2["MagentaTerracotta"] = "minecraft:magenta_terracotta";
      MinecraftBlockTypes2["MagentaWool"] = "minecraft:magenta_wool";
      MinecraftBlockTypes2["Magma"] = "minecraft:magma";
      MinecraftBlockTypes2["MangroveButton"] = "minecraft:mangrove_button";
      MinecraftBlockTypes2["MangroveDoor"] = "minecraft:mangrove_door";
      MinecraftBlockTypes2["MangroveDoubleSlab"] = "minecraft:mangrove_double_slab";
      MinecraftBlockTypes2["MangroveFence"] = "minecraft:mangrove_fence";
      MinecraftBlockTypes2["MangroveFenceGate"] = "minecraft:mangrove_fence_gate";
      MinecraftBlockTypes2["MangroveHangingSign"] = "minecraft:mangrove_hanging_sign";
      MinecraftBlockTypes2["MangroveLeaves"] = "minecraft:mangrove_leaves";
      MinecraftBlockTypes2["MangroveLog"] = "minecraft:mangrove_log";
      MinecraftBlockTypes2["MangrovePlanks"] = "minecraft:mangrove_planks";
      MinecraftBlockTypes2["MangrovePressurePlate"] = "minecraft:mangrove_pressure_plate";
      MinecraftBlockTypes2["MangrovePropagule"] = "minecraft:mangrove_propagule";
      MinecraftBlockTypes2["MangroveRoots"] = "minecraft:mangrove_roots";
      MinecraftBlockTypes2["MangroveShelf"] = "minecraft:mangrove_shelf";
      MinecraftBlockTypes2["MangroveSlab"] = "minecraft:mangrove_slab";
      MinecraftBlockTypes2["MangroveStairs"] = "minecraft:mangrove_stairs";
      MinecraftBlockTypes2["MangroveStandingSign"] = "minecraft:mangrove_standing_sign";
      MinecraftBlockTypes2["MangroveTrapdoor"] = "minecraft:mangrove_trapdoor";
      MinecraftBlockTypes2["MangroveWallSign"] = "minecraft:mangrove_wall_sign";
      MinecraftBlockTypes2["MangroveWood"] = "minecraft:mangrove_wood";
      MinecraftBlockTypes2["MaterialReducer"] = "minecraft:material_reducer";
      MinecraftBlockTypes2["MediumAmethystBud"] = "minecraft:medium_amethyst_bud";
      MinecraftBlockTypes2["MelonBlock"] = "minecraft:melon_block";
      MinecraftBlockTypes2["MelonStem"] = "minecraft:melon_stem";
      MinecraftBlockTypes2["MobSpawner"] = "minecraft:mob_spawner";
      MinecraftBlockTypes2["MossBlock"] = "minecraft:moss_block";
      MinecraftBlockTypes2["MossCarpet"] = "minecraft:moss_carpet";
      MinecraftBlockTypes2["MossyCobblestone"] = "minecraft:mossy_cobblestone";
      MinecraftBlockTypes2["MossyCobblestoneDoubleSlab"] = "minecraft:mossy_cobblestone_double_slab";
      MinecraftBlockTypes2["MossyCobblestoneSlab"] = "minecraft:mossy_cobblestone_slab";
      MinecraftBlockTypes2["MossyCobblestoneStairs"] = "minecraft:mossy_cobblestone_stairs";
      MinecraftBlockTypes2["MossyCobblestoneWall"] = "minecraft:mossy_cobblestone_wall";
      MinecraftBlockTypes2["MossyStoneBrickDoubleSlab"] = "minecraft:mossy_stone_brick_double_slab";
      MinecraftBlockTypes2["MossyStoneBrickSlab"] = "minecraft:mossy_stone_brick_slab";
      MinecraftBlockTypes2["MossyStoneBrickStairs"] = "minecraft:mossy_stone_brick_stairs";
      MinecraftBlockTypes2["MossyStoneBrickWall"] = "minecraft:mossy_stone_brick_wall";
      MinecraftBlockTypes2["MossyStoneBricks"] = "minecraft:mossy_stone_bricks";
      MinecraftBlockTypes2["Mud"] = "minecraft:mud";
      MinecraftBlockTypes2["MudBrickDoubleSlab"] = "minecraft:mud_brick_double_slab";
      MinecraftBlockTypes2["MudBrickSlab"] = "minecraft:mud_brick_slab";
      MinecraftBlockTypes2["MudBrickStairs"] = "minecraft:mud_brick_stairs";
      MinecraftBlockTypes2["MudBrickWall"] = "minecraft:mud_brick_wall";
      MinecraftBlockTypes2["MudBricks"] = "minecraft:mud_bricks";
      MinecraftBlockTypes2["MuddyMangroveRoots"] = "minecraft:muddy_mangrove_roots";
      MinecraftBlockTypes2["MushroomStem"] = "minecraft:mushroom_stem";
      MinecraftBlockTypes2["Mycelium"] = "minecraft:mycelium";
      MinecraftBlockTypes2["NetherBrick"] = "minecraft:nether_brick";
      MinecraftBlockTypes2["NetherBrickDoubleSlab"] = "minecraft:nether_brick_double_slab";
      MinecraftBlockTypes2["NetherBrickFence"] = "minecraft:nether_brick_fence";
      MinecraftBlockTypes2["NetherBrickSlab"] = "minecraft:nether_brick_slab";
      MinecraftBlockTypes2["NetherBrickStairs"] = "minecraft:nether_brick_stairs";
      MinecraftBlockTypes2["NetherBrickWall"] = "minecraft:nether_brick_wall";
      MinecraftBlockTypes2["NetherGoldOre"] = "minecraft:nether_gold_ore";
      MinecraftBlockTypes2["NetherSprouts"] = "minecraft:nether_sprouts";
      MinecraftBlockTypes2["NetherWart"] = "minecraft:nether_wart";
      MinecraftBlockTypes2["NetherWartBlock"] = "minecraft:nether_wart_block";
      MinecraftBlockTypes2["NetheriteBlock"] = "minecraft:netherite_block";
      MinecraftBlockTypes2["Netherrack"] = "minecraft:netherrack";
      MinecraftBlockTypes2["NormalStoneDoubleSlab"] = "minecraft:normal_stone_double_slab";
      MinecraftBlockTypes2["NormalStoneSlab"] = "minecraft:normal_stone_slab";
      MinecraftBlockTypes2["NormalStoneStairs"] = "minecraft:normal_stone_stairs";
      MinecraftBlockTypes2["Noteblock"] = "minecraft:noteblock";
      MinecraftBlockTypes2["OakDoubleSlab"] = "minecraft:oak_double_slab";
      MinecraftBlockTypes2["OakFence"] = "minecraft:oak_fence";
      MinecraftBlockTypes2["OakHangingSign"] = "minecraft:oak_hanging_sign";
      MinecraftBlockTypes2["OakLeaves"] = "minecraft:oak_leaves";
      MinecraftBlockTypes2["OakLog"] = "minecraft:oak_log";
      MinecraftBlockTypes2["OakPlanks"] = "minecraft:oak_planks";
      MinecraftBlockTypes2["OakSapling"] = "minecraft:oak_sapling";
      MinecraftBlockTypes2["OakShelf"] = "minecraft:oak_shelf";
      MinecraftBlockTypes2["OakSlab"] = "minecraft:oak_slab";
      MinecraftBlockTypes2["OakStairs"] = "minecraft:oak_stairs";
      MinecraftBlockTypes2["OakWood"] = "minecraft:oak_wood";
      MinecraftBlockTypes2["Observer"] = "minecraft:observer";
      MinecraftBlockTypes2["Obsidian"] = "minecraft:obsidian";
      MinecraftBlockTypes2["OchreFroglight"] = "minecraft:ochre_froglight";
      MinecraftBlockTypes2["OpenEyeblossom"] = "minecraft:open_eyeblossom";
      MinecraftBlockTypes2["OrangeCandle"] = "minecraft:orange_candle";
      MinecraftBlockTypes2["OrangeCandleCake"] = "minecraft:orange_candle_cake";
      MinecraftBlockTypes2["OrangeCarpet"] = "minecraft:orange_carpet";
      MinecraftBlockTypes2["OrangeConcrete"] = "minecraft:orange_concrete";
      MinecraftBlockTypes2["OrangeConcretePowder"] = "minecraft:orange_concrete_powder";
      MinecraftBlockTypes2["OrangeGlazedTerracotta"] = "minecraft:orange_glazed_terracotta";
      MinecraftBlockTypes2["OrangeShulkerBox"] = "minecraft:orange_shulker_box";
      MinecraftBlockTypes2["OrangeStainedGlass"] = "minecraft:orange_stained_glass";
      MinecraftBlockTypes2["OrangeStainedGlassPane"] = "minecraft:orange_stained_glass_pane";
      MinecraftBlockTypes2["OrangeTerracotta"] = "minecraft:orange_terracotta";
      MinecraftBlockTypes2["OrangeTulip"] = "minecraft:orange_tulip";
      MinecraftBlockTypes2["OrangeWool"] = "minecraft:orange_wool";
      MinecraftBlockTypes2["OxeyeDaisy"] = "minecraft:oxeye_daisy";
      MinecraftBlockTypes2["OxidizedChiseledCopper"] = "minecraft:oxidized_chiseled_copper";
      MinecraftBlockTypes2["OxidizedCopper"] = "minecraft:oxidized_copper";
      MinecraftBlockTypes2["OxidizedCopperBars"] = "minecraft:oxidized_copper_bars";
      MinecraftBlockTypes2["OxidizedCopperBulb"] = "minecraft:oxidized_copper_bulb";
      MinecraftBlockTypes2["OxidizedCopperChain"] = "minecraft:oxidized_copper_chain";
      MinecraftBlockTypes2["OxidizedCopperChest"] = "minecraft:oxidized_copper_chest";
      MinecraftBlockTypes2["OxidizedCopperDoor"] = "minecraft:oxidized_copper_door";
      MinecraftBlockTypes2["OxidizedCopperGolemStatue"] = "minecraft:oxidized_copper_golem_statue";
      MinecraftBlockTypes2["OxidizedCopperGrate"] = "minecraft:oxidized_copper_grate";
      MinecraftBlockTypes2["OxidizedCopperLantern"] = "minecraft:oxidized_copper_lantern";
      MinecraftBlockTypes2["OxidizedCopperTrapdoor"] = "minecraft:oxidized_copper_trapdoor";
      MinecraftBlockTypes2["OxidizedCutCopper"] = "minecraft:oxidized_cut_copper";
      MinecraftBlockTypes2["OxidizedCutCopperSlab"] = "minecraft:oxidized_cut_copper_slab";
      MinecraftBlockTypes2["OxidizedCutCopperStairs"] = "minecraft:oxidized_cut_copper_stairs";
      MinecraftBlockTypes2["OxidizedDoubleCutCopperSlab"] = "minecraft:oxidized_double_cut_copper_slab";
      MinecraftBlockTypes2["OxidizedLightningRod"] = "minecraft:oxidized_lightning_rod";
      MinecraftBlockTypes2["PackedIce"] = "minecraft:packed_ice";
      MinecraftBlockTypes2["PackedMud"] = "minecraft:packed_mud";
      MinecraftBlockTypes2["PaleHangingMoss"] = "minecraft:pale_hanging_moss";
      MinecraftBlockTypes2["PaleMossBlock"] = "minecraft:pale_moss_block";
      MinecraftBlockTypes2["PaleMossCarpet"] = "minecraft:pale_moss_carpet";
      MinecraftBlockTypes2["PaleOakButton"] = "minecraft:pale_oak_button";
      MinecraftBlockTypes2["PaleOakDoor"] = "minecraft:pale_oak_door";
      MinecraftBlockTypes2["PaleOakDoubleSlab"] = "minecraft:pale_oak_double_slab";
      MinecraftBlockTypes2["PaleOakFence"] = "minecraft:pale_oak_fence";
      MinecraftBlockTypes2["PaleOakFenceGate"] = "minecraft:pale_oak_fence_gate";
      MinecraftBlockTypes2["PaleOakHangingSign"] = "minecraft:pale_oak_hanging_sign";
      MinecraftBlockTypes2["PaleOakLeaves"] = "minecraft:pale_oak_leaves";
      MinecraftBlockTypes2["PaleOakLog"] = "minecraft:pale_oak_log";
      MinecraftBlockTypes2["PaleOakPlanks"] = "minecraft:pale_oak_planks";
      MinecraftBlockTypes2["PaleOakPressurePlate"] = "minecraft:pale_oak_pressure_plate";
      MinecraftBlockTypes2["PaleOakSapling"] = "minecraft:pale_oak_sapling";
      MinecraftBlockTypes2["PaleOakShelf"] = "minecraft:pale_oak_shelf";
      MinecraftBlockTypes2["PaleOakSlab"] = "minecraft:pale_oak_slab";
      MinecraftBlockTypes2["PaleOakStairs"] = "minecraft:pale_oak_stairs";
      MinecraftBlockTypes2["PaleOakStandingSign"] = "minecraft:pale_oak_standing_sign";
      MinecraftBlockTypes2["PaleOakTrapdoor"] = "minecraft:pale_oak_trapdoor";
      MinecraftBlockTypes2["PaleOakWallSign"] = "minecraft:pale_oak_wall_sign";
      MinecraftBlockTypes2["PaleOakWood"] = "minecraft:pale_oak_wood";
      MinecraftBlockTypes2["PearlescentFroglight"] = "minecraft:pearlescent_froglight";
      MinecraftBlockTypes2["Peony"] = "minecraft:peony";
      MinecraftBlockTypes2["PetrifiedOakDoubleSlab"] = "minecraft:petrified_oak_double_slab";
      MinecraftBlockTypes2["PetrifiedOakSlab"] = "minecraft:petrified_oak_slab";
      MinecraftBlockTypes2["PiglinHead"] = "minecraft:piglin_head";
      MinecraftBlockTypes2["PinkCandle"] = "minecraft:pink_candle";
      MinecraftBlockTypes2["PinkCandleCake"] = "minecraft:pink_candle_cake";
      MinecraftBlockTypes2["PinkCarpet"] = "minecraft:pink_carpet";
      MinecraftBlockTypes2["PinkConcrete"] = "minecraft:pink_concrete";
      MinecraftBlockTypes2["PinkConcretePowder"] = "minecraft:pink_concrete_powder";
      MinecraftBlockTypes2["PinkGlazedTerracotta"] = "minecraft:pink_glazed_terracotta";
      MinecraftBlockTypes2["PinkPetals"] = "minecraft:pink_petals";
      MinecraftBlockTypes2["PinkShulkerBox"] = "minecraft:pink_shulker_box";
      MinecraftBlockTypes2["PinkStainedGlass"] = "minecraft:pink_stained_glass";
      MinecraftBlockTypes2["PinkStainedGlassPane"] = "minecraft:pink_stained_glass_pane";
      MinecraftBlockTypes2["PinkTerracotta"] = "minecraft:pink_terracotta";
      MinecraftBlockTypes2["PinkTulip"] = "minecraft:pink_tulip";
      MinecraftBlockTypes2["PinkWool"] = "minecraft:pink_wool";
      MinecraftBlockTypes2["Piston"] = "minecraft:piston";
      MinecraftBlockTypes2["PistonArmCollision"] = "minecraft:piston_arm_collision";
      MinecraftBlockTypes2["PitcherCrop"] = "minecraft:pitcher_crop";
      MinecraftBlockTypes2["PitcherPlant"] = "minecraft:pitcher_plant";
      MinecraftBlockTypes2["PlayerHead"] = "minecraft:player_head";
      MinecraftBlockTypes2["Podzol"] = "minecraft:podzol";
      MinecraftBlockTypes2["PointedDripstone"] = "minecraft:pointed_dripstone";
      MinecraftBlockTypes2["PolishedAndesite"] = "minecraft:polished_andesite";
      MinecraftBlockTypes2["PolishedAndesiteDoubleSlab"] = "minecraft:polished_andesite_double_slab";
      MinecraftBlockTypes2["PolishedAndesiteSlab"] = "minecraft:polished_andesite_slab";
      MinecraftBlockTypes2["PolishedAndesiteStairs"] = "minecraft:polished_andesite_stairs";
      MinecraftBlockTypes2["PolishedBasalt"] = "minecraft:polished_basalt";
      MinecraftBlockTypes2["PolishedBlackstone"] = "minecraft:polished_blackstone";
      MinecraftBlockTypes2["PolishedBlackstoneBrickDoubleSlab"] = "minecraft:polished_blackstone_brick_double_slab";
      MinecraftBlockTypes2["PolishedBlackstoneBrickSlab"] = "minecraft:polished_blackstone_brick_slab";
      MinecraftBlockTypes2["PolishedBlackstoneBrickStairs"] = "minecraft:polished_blackstone_brick_stairs";
      MinecraftBlockTypes2["PolishedBlackstoneBrickWall"] = "minecraft:polished_blackstone_brick_wall";
      MinecraftBlockTypes2["PolishedBlackstoneBricks"] = "minecraft:polished_blackstone_bricks";
      MinecraftBlockTypes2["PolishedBlackstoneButton"] = "minecraft:polished_blackstone_button";
      MinecraftBlockTypes2["PolishedBlackstoneDoubleSlab"] = "minecraft:polished_blackstone_double_slab";
      MinecraftBlockTypes2["PolishedBlackstonePressurePlate"] = "minecraft:polished_blackstone_pressure_plate";
      MinecraftBlockTypes2["PolishedBlackstoneSlab"] = "minecraft:polished_blackstone_slab";
      MinecraftBlockTypes2["PolishedBlackstoneStairs"] = "minecraft:polished_blackstone_stairs";
      MinecraftBlockTypes2["PolishedBlackstoneWall"] = "minecraft:polished_blackstone_wall";
      MinecraftBlockTypes2["PolishedDeepslate"] = "minecraft:polished_deepslate";
      MinecraftBlockTypes2["PolishedDeepslateDoubleSlab"] = "minecraft:polished_deepslate_double_slab";
      MinecraftBlockTypes2["PolishedDeepslateSlab"] = "minecraft:polished_deepslate_slab";
      MinecraftBlockTypes2["PolishedDeepslateStairs"] = "minecraft:polished_deepslate_stairs";
      MinecraftBlockTypes2["PolishedDeepslateWall"] = "minecraft:polished_deepslate_wall";
      MinecraftBlockTypes2["PolishedDiorite"] = "minecraft:polished_diorite";
      MinecraftBlockTypes2["PolishedDioriteDoubleSlab"] = "minecraft:polished_diorite_double_slab";
      MinecraftBlockTypes2["PolishedDioriteSlab"] = "minecraft:polished_diorite_slab";
      MinecraftBlockTypes2["PolishedDioriteStairs"] = "minecraft:polished_diorite_stairs";
      MinecraftBlockTypes2["PolishedGranite"] = "minecraft:polished_granite";
      MinecraftBlockTypes2["PolishedGraniteDoubleSlab"] = "minecraft:polished_granite_double_slab";
      MinecraftBlockTypes2["PolishedGraniteSlab"] = "minecraft:polished_granite_slab";
      MinecraftBlockTypes2["PolishedGraniteStairs"] = "minecraft:polished_granite_stairs";
      MinecraftBlockTypes2["PolishedTuff"] = "minecraft:polished_tuff";
      MinecraftBlockTypes2["PolishedTuffDoubleSlab"] = "minecraft:polished_tuff_double_slab";
      MinecraftBlockTypes2["PolishedTuffSlab"] = "minecraft:polished_tuff_slab";
      MinecraftBlockTypes2["PolishedTuffStairs"] = "minecraft:polished_tuff_stairs";
      MinecraftBlockTypes2["PolishedTuffWall"] = "minecraft:polished_tuff_wall";
      MinecraftBlockTypes2["Poppy"] = "minecraft:poppy";
      MinecraftBlockTypes2["Portal"] = "minecraft:portal";
      MinecraftBlockTypes2["Potatoes"] = "minecraft:potatoes";
      MinecraftBlockTypes2["PowderSnow"] = "minecraft:powder_snow";
      MinecraftBlockTypes2["PoweredComparator"] = "minecraft:powered_comparator";
      MinecraftBlockTypes2["PoweredRepeater"] = "minecraft:powered_repeater";
      MinecraftBlockTypes2["Prismarine"] = "minecraft:prismarine";
      MinecraftBlockTypes2["PrismarineBrickDoubleSlab"] = "minecraft:prismarine_brick_double_slab";
      MinecraftBlockTypes2["PrismarineBrickSlab"] = "minecraft:prismarine_brick_slab";
      MinecraftBlockTypes2["PrismarineBricks"] = "minecraft:prismarine_bricks";
      MinecraftBlockTypes2["PrismarineBricksStairs"] = "minecraft:prismarine_bricks_stairs";
      MinecraftBlockTypes2["PrismarineDoubleSlab"] = "minecraft:prismarine_double_slab";
      MinecraftBlockTypes2["PrismarineSlab"] = "minecraft:prismarine_slab";
      MinecraftBlockTypes2["PrismarineStairs"] = "minecraft:prismarine_stairs";
      MinecraftBlockTypes2["PrismarineWall"] = "minecraft:prismarine_wall";
      MinecraftBlockTypes2["Pumpkin"] = "minecraft:pumpkin";
      MinecraftBlockTypes2["PumpkinStem"] = "minecraft:pumpkin_stem";
      MinecraftBlockTypes2["PurpleCandle"] = "minecraft:purple_candle";
      MinecraftBlockTypes2["PurpleCandleCake"] = "minecraft:purple_candle_cake";
      MinecraftBlockTypes2["PurpleCarpet"] = "minecraft:purple_carpet";
      MinecraftBlockTypes2["PurpleConcrete"] = "minecraft:purple_concrete";
      MinecraftBlockTypes2["PurpleConcretePowder"] = "minecraft:purple_concrete_powder";
      MinecraftBlockTypes2["PurpleGlazedTerracotta"] = "minecraft:purple_glazed_terracotta";
      MinecraftBlockTypes2["PurpleShulkerBox"] = "minecraft:purple_shulker_box";
      MinecraftBlockTypes2["PurpleStainedGlass"] = "minecraft:purple_stained_glass";
      MinecraftBlockTypes2["PurpleStainedGlassPane"] = "minecraft:purple_stained_glass_pane";
      MinecraftBlockTypes2["PurpleTerracotta"] = "minecraft:purple_terracotta";
      MinecraftBlockTypes2["PurpleWool"] = "minecraft:purple_wool";
      MinecraftBlockTypes2["PurpurBlock"] = "minecraft:purpur_block";
      MinecraftBlockTypes2["PurpurDoubleSlab"] = "minecraft:purpur_double_slab";
      MinecraftBlockTypes2["PurpurPillar"] = "minecraft:purpur_pillar";
      MinecraftBlockTypes2["PurpurSlab"] = "minecraft:purpur_slab";
      MinecraftBlockTypes2["PurpurStairs"] = "minecraft:purpur_stairs";
      MinecraftBlockTypes2["QuartzBlock"] = "minecraft:quartz_block";
      MinecraftBlockTypes2["QuartzBricks"] = "minecraft:quartz_bricks";
      MinecraftBlockTypes2["QuartzDoubleSlab"] = "minecraft:quartz_double_slab";
      MinecraftBlockTypes2["QuartzOre"] = "minecraft:quartz_ore";
      MinecraftBlockTypes2["QuartzPillar"] = "minecraft:quartz_pillar";
      MinecraftBlockTypes2["QuartzSlab"] = "minecraft:quartz_slab";
      MinecraftBlockTypes2["QuartzStairs"] = "minecraft:quartz_stairs";
      MinecraftBlockTypes2["Rail"] = "minecraft:rail";
      MinecraftBlockTypes2["RawCopperBlock"] = "minecraft:raw_copper_block";
      MinecraftBlockTypes2["RawGoldBlock"] = "minecraft:raw_gold_block";
      MinecraftBlockTypes2["RawIronBlock"] = "minecraft:raw_iron_block";
      MinecraftBlockTypes2["RedCandle"] = "minecraft:red_candle";
      MinecraftBlockTypes2["RedCandleCake"] = "minecraft:red_candle_cake";
      MinecraftBlockTypes2["RedCarpet"] = "minecraft:red_carpet";
      MinecraftBlockTypes2["RedConcrete"] = "minecraft:red_concrete";
      MinecraftBlockTypes2["RedConcretePowder"] = "minecraft:red_concrete_powder";
      MinecraftBlockTypes2["RedGlazedTerracotta"] = "minecraft:red_glazed_terracotta";
      MinecraftBlockTypes2["RedMushroom"] = "minecraft:red_mushroom";
      MinecraftBlockTypes2["RedMushroomBlock"] = "minecraft:red_mushroom_block";
      MinecraftBlockTypes2["RedNetherBrick"] = "minecraft:red_nether_brick";
      MinecraftBlockTypes2["RedNetherBrickDoubleSlab"] = "minecraft:red_nether_brick_double_slab";
      MinecraftBlockTypes2["RedNetherBrickSlab"] = "minecraft:red_nether_brick_slab";
      MinecraftBlockTypes2["RedNetherBrickStairs"] = "minecraft:red_nether_brick_stairs";
      MinecraftBlockTypes2["RedNetherBrickWall"] = "minecraft:red_nether_brick_wall";
      MinecraftBlockTypes2["RedSand"] = "minecraft:red_sand";
      MinecraftBlockTypes2["RedSandstone"] = "minecraft:red_sandstone";
      MinecraftBlockTypes2["RedSandstoneDoubleSlab"] = "minecraft:red_sandstone_double_slab";
      MinecraftBlockTypes2["RedSandstoneSlab"] = "minecraft:red_sandstone_slab";
      MinecraftBlockTypes2["RedSandstoneStairs"] = "minecraft:red_sandstone_stairs";
      MinecraftBlockTypes2["RedSandstoneWall"] = "minecraft:red_sandstone_wall";
      MinecraftBlockTypes2["RedShulkerBox"] = "minecraft:red_shulker_box";
      MinecraftBlockTypes2["RedStainedGlass"] = "minecraft:red_stained_glass";
      MinecraftBlockTypes2["RedStainedGlassPane"] = "minecraft:red_stained_glass_pane";
      MinecraftBlockTypes2["RedTerracotta"] = "minecraft:red_terracotta";
      MinecraftBlockTypes2["RedTulip"] = "minecraft:red_tulip";
      MinecraftBlockTypes2["RedWool"] = "minecraft:red_wool";
      MinecraftBlockTypes2["RedstoneBlock"] = "minecraft:redstone_block";
      MinecraftBlockTypes2["RedstoneLamp"] = "minecraft:redstone_lamp";
      MinecraftBlockTypes2["RedstoneOre"] = "minecraft:redstone_ore";
      MinecraftBlockTypes2["RedstoneTorch"] = "minecraft:redstone_torch";
      MinecraftBlockTypes2["RedstoneWire"] = "minecraft:redstone_wire";
      MinecraftBlockTypes2["Reeds"] = "minecraft:reeds";
      MinecraftBlockTypes2["ReinforcedDeepslate"] = "minecraft:reinforced_deepslate";
      MinecraftBlockTypes2["RepeatingCommandBlock"] = "minecraft:repeating_command_block";
      MinecraftBlockTypes2["ResinBlock"] = "minecraft:resin_block";
      MinecraftBlockTypes2["ResinBrickDoubleSlab"] = "minecraft:resin_brick_double_slab";
      MinecraftBlockTypes2["ResinBrickSlab"] = "minecraft:resin_brick_slab";
      MinecraftBlockTypes2["ResinBrickStairs"] = "minecraft:resin_brick_stairs";
      MinecraftBlockTypes2["ResinBrickWall"] = "minecraft:resin_brick_wall";
      MinecraftBlockTypes2["ResinBricks"] = "minecraft:resin_bricks";
      MinecraftBlockTypes2["ResinClump"] = "minecraft:resin_clump";
      MinecraftBlockTypes2["RespawnAnchor"] = "minecraft:respawn_anchor";
      MinecraftBlockTypes2["RoseBush"] = "minecraft:rose_bush";
      MinecraftBlockTypes2["Sand"] = "minecraft:sand";
      MinecraftBlockTypes2["Sandstone"] = "minecraft:sandstone";
      MinecraftBlockTypes2["SandstoneDoubleSlab"] = "minecraft:sandstone_double_slab";
      MinecraftBlockTypes2["SandstoneSlab"] = "minecraft:sandstone_slab";
      MinecraftBlockTypes2["SandstoneStairs"] = "minecraft:sandstone_stairs";
      MinecraftBlockTypes2["SandstoneWall"] = "minecraft:sandstone_wall";
      MinecraftBlockTypes2["Scaffolding"] = "minecraft:scaffolding";
      MinecraftBlockTypes2["Sculk"] = "minecraft:sculk";
      MinecraftBlockTypes2["SculkCatalyst"] = "minecraft:sculk_catalyst";
      MinecraftBlockTypes2["SculkSensor"] = "minecraft:sculk_sensor";
      MinecraftBlockTypes2["SculkShrieker"] = "minecraft:sculk_shrieker";
      MinecraftBlockTypes2["SculkVein"] = "minecraft:sculk_vein";
      MinecraftBlockTypes2["SeaLantern"] = "minecraft:sea_lantern";
      MinecraftBlockTypes2["SeaPickle"] = "minecraft:sea_pickle";
      MinecraftBlockTypes2["Seagrass"] = "minecraft:seagrass";
      MinecraftBlockTypes2["ShortDryGrass"] = "minecraft:short_dry_grass";
      MinecraftBlockTypes2["ShortGrass"] = "minecraft:short_grass";
      MinecraftBlockTypes2["Shroomlight"] = "minecraft:shroomlight";
      MinecraftBlockTypes2["SilverGlazedTerracotta"] = "minecraft:silver_glazed_terracotta";
      MinecraftBlockTypes2["SkeletonSkull"] = "minecraft:skeleton_skull";
      MinecraftBlockTypes2["Slime"] = "minecraft:slime";
      MinecraftBlockTypes2["SmallAmethystBud"] = "minecraft:small_amethyst_bud";
      MinecraftBlockTypes2["SmallDripleafBlock"] = "minecraft:small_dripleaf_block";
      MinecraftBlockTypes2["SmithingTable"] = "minecraft:smithing_table";
      MinecraftBlockTypes2["Smoker"] = "minecraft:smoker";
      MinecraftBlockTypes2["SmoothBasalt"] = "minecraft:smooth_basalt";
      MinecraftBlockTypes2["SmoothQuartz"] = "minecraft:smooth_quartz";
      MinecraftBlockTypes2["SmoothQuartzDoubleSlab"] = "minecraft:smooth_quartz_double_slab";
      MinecraftBlockTypes2["SmoothQuartzSlab"] = "minecraft:smooth_quartz_slab";
      MinecraftBlockTypes2["SmoothQuartzStairs"] = "minecraft:smooth_quartz_stairs";
      MinecraftBlockTypes2["SmoothRedSandstone"] = "minecraft:smooth_red_sandstone";
      MinecraftBlockTypes2["SmoothRedSandstoneDoubleSlab"] = "minecraft:smooth_red_sandstone_double_slab";
      MinecraftBlockTypes2["SmoothRedSandstoneSlab"] = "minecraft:smooth_red_sandstone_slab";
      MinecraftBlockTypes2["SmoothRedSandstoneStairs"] = "minecraft:smooth_red_sandstone_stairs";
      MinecraftBlockTypes2["SmoothSandstone"] = "minecraft:smooth_sandstone";
      MinecraftBlockTypes2["SmoothSandstoneDoubleSlab"] = "minecraft:smooth_sandstone_double_slab";
      MinecraftBlockTypes2["SmoothSandstoneSlab"] = "minecraft:smooth_sandstone_slab";
      MinecraftBlockTypes2["SmoothSandstoneStairs"] = "minecraft:smooth_sandstone_stairs";
      MinecraftBlockTypes2["SmoothStone"] = "minecraft:smooth_stone";
      MinecraftBlockTypes2["SmoothStoneDoubleSlab"] = "minecraft:smooth_stone_double_slab";
      MinecraftBlockTypes2["SmoothStoneSlab"] = "minecraft:smooth_stone_slab";
      MinecraftBlockTypes2["SnifferEgg"] = "minecraft:sniffer_egg";
      MinecraftBlockTypes2["Snow"] = "minecraft:snow";
      MinecraftBlockTypes2["SnowLayer"] = "minecraft:snow_layer";
      MinecraftBlockTypes2["SoulCampfire"] = "minecraft:soul_campfire";
      MinecraftBlockTypes2["SoulFire"] = "minecraft:soul_fire";
      MinecraftBlockTypes2["SoulLantern"] = "minecraft:soul_lantern";
      MinecraftBlockTypes2["SoulSand"] = "minecraft:soul_sand";
      MinecraftBlockTypes2["SoulSoil"] = "minecraft:soul_soil";
      MinecraftBlockTypes2["SoulTorch"] = "minecraft:soul_torch";
      MinecraftBlockTypes2["Sponge"] = "minecraft:sponge";
      MinecraftBlockTypes2["SporeBlossom"] = "minecraft:spore_blossom";
      MinecraftBlockTypes2["SpruceButton"] = "minecraft:spruce_button";
      MinecraftBlockTypes2["SpruceDoor"] = "minecraft:spruce_door";
      MinecraftBlockTypes2["SpruceDoubleSlab"] = "minecraft:spruce_double_slab";
      MinecraftBlockTypes2["SpruceFence"] = "minecraft:spruce_fence";
      MinecraftBlockTypes2["SpruceFenceGate"] = "minecraft:spruce_fence_gate";
      MinecraftBlockTypes2["SpruceHangingSign"] = "minecraft:spruce_hanging_sign";
      MinecraftBlockTypes2["SpruceLeaves"] = "minecraft:spruce_leaves";
      MinecraftBlockTypes2["SpruceLog"] = "minecraft:spruce_log";
      MinecraftBlockTypes2["SprucePlanks"] = "minecraft:spruce_planks";
      MinecraftBlockTypes2["SprucePressurePlate"] = "minecraft:spruce_pressure_plate";
      MinecraftBlockTypes2["SpruceSapling"] = "minecraft:spruce_sapling";
      MinecraftBlockTypes2["SpruceShelf"] = "minecraft:spruce_shelf";
      MinecraftBlockTypes2["SpruceSlab"] = "minecraft:spruce_slab";
      MinecraftBlockTypes2["SpruceStairs"] = "minecraft:spruce_stairs";
      MinecraftBlockTypes2["SpruceStandingSign"] = "minecraft:spruce_standing_sign";
      MinecraftBlockTypes2["SpruceTrapdoor"] = "minecraft:spruce_trapdoor";
      MinecraftBlockTypes2["SpruceWallSign"] = "minecraft:spruce_wall_sign";
      MinecraftBlockTypes2["SpruceWood"] = "minecraft:spruce_wood";
      MinecraftBlockTypes2["StandingBanner"] = "minecraft:standing_banner";
      MinecraftBlockTypes2["StandingSign"] = "minecraft:standing_sign";
      MinecraftBlockTypes2["StickyPiston"] = "minecraft:sticky_piston";
      MinecraftBlockTypes2["StickyPistonArmCollision"] = "minecraft:sticky_piston_arm_collision";
      MinecraftBlockTypes2["Stone"] = "minecraft:stone";
      MinecraftBlockTypes2["StoneBrickDoubleSlab"] = "minecraft:stone_brick_double_slab";
      MinecraftBlockTypes2["StoneBrickSlab"] = "minecraft:stone_brick_slab";
      MinecraftBlockTypes2["StoneBrickStairs"] = "minecraft:stone_brick_stairs";
      MinecraftBlockTypes2["StoneBrickWall"] = "minecraft:stone_brick_wall";
      MinecraftBlockTypes2["StoneBricks"] = "minecraft:stone_bricks";
      MinecraftBlockTypes2["StoneButton"] = "minecraft:stone_button";
      MinecraftBlockTypes2["StonePressurePlate"] = "minecraft:stone_pressure_plate";
      MinecraftBlockTypes2["StoneStairs"] = "minecraft:stone_stairs";
      MinecraftBlockTypes2["StonecutterBlock"] = "minecraft:stonecutter_block";
      MinecraftBlockTypes2["StrippedAcaciaLog"] = "minecraft:stripped_acacia_log";
      MinecraftBlockTypes2["StrippedAcaciaWood"] = "minecraft:stripped_acacia_wood";
      MinecraftBlockTypes2["StrippedBambooBlock"] = "minecraft:stripped_bamboo_block";
      MinecraftBlockTypes2["StrippedBirchLog"] = "minecraft:stripped_birch_log";
      MinecraftBlockTypes2["StrippedBirchWood"] = "minecraft:stripped_birch_wood";
      MinecraftBlockTypes2["StrippedCherryLog"] = "minecraft:stripped_cherry_log";
      MinecraftBlockTypes2["StrippedCherryWood"] = "minecraft:stripped_cherry_wood";
      MinecraftBlockTypes2["StrippedCrimsonHyphae"] = "minecraft:stripped_crimson_hyphae";
      MinecraftBlockTypes2["StrippedCrimsonStem"] = "minecraft:stripped_crimson_stem";
      MinecraftBlockTypes2["StrippedDarkOakLog"] = "minecraft:stripped_dark_oak_log";
      MinecraftBlockTypes2["StrippedDarkOakWood"] = "minecraft:stripped_dark_oak_wood";
      MinecraftBlockTypes2["StrippedJungleLog"] = "minecraft:stripped_jungle_log";
      MinecraftBlockTypes2["StrippedJungleWood"] = "minecraft:stripped_jungle_wood";
      MinecraftBlockTypes2["StrippedMangroveLog"] = "minecraft:stripped_mangrove_log";
      MinecraftBlockTypes2["StrippedMangroveWood"] = "minecraft:stripped_mangrove_wood";
      MinecraftBlockTypes2["StrippedOakLog"] = "minecraft:stripped_oak_log";
      MinecraftBlockTypes2["StrippedOakWood"] = "minecraft:stripped_oak_wood";
      MinecraftBlockTypes2["StrippedPaleOakLog"] = "minecraft:stripped_pale_oak_log";
      MinecraftBlockTypes2["StrippedPaleOakWood"] = "minecraft:stripped_pale_oak_wood";
      MinecraftBlockTypes2["StrippedSpruceLog"] = "minecraft:stripped_spruce_log";
      MinecraftBlockTypes2["StrippedSpruceWood"] = "minecraft:stripped_spruce_wood";
      MinecraftBlockTypes2["StrippedWarpedHyphae"] = "minecraft:stripped_warped_hyphae";
      MinecraftBlockTypes2["StrippedWarpedStem"] = "minecraft:stripped_warped_stem";
      MinecraftBlockTypes2["StructureBlock"] = "minecraft:structure_block";
      MinecraftBlockTypes2["StructureVoid"] = "minecraft:structure_void";
      MinecraftBlockTypes2["Sunflower"] = "minecraft:sunflower";
      MinecraftBlockTypes2["SuspiciousGravel"] = "minecraft:suspicious_gravel";
      MinecraftBlockTypes2["SuspiciousSand"] = "minecraft:suspicious_sand";
      MinecraftBlockTypes2["SweetBerryBush"] = "minecraft:sweet_berry_bush";
      MinecraftBlockTypes2["TallDryGrass"] = "minecraft:tall_dry_grass";
      MinecraftBlockTypes2["TallGrass"] = "minecraft:tall_grass";
      MinecraftBlockTypes2["Target"] = "minecraft:target";
      MinecraftBlockTypes2["TintedGlass"] = "minecraft:tinted_glass";
      MinecraftBlockTypes2["Tnt"] = "minecraft:tnt";
      MinecraftBlockTypes2["Torch"] = "minecraft:torch";
      MinecraftBlockTypes2["Torchflower"] = "minecraft:torchflower";
      MinecraftBlockTypes2["TorchflowerCrop"] = "minecraft:torchflower_crop";
      MinecraftBlockTypes2["Trapdoor"] = "minecraft:trapdoor";
      MinecraftBlockTypes2["TrappedChest"] = "minecraft:trapped_chest";
      MinecraftBlockTypes2["TrialSpawner"] = "minecraft:trial_spawner";
      MinecraftBlockTypes2["TripWire"] = "minecraft:trip_wire";
      MinecraftBlockTypes2["TripwireHook"] = "minecraft:tripwire_hook";
      MinecraftBlockTypes2["TubeCoral"] = "minecraft:tube_coral";
      MinecraftBlockTypes2["TubeCoralBlock"] = "minecraft:tube_coral_block";
      MinecraftBlockTypes2["TubeCoralFan"] = "minecraft:tube_coral_fan";
      MinecraftBlockTypes2["TubeCoralWallFan"] = "minecraft:tube_coral_wall_fan";
      MinecraftBlockTypes2["Tuff"] = "minecraft:tuff";
      MinecraftBlockTypes2["TuffBrickDoubleSlab"] = "minecraft:tuff_brick_double_slab";
      MinecraftBlockTypes2["TuffBrickSlab"] = "minecraft:tuff_brick_slab";
      MinecraftBlockTypes2["TuffBrickStairs"] = "minecraft:tuff_brick_stairs";
      MinecraftBlockTypes2["TuffBrickWall"] = "minecraft:tuff_brick_wall";
      MinecraftBlockTypes2["TuffBricks"] = "minecraft:tuff_bricks";
      MinecraftBlockTypes2["TuffDoubleSlab"] = "minecraft:tuff_double_slab";
      MinecraftBlockTypes2["TuffSlab"] = "minecraft:tuff_slab";
      MinecraftBlockTypes2["TuffStairs"] = "minecraft:tuff_stairs";
      MinecraftBlockTypes2["TuffWall"] = "minecraft:tuff_wall";
      MinecraftBlockTypes2["TurtleEgg"] = "minecraft:turtle_egg";
      MinecraftBlockTypes2["TwistingVines"] = "minecraft:twisting_vines";
      MinecraftBlockTypes2["UnderwaterTnt"] = "minecraft:underwater_tnt";
      MinecraftBlockTypes2["UnderwaterTorch"] = "minecraft:underwater_torch";
      MinecraftBlockTypes2["UndyedShulkerBox"] = "minecraft:undyed_shulker_box";
      MinecraftBlockTypes2["Unknown"] = "minecraft:unknown";
      MinecraftBlockTypes2["UnlitRedstoneTorch"] = "minecraft:unlit_redstone_torch";
      MinecraftBlockTypes2["UnpoweredComparator"] = "minecraft:unpowered_comparator";
      MinecraftBlockTypes2["UnpoweredRepeater"] = "minecraft:unpowered_repeater";
      MinecraftBlockTypes2["Vault"] = "minecraft:vault";
      MinecraftBlockTypes2["VerdantFroglight"] = "minecraft:verdant_froglight";
      MinecraftBlockTypes2["Vine"] = "minecraft:vine";
      MinecraftBlockTypes2["WallBanner"] = "minecraft:wall_banner";
      MinecraftBlockTypes2["WallSign"] = "minecraft:wall_sign";
      MinecraftBlockTypes2["WarpedButton"] = "minecraft:warped_button";
      MinecraftBlockTypes2["WarpedDoor"] = "minecraft:warped_door";
      MinecraftBlockTypes2["WarpedDoubleSlab"] = "minecraft:warped_double_slab";
      MinecraftBlockTypes2["WarpedFence"] = "minecraft:warped_fence";
      MinecraftBlockTypes2["WarpedFenceGate"] = "minecraft:warped_fence_gate";
      MinecraftBlockTypes2["WarpedFungus"] = "minecraft:warped_fungus";
      MinecraftBlockTypes2["WarpedHangingSign"] = "minecraft:warped_hanging_sign";
      MinecraftBlockTypes2["WarpedHyphae"] = "minecraft:warped_hyphae";
      MinecraftBlockTypes2["WarpedNylium"] = "minecraft:warped_nylium";
      MinecraftBlockTypes2["WarpedPlanks"] = "minecraft:warped_planks";
      MinecraftBlockTypes2["WarpedPressurePlate"] = "minecraft:warped_pressure_plate";
      MinecraftBlockTypes2["WarpedRoots"] = "minecraft:warped_roots";
      MinecraftBlockTypes2["WarpedShelf"] = "minecraft:warped_shelf";
      MinecraftBlockTypes2["WarpedSlab"] = "minecraft:warped_slab";
      MinecraftBlockTypes2["WarpedStairs"] = "minecraft:warped_stairs";
      MinecraftBlockTypes2["WarpedStandingSign"] = "minecraft:warped_standing_sign";
      MinecraftBlockTypes2["WarpedStem"] = "minecraft:warped_stem";
      MinecraftBlockTypes2["WarpedTrapdoor"] = "minecraft:warped_trapdoor";
      MinecraftBlockTypes2["WarpedWallSign"] = "minecraft:warped_wall_sign";
      MinecraftBlockTypes2["WarpedWartBlock"] = "minecraft:warped_wart_block";
      MinecraftBlockTypes2["Water"] = "minecraft:water";
      MinecraftBlockTypes2["Waterlily"] = "minecraft:waterlily";
      MinecraftBlockTypes2["WaxedChiseledCopper"] = "minecraft:waxed_chiseled_copper";
      MinecraftBlockTypes2["WaxedCopper"] = "minecraft:waxed_copper";
      MinecraftBlockTypes2["WaxedCopperBars"] = "minecraft:waxed_copper_bars";
      MinecraftBlockTypes2["WaxedCopperBulb"] = "minecraft:waxed_copper_bulb";
      MinecraftBlockTypes2["WaxedCopperChain"] = "minecraft:waxed_copper_chain";
      MinecraftBlockTypes2["WaxedCopperChest"] = "minecraft:waxed_copper_chest";
      MinecraftBlockTypes2["WaxedCopperDoor"] = "minecraft:waxed_copper_door";
      MinecraftBlockTypes2["WaxedCopperGolemStatue"] = "minecraft:waxed_copper_golem_statue";
      MinecraftBlockTypes2["WaxedCopperGrate"] = "minecraft:waxed_copper_grate";
      MinecraftBlockTypes2["WaxedCopperLantern"] = "minecraft:waxed_copper_lantern";
      MinecraftBlockTypes2["WaxedCopperTrapdoor"] = "minecraft:waxed_copper_trapdoor";
      MinecraftBlockTypes2["WaxedCutCopper"] = "minecraft:waxed_cut_copper";
      MinecraftBlockTypes2["WaxedCutCopperSlab"] = "minecraft:waxed_cut_copper_slab";
      MinecraftBlockTypes2["WaxedCutCopperStairs"] = "minecraft:waxed_cut_copper_stairs";
      MinecraftBlockTypes2["WaxedDoubleCutCopperSlab"] = "minecraft:waxed_double_cut_copper_slab";
      MinecraftBlockTypes2["WaxedExposedChiseledCopper"] = "minecraft:waxed_exposed_chiseled_copper";
      MinecraftBlockTypes2["WaxedExposedCopper"] = "minecraft:waxed_exposed_copper";
      MinecraftBlockTypes2["WaxedExposedCopperBars"] = "minecraft:waxed_exposed_copper_bars";
      MinecraftBlockTypes2["WaxedExposedCopperBulb"] = "minecraft:waxed_exposed_copper_bulb";
      MinecraftBlockTypes2["WaxedExposedCopperChain"] = "minecraft:waxed_exposed_copper_chain";
      MinecraftBlockTypes2["WaxedExposedCopperChest"] = "minecraft:waxed_exposed_copper_chest";
      MinecraftBlockTypes2["WaxedExposedCopperDoor"] = "minecraft:waxed_exposed_copper_door";
      MinecraftBlockTypes2["WaxedExposedCopperGolemStatue"] = "minecraft:waxed_exposed_copper_golem_statue";
      MinecraftBlockTypes2["WaxedExposedCopperGrate"] = "minecraft:waxed_exposed_copper_grate";
      MinecraftBlockTypes2["WaxedExposedCopperLantern"] = "minecraft:waxed_exposed_copper_lantern";
      MinecraftBlockTypes2["WaxedExposedCopperTrapdoor"] = "minecraft:waxed_exposed_copper_trapdoor";
      MinecraftBlockTypes2["WaxedExposedCutCopper"] = "minecraft:waxed_exposed_cut_copper";
      MinecraftBlockTypes2["WaxedExposedCutCopperSlab"] = "minecraft:waxed_exposed_cut_copper_slab";
      MinecraftBlockTypes2["WaxedExposedCutCopperStairs"] = "minecraft:waxed_exposed_cut_copper_stairs";
      MinecraftBlockTypes2["WaxedExposedDoubleCutCopperSlab"] = "minecraft:waxed_exposed_double_cut_copper_slab";
      MinecraftBlockTypes2["WaxedExposedLightningRod"] = "minecraft:waxed_exposed_lightning_rod";
      MinecraftBlockTypes2["WaxedLightningRod"] = "minecraft:waxed_lightning_rod";
      MinecraftBlockTypes2["WaxedOxidizedChiseledCopper"] = "minecraft:waxed_oxidized_chiseled_copper";
      MinecraftBlockTypes2["WaxedOxidizedCopper"] = "minecraft:waxed_oxidized_copper";
      MinecraftBlockTypes2["WaxedOxidizedCopperBars"] = "minecraft:waxed_oxidized_copper_bars";
      MinecraftBlockTypes2["WaxedOxidizedCopperBulb"] = "minecraft:waxed_oxidized_copper_bulb";
      MinecraftBlockTypes2["WaxedOxidizedCopperChain"] = "minecraft:waxed_oxidized_copper_chain";
      MinecraftBlockTypes2["WaxedOxidizedCopperChest"] = "minecraft:waxed_oxidized_copper_chest";
      MinecraftBlockTypes2["WaxedOxidizedCopperDoor"] = "minecraft:waxed_oxidized_copper_door";
      MinecraftBlockTypes2["WaxedOxidizedCopperGolemStatue"] = "minecraft:waxed_oxidized_copper_golem_statue";
      MinecraftBlockTypes2["WaxedOxidizedCopperGrate"] = "minecraft:waxed_oxidized_copper_grate";
      MinecraftBlockTypes2["WaxedOxidizedCopperLantern"] = "minecraft:waxed_oxidized_copper_lantern";
      MinecraftBlockTypes2["WaxedOxidizedCopperTrapdoor"] = "minecraft:waxed_oxidized_copper_trapdoor";
      MinecraftBlockTypes2["WaxedOxidizedCutCopper"] = "minecraft:waxed_oxidized_cut_copper";
      MinecraftBlockTypes2["WaxedOxidizedCutCopperSlab"] = "minecraft:waxed_oxidized_cut_copper_slab";
      MinecraftBlockTypes2["WaxedOxidizedCutCopperStairs"] = "minecraft:waxed_oxidized_cut_copper_stairs";
      MinecraftBlockTypes2["WaxedOxidizedDoubleCutCopperSlab"] = "minecraft:waxed_oxidized_double_cut_copper_slab";
      MinecraftBlockTypes2["WaxedOxidizedLightningRod"] = "minecraft:waxed_oxidized_lightning_rod";
      MinecraftBlockTypes2["WaxedWeatheredChiseledCopper"] = "minecraft:waxed_weathered_chiseled_copper";
      MinecraftBlockTypes2["WaxedWeatheredCopper"] = "minecraft:waxed_weathered_copper";
      MinecraftBlockTypes2["WaxedWeatheredCopperBars"] = "minecraft:waxed_weathered_copper_bars";
      MinecraftBlockTypes2["WaxedWeatheredCopperBulb"] = "minecraft:waxed_weathered_copper_bulb";
      MinecraftBlockTypes2["WaxedWeatheredCopperChain"] = "minecraft:waxed_weathered_copper_chain";
      MinecraftBlockTypes2["WaxedWeatheredCopperChest"] = "minecraft:waxed_weathered_copper_chest";
      MinecraftBlockTypes2["WaxedWeatheredCopperDoor"] = "minecraft:waxed_weathered_copper_door";
      MinecraftBlockTypes2["WaxedWeatheredCopperGolemStatue"] = "minecraft:waxed_weathered_copper_golem_statue";
      MinecraftBlockTypes2["WaxedWeatheredCopperGrate"] = "minecraft:waxed_weathered_copper_grate";
      MinecraftBlockTypes2["WaxedWeatheredCopperLantern"] = "minecraft:waxed_weathered_copper_lantern";
      MinecraftBlockTypes2["WaxedWeatheredCopperTrapdoor"] = "minecraft:waxed_weathered_copper_trapdoor";
      MinecraftBlockTypes2["WaxedWeatheredCutCopper"] = "minecraft:waxed_weathered_cut_copper";
      MinecraftBlockTypes2["WaxedWeatheredCutCopperSlab"] = "minecraft:waxed_weathered_cut_copper_slab";
      MinecraftBlockTypes2["WaxedWeatheredCutCopperStairs"] = "minecraft:waxed_weathered_cut_copper_stairs";
      MinecraftBlockTypes2["WaxedWeatheredDoubleCutCopperSlab"] = "minecraft:waxed_weathered_double_cut_copper_slab";
      MinecraftBlockTypes2["WaxedWeatheredLightningRod"] = "minecraft:waxed_weathered_lightning_rod";
      MinecraftBlockTypes2["WeatheredChiseledCopper"] = "minecraft:weathered_chiseled_copper";
      MinecraftBlockTypes2["WeatheredCopper"] = "minecraft:weathered_copper";
      MinecraftBlockTypes2["WeatheredCopperBars"] = "minecraft:weathered_copper_bars";
      MinecraftBlockTypes2["WeatheredCopperBulb"] = "minecraft:weathered_copper_bulb";
      MinecraftBlockTypes2["WeatheredCopperChain"] = "minecraft:weathered_copper_chain";
      MinecraftBlockTypes2["WeatheredCopperChest"] = "minecraft:weathered_copper_chest";
      MinecraftBlockTypes2["WeatheredCopperDoor"] = "minecraft:weathered_copper_door";
      MinecraftBlockTypes2["WeatheredCopperGolemStatue"] = "minecraft:weathered_copper_golem_statue";
      MinecraftBlockTypes2["WeatheredCopperGrate"] = "minecraft:weathered_copper_grate";
      MinecraftBlockTypes2["WeatheredCopperLantern"] = "minecraft:weathered_copper_lantern";
      MinecraftBlockTypes2["WeatheredCopperTrapdoor"] = "minecraft:weathered_copper_trapdoor";
      MinecraftBlockTypes2["WeatheredCutCopper"] = "minecraft:weathered_cut_copper";
      MinecraftBlockTypes2["WeatheredCutCopperSlab"] = "minecraft:weathered_cut_copper_slab";
      MinecraftBlockTypes2["WeatheredCutCopperStairs"] = "minecraft:weathered_cut_copper_stairs";
      MinecraftBlockTypes2["WeatheredDoubleCutCopperSlab"] = "minecraft:weathered_double_cut_copper_slab";
      MinecraftBlockTypes2["WeatheredLightningRod"] = "minecraft:weathered_lightning_rod";
      MinecraftBlockTypes2["Web"] = "minecraft:web";
      MinecraftBlockTypes2["WeepingVines"] = "minecraft:weeping_vines";
      MinecraftBlockTypes2["WetSponge"] = "minecraft:wet_sponge";
      MinecraftBlockTypes2["Wheat"] = "minecraft:wheat";
      MinecraftBlockTypes2["WhiteCandle"] = "minecraft:white_candle";
      MinecraftBlockTypes2["WhiteCandleCake"] = "minecraft:white_candle_cake";
      MinecraftBlockTypes2["WhiteCarpet"] = "minecraft:white_carpet";
      MinecraftBlockTypes2["WhiteConcrete"] = "minecraft:white_concrete";
      MinecraftBlockTypes2["WhiteConcretePowder"] = "minecraft:white_concrete_powder";
      MinecraftBlockTypes2["WhiteGlazedTerracotta"] = "minecraft:white_glazed_terracotta";
      MinecraftBlockTypes2["WhiteShulkerBox"] = "minecraft:white_shulker_box";
      MinecraftBlockTypes2["WhiteStainedGlass"] = "minecraft:white_stained_glass";
      MinecraftBlockTypes2["WhiteStainedGlassPane"] = "minecraft:white_stained_glass_pane";
      MinecraftBlockTypes2["WhiteTerracotta"] = "minecraft:white_terracotta";
      MinecraftBlockTypes2["WhiteTulip"] = "minecraft:white_tulip";
      MinecraftBlockTypes2["WhiteWool"] = "minecraft:white_wool";
      MinecraftBlockTypes2["Wildflowers"] = "minecraft:wildflowers";
      MinecraftBlockTypes2["WitherRose"] = "minecraft:wither_rose";
      MinecraftBlockTypes2["WitherSkeletonSkull"] = "minecraft:wither_skeleton_skull";
      MinecraftBlockTypes2["WoodenButton"] = "minecraft:wooden_button";
      MinecraftBlockTypes2["WoodenDoor"] = "minecraft:wooden_door";
      MinecraftBlockTypes2["WoodenPressurePlate"] = "minecraft:wooden_pressure_plate";
      MinecraftBlockTypes2["YellowCandle"] = "minecraft:yellow_candle";
      MinecraftBlockTypes2["YellowCandleCake"] = "minecraft:yellow_candle_cake";
      MinecraftBlockTypes2["YellowCarpet"] = "minecraft:yellow_carpet";
      MinecraftBlockTypes2["YellowConcrete"] = "minecraft:yellow_concrete";
      MinecraftBlockTypes2["YellowConcretePowder"] = "minecraft:yellow_concrete_powder";
      MinecraftBlockTypes2["YellowGlazedTerracotta"] = "minecraft:yellow_glazed_terracotta";
      MinecraftBlockTypes2["YellowShulkerBox"] = "minecraft:yellow_shulker_box";
      MinecraftBlockTypes2["YellowStainedGlass"] = "minecraft:yellow_stained_glass";
      MinecraftBlockTypes2["YellowStainedGlassPane"] = "minecraft:yellow_stained_glass_pane";
      MinecraftBlockTypes2["YellowTerracotta"] = "minecraft:yellow_terracotta";
      MinecraftBlockTypes2["YellowWool"] = "minecraft:yellow_wool";
      MinecraftBlockTypes2["ZombieHead"] = "minecraft:zombie_head";
      return MinecraftBlockTypes2;
    })(MinecraftBlockTypes || {});
    MinecraftCameraPresetsTypes = ((MinecraftCameraPresetsTypes2) => {
      MinecraftCameraPresetsTypes2["ControlSchemeCamera"] = "minecraft:control_scheme_camera";
      MinecraftCameraPresetsTypes2["FirstPerson"] = "minecraft:first_person";
      MinecraftCameraPresetsTypes2["FixedBoom"] = "minecraft:fixed_boom";
      MinecraftCameraPresetsTypes2["FollowOrbit"] = "minecraft:follow_orbit";
      MinecraftCameraPresetsTypes2["Free"] = "minecraft:free";
      MinecraftCameraPresetsTypes2["ThirdPerson"] = "minecraft:third_person";
      MinecraftCameraPresetsTypes2["ThirdPersonFront"] = "minecraft:third_person_front";
      return MinecraftCameraPresetsTypes2;
    })(MinecraftCameraPresetsTypes || {});
    MinecraftCooldownCategoryTypes = ((MinecraftCooldownCategoryTypes2) => {
      MinecraftCooldownCategoryTypes2["Chorusfruit"] = "minecraft:chorusfruit";
      MinecraftCooldownCategoryTypes2["EnderPearl"] = "minecraft:ender_pearl";
      MinecraftCooldownCategoryTypes2["GoatHorn"] = "minecraft:goat_horn";
      MinecraftCooldownCategoryTypes2["Shield"] = "minecraft:shield";
      MinecraftCooldownCategoryTypes2["WindCharge"] = "minecraft:wind_charge";
      return MinecraftCooldownCategoryTypes2;
    })(MinecraftCooldownCategoryTypes || {});
    MinecraftDimensionTypes = ((MinecraftDimensionTypes2) => {
      MinecraftDimensionTypes2["Nether"] = "minecraft:nether";
      MinecraftDimensionTypes2["Overworld"] = "minecraft:overworld";
      MinecraftDimensionTypes2["TheEnd"] = "minecraft:the_end";
      return MinecraftDimensionTypes2;
    })(MinecraftDimensionTypes || {});
    MinecraftEffectTypes = ((MinecraftEffectTypes2) => {
      MinecraftEffectTypes2["Absorption"] = "minecraft:absorption";
      MinecraftEffectTypes2["BadOmen"] = "minecraft:bad_omen";
      MinecraftEffectTypes2["Blindness"] = "minecraft:blindness";
      MinecraftEffectTypes2["ConduitPower"] = "minecraft:conduit_power";
      MinecraftEffectTypes2["Darkness"] = "minecraft:darkness";
      MinecraftEffectTypes2["FatalPoison"] = "minecraft:fatal_poison";
      MinecraftEffectTypes2["FireResistance"] = "minecraft:fire_resistance";
      MinecraftEffectTypes2["Haste"] = "minecraft:haste";
      MinecraftEffectTypes2["HealthBoost"] = "minecraft:health_boost";
      MinecraftEffectTypes2["Hunger"] = "minecraft:hunger";
      MinecraftEffectTypes2["Infested"] = "minecraft:infested";
      MinecraftEffectTypes2["InstantDamage"] = "minecraft:instant_damage";
      MinecraftEffectTypes2["InstantHealth"] = "minecraft:instant_health";
      MinecraftEffectTypes2["Invisibility"] = "minecraft:invisibility";
      MinecraftEffectTypes2["JumpBoost"] = "minecraft:jump_boost";
      MinecraftEffectTypes2["Levitation"] = "minecraft:levitation";
      MinecraftEffectTypes2["MiningFatigue"] = "minecraft:mining_fatigue";
      MinecraftEffectTypes2["Nausea"] = "minecraft:nausea";
      MinecraftEffectTypes2["NightVision"] = "minecraft:night_vision";
      MinecraftEffectTypes2["Oozing"] = "minecraft:oozing";
      MinecraftEffectTypes2["Poison"] = "minecraft:poison";
      MinecraftEffectTypes2["RaidOmen"] = "minecraft:raid_omen";
      MinecraftEffectTypes2["Regeneration"] = "minecraft:regeneration";
      MinecraftEffectTypes2["Resistance"] = "minecraft:resistance";
      MinecraftEffectTypes2["Saturation"] = "minecraft:saturation";
      MinecraftEffectTypes2["SlowFalling"] = "minecraft:slow_falling";
      MinecraftEffectTypes2["Slowness"] = "minecraft:slowness";
      MinecraftEffectTypes2["Speed"] = "minecraft:speed";
      MinecraftEffectTypes2["Strength"] = "minecraft:strength";
      MinecraftEffectTypes2["TrialOmen"] = "minecraft:trial_omen";
      MinecraftEffectTypes2["VillageHero"] = "minecraft:village_hero";
      MinecraftEffectTypes2["WaterBreathing"] = "minecraft:water_breathing";
      MinecraftEffectTypes2["Weakness"] = "minecraft:weakness";
      MinecraftEffectTypes2["Weaving"] = "minecraft:weaving";
      MinecraftEffectTypes2["WindCharged"] = "minecraft:wind_charged";
      MinecraftEffectTypes2["Wither"] = "minecraft:wither";
      return MinecraftEffectTypes2;
    })(MinecraftEffectTypes || {});
    MinecraftEnchantmentTypes = ((MinecraftEnchantmentTypes2) => {
      MinecraftEnchantmentTypes2["AquaAffinity"] = "minecraft:aqua_affinity";
      MinecraftEnchantmentTypes2["BaneOfArthropods"] = "minecraft:bane_of_arthropods";
      MinecraftEnchantmentTypes2["Binding"] = "minecraft:binding";
      MinecraftEnchantmentTypes2["BlastProtection"] = "minecraft:blast_protection";
      MinecraftEnchantmentTypes2["BowInfinity"] = "minecraft:infinity";
      MinecraftEnchantmentTypes2["Breach"] = "minecraft:breach";
      MinecraftEnchantmentTypes2["Channeling"] = "minecraft:channeling";
      MinecraftEnchantmentTypes2["Density"] = "minecraft:density";
      MinecraftEnchantmentTypes2["DepthStrider"] = "minecraft:depth_strider";
      MinecraftEnchantmentTypes2["Efficiency"] = "minecraft:efficiency";
      MinecraftEnchantmentTypes2["FeatherFalling"] = "minecraft:feather_falling";
      MinecraftEnchantmentTypes2["FireAspect"] = "minecraft:fire_aspect";
      MinecraftEnchantmentTypes2["FireProtection"] = "minecraft:fire_protection";
      MinecraftEnchantmentTypes2["Flame"] = "minecraft:flame";
      MinecraftEnchantmentTypes2["Fortune"] = "minecraft:fortune";
      MinecraftEnchantmentTypes2["FrostWalker"] = "minecraft:frost_walker";
      MinecraftEnchantmentTypes2["Impaling"] = "minecraft:impaling";
      MinecraftEnchantmentTypes2["Knockback"] = "minecraft:knockback";
      MinecraftEnchantmentTypes2["Looting"] = "minecraft:looting";
      MinecraftEnchantmentTypes2["Loyalty"] = "minecraft:loyalty";
      MinecraftEnchantmentTypes2["LuckOfTheSea"] = "minecraft:luck_of_the_sea";
      MinecraftEnchantmentTypes2["Lure"] = "minecraft:lure";
      MinecraftEnchantmentTypes2["Mending"] = "minecraft:mending";
      MinecraftEnchantmentTypes2["Multishot"] = "minecraft:multishot";
      MinecraftEnchantmentTypes2["Piercing"] = "minecraft:piercing";
      MinecraftEnchantmentTypes2["Power"] = "minecraft:power";
      MinecraftEnchantmentTypes2["ProjectileProtection"] = "minecraft:projectile_protection";
      MinecraftEnchantmentTypes2["Protection"] = "minecraft:protection";
      MinecraftEnchantmentTypes2["Punch"] = "minecraft:punch";
      MinecraftEnchantmentTypes2["QuickCharge"] = "minecraft:quick_charge";
      MinecraftEnchantmentTypes2["Respiration"] = "minecraft:respiration";
      MinecraftEnchantmentTypes2["Riptide"] = "minecraft:riptide";
      MinecraftEnchantmentTypes2["Sharpness"] = "minecraft:sharpness";
      MinecraftEnchantmentTypes2["SilkTouch"] = "minecraft:silk_touch";
      MinecraftEnchantmentTypes2["Smite"] = "minecraft:smite";
      MinecraftEnchantmentTypes2["SoulSpeed"] = "minecraft:soul_speed";
      MinecraftEnchantmentTypes2["SwiftSneak"] = "minecraft:swift_sneak";
      MinecraftEnchantmentTypes2["Thorns"] = "minecraft:thorns";
      MinecraftEnchantmentTypes2["Unbreaking"] = "minecraft:unbreaking";
      MinecraftEnchantmentTypes2["Vanishing"] = "minecraft:vanishing";
      MinecraftEnchantmentTypes2["WindBurst"] = "minecraft:wind_burst";
      return MinecraftEnchantmentTypes2;
    })(MinecraftEnchantmentTypes || {});
    MinecraftEntityTypes = ((MinecraftEntityTypes2) => {
      MinecraftEntityTypes2["Agent"] = "minecraft:agent";
      MinecraftEntityTypes2["Allay"] = "minecraft:allay";
      MinecraftEntityTypes2["AreaEffectCloud"] = "minecraft:area_effect_cloud";
      MinecraftEntityTypes2["Armadillo"] = "minecraft:armadillo";
      MinecraftEntityTypes2["ArmorStand"] = "minecraft:armor_stand";
      MinecraftEntityTypes2["Arrow"] = "minecraft:arrow";
      MinecraftEntityTypes2["Axolotl"] = "minecraft:axolotl";
      MinecraftEntityTypes2["Bat"] = "minecraft:bat";
      MinecraftEntityTypes2["Bee"] = "minecraft:bee";
      MinecraftEntityTypes2["Blaze"] = "minecraft:blaze";
      MinecraftEntityTypes2["Boat"] = "minecraft:boat";
      MinecraftEntityTypes2["Bogged"] = "minecraft:bogged";
      MinecraftEntityTypes2["Breeze"] = "minecraft:breeze";
      MinecraftEntityTypes2["BreezeWindChargeProjectile"] = "minecraft:breeze_wind_charge_projectile";
      MinecraftEntityTypes2["Camel"] = "minecraft:camel";
      MinecraftEntityTypes2["Cat"] = "minecraft:cat";
      MinecraftEntityTypes2["CaveSpider"] = "minecraft:cave_spider";
      MinecraftEntityTypes2["ChestBoat"] = "minecraft:chest_boat";
      MinecraftEntityTypes2["ChestMinecart"] = "minecraft:chest_minecart";
      MinecraftEntityTypes2["Chicken"] = "minecraft:chicken";
      MinecraftEntityTypes2["Cod"] = "minecraft:cod";
      MinecraftEntityTypes2["CommandBlockMinecart"] = "minecraft:command_block_minecart";
      MinecraftEntityTypes2["CopperGolem"] = "minecraft:copper_golem";
      MinecraftEntityTypes2["Cow"] = "minecraft:cow";
      MinecraftEntityTypes2["Creaking"] = "minecraft:creaking";
      MinecraftEntityTypes2["Creeper"] = "minecraft:creeper";
      MinecraftEntityTypes2["Dolphin"] = "minecraft:dolphin";
      MinecraftEntityTypes2["Donkey"] = "minecraft:donkey";
      MinecraftEntityTypes2["DragonFireball"] = "minecraft:dragon_fireball";
      MinecraftEntityTypes2["Drowned"] = "minecraft:drowned";
      MinecraftEntityTypes2["Egg"] = "minecraft:egg";
      MinecraftEntityTypes2["ElderGuardian"] = "minecraft:elder_guardian";
      MinecraftEntityTypes2["EnderCrystal"] = "minecraft:ender_crystal";
      MinecraftEntityTypes2["EnderDragon"] = "minecraft:ender_dragon";
      MinecraftEntityTypes2["EnderPearl"] = "minecraft:ender_pearl";
      MinecraftEntityTypes2["Enderman"] = "minecraft:enderman";
      MinecraftEntityTypes2["Endermite"] = "minecraft:endermite";
      MinecraftEntityTypes2["EvocationIllager"] = "minecraft:evocation_illager";
      MinecraftEntityTypes2["EyeOfEnderSignal"] = "minecraft:eye_of_ender_signal";
      MinecraftEntityTypes2["Fireball"] = "minecraft:fireball";
      MinecraftEntityTypes2["FireworksRocket"] = "minecraft:fireworks_rocket";
      MinecraftEntityTypes2["FishingHook"] = "minecraft:fishing_hook";
      MinecraftEntityTypes2["Fox"] = "minecraft:fox";
      MinecraftEntityTypes2["Frog"] = "minecraft:frog";
      MinecraftEntityTypes2["Ghast"] = "minecraft:ghast";
      MinecraftEntityTypes2["GlowSquid"] = "minecraft:glow_squid";
      MinecraftEntityTypes2["Goat"] = "minecraft:goat";
      MinecraftEntityTypes2["Guardian"] = "minecraft:guardian";
      MinecraftEntityTypes2["HappyGhast"] = "minecraft:happy_ghast";
      MinecraftEntityTypes2["Hoglin"] = "minecraft:hoglin";
      MinecraftEntityTypes2["HopperMinecart"] = "minecraft:hopper_minecart";
      MinecraftEntityTypes2["Horse"] = "minecraft:horse";
      MinecraftEntityTypes2["Husk"] = "minecraft:husk";
      MinecraftEntityTypes2["IronGolem"] = "minecraft:iron_golem";
      MinecraftEntityTypes2["LightningBolt"] = "minecraft:lightning_bolt";
      MinecraftEntityTypes2["LingeringPotion"] = "minecraft:lingering_potion";
      MinecraftEntityTypes2["Llama"] = "minecraft:llama";
      MinecraftEntityTypes2["LlamaSpit"] = "minecraft:llama_spit";
      MinecraftEntityTypes2["MagmaCube"] = "minecraft:magma_cube";
      MinecraftEntityTypes2["Minecart"] = "minecraft:minecart";
      MinecraftEntityTypes2["Mooshroom"] = "minecraft:mooshroom";
      MinecraftEntityTypes2["Mule"] = "minecraft:mule";
      MinecraftEntityTypes2["Npc"] = "minecraft:npc";
      MinecraftEntityTypes2["Ocelot"] = "minecraft:ocelot";
      MinecraftEntityTypes2["OminousItemSpawner"] = "minecraft:ominous_item_spawner";
      MinecraftEntityTypes2["Panda"] = "minecraft:panda";
      MinecraftEntityTypes2["Parrot"] = "minecraft:parrot";
      MinecraftEntityTypes2["Phantom"] = "minecraft:phantom";
      MinecraftEntityTypes2["Pig"] = "minecraft:pig";
      MinecraftEntityTypes2["Piglin"] = "minecraft:piglin";
      MinecraftEntityTypes2["PiglinBrute"] = "minecraft:piglin_brute";
      MinecraftEntityTypes2["Pillager"] = "minecraft:pillager";
      MinecraftEntityTypes2["Player"] = "minecraft:player";
      MinecraftEntityTypes2["PolarBear"] = "minecraft:polar_bear";
      MinecraftEntityTypes2["Pufferfish"] = "minecraft:pufferfish";
      MinecraftEntityTypes2["Rabbit"] = "minecraft:rabbit";
      MinecraftEntityTypes2["Ravager"] = "minecraft:ravager";
      MinecraftEntityTypes2["Salmon"] = "minecraft:salmon";
      MinecraftEntityTypes2["Sheep"] = "minecraft:sheep";
      MinecraftEntityTypes2["Shulker"] = "minecraft:shulker";
      MinecraftEntityTypes2["ShulkerBullet"] = "minecraft:shulker_bullet";
      MinecraftEntityTypes2["Silverfish"] = "minecraft:silverfish";
      MinecraftEntityTypes2["Skeleton"] = "minecraft:skeleton";
      MinecraftEntityTypes2["SkeletonHorse"] = "minecraft:skeleton_horse";
      MinecraftEntityTypes2["Slime"] = "minecraft:slime";
      MinecraftEntityTypes2["SmallFireball"] = "minecraft:small_fireball";
      MinecraftEntityTypes2["Sniffer"] = "minecraft:sniffer";
      MinecraftEntityTypes2["SnowGolem"] = "minecraft:snow_golem";
      MinecraftEntityTypes2["Snowball"] = "minecraft:snowball";
      MinecraftEntityTypes2["Spider"] = "minecraft:spider";
      MinecraftEntityTypes2["SplashPotion"] = "minecraft:splash_potion";
      MinecraftEntityTypes2["Squid"] = "minecraft:squid";
      MinecraftEntityTypes2["Stray"] = "minecraft:stray";
      MinecraftEntityTypes2["Strider"] = "minecraft:strider";
      MinecraftEntityTypes2["Tadpole"] = "minecraft:tadpole";
      MinecraftEntityTypes2["ThrownTrident"] = "minecraft:thrown_trident";
      MinecraftEntityTypes2["Tnt"] = "minecraft:tnt";
      MinecraftEntityTypes2["TntMinecart"] = "minecraft:tnt_minecart";
      MinecraftEntityTypes2["TraderLlama"] = "minecraft:trader_llama";
      MinecraftEntityTypes2["TripodCamera"] = "minecraft:tripod_camera";
      MinecraftEntityTypes2["Tropicalfish"] = "minecraft:tropicalfish";
      MinecraftEntityTypes2["Turtle"] = "minecraft:turtle";
      MinecraftEntityTypes2["Vex"] = "minecraft:vex";
      MinecraftEntityTypes2["Villager"] = "minecraft:villager";
      MinecraftEntityTypes2["VillagerV2"] = "minecraft:villager_v2";
      MinecraftEntityTypes2["Vindicator"] = "minecraft:vindicator";
      MinecraftEntityTypes2["WanderingTrader"] = "minecraft:wandering_trader";
      MinecraftEntityTypes2["Warden"] = "minecraft:warden";
      MinecraftEntityTypes2["WindChargeProjectile"] = "minecraft:wind_charge_projectile";
      MinecraftEntityTypes2["Witch"] = "minecraft:witch";
      MinecraftEntityTypes2["Wither"] = "minecraft:wither";
      MinecraftEntityTypes2["WitherSkeleton"] = "minecraft:wither_skeleton";
      MinecraftEntityTypes2["WitherSkull"] = "minecraft:wither_skull";
      MinecraftEntityTypes2["WitherSkullDangerous"] = "minecraft:wither_skull_dangerous";
      MinecraftEntityTypes2["Wolf"] = "minecraft:wolf";
      MinecraftEntityTypes2["XpBottle"] = "minecraft:xp_bottle";
      MinecraftEntityTypes2["XpOrb"] = "minecraft:xp_orb";
      MinecraftEntityTypes2["Zoglin"] = "minecraft:zoglin";
      MinecraftEntityTypes2["Zombie"] = "minecraft:zombie";
      MinecraftEntityTypes2["ZombieHorse"] = "minecraft:zombie_horse";
      MinecraftEntityTypes2["ZombiePigman"] = "minecraft:zombie_pigman";
      MinecraftEntityTypes2["ZombieVillager"] = "minecraft:zombie_villager";
      MinecraftEntityTypes2["ZombieVillagerV2"] = "minecraft:zombie_villager_v2";
      return MinecraftEntityTypes2;
    })(MinecraftEntityTypes || {});
    MinecraftFeatureTypes = ((MinecraftFeatureTypes2) => {
      MinecraftFeatureTypes2["AncientCity"] = "minecraft:ancient_city";
      MinecraftFeatureTypes2["BastionRemnant"] = "minecraft:bastion_remnant";
      MinecraftFeatureTypes2["BuriedTreasure"] = "minecraft:buried_treasure";
      MinecraftFeatureTypes2["EndCity"] = "minecraft:end_city";
      MinecraftFeatureTypes2["Fortress"] = "minecraft:fortress";
      MinecraftFeatureTypes2["Mansion"] = "minecraft:mansion";
      MinecraftFeatureTypes2["Mineshaft"] = "minecraft:mineshaft";
      MinecraftFeatureTypes2["Monument"] = "minecraft:monument";
      MinecraftFeatureTypes2["PillagerOutpost"] = "minecraft:pillager_outpost";
      MinecraftFeatureTypes2["RuinedPortal"] = "minecraft:ruined_portal";
      MinecraftFeatureTypes2["Ruins"] = "minecraft:ruins";
      MinecraftFeatureTypes2["Shipwreck"] = "minecraft:shipwreck";
      MinecraftFeatureTypes2["Stronghold"] = "minecraft:stronghold";
      MinecraftFeatureTypes2["Temple"] = "minecraft:temple";
      MinecraftFeatureTypes2["TrailRuins"] = "minecraft:trail_ruins";
      MinecraftFeatureTypes2["TrialChambers"] = "minecraft:trial_chambers";
      MinecraftFeatureTypes2["Village"] = "minecraft:village";
      return MinecraftFeatureTypes2;
    })(MinecraftFeatureTypes || {});
    MinecraftItemTypes = ((MinecraftItemTypes2) => {
      MinecraftItemTypes2["AcaciaBoat"] = "minecraft:acacia_boat";
      MinecraftItemTypes2["AcaciaButton"] = "minecraft:acacia_button";
      MinecraftItemTypes2["AcaciaChestBoat"] = "minecraft:acacia_chest_boat";
      MinecraftItemTypes2["AcaciaDoor"] = "minecraft:acacia_door";
      MinecraftItemTypes2["AcaciaFence"] = "minecraft:acacia_fence";
      MinecraftItemTypes2["AcaciaFenceGate"] = "minecraft:acacia_fence_gate";
      MinecraftItemTypes2["AcaciaHangingSign"] = "minecraft:acacia_hanging_sign";
      MinecraftItemTypes2["AcaciaLeaves"] = "minecraft:acacia_leaves";
      MinecraftItemTypes2["AcaciaLog"] = "minecraft:acacia_log";
      MinecraftItemTypes2["AcaciaPlanks"] = "minecraft:acacia_planks";
      MinecraftItemTypes2["AcaciaPressurePlate"] = "minecraft:acacia_pressure_plate";
      MinecraftItemTypes2["AcaciaSapling"] = "minecraft:acacia_sapling";
      MinecraftItemTypes2["AcaciaShelf"] = "minecraft:acacia_shelf";
      MinecraftItemTypes2["AcaciaSign"] = "minecraft:acacia_sign";
      MinecraftItemTypes2["AcaciaSlab"] = "minecraft:acacia_slab";
      MinecraftItemTypes2["AcaciaStairs"] = "minecraft:acacia_stairs";
      MinecraftItemTypes2["AcaciaTrapdoor"] = "minecraft:acacia_trapdoor";
      MinecraftItemTypes2["AcaciaWood"] = "minecraft:acacia_wood";
      MinecraftItemTypes2["ActivatorRail"] = "minecraft:activator_rail";
      MinecraftItemTypes2["AllaySpawnEgg"] = "minecraft:allay_spawn_egg";
      MinecraftItemTypes2["Allium"] = "minecraft:allium";
      MinecraftItemTypes2["Allow"] = "minecraft:allow";
      MinecraftItemTypes2["AmethystBlock"] = "minecraft:amethyst_block";
      MinecraftItemTypes2["AmethystCluster"] = "minecraft:amethyst_cluster";
      MinecraftItemTypes2["AmethystShard"] = "minecraft:amethyst_shard";
      MinecraftItemTypes2["AncientDebris"] = "minecraft:ancient_debris";
      MinecraftItemTypes2["Andesite"] = "minecraft:andesite";
      MinecraftItemTypes2["AndesiteSlab"] = "minecraft:andesite_slab";
      MinecraftItemTypes2["AndesiteStairs"] = "minecraft:andesite_stairs";
      MinecraftItemTypes2["AndesiteWall"] = "minecraft:andesite_wall";
      MinecraftItemTypes2["AnglerPotterySherd"] = "minecraft:angler_pottery_sherd";
      MinecraftItemTypes2["Anvil"] = "minecraft:anvil";
      MinecraftItemTypes2["Apple"] = "minecraft:apple";
      MinecraftItemTypes2["ArcherPotterySherd"] = "minecraft:archer_pottery_sherd";
      MinecraftItemTypes2["ArmadilloScute"] = "minecraft:armadillo_scute";
      MinecraftItemTypes2["ArmadilloSpawnEgg"] = "minecraft:armadillo_spawn_egg";
      MinecraftItemTypes2["ArmorStand"] = "minecraft:armor_stand";
      MinecraftItemTypes2["ArmsUpPotterySherd"] = "minecraft:arms_up_pottery_sherd";
      MinecraftItemTypes2["Arrow"] = "minecraft:arrow";
      MinecraftItemTypes2["AxolotlBucket"] = "minecraft:axolotl_bucket";
      MinecraftItemTypes2["AxolotlSpawnEgg"] = "minecraft:axolotl_spawn_egg";
      MinecraftItemTypes2["Azalea"] = "minecraft:azalea";
      MinecraftItemTypes2["AzaleaLeaves"] = "minecraft:azalea_leaves";
      MinecraftItemTypes2["AzaleaLeavesFlowered"] = "minecraft:azalea_leaves_flowered";
      MinecraftItemTypes2["AzureBluet"] = "minecraft:azure_bluet";
      MinecraftItemTypes2["BakedPotato"] = "minecraft:baked_potato";
      MinecraftItemTypes2["Bamboo"] = "minecraft:bamboo";
      MinecraftItemTypes2["BambooBlock"] = "minecraft:bamboo_block";
      MinecraftItemTypes2["BambooButton"] = "minecraft:bamboo_button";
      MinecraftItemTypes2["BambooChestRaft"] = "minecraft:bamboo_chest_raft";
      MinecraftItemTypes2["BambooDoor"] = "minecraft:bamboo_door";
      MinecraftItemTypes2["BambooFence"] = "minecraft:bamboo_fence";
      MinecraftItemTypes2["BambooFenceGate"] = "minecraft:bamboo_fence_gate";
      MinecraftItemTypes2["BambooHangingSign"] = "minecraft:bamboo_hanging_sign";
      MinecraftItemTypes2["BambooMosaic"] = "minecraft:bamboo_mosaic";
      MinecraftItemTypes2["BambooMosaicSlab"] = "minecraft:bamboo_mosaic_slab";
      MinecraftItemTypes2["BambooMosaicStairs"] = "minecraft:bamboo_mosaic_stairs";
      MinecraftItemTypes2["BambooPlanks"] = "minecraft:bamboo_planks";
      MinecraftItemTypes2["BambooPressurePlate"] = "minecraft:bamboo_pressure_plate";
      MinecraftItemTypes2["BambooRaft"] = "minecraft:bamboo_raft";
      MinecraftItemTypes2["BambooShelf"] = "minecraft:bamboo_shelf";
      MinecraftItemTypes2["BambooSign"] = "minecraft:bamboo_sign";
      MinecraftItemTypes2["BambooSlab"] = "minecraft:bamboo_slab";
      MinecraftItemTypes2["BambooStairs"] = "minecraft:bamboo_stairs";
      MinecraftItemTypes2["BambooTrapdoor"] = "minecraft:bamboo_trapdoor";
      MinecraftItemTypes2["Banner"] = "minecraft:banner";
      MinecraftItemTypes2["Barrel"] = "minecraft:barrel";
      MinecraftItemTypes2["Barrier"] = "minecraft:barrier";
      MinecraftItemTypes2["Basalt"] = "minecraft:basalt";
      MinecraftItemTypes2["BatSpawnEgg"] = "minecraft:bat_spawn_egg";
      MinecraftItemTypes2["Beacon"] = "minecraft:beacon";
      MinecraftItemTypes2["Bed"] = "minecraft:bed";
      MinecraftItemTypes2["Bedrock"] = "minecraft:bedrock";
      MinecraftItemTypes2["BeeNest"] = "minecraft:bee_nest";
      MinecraftItemTypes2["BeeSpawnEgg"] = "minecraft:bee_spawn_egg";
      MinecraftItemTypes2["Beef"] = "minecraft:beef";
      MinecraftItemTypes2["Beehive"] = "minecraft:beehive";
      MinecraftItemTypes2["Beetroot"] = "minecraft:beetroot";
      MinecraftItemTypes2["BeetrootSeeds"] = "minecraft:beetroot_seeds";
      MinecraftItemTypes2["BeetrootSoup"] = "minecraft:beetroot_soup";
      MinecraftItemTypes2["Bell"] = "minecraft:bell";
      MinecraftItemTypes2["BigDripleaf"] = "minecraft:big_dripleaf";
      MinecraftItemTypes2["BirchBoat"] = "minecraft:birch_boat";
      MinecraftItemTypes2["BirchButton"] = "minecraft:birch_button";
      MinecraftItemTypes2["BirchChestBoat"] = "minecraft:birch_chest_boat";
      MinecraftItemTypes2["BirchDoor"] = "minecraft:birch_door";
      MinecraftItemTypes2["BirchFence"] = "minecraft:birch_fence";
      MinecraftItemTypes2["BirchFenceGate"] = "minecraft:birch_fence_gate";
      MinecraftItemTypes2["BirchHangingSign"] = "minecraft:birch_hanging_sign";
      MinecraftItemTypes2["BirchLeaves"] = "minecraft:birch_leaves";
      MinecraftItemTypes2["BirchLog"] = "minecraft:birch_log";
      MinecraftItemTypes2["BirchPlanks"] = "minecraft:birch_planks";
      MinecraftItemTypes2["BirchPressurePlate"] = "minecraft:birch_pressure_plate";
      MinecraftItemTypes2["BirchSapling"] = "minecraft:birch_sapling";
      MinecraftItemTypes2["BirchShelf"] = "minecraft:birch_shelf";
      MinecraftItemTypes2["BirchSign"] = "minecraft:birch_sign";
      MinecraftItemTypes2["BirchSlab"] = "minecraft:birch_slab";
      MinecraftItemTypes2["BirchStairs"] = "minecraft:birch_stairs";
      MinecraftItemTypes2["BirchTrapdoor"] = "minecraft:birch_trapdoor";
      MinecraftItemTypes2["BirchWood"] = "minecraft:birch_wood";
      MinecraftItemTypes2["BlackBundle"] = "minecraft:black_bundle";
      MinecraftItemTypes2["BlackCandle"] = "minecraft:black_candle";
      MinecraftItemTypes2["BlackCarpet"] = "minecraft:black_carpet";
      MinecraftItemTypes2["BlackConcrete"] = "minecraft:black_concrete";
      MinecraftItemTypes2["BlackConcretePowder"] = "minecraft:black_concrete_powder";
      MinecraftItemTypes2["BlackDye"] = "minecraft:black_dye";
      MinecraftItemTypes2["BlackGlazedTerracotta"] = "minecraft:black_glazed_terracotta";
      MinecraftItemTypes2["BlackHarness"] = "minecraft:black_harness";
      MinecraftItemTypes2["BlackShulkerBox"] = "minecraft:black_shulker_box";
      MinecraftItemTypes2["BlackStainedGlass"] = "minecraft:black_stained_glass";
      MinecraftItemTypes2["BlackStainedGlassPane"] = "minecraft:black_stained_glass_pane";
      MinecraftItemTypes2["BlackTerracotta"] = "minecraft:black_terracotta";
      MinecraftItemTypes2["BlackWool"] = "minecraft:black_wool";
      MinecraftItemTypes2["Blackstone"] = "minecraft:blackstone";
      MinecraftItemTypes2["BlackstoneSlab"] = "minecraft:blackstone_slab";
      MinecraftItemTypes2["BlackstoneStairs"] = "minecraft:blackstone_stairs";
      MinecraftItemTypes2["BlackstoneWall"] = "minecraft:blackstone_wall";
      MinecraftItemTypes2["BladePotterySherd"] = "minecraft:blade_pottery_sherd";
      MinecraftItemTypes2["BlastFurnace"] = "minecraft:blast_furnace";
      MinecraftItemTypes2["BlazePowder"] = "minecraft:blaze_powder";
      MinecraftItemTypes2["BlazeRod"] = "minecraft:blaze_rod";
      MinecraftItemTypes2["BlazeSpawnEgg"] = "minecraft:blaze_spawn_egg";
      MinecraftItemTypes2["BlueBundle"] = "minecraft:blue_bundle";
      MinecraftItemTypes2["BlueCandle"] = "minecraft:blue_candle";
      MinecraftItemTypes2["BlueCarpet"] = "minecraft:blue_carpet";
      MinecraftItemTypes2["BlueConcrete"] = "minecraft:blue_concrete";
      MinecraftItemTypes2["BlueConcretePowder"] = "minecraft:blue_concrete_powder";
      MinecraftItemTypes2["BlueDye"] = "minecraft:blue_dye";
      MinecraftItemTypes2["BlueEgg"] = "minecraft:blue_egg";
      MinecraftItemTypes2["BlueGlazedTerracotta"] = "minecraft:blue_glazed_terracotta";
      MinecraftItemTypes2["BlueHarness"] = "minecraft:blue_harness";
      MinecraftItemTypes2["BlueIce"] = "minecraft:blue_ice";
      MinecraftItemTypes2["BlueOrchid"] = "minecraft:blue_orchid";
      MinecraftItemTypes2["BlueShulkerBox"] = "minecraft:blue_shulker_box";
      MinecraftItemTypes2["BlueStainedGlass"] = "minecraft:blue_stained_glass";
      MinecraftItemTypes2["BlueStainedGlassPane"] = "minecraft:blue_stained_glass_pane";
      MinecraftItemTypes2["BlueTerracotta"] = "minecraft:blue_terracotta";
      MinecraftItemTypes2["BlueWool"] = "minecraft:blue_wool";
      MinecraftItemTypes2["BoggedSpawnEgg"] = "minecraft:bogged_spawn_egg";
      MinecraftItemTypes2["BoltArmorTrimSmithingTemplate"] = "minecraft:bolt_armor_trim_smithing_template";
      MinecraftItemTypes2["Bone"] = "minecraft:bone";
      MinecraftItemTypes2["BoneBlock"] = "minecraft:bone_block";
      MinecraftItemTypes2["BoneMeal"] = "minecraft:bone_meal";
      MinecraftItemTypes2["Book"] = "minecraft:book";
      MinecraftItemTypes2["Bookshelf"] = "minecraft:bookshelf";
      MinecraftItemTypes2["BorderBlock"] = "minecraft:border_block";
      MinecraftItemTypes2["BordureIndentedBannerPattern"] = "minecraft:bordure_indented_banner_pattern";
      MinecraftItemTypes2["Bow"] = "minecraft:bow";
      MinecraftItemTypes2["Bowl"] = "minecraft:bowl";
      MinecraftItemTypes2["BrainCoral"] = "minecraft:brain_coral";
      MinecraftItemTypes2["BrainCoralBlock"] = "minecraft:brain_coral_block";
      MinecraftItemTypes2["BrainCoralFan"] = "minecraft:brain_coral_fan";
      MinecraftItemTypes2["Bread"] = "minecraft:bread";
      MinecraftItemTypes2["BreezeRod"] = "minecraft:breeze_rod";
      MinecraftItemTypes2["BreezeSpawnEgg"] = "minecraft:breeze_spawn_egg";
      MinecraftItemTypes2["BrewerPotterySherd"] = "minecraft:brewer_pottery_sherd";
      MinecraftItemTypes2["BrewingStand"] = "minecraft:brewing_stand";
      MinecraftItemTypes2["Brick"] = "minecraft:brick";
      MinecraftItemTypes2["BrickBlock"] = "minecraft:brick_block";
      MinecraftItemTypes2["BrickSlab"] = "minecraft:brick_slab";
      MinecraftItemTypes2["BrickStairs"] = "minecraft:brick_stairs";
      MinecraftItemTypes2["BrickWall"] = "minecraft:brick_wall";
      MinecraftItemTypes2["BrownBundle"] = "minecraft:brown_bundle";
      MinecraftItemTypes2["BrownCandle"] = "minecraft:brown_candle";
      MinecraftItemTypes2["BrownCarpet"] = "minecraft:brown_carpet";
      MinecraftItemTypes2["BrownConcrete"] = "minecraft:brown_concrete";
      MinecraftItemTypes2["BrownConcretePowder"] = "minecraft:brown_concrete_powder";
      MinecraftItemTypes2["BrownDye"] = "minecraft:brown_dye";
      MinecraftItemTypes2["BrownEgg"] = "minecraft:brown_egg";
      MinecraftItemTypes2["BrownGlazedTerracotta"] = "minecraft:brown_glazed_terracotta";
      MinecraftItemTypes2["BrownHarness"] = "minecraft:brown_harness";
      MinecraftItemTypes2["BrownMushroom"] = "minecraft:brown_mushroom";
      MinecraftItemTypes2["BrownMushroomBlock"] = "minecraft:brown_mushroom_block";
      MinecraftItemTypes2["BrownShulkerBox"] = "minecraft:brown_shulker_box";
      MinecraftItemTypes2["BrownStainedGlass"] = "minecraft:brown_stained_glass";
      MinecraftItemTypes2["BrownStainedGlassPane"] = "minecraft:brown_stained_glass_pane";
      MinecraftItemTypes2["BrownTerracotta"] = "minecraft:brown_terracotta";
      MinecraftItemTypes2["BrownWool"] = "minecraft:brown_wool";
      MinecraftItemTypes2["Brush"] = "minecraft:brush";
      MinecraftItemTypes2["BubbleCoral"] = "minecraft:bubble_coral";
      MinecraftItemTypes2["BubbleCoralBlock"] = "minecraft:bubble_coral_block";
      MinecraftItemTypes2["BubbleCoralFan"] = "minecraft:bubble_coral_fan";
      MinecraftItemTypes2["Bucket"] = "minecraft:bucket";
      MinecraftItemTypes2["BuddingAmethyst"] = "minecraft:budding_amethyst";
      MinecraftItemTypes2["Bundle"] = "minecraft:bundle";
      MinecraftItemTypes2["BurnPotterySherd"] = "minecraft:burn_pottery_sherd";
      MinecraftItemTypes2["Bush"] = "minecraft:bush";
      MinecraftItemTypes2["Cactus"] = "minecraft:cactus";
      MinecraftItemTypes2["CactusFlower"] = "minecraft:cactus_flower";
      MinecraftItemTypes2["Cake"] = "minecraft:cake";
      MinecraftItemTypes2["Calcite"] = "minecraft:calcite";
      MinecraftItemTypes2["CalibratedSculkSensor"] = "minecraft:calibrated_sculk_sensor";
      MinecraftItemTypes2["CamelSpawnEgg"] = "minecraft:camel_spawn_egg";
      MinecraftItemTypes2["Campfire"] = "minecraft:campfire";
      MinecraftItemTypes2["Candle"] = "minecraft:candle";
      MinecraftItemTypes2["Carrot"] = "minecraft:carrot";
      MinecraftItemTypes2["CarrotOnAStick"] = "minecraft:carrot_on_a_stick";
      MinecraftItemTypes2["CartographyTable"] = "minecraft:cartography_table";
      MinecraftItemTypes2["CarvedPumpkin"] = "minecraft:carved_pumpkin";
      MinecraftItemTypes2["CatSpawnEgg"] = "minecraft:cat_spawn_egg";
      MinecraftItemTypes2["Cauldron"] = "minecraft:cauldron";
      MinecraftItemTypes2["CaveSpiderSpawnEgg"] = "minecraft:cave_spider_spawn_egg";
      MinecraftItemTypes2["ChainCommandBlock"] = "minecraft:chain_command_block";
      MinecraftItemTypes2["ChainmailBoots"] = "minecraft:chainmail_boots";
      MinecraftItemTypes2["ChainmailChestplate"] = "minecraft:chainmail_chestplate";
      MinecraftItemTypes2["ChainmailHelmet"] = "minecraft:chainmail_helmet";
      MinecraftItemTypes2["ChainmailLeggings"] = "minecraft:chainmail_leggings";
      MinecraftItemTypes2["Charcoal"] = "minecraft:charcoal";
      MinecraftItemTypes2["CherryBoat"] = "minecraft:cherry_boat";
      MinecraftItemTypes2["CherryButton"] = "minecraft:cherry_button";
      MinecraftItemTypes2["CherryChestBoat"] = "minecraft:cherry_chest_boat";
      MinecraftItemTypes2["CherryDoor"] = "minecraft:cherry_door";
      MinecraftItemTypes2["CherryFence"] = "minecraft:cherry_fence";
      MinecraftItemTypes2["CherryFenceGate"] = "minecraft:cherry_fence_gate";
      MinecraftItemTypes2["CherryHangingSign"] = "minecraft:cherry_hanging_sign";
      MinecraftItemTypes2["CherryLeaves"] = "minecraft:cherry_leaves";
      MinecraftItemTypes2["CherryLog"] = "minecraft:cherry_log";
      MinecraftItemTypes2["CherryPlanks"] = "minecraft:cherry_planks";
      MinecraftItemTypes2["CherryPressurePlate"] = "minecraft:cherry_pressure_plate";
      MinecraftItemTypes2["CherrySapling"] = "minecraft:cherry_sapling";
      MinecraftItemTypes2["CherryShelf"] = "minecraft:cherry_shelf";
      MinecraftItemTypes2["CherrySign"] = "minecraft:cherry_sign";
      MinecraftItemTypes2["CherrySlab"] = "minecraft:cherry_slab";
      MinecraftItemTypes2["CherryStairs"] = "minecraft:cherry_stairs";
      MinecraftItemTypes2["CherryTrapdoor"] = "minecraft:cherry_trapdoor";
      MinecraftItemTypes2["CherryWood"] = "minecraft:cherry_wood";
      MinecraftItemTypes2["Chest"] = "minecraft:chest";
      MinecraftItemTypes2["ChestMinecart"] = "minecraft:chest_minecart";
      MinecraftItemTypes2["Chicken"] = "minecraft:chicken";
      MinecraftItemTypes2["ChickenSpawnEgg"] = "minecraft:chicken_spawn_egg";
      MinecraftItemTypes2["ChippedAnvil"] = "minecraft:chipped_anvil";
      MinecraftItemTypes2["ChiseledBookshelf"] = "minecraft:chiseled_bookshelf";
      MinecraftItemTypes2["ChiseledCopper"] = "minecraft:chiseled_copper";
      MinecraftItemTypes2["ChiseledDeepslate"] = "minecraft:chiseled_deepslate";
      MinecraftItemTypes2["ChiseledNetherBricks"] = "minecraft:chiseled_nether_bricks";
      MinecraftItemTypes2["ChiseledPolishedBlackstone"] = "minecraft:chiseled_polished_blackstone";
      MinecraftItemTypes2["ChiseledQuartzBlock"] = "minecraft:chiseled_quartz_block";
      MinecraftItemTypes2["ChiseledRedSandstone"] = "minecraft:chiseled_red_sandstone";
      MinecraftItemTypes2["ChiseledResinBricks"] = "minecraft:chiseled_resin_bricks";
      MinecraftItemTypes2["ChiseledSandstone"] = "minecraft:chiseled_sandstone";
      MinecraftItemTypes2["ChiseledStoneBricks"] = "minecraft:chiseled_stone_bricks";
      MinecraftItemTypes2["ChiseledTuff"] = "minecraft:chiseled_tuff";
      MinecraftItemTypes2["ChiseledTuffBricks"] = "minecraft:chiseled_tuff_bricks";
      MinecraftItemTypes2["ChorusFlower"] = "minecraft:chorus_flower";
      MinecraftItemTypes2["ChorusFruit"] = "minecraft:chorus_fruit";
      MinecraftItemTypes2["ChorusPlant"] = "minecraft:chorus_plant";
      MinecraftItemTypes2["Clay"] = "minecraft:clay";
      MinecraftItemTypes2["ClayBall"] = "minecraft:clay_ball";
      MinecraftItemTypes2["Clock"] = "minecraft:clock";
      MinecraftItemTypes2["ClosedEyeblossom"] = "minecraft:closed_eyeblossom";
      MinecraftItemTypes2["Coal"] = "minecraft:coal";
      MinecraftItemTypes2["CoalBlock"] = "minecraft:coal_block";
      MinecraftItemTypes2["CoalOre"] = "minecraft:coal_ore";
      MinecraftItemTypes2["CoarseDirt"] = "minecraft:coarse_dirt";
      MinecraftItemTypes2["CoastArmorTrimSmithingTemplate"] = "minecraft:coast_armor_trim_smithing_template";
      MinecraftItemTypes2["CobbledDeepslate"] = "minecraft:cobbled_deepslate";
      MinecraftItemTypes2["CobbledDeepslateSlab"] = "minecraft:cobbled_deepslate_slab";
      MinecraftItemTypes2["CobbledDeepslateStairs"] = "minecraft:cobbled_deepslate_stairs";
      MinecraftItemTypes2["CobbledDeepslateWall"] = "minecraft:cobbled_deepslate_wall";
      MinecraftItemTypes2["Cobblestone"] = "minecraft:cobblestone";
      MinecraftItemTypes2["CobblestoneSlab"] = "minecraft:cobblestone_slab";
      MinecraftItemTypes2["CobblestoneWall"] = "minecraft:cobblestone_wall";
      MinecraftItemTypes2["CocoaBeans"] = "minecraft:cocoa_beans";
      MinecraftItemTypes2["Cod"] = "minecraft:cod";
      MinecraftItemTypes2["CodBucket"] = "minecraft:cod_bucket";
      MinecraftItemTypes2["CodSpawnEgg"] = "minecraft:cod_spawn_egg";
      MinecraftItemTypes2["CommandBlock"] = "minecraft:command_block";
      MinecraftItemTypes2["CommandBlockMinecart"] = "minecraft:command_block_minecart";
      MinecraftItemTypes2["Comparator"] = "minecraft:comparator";
      MinecraftItemTypes2["Compass"] = "minecraft:compass";
      MinecraftItemTypes2["Composter"] = "minecraft:composter";
      MinecraftItemTypes2["Conduit"] = "minecraft:conduit";
      MinecraftItemTypes2["CookedBeef"] = "minecraft:cooked_beef";
      MinecraftItemTypes2["CookedChicken"] = "minecraft:cooked_chicken";
      MinecraftItemTypes2["CookedCod"] = "minecraft:cooked_cod";
      MinecraftItemTypes2["CookedMutton"] = "minecraft:cooked_mutton";
      MinecraftItemTypes2["CookedPorkchop"] = "minecraft:cooked_porkchop";
      MinecraftItemTypes2["CookedRabbit"] = "minecraft:cooked_rabbit";
      MinecraftItemTypes2["CookedSalmon"] = "minecraft:cooked_salmon";
      MinecraftItemTypes2["Cookie"] = "minecraft:cookie";
      MinecraftItemTypes2["CopperAxe"] = "minecraft:copper_axe";
      MinecraftItemTypes2["CopperBars"] = "minecraft:copper_bars";
      MinecraftItemTypes2["CopperBlock"] = "minecraft:copper_block";
      MinecraftItemTypes2["CopperBoots"] = "minecraft:copper_boots";
      MinecraftItemTypes2["CopperBulb"] = "minecraft:copper_bulb";
      MinecraftItemTypes2["CopperChain"] = "minecraft:copper_chain";
      MinecraftItemTypes2["CopperChest"] = "minecraft:copper_chest";
      MinecraftItemTypes2["CopperChestplate"] = "minecraft:copper_chestplate";
      MinecraftItemTypes2["CopperDoor"] = "minecraft:copper_door";
      MinecraftItemTypes2["CopperGolemSpawnEgg"] = "minecraft:copper_golem_spawn_egg";
      MinecraftItemTypes2["CopperGolemStatue"] = "minecraft:copper_golem_statue";
      MinecraftItemTypes2["CopperGrate"] = "minecraft:copper_grate";
      MinecraftItemTypes2["CopperHelmet"] = "minecraft:copper_helmet";
      MinecraftItemTypes2["CopperHoe"] = "minecraft:copper_hoe";
      MinecraftItemTypes2["CopperHorseArmor"] = "minecraft:copper_horse_armor";
      MinecraftItemTypes2["CopperIngot"] = "minecraft:copper_ingot";
      MinecraftItemTypes2["CopperLantern"] = "minecraft:copper_lantern";
      MinecraftItemTypes2["CopperLeggings"] = "minecraft:copper_leggings";
      MinecraftItemTypes2["CopperNugget"] = "minecraft:copper_nugget";
      MinecraftItemTypes2["CopperOre"] = "minecraft:copper_ore";
      MinecraftItemTypes2["CopperPickaxe"] = "minecraft:copper_pickaxe";
      MinecraftItemTypes2["CopperShovel"] = "minecraft:copper_shovel";
      MinecraftItemTypes2["CopperSword"] = "minecraft:copper_sword";
      MinecraftItemTypes2["CopperTorch"] = "minecraft:copper_torch";
      MinecraftItemTypes2["CopperTrapdoor"] = "minecraft:copper_trapdoor";
      MinecraftItemTypes2["Cornflower"] = "minecraft:cornflower";
      MinecraftItemTypes2["CowSpawnEgg"] = "minecraft:cow_spawn_egg";
      MinecraftItemTypes2["CrackedDeepslateBricks"] = "minecraft:cracked_deepslate_bricks";
      MinecraftItemTypes2["CrackedDeepslateTiles"] = "minecraft:cracked_deepslate_tiles";
      MinecraftItemTypes2["CrackedNetherBricks"] = "minecraft:cracked_nether_bricks";
      MinecraftItemTypes2["CrackedPolishedBlackstoneBricks"] = "minecraft:cracked_polished_blackstone_bricks";
      MinecraftItemTypes2["CrackedStoneBricks"] = "minecraft:cracked_stone_bricks";
      MinecraftItemTypes2["Crafter"] = "minecraft:crafter";
      MinecraftItemTypes2["CraftingTable"] = "minecraft:crafting_table";
      MinecraftItemTypes2["CreakingHeart"] = "minecraft:creaking_heart";
      MinecraftItemTypes2["CreakingSpawnEgg"] = "minecraft:creaking_spawn_egg";
      MinecraftItemTypes2["CreeperBannerPattern"] = "minecraft:creeper_banner_pattern";
      MinecraftItemTypes2["CreeperHead"] = "minecraft:creeper_head";
      MinecraftItemTypes2["CreeperSpawnEgg"] = "minecraft:creeper_spawn_egg";
      MinecraftItemTypes2["CrimsonButton"] = "minecraft:crimson_button";
      MinecraftItemTypes2["CrimsonDoor"] = "minecraft:crimson_door";
      MinecraftItemTypes2["CrimsonFence"] = "minecraft:crimson_fence";
      MinecraftItemTypes2["CrimsonFenceGate"] = "minecraft:crimson_fence_gate";
      MinecraftItemTypes2["CrimsonFungus"] = "minecraft:crimson_fungus";
      MinecraftItemTypes2["CrimsonHangingSign"] = "minecraft:crimson_hanging_sign";
      MinecraftItemTypes2["CrimsonHyphae"] = "minecraft:crimson_hyphae";
      MinecraftItemTypes2["CrimsonNylium"] = "minecraft:crimson_nylium";
      MinecraftItemTypes2["CrimsonPlanks"] = "minecraft:crimson_planks";
      MinecraftItemTypes2["CrimsonPressurePlate"] = "minecraft:crimson_pressure_plate";
      MinecraftItemTypes2["CrimsonRoots"] = "minecraft:crimson_roots";
      MinecraftItemTypes2["CrimsonShelf"] = "minecraft:crimson_shelf";
      MinecraftItemTypes2["CrimsonSign"] = "minecraft:crimson_sign";
      MinecraftItemTypes2["CrimsonSlab"] = "minecraft:crimson_slab";
      MinecraftItemTypes2["CrimsonStairs"] = "minecraft:crimson_stairs";
      MinecraftItemTypes2["CrimsonStem"] = "minecraft:crimson_stem";
      MinecraftItemTypes2["CrimsonTrapdoor"] = "minecraft:crimson_trapdoor";
      MinecraftItemTypes2["Crossbow"] = "minecraft:crossbow";
      MinecraftItemTypes2["CryingObsidian"] = "minecraft:crying_obsidian";
      MinecraftItemTypes2["CutCopper"] = "minecraft:cut_copper";
      MinecraftItemTypes2["CutCopperSlab"] = "minecraft:cut_copper_slab";
      MinecraftItemTypes2["CutCopperStairs"] = "minecraft:cut_copper_stairs";
      MinecraftItemTypes2["CutRedSandstone"] = "minecraft:cut_red_sandstone";
      MinecraftItemTypes2["CutRedSandstoneSlab"] = "minecraft:cut_red_sandstone_slab";
      MinecraftItemTypes2["CutSandstone"] = "minecraft:cut_sandstone";
      MinecraftItemTypes2["CutSandstoneSlab"] = "minecraft:cut_sandstone_slab";
      MinecraftItemTypes2["CyanBundle"] = "minecraft:cyan_bundle";
      MinecraftItemTypes2["CyanCandle"] = "minecraft:cyan_candle";
      MinecraftItemTypes2["CyanCarpet"] = "minecraft:cyan_carpet";
      MinecraftItemTypes2["CyanConcrete"] = "minecraft:cyan_concrete";
      MinecraftItemTypes2["CyanConcretePowder"] = "minecraft:cyan_concrete_powder";
      MinecraftItemTypes2["CyanDye"] = "minecraft:cyan_dye";
      MinecraftItemTypes2["CyanGlazedTerracotta"] = "minecraft:cyan_glazed_terracotta";
      MinecraftItemTypes2["CyanHarness"] = "minecraft:cyan_harness";
      MinecraftItemTypes2["CyanShulkerBox"] = "minecraft:cyan_shulker_box";
      MinecraftItemTypes2["CyanStainedGlass"] = "minecraft:cyan_stained_glass";
      MinecraftItemTypes2["CyanStainedGlassPane"] = "minecraft:cyan_stained_glass_pane";
      MinecraftItemTypes2["CyanTerracotta"] = "minecraft:cyan_terracotta";
      MinecraftItemTypes2["CyanWool"] = "minecraft:cyan_wool";
      MinecraftItemTypes2["DamagedAnvil"] = "minecraft:damaged_anvil";
      MinecraftItemTypes2["Dandelion"] = "minecraft:dandelion";
      MinecraftItemTypes2["DangerPotterySherd"] = "minecraft:danger_pottery_sherd";
      MinecraftItemTypes2["DarkOakBoat"] = "minecraft:dark_oak_boat";
      MinecraftItemTypes2["DarkOakButton"] = "minecraft:dark_oak_button";
      MinecraftItemTypes2["DarkOakChestBoat"] = "minecraft:dark_oak_chest_boat";
      MinecraftItemTypes2["DarkOakDoor"] = "minecraft:dark_oak_door";
      MinecraftItemTypes2["DarkOakFence"] = "minecraft:dark_oak_fence";
      MinecraftItemTypes2["DarkOakFenceGate"] = "minecraft:dark_oak_fence_gate";
      MinecraftItemTypes2["DarkOakHangingSign"] = "minecraft:dark_oak_hanging_sign";
      MinecraftItemTypes2["DarkOakLeaves"] = "minecraft:dark_oak_leaves";
      MinecraftItemTypes2["DarkOakLog"] = "minecraft:dark_oak_log";
      MinecraftItemTypes2["DarkOakPlanks"] = "minecraft:dark_oak_planks";
      MinecraftItemTypes2["DarkOakPressurePlate"] = "minecraft:dark_oak_pressure_plate";
      MinecraftItemTypes2["DarkOakSapling"] = "minecraft:dark_oak_sapling";
      MinecraftItemTypes2["DarkOakShelf"] = "minecraft:dark_oak_shelf";
      MinecraftItemTypes2["DarkOakSign"] = "minecraft:dark_oak_sign";
      MinecraftItemTypes2["DarkOakSlab"] = "minecraft:dark_oak_slab";
      MinecraftItemTypes2["DarkOakStairs"] = "minecraft:dark_oak_stairs";
      MinecraftItemTypes2["DarkOakTrapdoor"] = "minecraft:dark_oak_trapdoor";
      MinecraftItemTypes2["DarkOakWood"] = "minecraft:dark_oak_wood";
      MinecraftItemTypes2["DarkPrismarine"] = "minecraft:dark_prismarine";
      MinecraftItemTypes2["DarkPrismarineSlab"] = "minecraft:dark_prismarine_slab";
      MinecraftItemTypes2["DarkPrismarineStairs"] = "minecraft:dark_prismarine_stairs";
      MinecraftItemTypes2["DaylightDetector"] = "minecraft:daylight_detector";
      MinecraftItemTypes2["DeadBrainCoral"] = "minecraft:dead_brain_coral";
      MinecraftItemTypes2["DeadBrainCoralBlock"] = "minecraft:dead_brain_coral_block";
      MinecraftItemTypes2["DeadBrainCoralFan"] = "minecraft:dead_brain_coral_fan";
      MinecraftItemTypes2["DeadBubbleCoral"] = "minecraft:dead_bubble_coral";
      MinecraftItemTypes2["DeadBubbleCoralBlock"] = "minecraft:dead_bubble_coral_block";
      MinecraftItemTypes2["DeadBubbleCoralFan"] = "minecraft:dead_bubble_coral_fan";
      MinecraftItemTypes2["DeadFireCoral"] = "minecraft:dead_fire_coral";
      MinecraftItemTypes2["DeadFireCoralBlock"] = "minecraft:dead_fire_coral_block";
      MinecraftItemTypes2["DeadFireCoralFan"] = "minecraft:dead_fire_coral_fan";
      MinecraftItemTypes2["DeadHornCoral"] = "minecraft:dead_horn_coral";
      MinecraftItemTypes2["DeadHornCoralBlock"] = "minecraft:dead_horn_coral_block";
      MinecraftItemTypes2["DeadHornCoralFan"] = "minecraft:dead_horn_coral_fan";
      MinecraftItemTypes2["DeadTubeCoral"] = "minecraft:dead_tube_coral";
      MinecraftItemTypes2["DeadTubeCoralBlock"] = "minecraft:dead_tube_coral_block";
      MinecraftItemTypes2["DeadTubeCoralFan"] = "minecraft:dead_tube_coral_fan";
      MinecraftItemTypes2["Deadbush"] = "minecraft:deadbush";
      MinecraftItemTypes2["DecoratedPot"] = "minecraft:decorated_pot";
      MinecraftItemTypes2["Deepslate"] = "minecraft:deepslate";
      MinecraftItemTypes2["DeepslateBrickSlab"] = "minecraft:deepslate_brick_slab";
      MinecraftItemTypes2["DeepslateBrickStairs"] = "minecraft:deepslate_brick_stairs";
      MinecraftItemTypes2["DeepslateBrickWall"] = "minecraft:deepslate_brick_wall";
      MinecraftItemTypes2["DeepslateBricks"] = "minecraft:deepslate_bricks";
      MinecraftItemTypes2["DeepslateCoalOre"] = "minecraft:deepslate_coal_ore";
      MinecraftItemTypes2["DeepslateCopperOre"] = "minecraft:deepslate_copper_ore";
      MinecraftItemTypes2["DeepslateDiamondOre"] = "minecraft:deepslate_diamond_ore";
      MinecraftItemTypes2["DeepslateEmeraldOre"] = "minecraft:deepslate_emerald_ore";
      MinecraftItemTypes2["DeepslateGoldOre"] = "minecraft:deepslate_gold_ore";
      MinecraftItemTypes2["DeepslateIronOre"] = "minecraft:deepslate_iron_ore";
      MinecraftItemTypes2["DeepslateLapisOre"] = "minecraft:deepslate_lapis_ore";
      MinecraftItemTypes2["DeepslateRedstoneOre"] = "minecraft:deepslate_redstone_ore";
      MinecraftItemTypes2["DeepslateTileSlab"] = "minecraft:deepslate_tile_slab";
      MinecraftItemTypes2["DeepslateTileStairs"] = "minecraft:deepslate_tile_stairs";
      MinecraftItemTypes2["DeepslateTileWall"] = "minecraft:deepslate_tile_wall";
      MinecraftItemTypes2["DeepslateTiles"] = "minecraft:deepslate_tiles";
      MinecraftItemTypes2["Deny"] = "minecraft:deny";
      MinecraftItemTypes2["DetectorRail"] = "minecraft:detector_rail";
      MinecraftItemTypes2["Diamond"] = "minecraft:diamond";
      MinecraftItemTypes2["DiamondAxe"] = "minecraft:diamond_axe";
      MinecraftItemTypes2["DiamondBlock"] = "minecraft:diamond_block";
      MinecraftItemTypes2["DiamondBoots"] = "minecraft:diamond_boots";
      MinecraftItemTypes2["DiamondChestplate"] = "minecraft:diamond_chestplate";
      MinecraftItemTypes2["DiamondHelmet"] = "minecraft:diamond_helmet";
      MinecraftItemTypes2["DiamondHoe"] = "minecraft:diamond_hoe";
      MinecraftItemTypes2["DiamondHorseArmor"] = "minecraft:diamond_horse_armor";
      MinecraftItemTypes2["DiamondLeggings"] = "minecraft:diamond_leggings";
      MinecraftItemTypes2["DiamondOre"] = "minecraft:diamond_ore";
      MinecraftItemTypes2["DiamondPickaxe"] = "minecraft:diamond_pickaxe";
      MinecraftItemTypes2["DiamondShovel"] = "minecraft:diamond_shovel";
      MinecraftItemTypes2["DiamondSword"] = "minecraft:diamond_sword";
      MinecraftItemTypes2["Diorite"] = "minecraft:diorite";
      MinecraftItemTypes2["DioriteSlab"] = "minecraft:diorite_slab";
      MinecraftItemTypes2["DioriteStairs"] = "minecraft:diorite_stairs";
      MinecraftItemTypes2["DioriteWall"] = "minecraft:diorite_wall";
      MinecraftItemTypes2["Dirt"] = "minecraft:dirt";
      MinecraftItemTypes2["DirtWithRoots"] = "minecraft:dirt_with_roots";
      MinecraftItemTypes2["DiscFragment5"] = "minecraft:disc_fragment_5";
      MinecraftItemTypes2["Dispenser"] = "minecraft:dispenser";
      MinecraftItemTypes2["DolphinSpawnEgg"] = "minecraft:dolphin_spawn_egg";
      MinecraftItemTypes2["DonkeySpawnEgg"] = "minecraft:donkey_spawn_egg";
      MinecraftItemTypes2["DragonBreath"] = "minecraft:dragon_breath";
      MinecraftItemTypes2["DragonEgg"] = "minecraft:dragon_egg";
      MinecraftItemTypes2["DragonHead"] = "minecraft:dragon_head";
      MinecraftItemTypes2["DriedGhast"] = "minecraft:dried_ghast";
      MinecraftItemTypes2["DriedKelp"] = "minecraft:dried_kelp";
      MinecraftItemTypes2["DriedKelpBlock"] = "minecraft:dried_kelp_block";
      MinecraftItemTypes2["DripstoneBlock"] = "minecraft:dripstone_block";
      MinecraftItemTypes2["Dropper"] = "minecraft:dropper";
      MinecraftItemTypes2["DrownedSpawnEgg"] = "minecraft:drowned_spawn_egg";
      MinecraftItemTypes2["DuneArmorTrimSmithingTemplate"] = "minecraft:dune_armor_trim_smithing_template";
      MinecraftItemTypes2["EchoShard"] = "minecraft:echo_shard";
      MinecraftItemTypes2["Egg"] = "minecraft:egg";
      MinecraftItemTypes2["ElderGuardianSpawnEgg"] = "minecraft:elder_guardian_spawn_egg";
      MinecraftItemTypes2["Elytra"] = "minecraft:elytra";
      MinecraftItemTypes2["Emerald"] = "minecraft:emerald";
      MinecraftItemTypes2["EmeraldBlock"] = "minecraft:emerald_block";
      MinecraftItemTypes2["EmeraldOre"] = "minecraft:emerald_ore";
      MinecraftItemTypes2["EmptyMap"] = "minecraft:empty_map";
      MinecraftItemTypes2["EnchantedBook"] = "minecraft:enchanted_book";
      MinecraftItemTypes2["EnchantedGoldenApple"] = "minecraft:enchanted_golden_apple";
      MinecraftItemTypes2["EnchantingTable"] = "minecraft:enchanting_table";
      MinecraftItemTypes2["EndBrickStairs"] = "minecraft:end_brick_stairs";
      MinecraftItemTypes2["EndBricks"] = "minecraft:end_bricks";
      MinecraftItemTypes2["EndCrystal"] = "minecraft:end_crystal";
      MinecraftItemTypes2["EndPortalFrame"] = "minecraft:end_portal_frame";
      MinecraftItemTypes2["EndRod"] = "minecraft:end_rod";
      MinecraftItemTypes2["EndStone"] = "minecraft:end_stone";
      MinecraftItemTypes2["EndStoneBrickSlab"] = "minecraft:end_stone_brick_slab";
      MinecraftItemTypes2["EndStoneBrickWall"] = "minecraft:end_stone_brick_wall";
      MinecraftItemTypes2["EnderChest"] = "minecraft:ender_chest";
      MinecraftItemTypes2["EnderDragonSpawnEgg"] = "minecraft:ender_dragon_spawn_egg";
      MinecraftItemTypes2["EnderEye"] = "minecraft:ender_eye";
      MinecraftItemTypes2["EnderPearl"] = "minecraft:ender_pearl";
      MinecraftItemTypes2["EndermanSpawnEgg"] = "minecraft:enderman_spawn_egg";
      MinecraftItemTypes2["EndermiteSpawnEgg"] = "minecraft:endermite_spawn_egg";
      MinecraftItemTypes2["EvokerSpawnEgg"] = "minecraft:evoker_spawn_egg";
      MinecraftItemTypes2["ExperienceBottle"] = "minecraft:experience_bottle";
      MinecraftItemTypes2["ExplorerPotterySherd"] = "minecraft:explorer_pottery_sherd";
      MinecraftItemTypes2["ExposedChiseledCopper"] = "minecraft:exposed_chiseled_copper";
      MinecraftItemTypes2["ExposedCopper"] = "minecraft:exposed_copper";
      MinecraftItemTypes2["ExposedCopperBars"] = "minecraft:exposed_copper_bars";
      MinecraftItemTypes2["ExposedCopperBulb"] = "minecraft:exposed_copper_bulb";
      MinecraftItemTypes2["ExposedCopperChain"] = "minecraft:exposed_copper_chain";
      MinecraftItemTypes2["ExposedCopperChest"] = "minecraft:exposed_copper_chest";
      MinecraftItemTypes2["ExposedCopperDoor"] = "minecraft:exposed_copper_door";
      MinecraftItemTypes2["ExposedCopperGolemStatue"] = "minecraft:exposed_copper_golem_statue";
      MinecraftItemTypes2["ExposedCopperGrate"] = "minecraft:exposed_copper_grate";
      MinecraftItemTypes2["ExposedCopperLantern"] = "minecraft:exposed_copper_lantern";
      MinecraftItemTypes2["ExposedCopperTrapdoor"] = "minecraft:exposed_copper_trapdoor";
      MinecraftItemTypes2["ExposedCutCopper"] = "minecraft:exposed_cut_copper";
      MinecraftItemTypes2["ExposedCutCopperSlab"] = "minecraft:exposed_cut_copper_slab";
      MinecraftItemTypes2["ExposedCutCopperStairs"] = "minecraft:exposed_cut_copper_stairs";
      MinecraftItemTypes2["ExposedLightningRod"] = "minecraft:exposed_lightning_rod";
      MinecraftItemTypes2["EyeArmorTrimSmithingTemplate"] = "minecraft:eye_armor_trim_smithing_template";
      MinecraftItemTypes2["Farmland"] = "minecraft:farmland";
      MinecraftItemTypes2["Feather"] = "minecraft:feather";
      MinecraftItemTypes2["FenceGate"] = "minecraft:fence_gate";
      MinecraftItemTypes2["FermentedSpiderEye"] = "minecraft:fermented_spider_eye";
      MinecraftItemTypes2["Fern"] = "minecraft:fern";
      MinecraftItemTypes2["FieldMasonedBannerPattern"] = "minecraft:field_masoned_banner_pattern";
      MinecraftItemTypes2["FilledMap"] = "minecraft:filled_map";
      MinecraftItemTypes2["FireCharge"] = "minecraft:fire_charge";
      MinecraftItemTypes2["FireCoral"] = "minecraft:fire_coral";
      MinecraftItemTypes2["FireCoralBlock"] = "minecraft:fire_coral_block";
      MinecraftItemTypes2["FireCoralFan"] = "minecraft:fire_coral_fan";
      MinecraftItemTypes2["FireflyBush"] = "minecraft:firefly_bush";
      MinecraftItemTypes2["FireworkRocket"] = "minecraft:firework_rocket";
      MinecraftItemTypes2["FireworkStar"] = "minecraft:firework_star";
      MinecraftItemTypes2["FishingRod"] = "minecraft:fishing_rod";
      MinecraftItemTypes2["FletchingTable"] = "minecraft:fletching_table";
      MinecraftItemTypes2["Flint"] = "minecraft:flint";
      MinecraftItemTypes2["FlintAndSteel"] = "minecraft:flint_and_steel";
      MinecraftItemTypes2["FlowArmorTrimSmithingTemplate"] = "minecraft:flow_armor_trim_smithing_template";
      MinecraftItemTypes2["FlowBannerPattern"] = "minecraft:flow_banner_pattern";
      MinecraftItemTypes2["FlowPotterySherd"] = "minecraft:flow_pottery_sherd";
      MinecraftItemTypes2["FlowerBannerPattern"] = "minecraft:flower_banner_pattern";
      MinecraftItemTypes2["FlowerPot"] = "minecraft:flower_pot";
      MinecraftItemTypes2["FloweringAzalea"] = "minecraft:flowering_azalea";
      MinecraftItemTypes2["FoxSpawnEgg"] = "minecraft:fox_spawn_egg";
      MinecraftItemTypes2["Frame"] = "minecraft:frame";
      MinecraftItemTypes2["FriendPotterySherd"] = "minecraft:friend_pottery_sherd";
      MinecraftItemTypes2["FrogSpawn"] = "minecraft:frog_spawn";
      MinecraftItemTypes2["FrogSpawnEgg"] = "minecraft:frog_spawn_egg";
      MinecraftItemTypes2["FrostedIce"] = "minecraft:frosted_ice";
      MinecraftItemTypes2["Furnace"] = "minecraft:furnace";
      MinecraftItemTypes2["GhastSpawnEgg"] = "minecraft:ghast_spawn_egg";
      MinecraftItemTypes2["GhastTear"] = "minecraft:ghast_tear";
      MinecraftItemTypes2["GildedBlackstone"] = "minecraft:gilded_blackstone";
      MinecraftItemTypes2["Glass"] = "minecraft:glass";
      MinecraftItemTypes2["GlassBottle"] = "minecraft:glass_bottle";
      MinecraftItemTypes2["GlassPane"] = "minecraft:glass_pane";
      MinecraftItemTypes2["GlisteringMelonSlice"] = "minecraft:glistering_melon_slice";
      MinecraftItemTypes2["GlobeBannerPattern"] = "minecraft:globe_banner_pattern";
      MinecraftItemTypes2["GlowBerries"] = "minecraft:glow_berries";
      MinecraftItemTypes2["GlowFrame"] = "minecraft:glow_frame";
      MinecraftItemTypes2["GlowInkSac"] = "minecraft:glow_ink_sac";
      MinecraftItemTypes2["GlowLichen"] = "minecraft:glow_lichen";
      MinecraftItemTypes2["GlowSquidSpawnEgg"] = "minecraft:glow_squid_spawn_egg";
      MinecraftItemTypes2["Glowstone"] = "minecraft:glowstone";
      MinecraftItemTypes2["GlowstoneDust"] = "minecraft:glowstone_dust";
      MinecraftItemTypes2["GoatHorn"] = "minecraft:goat_horn";
      MinecraftItemTypes2["GoatSpawnEgg"] = "minecraft:goat_spawn_egg";
      MinecraftItemTypes2["GoldBlock"] = "minecraft:gold_block";
      MinecraftItemTypes2["GoldIngot"] = "minecraft:gold_ingot";
      MinecraftItemTypes2["GoldNugget"] = "minecraft:gold_nugget";
      MinecraftItemTypes2["GoldOre"] = "minecraft:gold_ore";
      MinecraftItemTypes2["GoldenApple"] = "minecraft:golden_apple";
      MinecraftItemTypes2["GoldenAxe"] = "minecraft:golden_axe";
      MinecraftItemTypes2["GoldenBoots"] = "minecraft:golden_boots";
      MinecraftItemTypes2["GoldenCarrot"] = "minecraft:golden_carrot";
      MinecraftItemTypes2["GoldenChestplate"] = "minecraft:golden_chestplate";
      MinecraftItemTypes2["GoldenHelmet"] = "minecraft:golden_helmet";
      MinecraftItemTypes2["GoldenHoe"] = "minecraft:golden_hoe";
      MinecraftItemTypes2["GoldenHorseArmor"] = "minecraft:golden_horse_armor";
      MinecraftItemTypes2["GoldenLeggings"] = "minecraft:golden_leggings";
      MinecraftItemTypes2["GoldenPickaxe"] = "minecraft:golden_pickaxe";
      MinecraftItemTypes2["GoldenRail"] = "minecraft:golden_rail";
      MinecraftItemTypes2["GoldenShovel"] = "minecraft:golden_shovel";
      MinecraftItemTypes2["GoldenSword"] = "minecraft:golden_sword";
      MinecraftItemTypes2["Granite"] = "minecraft:granite";
      MinecraftItemTypes2["GraniteSlab"] = "minecraft:granite_slab";
      MinecraftItemTypes2["GraniteStairs"] = "minecraft:granite_stairs";
      MinecraftItemTypes2["GraniteWall"] = "minecraft:granite_wall";
      MinecraftItemTypes2["GrassBlock"] = "minecraft:grass_block";
      MinecraftItemTypes2["GrassPath"] = "minecraft:grass_path";
      MinecraftItemTypes2["Gravel"] = "minecraft:gravel";
      MinecraftItemTypes2["GrayBundle"] = "minecraft:gray_bundle";
      MinecraftItemTypes2["GrayCandle"] = "minecraft:gray_candle";
      MinecraftItemTypes2["GrayCarpet"] = "minecraft:gray_carpet";
      MinecraftItemTypes2["GrayConcrete"] = "minecraft:gray_concrete";
      MinecraftItemTypes2["GrayConcretePowder"] = "minecraft:gray_concrete_powder";
      MinecraftItemTypes2["GrayDye"] = "minecraft:gray_dye";
      MinecraftItemTypes2["GrayGlazedTerracotta"] = "minecraft:gray_glazed_terracotta";
      MinecraftItemTypes2["GrayHarness"] = "minecraft:gray_harness";
      MinecraftItemTypes2["GrayShulkerBox"] = "minecraft:gray_shulker_box";
      MinecraftItemTypes2["GrayStainedGlass"] = "minecraft:gray_stained_glass";
      MinecraftItemTypes2["GrayStainedGlassPane"] = "minecraft:gray_stained_glass_pane";
      MinecraftItemTypes2["GrayTerracotta"] = "minecraft:gray_terracotta";
      MinecraftItemTypes2["GrayWool"] = "minecraft:gray_wool";
      MinecraftItemTypes2["GreenBundle"] = "minecraft:green_bundle";
      MinecraftItemTypes2["GreenCandle"] = "minecraft:green_candle";
      MinecraftItemTypes2["GreenCarpet"] = "minecraft:green_carpet";
      MinecraftItemTypes2["GreenConcrete"] = "minecraft:green_concrete";
      MinecraftItemTypes2["GreenConcretePowder"] = "minecraft:green_concrete_powder";
      MinecraftItemTypes2["GreenDye"] = "minecraft:green_dye";
      MinecraftItemTypes2["GreenGlazedTerracotta"] = "minecraft:green_glazed_terracotta";
      MinecraftItemTypes2["GreenHarness"] = "minecraft:green_harness";
      MinecraftItemTypes2["GreenShulkerBox"] = "minecraft:green_shulker_box";
      MinecraftItemTypes2["GreenStainedGlass"] = "minecraft:green_stained_glass";
      MinecraftItemTypes2["GreenStainedGlassPane"] = "minecraft:green_stained_glass_pane";
      MinecraftItemTypes2["GreenTerracotta"] = "minecraft:green_terracotta";
      MinecraftItemTypes2["GreenWool"] = "minecraft:green_wool";
      MinecraftItemTypes2["Grindstone"] = "minecraft:grindstone";
      MinecraftItemTypes2["GuardianSpawnEgg"] = "minecraft:guardian_spawn_egg";
      MinecraftItemTypes2["Gunpowder"] = "minecraft:gunpowder";
      MinecraftItemTypes2["GusterBannerPattern"] = "minecraft:guster_banner_pattern";
      MinecraftItemTypes2["GusterPotterySherd"] = "minecraft:guster_pottery_sherd";
      MinecraftItemTypes2["HangingRoots"] = "minecraft:hanging_roots";
      MinecraftItemTypes2["HappyGhastSpawnEgg"] = "minecraft:happy_ghast_spawn_egg";
      MinecraftItemTypes2["HardenedClay"] = "minecraft:hardened_clay";
      MinecraftItemTypes2["HayBlock"] = "minecraft:hay_block";
      MinecraftItemTypes2["HeartOfTheSea"] = "minecraft:heart_of_the_sea";
      MinecraftItemTypes2["HeartPotterySherd"] = "minecraft:heart_pottery_sherd";
      MinecraftItemTypes2["HeartbreakPotterySherd"] = "minecraft:heartbreak_pottery_sherd";
      MinecraftItemTypes2["HeavyCore"] = "minecraft:heavy_core";
      MinecraftItemTypes2["HeavyWeightedPressurePlate"] = "minecraft:heavy_weighted_pressure_plate";
      MinecraftItemTypes2["HoglinSpawnEgg"] = "minecraft:hoglin_spawn_egg";
      MinecraftItemTypes2["HoneyBlock"] = "minecraft:honey_block";
      MinecraftItemTypes2["HoneyBottle"] = "minecraft:honey_bottle";
      MinecraftItemTypes2["Honeycomb"] = "minecraft:honeycomb";
      MinecraftItemTypes2["HoneycombBlock"] = "minecraft:honeycomb_block";
      MinecraftItemTypes2["Hopper"] = "minecraft:hopper";
      MinecraftItemTypes2["HopperMinecart"] = "minecraft:hopper_minecart";
      MinecraftItemTypes2["HornCoral"] = "minecraft:horn_coral";
      MinecraftItemTypes2["HornCoralBlock"] = "minecraft:horn_coral_block";
      MinecraftItemTypes2["HornCoralFan"] = "minecraft:horn_coral_fan";
      MinecraftItemTypes2["HorseSpawnEgg"] = "minecraft:horse_spawn_egg";
      MinecraftItemTypes2["HostArmorTrimSmithingTemplate"] = "minecraft:host_armor_trim_smithing_template";
      MinecraftItemTypes2["HowlPotterySherd"] = "minecraft:howl_pottery_sherd";
      MinecraftItemTypes2["HuskSpawnEgg"] = "minecraft:husk_spawn_egg";
      MinecraftItemTypes2["Ice"] = "minecraft:ice";
      MinecraftItemTypes2["InfestedChiseledStoneBricks"] = "minecraft:infested_chiseled_stone_bricks";
      MinecraftItemTypes2["InfestedCobblestone"] = "minecraft:infested_cobblestone";
      MinecraftItemTypes2["InfestedCrackedStoneBricks"] = "minecraft:infested_cracked_stone_bricks";
      MinecraftItemTypes2["InfestedDeepslate"] = "minecraft:infested_deepslate";
      MinecraftItemTypes2["InfestedMossyStoneBricks"] = "minecraft:infested_mossy_stone_bricks";
      MinecraftItemTypes2["InfestedStone"] = "minecraft:infested_stone";
      MinecraftItemTypes2["InfestedStoneBricks"] = "minecraft:infested_stone_bricks";
      MinecraftItemTypes2["InkSac"] = "minecraft:ink_sac";
      MinecraftItemTypes2["IronAxe"] = "minecraft:iron_axe";
      MinecraftItemTypes2["IronBars"] = "minecraft:iron_bars";
      MinecraftItemTypes2["IronBlock"] = "minecraft:iron_block";
      MinecraftItemTypes2["IronBoots"] = "minecraft:iron_boots";
      MinecraftItemTypes2["IronChain"] = "minecraft:iron_chain";
      MinecraftItemTypes2["IronChestplate"] = "minecraft:iron_chestplate";
      MinecraftItemTypes2["IronDoor"] = "minecraft:iron_door";
      MinecraftItemTypes2["IronGolemSpawnEgg"] = "minecraft:iron_golem_spawn_egg";
      MinecraftItemTypes2["IronHelmet"] = "minecraft:iron_helmet";
      MinecraftItemTypes2["IronHoe"] = "minecraft:iron_hoe";
      MinecraftItemTypes2["IronHorseArmor"] = "minecraft:iron_horse_armor";
      MinecraftItemTypes2["IronIngot"] = "minecraft:iron_ingot";
      MinecraftItemTypes2["IronLeggings"] = "minecraft:iron_leggings";
      MinecraftItemTypes2["IronNugget"] = "minecraft:iron_nugget";
      MinecraftItemTypes2["IronOre"] = "minecraft:iron_ore";
      MinecraftItemTypes2["IronPickaxe"] = "minecraft:iron_pickaxe";
      MinecraftItemTypes2["IronShovel"] = "minecraft:iron_shovel";
      MinecraftItemTypes2["IronSword"] = "minecraft:iron_sword";
      MinecraftItemTypes2["IronTrapdoor"] = "minecraft:iron_trapdoor";
      MinecraftItemTypes2["Jigsaw"] = "minecraft:jigsaw";
      MinecraftItemTypes2["Jukebox"] = "minecraft:jukebox";
      MinecraftItemTypes2["JungleBoat"] = "minecraft:jungle_boat";
      MinecraftItemTypes2["JungleButton"] = "minecraft:jungle_button";
      MinecraftItemTypes2["JungleChestBoat"] = "minecraft:jungle_chest_boat";
      MinecraftItemTypes2["JungleDoor"] = "minecraft:jungle_door";
      MinecraftItemTypes2["JungleFence"] = "minecraft:jungle_fence";
      MinecraftItemTypes2["JungleFenceGate"] = "minecraft:jungle_fence_gate";
      MinecraftItemTypes2["JungleHangingSign"] = "minecraft:jungle_hanging_sign";
      MinecraftItemTypes2["JungleLeaves"] = "minecraft:jungle_leaves";
      MinecraftItemTypes2["JungleLog"] = "minecraft:jungle_log";
      MinecraftItemTypes2["JunglePlanks"] = "minecraft:jungle_planks";
      MinecraftItemTypes2["JunglePressurePlate"] = "minecraft:jungle_pressure_plate";
      MinecraftItemTypes2["JungleSapling"] = "minecraft:jungle_sapling";
      MinecraftItemTypes2["JungleShelf"] = "minecraft:jungle_shelf";
      MinecraftItemTypes2["JungleSign"] = "minecraft:jungle_sign";
      MinecraftItemTypes2["JungleSlab"] = "minecraft:jungle_slab";
      MinecraftItemTypes2["JungleStairs"] = "minecraft:jungle_stairs";
      MinecraftItemTypes2["JungleTrapdoor"] = "minecraft:jungle_trapdoor";
      MinecraftItemTypes2["JungleWood"] = "minecraft:jungle_wood";
      MinecraftItemTypes2["Kelp"] = "minecraft:kelp";
      MinecraftItemTypes2["Ladder"] = "minecraft:ladder";
      MinecraftItemTypes2["Lantern"] = "minecraft:lantern";
      MinecraftItemTypes2["LapisBlock"] = "minecraft:lapis_block";
      MinecraftItemTypes2["LapisLazuli"] = "minecraft:lapis_lazuli";
      MinecraftItemTypes2["LapisOre"] = "minecraft:lapis_ore";
      MinecraftItemTypes2["LargeAmethystBud"] = "minecraft:large_amethyst_bud";
      MinecraftItemTypes2["LargeFern"] = "minecraft:large_fern";
      MinecraftItemTypes2["LavaBucket"] = "minecraft:lava_bucket";
      MinecraftItemTypes2["Lead"] = "minecraft:lead";
      MinecraftItemTypes2["LeafLitter"] = "minecraft:leaf_litter";
      MinecraftItemTypes2["Leather"] = "minecraft:leather";
      MinecraftItemTypes2["LeatherBoots"] = "minecraft:leather_boots";
      MinecraftItemTypes2["LeatherChestplate"] = "minecraft:leather_chestplate";
      MinecraftItemTypes2["LeatherHelmet"] = "minecraft:leather_helmet";
      MinecraftItemTypes2["LeatherHorseArmor"] = "minecraft:leather_horse_armor";
      MinecraftItemTypes2["LeatherLeggings"] = "minecraft:leather_leggings";
      MinecraftItemTypes2["Lectern"] = "minecraft:lectern";
      MinecraftItemTypes2["Lever"] = "minecraft:lever";
      MinecraftItemTypes2["LightBlock0"] = "minecraft:light_block_0";
      MinecraftItemTypes2["LightBlock1"] = "minecraft:light_block_1";
      MinecraftItemTypes2["LightBlock10"] = "minecraft:light_block_10";
      MinecraftItemTypes2["LightBlock11"] = "minecraft:light_block_11";
      MinecraftItemTypes2["LightBlock12"] = "minecraft:light_block_12";
      MinecraftItemTypes2["LightBlock13"] = "minecraft:light_block_13";
      MinecraftItemTypes2["LightBlock14"] = "minecraft:light_block_14";
      MinecraftItemTypes2["LightBlock15"] = "minecraft:light_block_15";
      MinecraftItemTypes2["LightBlock2"] = "minecraft:light_block_2";
      MinecraftItemTypes2["LightBlock3"] = "minecraft:light_block_3";
      MinecraftItemTypes2["LightBlock4"] = "minecraft:light_block_4";
      MinecraftItemTypes2["LightBlock5"] = "minecraft:light_block_5";
      MinecraftItemTypes2["LightBlock6"] = "minecraft:light_block_6";
      MinecraftItemTypes2["LightBlock7"] = "minecraft:light_block_7";
      MinecraftItemTypes2["LightBlock8"] = "minecraft:light_block_8";
      MinecraftItemTypes2["LightBlock9"] = "minecraft:light_block_9";
      MinecraftItemTypes2["LightBlueBundle"] = "minecraft:light_blue_bundle";
      MinecraftItemTypes2["LightBlueCandle"] = "minecraft:light_blue_candle";
      MinecraftItemTypes2["LightBlueCarpet"] = "minecraft:light_blue_carpet";
      MinecraftItemTypes2["LightBlueConcrete"] = "minecraft:light_blue_concrete";
      MinecraftItemTypes2["LightBlueConcretePowder"] = "minecraft:light_blue_concrete_powder";
      MinecraftItemTypes2["LightBlueDye"] = "minecraft:light_blue_dye";
      MinecraftItemTypes2["LightBlueGlazedTerracotta"] = "minecraft:light_blue_glazed_terracotta";
      MinecraftItemTypes2["LightBlueHarness"] = "minecraft:light_blue_harness";
      MinecraftItemTypes2["LightBlueShulkerBox"] = "minecraft:light_blue_shulker_box";
      MinecraftItemTypes2["LightBlueStainedGlass"] = "minecraft:light_blue_stained_glass";
      MinecraftItemTypes2["LightBlueStainedGlassPane"] = "minecraft:light_blue_stained_glass_pane";
      MinecraftItemTypes2["LightBlueTerracotta"] = "minecraft:light_blue_terracotta";
      MinecraftItemTypes2["LightBlueWool"] = "minecraft:light_blue_wool";
      MinecraftItemTypes2["LightGrayBundle"] = "minecraft:light_gray_bundle";
      MinecraftItemTypes2["LightGrayCandle"] = "minecraft:light_gray_candle";
      MinecraftItemTypes2["LightGrayCarpet"] = "minecraft:light_gray_carpet";
      MinecraftItemTypes2["LightGrayConcrete"] = "minecraft:light_gray_concrete";
      MinecraftItemTypes2["LightGrayConcretePowder"] = "minecraft:light_gray_concrete_powder";
      MinecraftItemTypes2["LightGrayDye"] = "minecraft:light_gray_dye";
      MinecraftItemTypes2["LightGrayHarness"] = "minecraft:light_gray_harness";
      MinecraftItemTypes2["LightGrayShulkerBox"] = "minecraft:light_gray_shulker_box";
      MinecraftItemTypes2["LightGrayStainedGlass"] = "minecraft:light_gray_stained_glass";
      MinecraftItemTypes2["LightGrayStainedGlassPane"] = "minecraft:light_gray_stained_glass_pane";
      MinecraftItemTypes2["LightGrayTerracotta"] = "minecraft:light_gray_terracotta";
      MinecraftItemTypes2["LightGrayWool"] = "minecraft:light_gray_wool";
      MinecraftItemTypes2["LightWeightedPressurePlate"] = "minecraft:light_weighted_pressure_plate";
      MinecraftItemTypes2["LightningRod"] = "minecraft:lightning_rod";
      MinecraftItemTypes2["Lilac"] = "minecraft:lilac";
      MinecraftItemTypes2["LilyOfTheValley"] = "minecraft:lily_of_the_valley";
      MinecraftItemTypes2["LimeBundle"] = "minecraft:lime_bundle";
      MinecraftItemTypes2["LimeCandle"] = "minecraft:lime_candle";
      MinecraftItemTypes2["LimeCarpet"] = "minecraft:lime_carpet";
      MinecraftItemTypes2["LimeConcrete"] = "minecraft:lime_concrete";
      MinecraftItemTypes2["LimeConcretePowder"] = "minecraft:lime_concrete_powder";
      MinecraftItemTypes2["LimeDye"] = "minecraft:lime_dye";
      MinecraftItemTypes2["LimeGlazedTerracotta"] = "minecraft:lime_glazed_terracotta";
      MinecraftItemTypes2["LimeHarness"] = "minecraft:lime_harness";
      MinecraftItemTypes2["LimeShulkerBox"] = "minecraft:lime_shulker_box";
      MinecraftItemTypes2["LimeStainedGlass"] = "minecraft:lime_stained_glass";
      MinecraftItemTypes2["LimeStainedGlassPane"] = "minecraft:lime_stained_glass_pane";
      MinecraftItemTypes2["LimeTerracotta"] = "minecraft:lime_terracotta";
      MinecraftItemTypes2["LimeWool"] = "minecraft:lime_wool";
      MinecraftItemTypes2["LingeringPotion"] = "minecraft:lingering_potion";
      MinecraftItemTypes2["LitPumpkin"] = "minecraft:lit_pumpkin";
      MinecraftItemTypes2["LlamaSpawnEgg"] = "minecraft:llama_spawn_egg";
      MinecraftItemTypes2["Lodestone"] = "minecraft:lodestone";
      MinecraftItemTypes2["LodestoneCompass"] = "minecraft:lodestone_compass";
      MinecraftItemTypes2["Loom"] = "minecraft:loom";
      MinecraftItemTypes2["Mace"] = "minecraft:mace";
      MinecraftItemTypes2["MagentaBundle"] = "minecraft:magenta_bundle";
      MinecraftItemTypes2["MagentaCandle"] = "minecraft:magenta_candle";
      MinecraftItemTypes2["MagentaCarpet"] = "minecraft:magenta_carpet";
      MinecraftItemTypes2["MagentaConcrete"] = "minecraft:magenta_concrete";
      MinecraftItemTypes2["MagentaConcretePowder"] = "minecraft:magenta_concrete_powder";
      MinecraftItemTypes2["MagentaDye"] = "minecraft:magenta_dye";
      MinecraftItemTypes2["MagentaGlazedTerracotta"] = "minecraft:magenta_glazed_terracotta";
      MinecraftItemTypes2["MagentaHarness"] = "minecraft:magenta_harness";
      MinecraftItemTypes2["MagentaShulkerBox"] = "minecraft:magenta_shulker_box";
      MinecraftItemTypes2["MagentaStainedGlass"] = "minecraft:magenta_stained_glass";
      MinecraftItemTypes2["MagentaStainedGlassPane"] = "minecraft:magenta_stained_glass_pane";
      MinecraftItemTypes2["MagentaTerracotta"] = "minecraft:magenta_terracotta";
      MinecraftItemTypes2["MagentaWool"] = "minecraft:magenta_wool";
      MinecraftItemTypes2["Magma"] = "minecraft:magma";
      MinecraftItemTypes2["MagmaCream"] = "minecraft:magma_cream";
      MinecraftItemTypes2["MagmaCubeSpawnEgg"] = "minecraft:magma_cube_spawn_egg";
      MinecraftItemTypes2["MangroveBoat"] = "minecraft:mangrove_boat";
      MinecraftItemTypes2["MangroveButton"] = "minecraft:mangrove_button";
      MinecraftItemTypes2["MangroveChestBoat"] = "minecraft:mangrove_chest_boat";
      MinecraftItemTypes2["MangroveDoor"] = "minecraft:mangrove_door";
      MinecraftItemTypes2["MangroveFence"] = "minecraft:mangrove_fence";
      MinecraftItemTypes2["MangroveFenceGate"] = "minecraft:mangrove_fence_gate";
      MinecraftItemTypes2["MangroveHangingSign"] = "minecraft:mangrove_hanging_sign";
      MinecraftItemTypes2["MangroveLeaves"] = "minecraft:mangrove_leaves";
      MinecraftItemTypes2["MangroveLog"] = "minecraft:mangrove_log";
      MinecraftItemTypes2["MangrovePlanks"] = "minecraft:mangrove_planks";
      MinecraftItemTypes2["MangrovePressurePlate"] = "minecraft:mangrove_pressure_plate";
      MinecraftItemTypes2["MangrovePropagule"] = "minecraft:mangrove_propagule";
      MinecraftItemTypes2["MangroveRoots"] = "minecraft:mangrove_roots";
      MinecraftItemTypes2["MangroveShelf"] = "minecraft:mangrove_shelf";
      MinecraftItemTypes2["MangroveSign"] = "minecraft:mangrove_sign";
      MinecraftItemTypes2["MangroveSlab"] = "minecraft:mangrove_slab";
      MinecraftItemTypes2["MangroveStairs"] = "minecraft:mangrove_stairs";
      MinecraftItemTypes2["MangroveTrapdoor"] = "minecraft:mangrove_trapdoor";
      MinecraftItemTypes2["MangroveWood"] = "minecraft:mangrove_wood";
      MinecraftItemTypes2["MediumAmethystBud"] = "minecraft:medium_amethyst_bud";
      MinecraftItemTypes2["MelonBlock"] = "minecraft:melon_block";
      MinecraftItemTypes2["MelonSeeds"] = "minecraft:melon_seeds";
      MinecraftItemTypes2["MelonSlice"] = "minecraft:melon_slice";
      MinecraftItemTypes2["MilkBucket"] = "minecraft:milk_bucket";
      MinecraftItemTypes2["Minecart"] = "minecraft:minecart";
      MinecraftItemTypes2["MinerPotterySherd"] = "minecraft:miner_pottery_sherd";
      MinecraftItemTypes2["MobSpawner"] = "minecraft:mob_spawner";
      MinecraftItemTypes2["MojangBannerPattern"] = "minecraft:mojang_banner_pattern";
      MinecraftItemTypes2["MooshroomSpawnEgg"] = "minecraft:mooshroom_spawn_egg";
      MinecraftItemTypes2["MossBlock"] = "minecraft:moss_block";
      MinecraftItemTypes2["MossCarpet"] = "minecraft:moss_carpet";
      MinecraftItemTypes2["MossyCobblestone"] = "minecraft:mossy_cobblestone";
      MinecraftItemTypes2["MossyCobblestoneSlab"] = "minecraft:mossy_cobblestone_slab";
      MinecraftItemTypes2["MossyCobblestoneStairs"] = "minecraft:mossy_cobblestone_stairs";
      MinecraftItemTypes2["MossyCobblestoneWall"] = "minecraft:mossy_cobblestone_wall";
      MinecraftItemTypes2["MossyStoneBrickSlab"] = "minecraft:mossy_stone_brick_slab";
      MinecraftItemTypes2["MossyStoneBrickStairs"] = "minecraft:mossy_stone_brick_stairs";
      MinecraftItemTypes2["MossyStoneBrickWall"] = "minecraft:mossy_stone_brick_wall";
      MinecraftItemTypes2["MossyStoneBricks"] = "minecraft:mossy_stone_bricks";
      MinecraftItemTypes2["MournerPotterySherd"] = "minecraft:mourner_pottery_sherd";
      MinecraftItemTypes2["Mud"] = "minecraft:mud";
      MinecraftItemTypes2["MudBrickSlab"] = "minecraft:mud_brick_slab";
      MinecraftItemTypes2["MudBrickStairs"] = "minecraft:mud_brick_stairs";
      MinecraftItemTypes2["MudBrickWall"] = "minecraft:mud_brick_wall";
      MinecraftItemTypes2["MudBricks"] = "minecraft:mud_bricks";
      MinecraftItemTypes2["MuddyMangroveRoots"] = "minecraft:muddy_mangrove_roots";
      MinecraftItemTypes2["MuleSpawnEgg"] = "minecraft:mule_spawn_egg";
      MinecraftItemTypes2["MushroomStem"] = "minecraft:mushroom_stem";
      MinecraftItemTypes2["MushroomStew"] = "minecraft:mushroom_stew";
      MinecraftItemTypes2["MusicDisc11"] = "minecraft:music_disc_11";
      MinecraftItemTypes2["MusicDisc13"] = "minecraft:music_disc_13";
      MinecraftItemTypes2["MusicDisc5"] = "minecraft:music_disc_5";
      MinecraftItemTypes2["MusicDiscBlocks"] = "minecraft:music_disc_blocks";
      MinecraftItemTypes2["MusicDiscCat"] = "minecraft:music_disc_cat";
      MinecraftItemTypes2["MusicDiscChirp"] = "minecraft:music_disc_chirp";
      MinecraftItemTypes2["MusicDiscCreator"] = "minecraft:music_disc_creator";
      MinecraftItemTypes2["MusicDiscCreatorMusicBox"] = "minecraft:music_disc_creator_music_box";
      MinecraftItemTypes2["MusicDiscFar"] = "minecraft:music_disc_far";
      MinecraftItemTypes2["MusicDiscLavaChicken"] = "minecraft:music_disc_lava_chicken";
      MinecraftItemTypes2["MusicDiscMall"] = "minecraft:music_disc_mall";
      MinecraftItemTypes2["MusicDiscMellohi"] = "minecraft:music_disc_mellohi";
      MinecraftItemTypes2["MusicDiscOtherside"] = "minecraft:music_disc_otherside";
      MinecraftItemTypes2["MusicDiscPigstep"] = "minecraft:music_disc_pigstep";
      MinecraftItemTypes2["MusicDiscPrecipice"] = "minecraft:music_disc_precipice";
      MinecraftItemTypes2["MusicDiscRelic"] = "minecraft:music_disc_relic";
      MinecraftItemTypes2["MusicDiscStal"] = "minecraft:music_disc_stal";
      MinecraftItemTypes2["MusicDiscStrad"] = "minecraft:music_disc_strad";
      MinecraftItemTypes2["MusicDiscTears"] = "minecraft:music_disc_tears";
      MinecraftItemTypes2["MusicDiscWait"] = "minecraft:music_disc_wait";
      MinecraftItemTypes2["MusicDiscWard"] = "minecraft:music_disc_ward";
      MinecraftItemTypes2["Mutton"] = "minecraft:mutton";
      MinecraftItemTypes2["Mycelium"] = "minecraft:mycelium";
      MinecraftItemTypes2["NameTag"] = "minecraft:name_tag";
      MinecraftItemTypes2["NautilusShell"] = "minecraft:nautilus_shell";
      MinecraftItemTypes2["NetherBrick"] = "minecraft:nether_brick";
      MinecraftItemTypes2["NetherBrickFence"] = "minecraft:nether_brick_fence";
      MinecraftItemTypes2["NetherBrickSlab"] = "minecraft:nether_brick_slab";
      MinecraftItemTypes2["NetherBrickStairs"] = "minecraft:nether_brick_stairs";
      MinecraftItemTypes2["NetherBrickWall"] = "minecraft:nether_brick_wall";
      MinecraftItemTypes2["NetherGoldOre"] = "minecraft:nether_gold_ore";
      MinecraftItemTypes2["NetherSprouts"] = "minecraft:nether_sprouts";
      MinecraftItemTypes2["NetherStar"] = "minecraft:nether_star";
      MinecraftItemTypes2["NetherWart"] = "minecraft:nether_wart";
      MinecraftItemTypes2["NetherWartBlock"] = "minecraft:nether_wart_block";
      MinecraftItemTypes2["Netherbrick"] = "minecraft:netherbrick";
      MinecraftItemTypes2["NetheriteAxe"] = "minecraft:netherite_axe";
      MinecraftItemTypes2["NetheriteBlock"] = "minecraft:netherite_block";
      MinecraftItemTypes2["NetheriteBoots"] = "minecraft:netherite_boots";
      MinecraftItemTypes2["NetheriteChestplate"] = "minecraft:netherite_chestplate";
      MinecraftItemTypes2["NetheriteHelmet"] = "minecraft:netherite_helmet";
      MinecraftItemTypes2["NetheriteHoe"] = "minecraft:netherite_hoe";
      MinecraftItemTypes2["NetheriteIngot"] = "minecraft:netherite_ingot";
      MinecraftItemTypes2["NetheriteLeggings"] = "minecraft:netherite_leggings";
      MinecraftItemTypes2["NetheritePickaxe"] = "minecraft:netherite_pickaxe";
      MinecraftItemTypes2["NetheriteScrap"] = "minecraft:netherite_scrap";
      MinecraftItemTypes2["NetheriteShovel"] = "minecraft:netherite_shovel";
      MinecraftItemTypes2["NetheriteSword"] = "minecraft:netherite_sword";
      MinecraftItemTypes2["NetheriteUpgradeSmithingTemplate"] = "minecraft:netherite_upgrade_smithing_template";
      MinecraftItemTypes2["Netherrack"] = "minecraft:netherrack";
      MinecraftItemTypes2["NormalStoneSlab"] = "minecraft:normal_stone_slab";
      MinecraftItemTypes2["NormalStoneStairs"] = "minecraft:normal_stone_stairs";
      MinecraftItemTypes2["Noteblock"] = "minecraft:noteblock";
      MinecraftItemTypes2["OakBoat"] = "minecraft:oak_boat";
      MinecraftItemTypes2["OakChestBoat"] = "minecraft:oak_chest_boat";
      MinecraftItemTypes2["OakFence"] = "minecraft:oak_fence";
      MinecraftItemTypes2["OakHangingSign"] = "minecraft:oak_hanging_sign";
      MinecraftItemTypes2["OakLeaves"] = "minecraft:oak_leaves";
      MinecraftItemTypes2["OakLog"] = "minecraft:oak_log";
      MinecraftItemTypes2["OakPlanks"] = "minecraft:oak_planks";
      MinecraftItemTypes2["OakSapling"] = "minecraft:oak_sapling";
      MinecraftItemTypes2["OakShelf"] = "minecraft:oak_shelf";
      MinecraftItemTypes2["OakSign"] = "minecraft:oak_sign";
      MinecraftItemTypes2["OakSlab"] = "minecraft:oak_slab";
      MinecraftItemTypes2["OakStairs"] = "minecraft:oak_stairs";
      MinecraftItemTypes2["OakWood"] = "minecraft:oak_wood";
      MinecraftItemTypes2["Observer"] = "minecraft:observer";
      MinecraftItemTypes2["Obsidian"] = "minecraft:obsidian";
      MinecraftItemTypes2["OcelotSpawnEgg"] = "minecraft:ocelot_spawn_egg";
      MinecraftItemTypes2["OchreFroglight"] = "minecraft:ochre_froglight";
      MinecraftItemTypes2["OminousBottle"] = "minecraft:ominous_bottle";
      MinecraftItemTypes2["OminousTrialKey"] = "minecraft:ominous_trial_key";
      MinecraftItemTypes2["OpenEyeblossom"] = "minecraft:open_eyeblossom";
      MinecraftItemTypes2["OrangeBundle"] = "minecraft:orange_bundle";
      MinecraftItemTypes2["OrangeCandle"] = "minecraft:orange_candle";
      MinecraftItemTypes2["OrangeCarpet"] = "minecraft:orange_carpet";
      MinecraftItemTypes2["OrangeConcrete"] = "minecraft:orange_concrete";
      MinecraftItemTypes2["OrangeConcretePowder"] = "minecraft:orange_concrete_powder";
      MinecraftItemTypes2["OrangeDye"] = "minecraft:orange_dye";
      MinecraftItemTypes2["OrangeGlazedTerracotta"] = "minecraft:orange_glazed_terracotta";
      MinecraftItemTypes2["OrangeHarness"] = "minecraft:orange_harness";
      MinecraftItemTypes2["OrangeShulkerBox"] = "minecraft:orange_shulker_box";
      MinecraftItemTypes2["OrangeStainedGlass"] = "minecraft:orange_stained_glass";
      MinecraftItemTypes2["OrangeStainedGlassPane"] = "minecraft:orange_stained_glass_pane";
      MinecraftItemTypes2["OrangeTerracotta"] = "minecraft:orange_terracotta";
      MinecraftItemTypes2["OrangeTulip"] = "minecraft:orange_tulip";
      MinecraftItemTypes2["OrangeWool"] = "minecraft:orange_wool";
      MinecraftItemTypes2["OxeyeDaisy"] = "minecraft:oxeye_daisy";
      MinecraftItemTypes2["OxidizedChiseledCopper"] = "minecraft:oxidized_chiseled_copper";
      MinecraftItemTypes2["OxidizedCopper"] = "minecraft:oxidized_copper";
      MinecraftItemTypes2["OxidizedCopperBars"] = "minecraft:oxidized_copper_bars";
      MinecraftItemTypes2["OxidizedCopperBulb"] = "minecraft:oxidized_copper_bulb";
      MinecraftItemTypes2["OxidizedCopperChain"] = "minecraft:oxidized_copper_chain";
      MinecraftItemTypes2["OxidizedCopperChest"] = "minecraft:oxidized_copper_chest";
      MinecraftItemTypes2["OxidizedCopperDoor"] = "minecraft:oxidized_copper_door";
      MinecraftItemTypes2["OxidizedCopperGolemStatue"] = "minecraft:oxidized_copper_golem_statue";
      MinecraftItemTypes2["OxidizedCopperGrate"] = "minecraft:oxidized_copper_grate";
      MinecraftItemTypes2["OxidizedCopperLantern"] = "minecraft:oxidized_copper_lantern";
      MinecraftItemTypes2["OxidizedCopperTrapdoor"] = "minecraft:oxidized_copper_trapdoor";
      MinecraftItemTypes2["OxidizedCutCopper"] = "minecraft:oxidized_cut_copper";
      MinecraftItemTypes2["OxidizedCutCopperSlab"] = "minecraft:oxidized_cut_copper_slab";
      MinecraftItemTypes2["OxidizedCutCopperStairs"] = "minecraft:oxidized_cut_copper_stairs";
      MinecraftItemTypes2["OxidizedLightningRod"] = "minecraft:oxidized_lightning_rod";
      MinecraftItemTypes2["PackedIce"] = "minecraft:packed_ice";
      MinecraftItemTypes2["PackedMud"] = "minecraft:packed_mud";
      MinecraftItemTypes2["Painting"] = "minecraft:painting";
      MinecraftItemTypes2["PaleHangingMoss"] = "minecraft:pale_hanging_moss";
      MinecraftItemTypes2["PaleMossBlock"] = "minecraft:pale_moss_block";
      MinecraftItemTypes2["PaleMossCarpet"] = "minecraft:pale_moss_carpet";
      MinecraftItemTypes2["PaleOakBoat"] = "minecraft:pale_oak_boat";
      MinecraftItemTypes2["PaleOakButton"] = "minecraft:pale_oak_button";
      MinecraftItemTypes2["PaleOakChestBoat"] = "minecraft:pale_oak_chest_boat";
      MinecraftItemTypes2["PaleOakDoor"] = "minecraft:pale_oak_door";
      MinecraftItemTypes2["PaleOakFence"] = "minecraft:pale_oak_fence";
      MinecraftItemTypes2["PaleOakFenceGate"] = "minecraft:pale_oak_fence_gate";
      MinecraftItemTypes2["PaleOakHangingSign"] = "minecraft:pale_oak_hanging_sign";
      MinecraftItemTypes2["PaleOakLeaves"] = "minecraft:pale_oak_leaves";
      MinecraftItemTypes2["PaleOakLog"] = "minecraft:pale_oak_log";
      MinecraftItemTypes2["PaleOakPlanks"] = "minecraft:pale_oak_planks";
      MinecraftItemTypes2["PaleOakPressurePlate"] = "minecraft:pale_oak_pressure_plate";
      MinecraftItemTypes2["PaleOakSapling"] = "minecraft:pale_oak_sapling";
      MinecraftItemTypes2["PaleOakShelf"] = "minecraft:pale_oak_shelf";
      MinecraftItemTypes2["PaleOakSign"] = "minecraft:pale_oak_sign";
      MinecraftItemTypes2["PaleOakSlab"] = "minecraft:pale_oak_slab";
      MinecraftItemTypes2["PaleOakStairs"] = "minecraft:pale_oak_stairs";
      MinecraftItemTypes2["PaleOakTrapdoor"] = "minecraft:pale_oak_trapdoor";
      MinecraftItemTypes2["PaleOakWood"] = "minecraft:pale_oak_wood";
      MinecraftItemTypes2["PandaSpawnEgg"] = "minecraft:panda_spawn_egg";
      MinecraftItemTypes2["Paper"] = "minecraft:paper";
      MinecraftItemTypes2["ParrotSpawnEgg"] = "minecraft:parrot_spawn_egg";
      MinecraftItemTypes2["PearlescentFroglight"] = "minecraft:pearlescent_froglight";
      MinecraftItemTypes2["Peony"] = "minecraft:peony";
      MinecraftItemTypes2["PetrifiedOakSlab"] = "minecraft:petrified_oak_slab";
      MinecraftItemTypes2["PhantomMembrane"] = "minecraft:phantom_membrane";
      MinecraftItemTypes2["PhantomSpawnEgg"] = "minecraft:phantom_spawn_egg";
      MinecraftItemTypes2["PigSpawnEgg"] = "minecraft:pig_spawn_egg";
      MinecraftItemTypes2["PiglinBannerPattern"] = "minecraft:piglin_banner_pattern";
      MinecraftItemTypes2["PiglinBruteSpawnEgg"] = "minecraft:piglin_brute_spawn_egg";
      MinecraftItemTypes2["PiglinHead"] = "minecraft:piglin_head";
      MinecraftItemTypes2["PiglinSpawnEgg"] = "minecraft:piglin_spawn_egg";
      MinecraftItemTypes2["PillagerSpawnEgg"] = "minecraft:pillager_spawn_egg";
      MinecraftItemTypes2["PinkBundle"] = "minecraft:pink_bundle";
      MinecraftItemTypes2["PinkCandle"] = "minecraft:pink_candle";
      MinecraftItemTypes2["PinkCarpet"] = "minecraft:pink_carpet";
      MinecraftItemTypes2["PinkConcrete"] = "minecraft:pink_concrete";
      MinecraftItemTypes2["PinkConcretePowder"] = "minecraft:pink_concrete_powder";
      MinecraftItemTypes2["PinkDye"] = "minecraft:pink_dye";
      MinecraftItemTypes2["PinkGlazedTerracotta"] = "minecraft:pink_glazed_terracotta";
      MinecraftItemTypes2["PinkHarness"] = "minecraft:pink_harness";
      MinecraftItemTypes2["PinkPetals"] = "minecraft:pink_petals";
      MinecraftItemTypes2["PinkShulkerBox"] = "minecraft:pink_shulker_box";
      MinecraftItemTypes2["PinkStainedGlass"] = "minecraft:pink_stained_glass";
      MinecraftItemTypes2["PinkStainedGlassPane"] = "minecraft:pink_stained_glass_pane";
      MinecraftItemTypes2["PinkTerracotta"] = "minecraft:pink_terracotta";
      MinecraftItemTypes2["PinkTulip"] = "minecraft:pink_tulip";
      MinecraftItemTypes2["PinkWool"] = "minecraft:pink_wool";
      MinecraftItemTypes2["Piston"] = "minecraft:piston";
      MinecraftItemTypes2["PitcherPlant"] = "minecraft:pitcher_plant";
      MinecraftItemTypes2["PitcherPod"] = "minecraft:pitcher_pod";
      MinecraftItemTypes2["PlayerHead"] = "minecraft:player_head";
      MinecraftItemTypes2["PlentyPotterySherd"] = "minecraft:plenty_pottery_sherd";
      MinecraftItemTypes2["Podzol"] = "minecraft:podzol";
      MinecraftItemTypes2["PointedDripstone"] = "minecraft:pointed_dripstone";
      MinecraftItemTypes2["PoisonousPotato"] = "minecraft:poisonous_potato";
      MinecraftItemTypes2["PolarBearSpawnEgg"] = "minecraft:polar_bear_spawn_egg";
      MinecraftItemTypes2["PolishedAndesite"] = "minecraft:polished_andesite";
      MinecraftItemTypes2["PolishedAndesiteSlab"] = "minecraft:polished_andesite_slab";
      MinecraftItemTypes2["PolishedAndesiteStairs"] = "minecraft:polished_andesite_stairs";
      MinecraftItemTypes2["PolishedBasalt"] = "minecraft:polished_basalt";
      MinecraftItemTypes2["PolishedBlackstone"] = "minecraft:polished_blackstone";
      MinecraftItemTypes2["PolishedBlackstoneBrickSlab"] = "minecraft:polished_blackstone_brick_slab";
      MinecraftItemTypes2["PolishedBlackstoneBrickStairs"] = "minecraft:polished_blackstone_brick_stairs";
      MinecraftItemTypes2["PolishedBlackstoneBrickWall"] = "minecraft:polished_blackstone_brick_wall";
      MinecraftItemTypes2["PolishedBlackstoneBricks"] = "minecraft:polished_blackstone_bricks";
      MinecraftItemTypes2["PolishedBlackstoneButton"] = "minecraft:polished_blackstone_button";
      MinecraftItemTypes2["PolishedBlackstonePressurePlate"] = "minecraft:polished_blackstone_pressure_plate";
      MinecraftItemTypes2["PolishedBlackstoneSlab"] = "minecraft:polished_blackstone_slab";
      MinecraftItemTypes2["PolishedBlackstoneStairs"] = "minecraft:polished_blackstone_stairs";
      MinecraftItemTypes2["PolishedBlackstoneWall"] = "minecraft:polished_blackstone_wall";
      MinecraftItemTypes2["PolishedDeepslate"] = "minecraft:polished_deepslate";
      MinecraftItemTypes2["PolishedDeepslateSlab"] = "minecraft:polished_deepslate_slab";
      MinecraftItemTypes2["PolishedDeepslateStairs"] = "minecraft:polished_deepslate_stairs";
      MinecraftItemTypes2["PolishedDeepslateWall"] = "minecraft:polished_deepslate_wall";
      MinecraftItemTypes2["PolishedDiorite"] = "minecraft:polished_diorite";
      MinecraftItemTypes2["PolishedDioriteSlab"] = "minecraft:polished_diorite_slab";
      MinecraftItemTypes2["PolishedDioriteStairs"] = "minecraft:polished_diorite_stairs";
      MinecraftItemTypes2["PolishedGranite"] = "minecraft:polished_granite";
      MinecraftItemTypes2["PolishedGraniteSlab"] = "minecraft:polished_granite_slab";
      MinecraftItemTypes2["PolishedGraniteStairs"] = "minecraft:polished_granite_stairs";
      MinecraftItemTypes2["PolishedTuff"] = "minecraft:polished_tuff";
      MinecraftItemTypes2["PolishedTuffSlab"] = "minecraft:polished_tuff_slab";
      MinecraftItemTypes2["PolishedTuffStairs"] = "minecraft:polished_tuff_stairs";
      MinecraftItemTypes2["PolishedTuffWall"] = "minecraft:polished_tuff_wall";
      MinecraftItemTypes2["PoppedChorusFruit"] = "minecraft:popped_chorus_fruit";
      MinecraftItemTypes2["Poppy"] = "minecraft:poppy";
      MinecraftItemTypes2["Porkchop"] = "minecraft:porkchop";
      MinecraftItemTypes2["Potato"] = "minecraft:potato";
      MinecraftItemTypes2["Potion"] = "minecraft:potion";
      MinecraftItemTypes2["PowderSnowBucket"] = "minecraft:powder_snow_bucket";
      MinecraftItemTypes2["Prismarine"] = "minecraft:prismarine";
      MinecraftItemTypes2["PrismarineBrickSlab"] = "minecraft:prismarine_brick_slab";
      MinecraftItemTypes2["PrismarineBricks"] = "minecraft:prismarine_bricks";
      MinecraftItemTypes2["PrismarineBricksStairs"] = "minecraft:prismarine_bricks_stairs";
      MinecraftItemTypes2["PrismarineCrystals"] = "minecraft:prismarine_crystals";
      MinecraftItemTypes2["PrismarineShard"] = "minecraft:prismarine_shard";
      MinecraftItemTypes2["PrismarineSlab"] = "minecraft:prismarine_slab";
      MinecraftItemTypes2["PrismarineStairs"] = "minecraft:prismarine_stairs";
      MinecraftItemTypes2["PrismarineWall"] = "minecraft:prismarine_wall";
      MinecraftItemTypes2["PrizePotterySherd"] = "minecraft:prize_pottery_sherd";
      MinecraftItemTypes2["Pufferfish"] = "minecraft:pufferfish";
      MinecraftItemTypes2["PufferfishBucket"] = "minecraft:pufferfish_bucket";
      MinecraftItemTypes2["PufferfishSpawnEgg"] = "minecraft:pufferfish_spawn_egg";
      MinecraftItemTypes2["Pumpkin"] = "minecraft:pumpkin";
      MinecraftItemTypes2["PumpkinPie"] = "minecraft:pumpkin_pie";
      MinecraftItemTypes2["PumpkinSeeds"] = "minecraft:pumpkin_seeds";
      MinecraftItemTypes2["PurpleBundle"] = "minecraft:purple_bundle";
      MinecraftItemTypes2["PurpleCandle"] = "minecraft:purple_candle";
      MinecraftItemTypes2["PurpleCarpet"] = "minecraft:purple_carpet";
      MinecraftItemTypes2["PurpleConcrete"] = "minecraft:purple_concrete";
      MinecraftItemTypes2["PurpleConcretePowder"] = "minecraft:purple_concrete_powder";
      MinecraftItemTypes2["PurpleDye"] = "minecraft:purple_dye";
      MinecraftItemTypes2["PurpleGlazedTerracotta"] = "minecraft:purple_glazed_terracotta";
      MinecraftItemTypes2["PurpleHarness"] = "minecraft:purple_harness";
      MinecraftItemTypes2["PurpleShulkerBox"] = "minecraft:purple_shulker_box";
      MinecraftItemTypes2["PurpleStainedGlass"] = "minecraft:purple_stained_glass";
      MinecraftItemTypes2["PurpleStainedGlassPane"] = "minecraft:purple_stained_glass_pane";
      MinecraftItemTypes2["PurpleTerracotta"] = "minecraft:purple_terracotta";
      MinecraftItemTypes2["PurpleWool"] = "minecraft:purple_wool";
      MinecraftItemTypes2["PurpurBlock"] = "minecraft:purpur_block";
      MinecraftItemTypes2["PurpurPillar"] = "minecraft:purpur_pillar";
      MinecraftItemTypes2["PurpurSlab"] = "minecraft:purpur_slab";
      MinecraftItemTypes2["PurpurStairs"] = "minecraft:purpur_stairs";
      MinecraftItemTypes2["Quartz"] = "minecraft:quartz";
      MinecraftItemTypes2["QuartzBlock"] = "minecraft:quartz_block";
      MinecraftItemTypes2["QuartzBricks"] = "minecraft:quartz_bricks";
      MinecraftItemTypes2["QuartzOre"] = "minecraft:quartz_ore";
      MinecraftItemTypes2["QuartzPillar"] = "minecraft:quartz_pillar";
      MinecraftItemTypes2["QuartzSlab"] = "minecraft:quartz_slab";
      MinecraftItemTypes2["QuartzStairs"] = "minecraft:quartz_stairs";
      MinecraftItemTypes2["Rabbit"] = "minecraft:rabbit";
      MinecraftItemTypes2["RabbitFoot"] = "minecraft:rabbit_foot";
      MinecraftItemTypes2["RabbitHide"] = "minecraft:rabbit_hide";
      MinecraftItemTypes2["RabbitSpawnEgg"] = "minecraft:rabbit_spawn_egg";
      MinecraftItemTypes2["RabbitStew"] = "minecraft:rabbit_stew";
      MinecraftItemTypes2["Rail"] = "minecraft:rail";
      MinecraftItemTypes2["RaiserArmorTrimSmithingTemplate"] = "minecraft:raiser_armor_trim_smithing_template";
      MinecraftItemTypes2["RavagerSpawnEgg"] = "minecraft:ravager_spawn_egg";
      MinecraftItemTypes2["RawCopper"] = "minecraft:raw_copper";
      MinecraftItemTypes2["RawCopperBlock"] = "minecraft:raw_copper_block";
      MinecraftItemTypes2["RawGold"] = "minecraft:raw_gold";
      MinecraftItemTypes2["RawGoldBlock"] = "minecraft:raw_gold_block";
      MinecraftItemTypes2["RawIron"] = "minecraft:raw_iron";
      MinecraftItemTypes2["RawIronBlock"] = "minecraft:raw_iron_block";
      MinecraftItemTypes2["RecoveryCompass"] = "minecraft:recovery_compass";
      MinecraftItemTypes2["RedBundle"] = "minecraft:red_bundle";
      MinecraftItemTypes2["RedCandle"] = "minecraft:red_candle";
      MinecraftItemTypes2["RedCarpet"] = "minecraft:red_carpet";
      MinecraftItemTypes2["RedConcrete"] = "minecraft:red_concrete";
      MinecraftItemTypes2["RedConcretePowder"] = "minecraft:red_concrete_powder";
      MinecraftItemTypes2["RedDye"] = "minecraft:red_dye";
      MinecraftItemTypes2["RedGlazedTerracotta"] = "minecraft:red_glazed_terracotta";
      MinecraftItemTypes2["RedHarness"] = "minecraft:red_harness";
      MinecraftItemTypes2["RedMushroom"] = "minecraft:red_mushroom";
      MinecraftItemTypes2["RedMushroomBlock"] = "minecraft:red_mushroom_block";
      MinecraftItemTypes2["RedNetherBrick"] = "minecraft:red_nether_brick";
      MinecraftItemTypes2["RedNetherBrickSlab"] = "minecraft:red_nether_brick_slab";
      MinecraftItemTypes2["RedNetherBrickStairs"] = "minecraft:red_nether_brick_stairs";
      MinecraftItemTypes2["RedNetherBrickWall"] = "minecraft:red_nether_brick_wall";
      MinecraftItemTypes2["RedSand"] = "minecraft:red_sand";
      MinecraftItemTypes2["RedSandstone"] = "minecraft:red_sandstone";
      MinecraftItemTypes2["RedSandstoneSlab"] = "minecraft:red_sandstone_slab";
      MinecraftItemTypes2["RedSandstoneStairs"] = "minecraft:red_sandstone_stairs";
      MinecraftItemTypes2["RedSandstoneWall"] = "minecraft:red_sandstone_wall";
      MinecraftItemTypes2["RedShulkerBox"] = "minecraft:red_shulker_box";
      MinecraftItemTypes2["RedStainedGlass"] = "minecraft:red_stained_glass";
      MinecraftItemTypes2["RedStainedGlassPane"] = "minecraft:red_stained_glass_pane";
      MinecraftItemTypes2["RedTerracotta"] = "minecraft:red_terracotta";
      MinecraftItemTypes2["RedTulip"] = "minecraft:red_tulip";
      MinecraftItemTypes2["RedWool"] = "minecraft:red_wool";
      MinecraftItemTypes2["Redstone"] = "minecraft:redstone";
      MinecraftItemTypes2["RedstoneBlock"] = "minecraft:redstone_block";
      MinecraftItemTypes2["RedstoneLamp"] = "minecraft:redstone_lamp";
      MinecraftItemTypes2["RedstoneOre"] = "minecraft:redstone_ore";
      MinecraftItemTypes2["RedstoneTorch"] = "minecraft:redstone_torch";
      MinecraftItemTypes2["ReinforcedDeepslate"] = "minecraft:reinforced_deepslate";
      MinecraftItemTypes2["Repeater"] = "minecraft:repeater";
      MinecraftItemTypes2["RepeatingCommandBlock"] = "minecraft:repeating_command_block";
      MinecraftItemTypes2["ResinBlock"] = "minecraft:resin_block";
      MinecraftItemTypes2["ResinBrick"] = "minecraft:resin_brick";
      MinecraftItemTypes2["ResinBrickSlab"] = "minecraft:resin_brick_slab";
      MinecraftItemTypes2["ResinBrickStairs"] = "minecraft:resin_brick_stairs";
      MinecraftItemTypes2["ResinBrickWall"] = "minecraft:resin_brick_wall";
      MinecraftItemTypes2["ResinBricks"] = "minecraft:resin_bricks";
      MinecraftItemTypes2["ResinClump"] = "minecraft:resin_clump";
      MinecraftItemTypes2["RespawnAnchor"] = "minecraft:respawn_anchor";
      MinecraftItemTypes2["RibArmorTrimSmithingTemplate"] = "minecraft:rib_armor_trim_smithing_template";
      MinecraftItemTypes2["RoseBush"] = "minecraft:rose_bush";
      MinecraftItemTypes2["RottenFlesh"] = "minecraft:rotten_flesh";
      MinecraftItemTypes2["Saddle"] = "minecraft:saddle";
      MinecraftItemTypes2["Salmon"] = "minecraft:salmon";
      MinecraftItemTypes2["SalmonBucket"] = "minecraft:salmon_bucket";
      MinecraftItemTypes2["SalmonSpawnEgg"] = "minecraft:salmon_spawn_egg";
      MinecraftItemTypes2["Sand"] = "minecraft:sand";
      MinecraftItemTypes2["Sandstone"] = "minecraft:sandstone";
      MinecraftItemTypes2["SandstoneSlab"] = "minecraft:sandstone_slab";
      MinecraftItemTypes2["SandstoneStairs"] = "minecraft:sandstone_stairs";
      MinecraftItemTypes2["SandstoneWall"] = "minecraft:sandstone_wall";
      MinecraftItemTypes2["Scaffolding"] = "minecraft:scaffolding";
      MinecraftItemTypes2["ScrapePotterySherd"] = "minecraft:scrape_pottery_sherd";
      MinecraftItemTypes2["Sculk"] = "minecraft:sculk";
      MinecraftItemTypes2["SculkCatalyst"] = "minecraft:sculk_catalyst";
      MinecraftItemTypes2["SculkSensor"] = "minecraft:sculk_sensor";
      MinecraftItemTypes2["SculkShrieker"] = "minecraft:sculk_shrieker";
      MinecraftItemTypes2["SculkVein"] = "minecraft:sculk_vein";
      MinecraftItemTypes2["SeaLantern"] = "minecraft:sea_lantern";
      MinecraftItemTypes2["SeaPickle"] = "minecraft:sea_pickle";
      MinecraftItemTypes2["Seagrass"] = "minecraft:seagrass";
      MinecraftItemTypes2["SentryArmorTrimSmithingTemplate"] = "minecraft:sentry_armor_trim_smithing_template";
      MinecraftItemTypes2["ShaperArmorTrimSmithingTemplate"] = "minecraft:shaper_armor_trim_smithing_template";
      MinecraftItemTypes2["SheafPotterySherd"] = "minecraft:sheaf_pottery_sherd";
      MinecraftItemTypes2["Shears"] = "minecraft:shears";
      MinecraftItemTypes2["SheepSpawnEgg"] = "minecraft:sheep_spawn_egg";
      MinecraftItemTypes2["ShelterPotterySherd"] = "minecraft:shelter_pottery_sherd";
      MinecraftItemTypes2["Shield"] = "minecraft:shield";
      MinecraftItemTypes2["ShortDryGrass"] = "minecraft:short_dry_grass";
      MinecraftItemTypes2["ShortGrass"] = "minecraft:short_grass";
      MinecraftItemTypes2["Shroomlight"] = "minecraft:shroomlight";
      MinecraftItemTypes2["ShulkerShell"] = "minecraft:shulker_shell";
      MinecraftItemTypes2["ShulkerSpawnEgg"] = "minecraft:shulker_spawn_egg";
      MinecraftItemTypes2["SilenceArmorTrimSmithingTemplate"] = "minecraft:silence_armor_trim_smithing_template";
      MinecraftItemTypes2["SilverGlazedTerracotta"] = "minecraft:silver_glazed_terracotta";
      MinecraftItemTypes2["SilverfishSpawnEgg"] = "minecraft:silverfish_spawn_egg";
      MinecraftItemTypes2["SkeletonHorseSpawnEgg"] = "minecraft:skeleton_horse_spawn_egg";
      MinecraftItemTypes2["SkeletonSkull"] = "minecraft:skeleton_skull";
      MinecraftItemTypes2["SkeletonSpawnEgg"] = "minecraft:skeleton_spawn_egg";
      MinecraftItemTypes2["SkullBannerPattern"] = "minecraft:skull_banner_pattern";
      MinecraftItemTypes2["SkullPotterySherd"] = "minecraft:skull_pottery_sherd";
      MinecraftItemTypes2["Slime"] = "minecraft:slime";
      MinecraftItemTypes2["SlimeBall"] = "minecraft:slime_ball";
      MinecraftItemTypes2["SlimeSpawnEgg"] = "minecraft:slime_spawn_egg";
      MinecraftItemTypes2["SmallAmethystBud"] = "minecraft:small_amethyst_bud";
      MinecraftItemTypes2["SmallDripleafBlock"] = "minecraft:small_dripleaf_block";
      MinecraftItemTypes2["SmithingTable"] = "minecraft:smithing_table";
      MinecraftItemTypes2["Smoker"] = "minecraft:smoker";
      MinecraftItemTypes2["SmoothBasalt"] = "minecraft:smooth_basalt";
      MinecraftItemTypes2["SmoothQuartz"] = "minecraft:smooth_quartz";
      MinecraftItemTypes2["SmoothQuartzSlab"] = "minecraft:smooth_quartz_slab";
      MinecraftItemTypes2["SmoothQuartzStairs"] = "minecraft:smooth_quartz_stairs";
      MinecraftItemTypes2["SmoothRedSandstone"] = "minecraft:smooth_red_sandstone";
      MinecraftItemTypes2["SmoothRedSandstoneSlab"] = "minecraft:smooth_red_sandstone_slab";
      MinecraftItemTypes2["SmoothRedSandstoneStairs"] = "minecraft:smooth_red_sandstone_stairs";
      MinecraftItemTypes2["SmoothSandstone"] = "minecraft:smooth_sandstone";
      MinecraftItemTypes2["SmoothSandstoneSlab"] = "minecraft:smooth_sandstone_slab";
      MinecraftItemTypes2["SmoothSandstoneStairs"] = "minecraft:smooth_sandstone_stairs";
      MinecraftItemTypes2["SmoothStone"] = "minecraft:smooth_stone";
      MinecraftItemTypes2["SmoothStoneSlab"] = "minecraft:smooth_stone_slab";
      MinecraftItemTypes2["SnifferEgg"] = "minecraft:sniffer_egg";
      MinecraftItemTypes2["SnifferSpawnEgg"] = "minecraft:sniffer_spawn_egg";
      MinecraftItemTypes2["SnortPotterySherd"] = "minecraft:snort_pottery_sherd";
      MinecraftItemTypes2["SnoutArmorTrimSmithingTemplate"] = "minecraft:snout_armor_trim_smithing_template";
      MinecraftItemTypes2["Snow"] = "minecraft:snow";
      MinecraftItemTypes2["SnowGolemSpawnEgg"] = "minecraft:snow_golem_spawn_egg";
      MinecraftItemTypes2["SnowLayer"] = "minecraft:snow_layer";
      MinecraftItemTypes2["Snowball"] = "minecraft:snowball";
      MinecraftItemTypes2["SoulCampfire"] = "minecraft:soul_campfire";
      MinecraftItemTypes2["SoulLantern"] = "minecraft:soul_lantern";
      MinecraftItemTypes2["SoulSand"] = "minecraft:soul_sand";
      MinecraftItemTypes2["SoulSoil"] = "minecraft:soul_soil";
      MinecraftItemTypes2["SoulTorch"] = "minecraft:soul_torch";
      MinecraftItemTypes2["SpiderEye"] = "minecraft:spider_eye";
      MinecraftItemTypes2["SpiderSpawnEgg"] = "minecraft:spider_spawn_egg";
      MinecraftItemTypes2["SpireArmorTrimSmithingTemplate"] = "minecraft:spire_armor_trim_smithing_template";
      MinecraftItemTypes2["SplashPotion"] = "minecraft:splash_potion";
      MinecraftItemTypes2["Sponge"] = "minecraft:sponge";
      MinecraftItemTypes2["SporeBlossom"] = "minecraft:spore_blossom";
      MinecraftItemTypes2["SpruceBoat"] = "minecraft:spruce_boat";
      MinecraftItemTypes2["SpruceButton"] = "minecraft:spruce_button";
      MinecraftItemTypes2["SpruceChestBoat"] = "minecraft:spruce_chest_boat";
      MinecraftItemTypes2["SpruceDoor"] = "minecraft:spruce_door";
      MinecraftItemTypes2["SpruceFence"] = "minecraft:spruce_fence";
      MinecraftItemTypes2["SpruceFenceGate"] = "minecraft:spruce_fence_gate";
      MinecraftItemTypes2["SpruceHangingSign"] = "minecraft:spruce_hanging_sign";
      MinecraftItemTypes2["SpruceLeaves"] = "minecraft:spruce_leaves";
      MinecraftItemTypes2["SpruceLog"] = "minecraft:spruce_log";
      MinecraftItemTypes2["SprucePlanks"] = "minecraft:spruce_planks";
      MinecraftItemTypes2["SprucePressurePlate"] = "minecraft:spruce_pressure_plate";
      MinecraftItemTypes2["SpruceSapling"] = "minecraft:spruce_sapling";
      MinecraftItemTypes2["SpruceShelf"] = "minecraft:spruce_shelf";
      MinecraftItemTypes2["SpruceSign"] = "minecraft:spruce_sign";
      MinecraftItemTypes2["SpruceSlab"] = "minecraft:spruce_slab";
      MinecraftItemTypes2["SpruceStairs"] = "minecraft:spruce_stairs";
      MinecraftItemTypes2["SpruceTrapdoor"] = "minecraft:spruce_trapdoor";
      MinecraftItemTypes2["SpruceWood"] = "minecraft:spruce_wood";
      MinecraftItemTypes2["Spyglass"] = "minecraft:spyglass";
      MinecraftItemTypes2["SquidSpawnEgg"] = "minecraft:squid_spawn_egg";
      MinecraftItemTypes2["Stick"] = "minecraft:stick";
      MinecraftItemTypes2["StickyPiston"] = "minecraft:sticky_piston";
      MinecraftItemTypes2["Stone"] = "minecraft:stone";
      MinecraftItemTypes2["StoneAxe"] = "minecraft:stone_axe";
      MinecraftItemTypes2["StoneBrickSlab"] = "minecraft:stone_brick_slab";
      MinecraftItemTypes2["StoneBrickStairs"] = "minecraft:stone_brick_stairs";
      MinecraftItemTypes2["StoneBrickWall"] = "minecraft:stone_brick_wall";
      MinecraftItemTypes2["StoneBricks"] = "minecraft:stone_bricks";
      MinecraftItemTypes2["StoneButton"] = "minecraft:stone_button";
      MinecraftItemTypes2["StoneHoe"] = "minecraft:stone_hoe";
      MinecraftItemTypes2["StonePickaxe"] = "minecraft:stone_pickaxe";
      MinecraftItemTypes2["StonePressurePlate"] = "minecraft:stone_pressure_plate";
      MinecraftItemTypes2["StoneShovel"] = "minecraft:stone_shovel";
      MinecraftItemTypes2["StoneStairs"] = "minecraft:stone_stairs";
      MinecraftItemTypes2["StoneSword"] = "minecraft:stone_sword";
      MinecraftItemTypes2["StonecutterBlock"] = "minecraft:stonecutter_block";
      MinecraftItemTypes2["StraySpawnEgg"] = "minecraft:stray_spawn_egg";
      MinecraftItemTypes2["StriderSpawnEgg"] = "minecraft:strider_spawn_egg";
      MinecraftItemTypes2["String"] = "minecraft:string";
      MinecraftItemTypes2["StrippedAcaciaLog"] = "minecraft:stripped_acacia_log";
      MinecraftItemTypes2["StrippedAcaciaWood"] = "minecraft:stripped_acacia_wood";
      MinecraftItemTypes2["StrippedBambooBlock"] = "minecraft:stripped_bamboo_block";
      MinecraftItemTypes2["StrippedBirchLog"] = "minecraft:stripped_birch_log";
      MinecraftItemTypes2["StrippedBirchWood"] = "minecraft:stripped_birch_wood";
      MinecraftItemTypes2["StrippedCherryLog"] = "minecraft:stripped_cherry_log";
      MinecraftItemTypes2["StrippedCherryWood"] = "minecraft:stripped_cherry_wood";
      MinecraftItemTypes2["StrippedCrimsonHyphae"] = "minecraft:stripped_crimson_hyphae";
      MinecraftItemTypes2["StrippedCrimsonStem"] = "minecraft:stripped_crimson_stem";
      MinecraftItemTypes2["StrippedDarkOakLog"] = "minecraft:stripped_dark_oak_log";
      MinecraftItemTypes2["StrippedDarkOakWood"] = "minecraft:stripped_dark_oak_wood";
      MinecraftItemTypes2["StrippedJungleLog"] = "minecraft:stripped_jungle_log";
      MinecraftItemTypes2["StrippedJungleWood"] = "minecraft:stripped_jungle_wood";
      MinecraftItemTypes2["StrippedMangroveLog"] = "minecraft:stripped_mangrove_log";
      MinecraftItemTypes2["StrippedMangroveWood"] = "minecraft:stripped_mangrove_wood";
      MinecraftItemTypes2["StrippedOakLog"] = "minecraft:stripped_oak_log";
      MinecraftItemTypes2["StrippedOakWood"] = "minecraft:stripped_oak_wood";
      MinecraftItemTypes2["StrippedPaleOakLog"] = "minecraft:stripped_pale_oak_log";
      MinecraftItemTypes2["StrippedPaleOakWood"] = "minecraft:stripped_pale_oak_wood";
      MinecraftItemTypes2["StrippedSpruceLog"] = "minecraft:stripped_spruce_log";
      MinecraftItemTypes2["StrippedSpruceWood"] = "minecraft:stripped_spruce_wood";
      MinecraftItemTypes2["StrippedWarpedHyphae"] = "minecraft:stripped_warped_hyphae";
      MinecraftItemTypes2["StrippedWarpedStem"] = "minecraft:stripped_warped_stem";
      MinecraftItemTypes2["StructureBlock"] = "minecraft:structure_block";
      MinecraftItemTypes2["StructureVoid"] = "minecraft:structure_void";
      MinecraftItemTypes2["Sugar"] = "minecraft:sugar";
      MinecraftItemTypes2["SugarCane"] = "minecraft:sugar_cane";
      MinecraftItemTypes2["Sunflower"] = "minecraft:sunflower";
      MinecraftItemTypes2["SuspiciousGravel"] = "minecraft:suspicious_gravel";
      MinecraftItemTypes2["SuspiciousSand"] = "minecraft:suspicious_sand";
      MinecraftItemTypes2["SuspiciousStew"] = "minecraft:suspicious_stew";
      MinecraftItemTypes2["SweetBerries"] = "minecraft:sweet_berries";
      MinecraftItemTypes2["TadpoleBucket"] = "minecraft:tadpole_bucket";
      MinecraftItemTypes2["TadpoleSpawnEgg"] = "minecraft:tadpole_spawn_egg";
      MinecraftItemTypes2["TallDryGrass"] = "minecraft:tall_dry_grass";
      MinecraftItemTypes2["TallGrass"] = "minecraft:tall_grass";
      MinecraftItemTypes2["Target"] = "minecraft:target";
      MinecraftItemTypes2["TideArmorTrimSmithingTemplate"] = "minecraft:tide_armor_trim_smithing_template";
      MinecraftItemTypes2["TintedGlass"] = "minecraft:tinted_glass";
      MinecraftItemTypes2["Tnt"] = "minecraft:tnt";
      MinecraftItemTypes2["TntMinecart"] = "minecraft:tnt_minecart";
      MinecraftItemTypes2["Torch"] = "minecraft:torch";
      MinecraftItemTypes2["Torchflower"] = "minecraft:torchflower";
      MinecraftItemTypes2["TorchflowerSeeds"] = "minecraft:torchflower_seeds";
      MinecraftItemTypes2["TotemOfUndying"] = "minecraft:totem_of_undying";
      MinecraftItemTypes2["TraderLlamaSpawnEgg"] = "minecraft:trader_llama_spawn_egg";
      MinecraftItemTypes2["Trapdoor"] = "minecraft:trapdoor";
      MinecraftItemTypes2["TrappedChest"] = "minecraft:trapped_chest";
      MinecraftItemTypes2["TrialKey"] = "minecraft:trial_key";
      MinecraftItemTypes2["TrialSpawner"] = "minecraft:trial_spawner";
      MinecraftItemTypes2["Trident"] = "minecraft:trident";
      MinecraftItemTypes2["TripwireHook"] = "minecraft:tripwire_hook";
      MinecraftItemTypes2["TropicalFish"] = "minecraft:tropical_fish";
      MinecraftItemTypes2["TropicalFishBucket"] = "minecraft:tropical_fish_bucket";
      MinecraftItemTypes2["TropicalFishSpawnEgg"] = "minecraft:tropical_fish_spawn_egg";
      MinecraftItemTypes2["TubeCoral"] = "minecraft:tube_coral";
      MinecraftItemTypes2["TubeCoralBlock"] = "minecraft:tube_coral_block";
      MinecraftItemTypes2["TubeCoralFan"] = "minecraft:tube_coral_fan";
      MinecraftItemTypes2["Tuff"] = "minecraft:tuff";
      MinecraftItemTypes2["TuffBrickSlab"] = "minecraft:tuff_brick_slab";
      MinecraftItemTypes2["TuffBrickStairs"] = "minecraft:tuff_brick_stairs";
      MinecraftItemTypes2["TuffBrickWall"] = "minecraft:tuff_brick_wall";
      MinecraftItemTypes2["TuffBricks"] = "minecraft:tuff_bricks";
      MinecraftItemTypes2["TuffSlab"] = "minecraft:tuff_slab";
      MinecraftItemTypes2["TuffStairs"] = "minecraft:tuff_stairs";
      MinecraftItemTypes2["TuffWall"] = "minecraft:tuff_wall";
      MinecraftItemTypes2["TurtleEgg"] = "minecraft:turtle_egg";
      MinecraftItemTypes2["TurtleHelmet"] = "minecraft:turtle_helmet";
      MinecraftItemTypes2["TurtleScute"] = "minecraft:turtle_scute";
      MinecraftItemTypes2["TurtleSpawnEgg"] = "minecraft:turtle_spawn_egg";
      MinecraftItemTypes2["TwistingVines"] = "minecraft:twisting_vines";
      MinecraftItemTypes2["UndyedShulkerBox"] = "minecraft:undyed_shulker_box";
      MinecraftItemTypes2["Vault"] = "minecraft:vault";
      MinecraftItemTypes2["VerdantFroglight"] = "minecraft:verdant_froglight";
      MinecraftItemTypes2["VexArmorTrimSmithingTemplate"] = "minecraft:vex_armor_trim_smithing_template";
      MinecraftItemTypes2["VexSpawnEgg"] = "minecraft:vex_spawn_egg";
      MinecraftItemTypes2["VillagerSpawnEgg"] = "minecraft:villager_spawn_egg";
      MinecraftItemTypes2["VindicatorSpawnEgg"] = "minecraft:vindicator_spawn_egg";
      MinecraftItemTypes2["Vine"] = "minecraft:vine";
      MinecraftItemTypes2["WanderingTraderSpawnEgg"] = "minecraft:wandering_trader_spawn_egg";
      MinecraftItemTypes2["WardArmorTrimSmithingTemplate"] = "minecraft:ward_armor_trim_smithing_template";
      MinecraftItemTypes2["WardenSpawnEgg"] = "minecraft:warden_spawn_egg";
      MinecraftItemTypes2["WarpedButton"] = "minecraft:warped_button";
      MinecraftItemTypes2["WarpedDoor"] = "minecraft:warped_door";
      MinecraftItemTypes2["WarpedFence"] = "minecraft:warped_fence";
      MinecraftItemTypes2["WarpedFenceGate"] = "minecraft:warped_fence_gate";
      MinecraftItemTypes2["WarpedFungus"] = "minecraft:warped_fungus";
      MinecraftItemTypes2["WarpedFungusOnAStick"] = "minecraft:warped_fungus_on_a_stick";
      MinecraftItemTypes2["WarpedHangingSign"] = "minecraft:warped_hanging_sign";
      MinecraftItemTypes2["WarpedHyphae"] = "minecraft:warped_hyphae";
      MinecraftItemTypes2["WarpedNylium"] = "minecraft:warped_nylium";
      MinecraftItemTypes2["WarpedPlanks"] = "minecraft:warped_planks";
      MinecraftItemTypes2["WarpedPressurePlate"] = "minecraft:warped_pressure_plate";
      MinecraftItemTypes2["WarpedRoots"] = "minecraft:warped_roots";
      MinecraftItemTypes2["WarpedShelf"] = "minecraft:warped_shelf";
      MinecraftItemTypes2["WarpedSign"] = "minecraft:warped_sign";
      MinecraftItemTypes2["WarpedSlab"] = "minecraft:warped_slab";
      MinecraftItemTypes2["WarpedStairs"] = "minecraft:warped_stairs";
      MinecraftItemTypes2["WarpedStem"] = "minecraft:warped_stem";
      MinecraftItemTypes2["WarpedTrapdoor"] = "minecraft:warped_trapdoor";
      MinecraftItemTypes2["WarpedWartBlock"] = "minecraft:warped_wart_block";
      MinecraftItemTypes2["WaterBucket"] = "minecraft:water_bucket";
      MinecraftItemTypes2["Waterlily"] = "minecraft:waterlily";
      MinecraftItemTypes2["WaxedChiseledCopper"] = "minecraft:waxed_chiseled_copper";
      MinecraftItemTypes2["WaxedCopper"] = "minecraft:waxed_copper";
      MinecraftItemTypes2["WaxedCopperBars"] = "minecraft:waxed_copper_bars";
      MinecraftItemTypes2["WaxedCopperBulb"] = "minecraft:waxed_copper_bulb";
      MinecraftItemTypes2["WaxedCopperChain"] = "minecraft:waxed_copper_chain";
      MinecraftItemTypes2["WaxedCopperChest"] = "minecraft:waxed_copper_chest";
      MinecraftItemTypes2["WaxedCopperDoor"] = "minecraft:waxed_copper_door";
      MinecraftItemTypes2["WaxedCopperGolemStatue"] = "minecraft:waxed_copper_golem_statue";
      MinecraftItemTypes2["WaxedCopperGrate"] = "minecraft:waxed_copper_grate";
      MinecraftItemTypes2["WaxedCopperLantern"] = "minecraft:waxed_copper_lantern";
      MinecraftItemTypes2["WaxedCopperTrapdoor"] = "minecraft:waxed_copper_trapdoor";
      MinecraftItemTypes2["WaxedCutCopper"] = "minecraft:waxed_cut_copper";
      MinecraftItemTypes2["WaxedCutCopperSlab"] = "minecraft:waxed_cut_copper_slab";
      MinecraftItemTypes2["WaxedCutCopperStairs"] = "minecraft:waxed_cut_copper_stairs";
      MinecraftItemTypes2["WaxedExposedChiseledCopper"] = "minecraft:waxed_exposed_chiseled_copper";
      MinecraftItemTypes2["WaxedExposedCopper"] = "minecraft:waxed_exposed_copper";
      MinecraftItemTypes2["WaxedExposedCopperBars"] = "minecraft:waxed_exposed_copper_bars";
      MinecraftItemTypes2["WaxedExposedCopperBulb"] = "minecraft:waxed_exposed_copper_bulb";
      MinecraftItemTypes2["WaxedExposedCopperChain"] = "minecraft:waxed_exposed_copper_chain";
      MinecraftItemTypes2["WaxedExposedCopperChest"] = "minecraft:waxed_exposed_copper_chest";
      MinecraftItemTypes2["WaxedExposedCopperDoor"] = "minecraft:waxed_exposed_copper_door";
      MinecraftItemTypes2["WaxedExposedCopperGolemStatue"] = "minecraft:waxed_exposed_copper_golem_statue";
      MinecraftItemTypes2["WaxedExposedCopperGrate"] = "minecraft:waxed_exposed_copper_grate";
      MinecraftItemTypes2["WaxedExposedCopperLantern"] = "minecraft:waxed_exposed_copper_lantern";
      MinecraftItemTypes2["WaxedExposedCopperTrapdoor"] = "minecraft:waxed_exposed_copper_trapdoor";
      MinecraftItemTypes2["WaxedExposedCutCopper"] = "minecraft:waxed_exposed_cut_copper";
      MinecraftItemTypes2["WaxedExposedCutCopperSlab"] = "minecraft:waxed_exposed_cut_copper_slab";
      MinecraftItemTypes2["WaxedExposedCutCopperStairs"] = "minecraft:waxed_exposed_cut_copper_stairs";
      MinecraftItemTypes2["WaxedExposedLightningRod"] = "minecraft:waxed_exposed_lightning_rod";
      MinecraftItemTypes2["WaxedLightningRod"] = "minecraft:waxed_lightning_rod";
      MinecraftItemTypes2["WaxedOxidizedChiseledCopper"] = "minecraft:waxed_oxidized_chiseled_copper";
      MinecraftItemTypes2["WaxedOxidizedCopper"] = "minecraft:waxed_oxidized_copper";
      MinecraftItemTypes2["WaxedOxidizedCopperBars"] = "minecraft:waxed_oxidized_copper_bars";
      MinecraftItemTypes2["WaxedOxidizedCopperBulb"] = "minecraft:waxed_oxidized_copper_bulb";
      MinecraftItemTypes2["WaxedOxidizedCopperChain"] = "minecraft:waxed_oxidized_copper_chain";
      MinecraftItemTypes2["WaxedOxidizedCopperChest"] = "minecraft:waxed_oxidized_copper_chest";
      MinecraftItemTypes2["WaxedOxidizedCopperDoor"] = "minecraft:waxed_oxidized_copper_door";
      MinecraftItemTypes2["WaxedOxidizedCopperGolemStatue"] = "minecraft:waxed_oxidized_copper_golem_statue";
      MinecraftItemTypes2["WaxedOxidizedCopperGrate"] = "minecraft:waxed_oxidized_copper_grate";
      MinecraftItemTypes2["WaxedOxidizedCopperLantern"] = "minecraft:waxed_oxidized_copper_lantern";
      MinecraftItemTypes2["WaxedOxidizedCopperTrapdoor"] = "minecraft:waxed_oxidized_copper_trapdoor";
      MinecraftItemTypes2["WaxedOxidizedCutCopper"] = "minecraft:waxed_oxidized_cut_copper";
      MinecraftItemTypes2["WaxedOxidizedCutCopperSlab"] = "minecraft:waxed_oxidized_cut_copper_slab";
      MinecraftItemTypes2["WaxedOxidizedCutCopperStairs"] = "minecraft:waxed_oxidized_cut_copper_stairs";
      MinecraftItemTypes2["WaxedOxidizedLightningRod"] = "minecraft:waxed_oxidized_lightning_rod";
      MinecraftItemTypes2["WaxedWeatheredChiseledCopper"] = "minecraft:waxed_weathered_chiseled_copper";
      MinecraftItemTypes2["WaxedWeatheredCopper"] = "minecraft:waxed_weathered_copper";
      MinecraftItemTypes2["WaxedWeatheredCopperBars"] = "minecraft:waxed_weathered_copper_bars";
      MinecraftItemTypes2["WaxedWeatheredCopperBulb"] = "minecraft:waxed_weathered_copper_bulb";
      MinecraftItemTypes2["WaxedWeatheredCopperChain"] = "minecraft:waxed_weathered_copper_chain";
      MinecraftItemTypes2["WaxedWeatheredCopperChest"] = "minecraft:waxed_weathered_copper_chest";
      MinecraftItemTypes2["WaxedWeatheredCopperDoor"] = "minecraft:waxed_weathered_copper_door";
      MinecraftItemTypes2["WaxedWeatheredCopperGolemStatue"] = "minecraft:waxed_weathered_copper_golem_statue";
      MinecraftItemTypes2["WaxedWeatheredCopperGrate"] = "minecraft:waxed_weathered_copper_grate";
      MinecraftItemTypes2["WaxedWeatheredCopperLantern"] = "minecraft:waxed_weathered_copper_lantern";
      MinecraftItemTypes2["WaxedWeatheredCopperTrapdoor"] = "minecraft:waxed_weathered_copper_trapdoor";
      MinecraftItemTypes2["WaxedWeatheredCutCopper"] = "minecraft:waxed_weathered_cut_copper";
      MinecraftItemTypes2["WaxedWeatheredCutCopperSlab"] = "minecraft:waxed_weathered_cut_copper_slab";
      MinecraftItemTypes2["WaxedWeatheredCutCopperStairs"] = "minecraft:waxed_weathered_cut_copper_stairs";
      MinecraftItemTypes2["WaxedWeatheredLightningRod"] = "minecraft:waxed_weathered_lightning_rod";
      MinecraftItemTypes2["WayfinderArmorTrimSmithingTemplate"] = "minecraft:wayfinder_armor_trim_smithing_template";
      MinecraftItemTypes2["WeatheredChiseledCopper"] = "minecraft:weathered_chiseled_copper";
      MinecraftItemTypes2["WeatheredCopper"] = "minecraft:weathered_copper";
      MinecraftItemTypes2["WeatheredCopperBars"] = "minecraft:weathered_copper_bars";
      MinecraftItemTypes2["WeatheredCopperBulb"] = "minecraft:weathered_copper_bulb";
      MinecraftItemTypes2["WeatheredCopperChain"] = "minecraft:weathered_copper_chain";
      MinecraftItemTypes2["WeatheredCopperChest"] = "minecraft:weathered_copper_chest";
      MinecraftItemTypes2["WeatheredCopperDoor"] = "minecraft:weathered_copper_door";
      MinecraftItemTypes2["WeatheredCopperGolemStatue"] = "minecraft:weathered_copper_golem_statue";
      MinecraftItemTypes2["WeatheredCopperGrate"] = "minecraft:weathered_copper_grate";
      MinecraftItemTypes2["WeatheredCopperLantern"] = "minecraft:weathered_copper_lantern";
      MinecraftItemTypes2["WeatheredCopperTrapdoor"] = "minecraft:weathered_copper_trapdoor";
      MinecraftItemTypes2["WeatheredCutCopper"] = "minecraft:weathered_cut_copper";
      MinecraftItemTypes2["WeatheredCutCopperSlab"] = "minecraft:weathered_cut_copper_slab";
      MinecraftItemTypes2["WeatheredCutCopperStairs"] = "minecraft:weathered_cut_copper_stairs";
      MinecraftItemTypes2["WeatheredLightningRod"] = "minecraft:weathered_lightning_rod";
      MinecraftItemTypes2["Web"] = "minecraft:web";
      MinecraftItemTypes2["WeepingVines"] = "minecraft:weeping_vines";
      MinecraftItemTypes2["WetSponge"] = "minecraft:wet_sponge";
      MinecraftItemTypes2["Wheat"] = "minecraft:wheat";
      MinecraftItemTypes2["WheatSeeds"] = "minecraft:wheat_seeds";
      MinecraftItemTypes2["WhiteBundle"] = "minecraft:white_bundle";
      MinecraftItemTypes2["WhiteCandle"] = "minecraft:white_candle";
      MinecraftItemTypes2["WhiteCarpet"] = "minecraft:white_carpet";
      MinecraftItemTypes2["WhiteConcrete"] = "minecraft:white_concrete";
      MinecraftItemTypes2["WhiteConcretePowder"] = "minecraft:white_concrete_powder";
      MinecraftItemTypes2["WhiteDye"] = "minecraft:white_dye";
      MinecraftItemTypes2["WhiteGlazedTerracotta"] = "minecraft:white_glazed_terracotta";
      MinecraftItemTypes2["WhiteHarness"] = "minecraft:white_harness";
      MinecraftItemTypes2["WhiteShulkerBox"] = "minecraft:white_shulker_box";
      MinecraftItemTypes2["WhiteStainedGlass"] = "minecraft:white_stained_glass";
      MinecraftItemTypes2["WhiteStainedGlassPane"] = "minecraft:white_stained_glass_pane";
      MinecraftItemTypes2["WhiteTerracotta"] = "minecraft:white_terracotta";
      MinecraftItemTypes2["WhiteTulip"] = "minecraft:white_tulip";
      MinecraftItemTypes2["WhiteWool"] = "minecraft:white_wool";
      MinecraftItemTypes2["WildArmorTrimSmithingTemplate"] = "minecraft:wild_armor_trim_smithing_template";
      MinecraftItemTypes2["Wildflowers"] = "minecraft:wildflowers";
      MinecraftItemTypes2["WindCharge"] = "minecraft:wind_charge";
      MinecraftItemTypes2["WitchSpawnEgg"] = "minecraft:witch_spawn_egg";
      MinecraftItemTypes2["WitherRose"] = "minecraft:wither_rose";
      MinecraftItemTypes2["WitherSkeletonSkull"] = "minecraft:wither_skeleton_skull";
      MinecraftItemTypes2["WitherSkeletonSpawnEgg"] = "minecraft:wither_skeleton_spawn_egg";
      MinecraftItemTypes2["WitherSpawnEgg"] = "minecraft:wither_spawn_egg";
      MinecraftItemTypes2["WolfArmor"] = "minecraft:wolf_armor";
      MinecraftItemTypes2["WolfSpawnEgg"] = "minecraft:wolf_spawn_egg";
      MinecraftItemTypes2["WoodenAxe"] = "minecraft:wooden_axe";
      MinecraftItemTypes2["WoodenButton"] = "minecraft:wooden_button";
      MinecraftItemTypes2["WoodenDoor"] = "minecraft:wooden_door";
      MinecraftItemTypes2["WoodenHoe"] = "minecraft:wooden_hoe";
      MinecraftItemTypes2["WoodenPickaxe"] = "minecraft:wooden_pickaxe";
      MinecraftItemTypes2["WoodenPressurePlate"] = "minecraft:wooden_pressure_plate";
      MinecraftItemTypes2["WoodenShovel"] = "minecraft:wooden_shovel";
      MinecraftItemTypes2["WoodenSword"] = "minecraft:wooden_sword";
      MinecraftItemTypes2["WritableBook"] = "minecraft:writable_book";
      MinecraftItemTypes2["YellowBundle"] = "minecraft:yellow_bundle";
      MinecraftItemTypes2["YellowCandle"] = "minecraft:yellow_candle";
      MinecraftItemTypes2["YellowCarpet"] = "minecraft:yellow_carpet";
      MinecraftItemTypes2["YellowConcrete"] = "minecraft:yellow_concrete";
      MinecraftItemTypes2["YellowConcretePowder"] = "minecraft:yellow_concrete_powder";
      MinecraftItemTypes2["YellowDye"] = "minecraft:yellow_dye";
      MinecraftItemTypes2["YellowGlazedTerracotta"] = "minecraft:yellow_glazed_terracotta";
      MinecraftItemTypes2["YellowHarness"] = "minecraft:yellow_harness";
      MinecraftItemTypes2["YellowShulkerBox"] = "minecraft:yellow_shulker_box";
      MinecraftItemTypes2["YellowStainedGlass"] = "minecraft:yellow_stained_glass";
      MinecraftItemTypes2["YellowStainedGlassPane"] = "minecraft:yellow_stained_glass_pane";
      MinecraftItemTypes2["YellowTerracotta"] = "minecraft:yellow_terracotta";
      MinecraftItemTypes2["YellowWool"] = "minecraft:yellow_wool";
      MinecraftItemTypes2["ZoglinSpawnEgg"] = "minecraft:zoglin_spawn_egg";
      MinecraftItemTypes2["ZombieHead"] = "minecraft:zombie_head";
      MinecraftItemTypes2["ZombieHorseSpawnEgg"] = "minecraft:zombie_horse_spawn_egg";
      MinecraftItemTypes2["ZombiePigmanSpawnEgg"] = "minecraft:zombie_pigman_spawn_egg";
      MinecraftItemTypes2["ZombieSpawnEgg"] = "minecraft:zombie_spawn_egg";
      MinecraftItemTypes2["ZombieVillagerSpawnEgg"] = "minecraft:zombie_villager_spawn_egg";
      return MinecraftItemTypes2;
    })(MinecraftItemTypes || {});
    MinecraftPotionDeliveryTypes = ((MinecraftPotionDeliveryTypes2) => {
      MinecraftPotionDeliveryTypes2["Consume"] = "Consume";
      MinecraftPotionDeliveryTypes2["ThrownLingering"] = "ThrownLingering";
      MinecraftPotionDeliveryTypes2["ThrownSplash"] = "ThrownSplash";
      return MinecraftPotionDeliveryTypes2;
    })(MinecraftPotionDeliveryTypes || {});
    MinecraftPotionEffectTypes = ((MinecraftPotionEffectTypes2) => {
      MinecraftPotionEffectTypes2["Awkward"] = "minecraft:awkward";
      MinecraftPotionEffectTypes2["FireResistance"] = "minecraft:fire_resistance";
      MinecraftPotionEffectTypes2["Harming"] = "minecraft:harming";
      MinecraftPotionEffectTypes2["Healing"] = "minecraft:healing";
      MinecraftPotionEffectTypes2["Infested"] = "minecraft:infested";
      MinecraftPotionEffectTypes2["Invisibility"] = "minecraft:invisibility";
      MinecraftPotionEffectTypes2["Leaping"] = "minecraft:leaping";
      MinecraftPotionEffectTypes2["LongFireResistance"] = "minecraft:long_fire_resistance";
      MinecraftPotionEffectTypes2["LongInvisibility"] = "minecraft:long_invisibility";
      MinecraftPotionEffectTypes2["LongLeaping"] = "minecraft:long_leaping";
      MinecraftPotionEffectTypes2["LongMundane"] = "minecraft:long_mundane";
      MinecraftPotionEffectTypes2["LongNightvision"] = "minecraft:long_nightvision";
      MinecraftPotionEffectTypes2["LongPoison"] = "minecraft:long_poison";
      MinecraftPotionEffectTypes2["LongRegeneration"] = "minecraft:long_regeneration";
      MinecraftPotionEffectTypes2["LongSlowFalling"] = "minecraft:long_slow_falling";
      MinecraftPotionEffectTypes2["LongSlowness"] = "minecraft:long_slowness";
      MinecraftPotionEffectTypes2["LongStrength"] = "minecraft:long_strength";
      MinecraftPotionEffectTypes2["LongSwiftness"] = "minecraft:long_swiftness";
      MinecraftPotionEffectTypes2["LongTurtleMaster"] = "minecraft:long_turtle_master";
      MinecraftPotionEffectTypes2["LongWaterBreathing"] = "minecraft:long_water_breathing";
      MinecraftPotionEffectTypes2["LongWeakness"] = "minecraft:long_weakness";
      MinecraftPotionEffectTypes2["Mundane"] = "minecraft:mundane";
      MinecraftPotionEffectTypes2["Nightvision"] = "minecraft:nightvision";
      MinecraftPotionEffectTypes2["Oozing"] = "minecraft:oozing";
      MinecraftPotionEffectTypes2["Poison"] = "minecraft:poison";
      MinecraftPotionEffectTypes2["Regeneration"] = "minecraft:regeneration";
      MinecraftPotionEffectTypes2["SlowFalling"] = "minecraft:slow_falling";
      MinecraftPotionEffectTypes2["Slowness"] = "minecraft:slowness";
      MinecraftPotionEffectTypes2["Strength"] = "minecraft:strength";
      MinecraftPotionEffectTypes2["StrongHarming"] = "minecraft:strong_harming";
      MinecraftPotionEffectTypes2["StrongHealing"] = "minecraft:strong_healing";
      MinecraftPotionEffectTypes2["StrongLeaping"] = "minecraft:strong_leaping";
      MinecraftPotionEffectTypes2["StrongPoison"] = "minecraft:strong_poison";
      MinecraftPotionEffectTypes2["StrongRegeneration"] = "minecraft:strong_regeneration";
      MinecraftPotionEffectTypes2["StrongSlowness"] = "minecraft:strong_slowness";
      MinecraftPotionEffectTypes2["StrongStrength"] = "minecraft:strong_strength";
      MinecraftPotionEffectTypes2["StrongSwiftness"] = "minecraft:strong_swiftness";
      MinecraftPotionEffectTypes2["StrongTurtleMaster"] = "minecraft:strong_turtle_master";
      MinecraftPotionEffectTypes2["Swiftness"] = "minecraft:swiftness";
      MinecraftPotionEffectTypes2["Thick"] = "minecraft:thick";
      MinecraftPotionEffectTypes2["TurtleMaster"] = "minecraft:turtle_master";
      MinecraftPotionEffectTypes2["Water"] = "minecraft:water";
      MinecraftPotionEffectTypes2["WaterBreathing"] = "minecraft:water_breathing";
      MinecraftPotionEffectTypes2["Weakness"] = "minecraft:weakness";
      MinecraftPotionEffectTypes2["Weaving"] = "minecraft:weaving";
      MinecraftPotionEffectTypes2["WindCharged"] = "minecraft:wind_charged";
      MinecraftPotionEffectTypes2["Wither"] = "minecraft:wither";
      return MinecraftPotionEffectTypes2;
    })(MinecraftPotionEffectTypes || {});
  }
});

// data/scripts/lib/cache/players.ts
import { system, world } from "@minecraft/server";
function registerEvents() {
  world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (initialSpawn) {
      playerList.push(player);
    }
  });
  world.beforeEvents.playerLeave.subscribe(({ player }) => {
    playerList = playerList.filter((p) => p !== player);
  });
}
function getAllPlayers() {
  if (!playerList) {
    playerList = world.getAllPlayers();
    system.run(registerEvents);
  }
  return playerList;
}
var playerList;
var init_players = __esm({
  "data/scripts/lib/cache/players.ts"() {
    "use strict";
  }
});

// data/scripts/lib/cache/dimension.ts
import { system as system2, world as world2 } from "@minecraft/server";
function getDimension(id) {
  let dimension = cache.get(id);
  if (!dimension) {
    dimension = world2.getDimension(id);
    cache.set(id, dimension);
  }
  return dimension;
}
function registerEvents2() {
  world2.afterEvents.playerDimensionChange.subscribe(({ fromDimension, toDimension }) => {
    if (fromDimension.getPlayers().length === 0) {
      dimensionList = dimensionList.filter((d) => d !== fromDimension);
    }
    if (!dimensionList.includes(toDimension)) {
      dimensionList.push(toDimension);
    }
  });
  world2.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    const dimension = player.dimension;
    if (initialSpawn && !dimensionList.includes(dimension)) {
      dimensionList.push(dimension);
    }
  });
  world2.beforeEvents.playerLeave.subscribe(({ player }) => {
    const dimension = player.dimension;
    if (dimension.getPlayers().length === 0) {
      dimensionList = dimensionList.filter((d) => d !== dimension);
    }
  });
}
function getActiveDimensions() {
  if (!dimensionList) {
    dimensionList = Array.from(new Set(getAllPlayers().map((p) => p.dimension)));
    system2.run(registerEvents2);
  }
  return dimensionList;
}
var cache, dimensionList;
var init_dimension = __esm({
  "data/scripts/lib/cache/dimension.ts"() {
    "use strict";
    init_players();
    cache = /* @__PURE__ */ new Map();
  }
});

// data/scripts/lib/permissions.ts
import { PlayerPermissionLevel } from "@minecraft/server";
function isOperator(player) {
  return player.playerPermissionLevel === PlayerPermissionLevel.Operator;
}
var init_permissions = __esm({
  "data/scripts/lib/permissions.ts"() {
    "use strict";
  }
});

// data/scripts/lib/particles.ts
function safeSpawnParticle(dimension, particleId, location, molangVariables) {
  if (!dimension.isChunkLoaded(location)) {
    return false;
  }
  dimension.spawnParticle(particleId, location, molangVariables);
  return true;
}
var init_particles = __esm({
  "data/scripts/lib/particles.ts"() {
    "use strict";
  }
});

// data/scripts/lib/safe_parse.ts
function safeParse(input) {
  if (typeof input !== "string" || input.length === 0) return void 0;
  try {
    return JSON.parse(input);
  } catch {
    return void 0;
  }
}
var init_safe_parse = __esm({
  "data/scripts/lib/safe_parse.ts"() {
    "use strict";
  }
});

// data/scripts/modules/weather/weather_data.ts
var weatherWeights, particleMap;
var init_weather_data = __esm({
  "data/scripts/modules/weather/weather_data.ts"() {
    "use strict";
    init_season_core();
    weatherWeights = {
      ["spring" /* Spring */]: [
        [
          { type: "clear" /* Clear */, weight: 50 },
          { type: "rain" /* Rain */, weight: 45 },
          { type: "sleet" /* Sleet */, weight: 5 }
        ],
        [
          { type: "clear" /* Clear */, weight: 50 },
          { type: "rain" /* Rain */, weight: 50 }
        ],
        [
          { type: "clear" /* Clear */, weight: 45 },
          { type: "rain" /* Rain */, weight: 50 },
          { type: "storm" /* Storm */, weight: 5 }
        ],
        [
          { type: "clear" /* Clear */, weight: 60 },
          { type: "rain" /* Rain */, weight: 40 },
          { type: "storm" /* Storm */, weight: 15 }
        ]
      ],
      ["summer" /* Summer */]: [
        [
          { type: "clear" /* Clear */, weight: 60 },
          { type: "rain" /* Rain */, weight: 30 },
          { type: "storm" /* Storm */, weight: 10 }
        ],
        [
          { type: "clear" /* Clear */, weight: 50 },
          { type: "rain" /* Rain */, weight: 45 },
          { type: "storm" /* Storm */, weight: 5 }
        ],
        [
          { type: "clear" /* Clear */, weight: 50 },
          { type: "rain" /* Rain */, weight: 45 },
          { type: "storm" /* Storm */, weight: 5 }
        ],
        [
          { type: "clear" /* Clear */, weight: 50 },
          { type: "rain" /* Rain */, weight: 40 },
          { type: "storm" /* Storm */, weight: 10 }
        ]
      ],
      ["fall" /* Fall */]: [
        [
          { type: "clear" /* Clear */, weight: 50 },
          { type: "rain" /* Rain */, weight: 30 },
          { type: "storm" /* Storm */, weight: 20 }
        ],
        [
          { type: "clear" /* Clear */, weight: 30 },
          { type: "foggy" /* Foggy */, weight: 10 },
          { type: "rain" /* Rain */, weight: 40 },
          { type: "storm" /* Storm */, weight: 20 }
        ],
        [
          { type: "clear" /* Clear */, weight: 30 },
          { type: "foggy" /* Foggy */, weight: 10 },
          { type: "rain" /* Rain */, weight: 30 },
          { type: "storm" /* Storm */, weight: 30 }
        ],
        [
          { type: "clear" /* Clear */, weight: 30 },
          { type: "foggy" /* Foggy */, weight: 10 },
          { type: "rain" /* Rain */, weight: 10 },
          { type: "storm" /* Storm */, weight: 10 },
          { type: "sleet" /* Sleet */, weight: 30 }
        ]
      ],
      ["winter" /* Winter */]: [
        [
          { type: "clear" /* Clear */, weight: 40 },
          { type: "sleet" /* Sleet */, weight: 20 },
          { type: "storm" /* Storm */, weight: 20 },
          { type: "flurries" /* Flurries */, weight: 20 }
        ],
        [
          { type: "clear" /* Clear */, weight: 30 },
          { type: "flurries" /* Flurries */, weight: 30 },
          { type: "snowing" /* Snowing */, weight: 30 },
          { type: "blizzard" /* Blizzard */, weight: 10 }
        ],
        [
          { type: "clear" /* Clear */, weight: 30 },
          { type: "flurries" /* Flurries */, weight: 30 },
          { type: "snowing" /* Snowing */, weight: 30 },
          { type: "blizzard" /* Blizzard */, weight: 10 }
        ],
        [
          { type: "clear" /* Clear */, weight: 50 },
          { type: "sleet" /* Sleet */, weight: 10 },
          { type: "flurries" /* Flurries */, weight: 40 }
        ]
      ]
    };
    particleMap = {
      ["rain" /* Rain */]: "mythicus_sn:raining",
      ["storm" /* Storm */]: "mythicus_sn:raining",
      ["sleet" /* Sleet */]: "mythicus_sn:sleet",
      ["flurries" /* Flurries */]: "mythicus_sn:flurries",
      ["snowing" /* Snowing */]: "mythicus_sn:snowing",
      ["blizzard" /* Blizzard */]: "mythicus_sn:blizzard"
    };
  }
});

// data/scripts/modules/weather/fogs/fog_data.ts
var fogMap;
var init_fog_data = __esm({
  "data/scripts/modules/weather/fogs/fog_data.ts"() {
    "use strict";
    fogMap = {
      rain: "mythicus_sn:fog_raining",
      sleet: "mythicus_sn:fog_raining",
      storm: "mythicus_sn:fog_storming",
      foggy: "mythicus_sn:fog_foggy",
      hurricane: "mythicus_sn:fog_storming",
      flurries: "mythicus_sn:fog_flurries",
      snowing: "mythicus_sn:fog_snowing",
      blizzard: "mythicus_sn:fog_blizzard"
    };
  }
});

// data/scripts/modules/weather/fogs/fog_system.ts
function isSeasonalBiome(biome) {
  return typeof biome === "string" && biome.includes("mythicus_sn:seasonal_");
}
function getFogForWeather(weather) {
  return fogMap[weather];
}
var init_fog_system = __esm({
  "data/scripts/modules/weather/fogs/fog_system.ts"() {
    "use strict";
    init_fog_data();
  }
});

// data/scripts/modules/rainbow/rainbow_runner.ts
import { TicksPerSecond as TicksPerSecond2, system as system5, world as world4 } from "@minecraft/server";
function queryGroundHeight(dimension, centerX, centerZ, probeDistance = 16) {
  let highestGroundY = 1;
  const probeLocations = [
    { x: centerX, z: centerZ },
    { x: centerX - probeDistance, z: centerZ },
    { x: centerX + probeDistance, z: centerZ },
    { x: centerX, z: centerZ - probeDistance },
    { x: centerX, z: centerZ + probeDistance },
    { x: centerX - probeDistance / 2, z: centerZ - probeDistance / 2 },
    { x: centerX + probeDistance / 2, z: centerZ + probeDistance / 2 }
  ];
  for (const location of probeLocations) {
    if (!dimension.isChunkLoaded({ x: location.x, y: 0, z: location.z })) continue;
    const block = dimension.getTopmostBlock({ x: location.x, z: location.z });
    if (block) {
      const groundY = block.y + 1;
      highestGroundY = Math.max(highestGroundY, groundY);
    }
  }
  return highestGroundY;
}
function shouldSpawnRainbow() {
  if (rainbowRollAttempted) return false;
  const roll = Math.random();
  rainbowRollAttempted = true;
  return roll >= RAINBOW_CHANCE;
}
function resetRainbowRoll() {
  rainbowRollAttempted = false;
}
function spawnRainbows() {
  const particlesEnabled = world4.getDynamicProperty("mythicus_sn:particles_enabled") ?? true;
  if (!particlesEnabled) {
    return;
  }
  const allPlayers = getAllPlayers();
  if (allPlayers.length === 0) return;
  const seasonalPlayers = allPlayers.filter((player) => {
    const biome = player.dimension.getBiome(player.location);
    return isSeasonalBiome(biome.id);
  });
  if (seasonalPlayers.length === 0) return;
  const randomRoll = Math.floor(Math.random() * seasonalPlayers.length);
  const randomPlayer = seasonalPlayers[randomRoll];
  if (currentRainbow) {
    currentRainbow.cleanup();
  }
  currentRainbow = new Rainbow(randomPlayer);
}
function spawnRainbowWithLifetime(player, lifetimeInSeconds) {
  const particlesEnabled = world4.getDynamicProperty("mythicus_sn:particles_enabled") ?? true;
  if (!particlesEnabled) {
    return;
  }
  if (currentRainbow) {
    currentRainbow.cleanup();
  }
  currentRainbow = new Rainbow(player, lifetimeInSeconds);
}
var Rainbow, rainbowRollAttempted, RAINBOW_CHANCE, currentRainbow;
var init_rainbow_runner = __esm({
  "data/scripts/modules/rainbow/rainbow_runner.ts"() {
    "use strict";
    init_lib2();
    init_dimension();
    init_players();
    init_particles();
    init_fog_system();
    Rainbow = class {
      emitters = [];
      particlesToChooseFrom = [
        "mythicus_sn:rainbow",
        "mythicus_sn:double_rainbow"
      ];
      lifetimeInTicks;
      createdAt;
      constructor(player, lifetimeInSeconds = 60, currentTick = system5.currentTick) {
        this.lifetimeInTicks = lifetimeInSeconds * TicksPerSecond2;
        this.createdAt = currentTick;
        const dimension = getDimension(MinecraftDimensionTypes.Overworld);
        const randomOffsetX = Math.round((Math.random() - 0.5) * 32);
        const randomOffsetZ = Math.round((Math.random() - 0.5) * 32);
        const chooseParticle = this.particlesToChooseFrom[Math.round(Math.random() * (this.particlesToChooseFrom.length - 1))];
        const baseLocation = player.location;
        baseLocation.z -= 48;
        const groundHeight = queryGroundHeight(dimension, baseLocation.x + randomOffsetX, baseLocation.z + randomOffsetZ);
        const rainbowHeight = groundHeight + 20;
        const newParticleLocation = {
          x: baseLocation.x + randomOffsetX,
          y: rainbowHeight,
          z: baseLocation.z + randomOffsetZ
        };
        const emitter = {
          location: newParticleLocation,
          particle: chooseParticle
        };
        this.emitters.push(emitter);
        if (chooseParticle == "mythicus_sn:double_rainbow") {
          safeSpawnParticle(dimension, this.particlesToChooseFrom[0], emitter.location);
        }
        safeSpawnParticle(dimension, emitter.particle, emitter.location);
      }
      isExpired(currentTick) {
        return currentTick - this.createdAt >= this.lifetimeInTicks;
      }
      process(currentTick = system5.currentTick) {
        if (this.isExpired(currentTick)) {
          this.cleanup();
          return;
        }
        const dimension = getDimension(MinecraftDimensionTypes.Overworld);
        this.emitters.forEach((emitter) => {
          if (emitter.particle === "mythicus_sn:double_rainbow") {
            safeSpawnParticle(dimension, this.particlesToChooseFrom[0], emitter.location);
          }
          safeSpawnParticle(dimension, emitter.particle, emitter.location);
        });
      }
      cleanup() {
        this.emitters = [];
      }
    };
    rainbowRollAttempted = false;
    RAINBOW_CHANCE = 0.5;
    currentRainbow = null;
    system5.runInterval(() => {
      const particlesEnabled = world4.getDynamicProperty("mythicus_sn:particles_enabled") ?? true;
      if (!particlesEnabled) {
        if (currentRainbow) {
          currentRainbow.cleanup();
          currentRainbow = null;
        }
        return;
      }
      if (currentRainbow) {
        if (currentRainbow.isExpired(system5.currentTick)) {
          currentRainbow.cleanup();
          currentRainbow = null;
        } else {
          currentRainbow.process();
        }
      }
    }, 179 * TicksPerSecond2);
  }
});

// data/scripts/modules/weather/weather_system.ts
import { MolangVariableMap, TicksPerSecond as TicksPerSecond3, system as system6, world as world5 } from "@minecraft/server";
function onDayEnd(currentDay) {
  if (forecast.length === 0) {
    initializeForecast(currentDay);
    return;
  }
  const previousWeather = forecast[0].weather;
  forecast.shift();
  const futureDay = currentDay + (forecastLength - 1);
  const [season, subIndex] = getFutureSeasonandSubIndex(futureDay);
  const weather = rollWeightedWeather(season, subIndex);
  forecast.push({ day: futureDay, weather });
  saveForecastToWorld();
  if (isRainy(previousWeather) && forecast[0].weather === "clear" /* Clear */) {
    resetRainbowRoll();
    if (shouldSpawnRainbow()) {
      spawnRainbows();
    }
  }
}
function initializeForecast(currentDay) {
  forecast = [];
  for (let i = 0; i < forecastLength; i++) {
    const futureDay = currentDay + i;
    const [season, subIndex] = getFutureSeasonandSubIndex(futureDay);
    const weather = rollWeightedWeather(season, subIndex);
    forecast[i] = { day: futureDay, weather };
  }
  saveForecastToWorld();
}
function getFutureSeasonandSubIndex(day) {
  let season;
  let subStageIndex = 0;
  const season_start_day = world5.getDynamicProperty(SEASON_START_DAY_PROPERTY);
  const season_ends_on = season_start_day + getActiveSeasonDuration();
  if (day >= season_ends_on) {
    season = getNextSeason(getCurrentSeason());
    const daysIntoNextSeason = day - season_ends_on;
    const transitionDurationPerSubStage = getActiveSeasonDuration() / 4;
    subStageIndex = Math.floor(daysIntoNextSeason / transitionDurationPerSubStage);
    subStageIndex = Math.max(0, Math.min(3, subStageIndex));
  } else {
    season = getCurrentSeason();
    const daysIntoCurrentSeason = day - season_start_day;
    const transitionDurationPerSubStage = getActiveSeasonDuration() / 4;
    subStageIndex = Math.floor(daysIntoCurrentSeason / transitionDurationPerSubStage);
    subStageIndex = Math.max(0, Math.min(3, subStageIndex));
  }
  return [season, subStageIndex];
}
function rollWeightedWeather(season, subIndex) {
  const seasonWeights = weatherWeights[season];
  if (!seasonWeights[subIndex] || subIndex < 0 || subIndex >= seasonWeights.length) {
    subIndex = 0;
  }
  const options = weatherWeights[season][subIndex];
  const totalWeight = options.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of options) {
    if (roll < entry.weight) {
      return entry.type;
    }
    roll -= entry.weight;
  }
  return "clear" /* Clear */;
}
function saveForecastToWorld() {
  world5.setDynamicProperty(FIVE_DAY_FORESCAST_PROPERTY, JSON.stringify(forecast));
}
function readSavedForecast() {
  const stored = world5.getDynamicProperty(FIVE_DAY_FORESCAST_PROPERTY);
  if (!stored) {
    forecast = [];
    return forecast;
  }
  forecast = safeParse(stored) ?? [];
  return forecast;
}
function isRainy(weather) {
  return weather === "rain" /* Rain */ || weather === "storm" /* Storm */;
}
function setFogForPlayer(player, currentFog, currentWeather) {
  const fogId = getFogForWeather(currentWeather);
  if (currentFog === fogId) return;
  if (currentFog) {
    const fogString2 = currentFog.split(":")[1];
    player.runCommand(`fog @s remove ${fogString2}`);
  }
  if (!fogId) return;
  const fogString = fogId.split(":")[1];
  player.runCommand(`fog @s push ${fogId} ${fogString} `);
  player.setDynamicProperty("mythicus_sn:current_fog", fogId);
}
function clearCurrentFog(player, currentFog) {
  if (!currentFog || currentFog === "None") {
    return;
  }
  const parts = currentFog.split(":");
  if (parts.length < 2) {
    player.setDynamicProperty("mythicus_sn:current_fog", "None");
    return;
  }
  const fogString = parts[1];
  player.runCommand(`fog @s remove ${fogString}`);
  player.setDynamicProperty("mythicus_sn:current_fog", "None");
}
function getParticleForWeather(season, weather) {
  const seasonData = particleMap[weather];
  return seasonData;
}
var FIVE_DAY_FORESCAST_PROPERTY, WEATHER_ENGINE_ENABLED_PROPERTY, forecastLength, forecast, lastKnownDay;
var init_weather_system = __esm({
  "data/scripts/modules/weather/weather_system.ts"() {
    "use strict";
    init_players();
    init_safe_parse();
    init_rainbow_runner();
    init_season_system();
    init_season_core();
    init_fog_system();
    init_weather_data();
    FIVE_DAY_FORESCAST_PROPERTY = "mythicus_sn:five_day_forecast";
    WEATHER_ENGINE_ENABLED_PROPERTY = "mythicus_sn:weather_engine_enabled";
    forecastLength = 5;
    forecast = [];
    lastKnownDay = -1;
    system6.runInterval(() => {
      const weatherEngineEnabled = world5.getDynamicProperty(WEATHER_ENGINE_ENABLED_PROPERTY) ?? true;
      if (!weatherEngineEnabled) return;
      const currentDay = world5.getDay();
      if (lastKnownDay === -1) {
        lastKnownDay = currentDay;
        return;
      }
      if (currentDay > lastKnownDay) {
        const daysSkipped = currentDay - lastKnownDay;
        if (daysSkipped > forecastLength) {
          initializeForecast(currentDay);
        } else {
          for (let day = lastKnownDay + 1; day <= currentDay; day++) {
            onDayEnd(day);
          }
        }
        lastKnownDay = currentDay;
      }
    }, 1 * TicksPerSecond3);
    world5.afterEvents.worldLoad.subscribe(() => {
      const currentDay = world5.getDay();
      if (world5.getDynamicProperty("mythicus_sn:particles_enabled") === void 0) {
        world5.setDynamicProperty("mythicus_sn:particles_enabled", true);
      }
      if (!world5.getDynamicProperty(FIVE_DAY_FORESCAST_PROPERTY)) {
        initializeForecast(currentDay);
      } else {
        readSavedForecast();
      }
    });
    system6.runInterval(() => {
      const weatherEngineEnabled = world5.getDynamicProperty(WEATHER_ENGINE_ENABLED_PROPERTY) ?? true;
      const players = getAllPlayers();
      if (!weatherEngineEnabled) {
        players.forEach((player) => {
          const currentFog = player.getDynamicProperty("mythicus_sn:current_fog");
          clearCurrentFog(player, currentFog);
        });
        return;
      }
      const particlesEnabled = world5.getDynamicProperty("mythicus_sn:particles_enabled") ?? true;
      players.forEach((player) => {
        const season = getCurrentSeason();
        const weather = forecast[0].weather;
        const currentBiome = player.getDynamicProperty("mythicus_sn:current_biome");
        const currentFog = player.getDynamicProperty("mythicus_sn:current_fog");
        let fogEnabled = player.getDynamicProperty("mythicus_sn:fogs_enabled");
        if (fogEnabled === void 0) {
          fogEnabled = true;
          player.setDynamicProperty("mythicus_sn:fogs_enabled", true);
        }
        if (!isSeasonalBiome(currentBiome)) {
          clearCurrentFog(player, currentFog);
          return;
        }
        if (!fogEnabled) {
          clearCurrentFog(player, currentFog);
        } else {
          setFogForPlayer(player, currentFog ?? "None", weather);
        }
        let weatherParticlesEnabled = player.getDynamicProperty("mythicus_sn:weather_particles");
        if (weatherParticlesEnabled === void 0) {
          weatherParticlesEnabled = true;
          player.setDynamicProperty("mythicus_sn:weather_particles", true);
        }
        if (!particlesEnabled || !weatherParticlesEnabled) {
          return;
        }
        const particleEffect = getParticleForWeather(season, weather);
        if (!particleEffect) return;
        const particleLocation = player.location;
        const playerY = particleLocation.y;
        particleLocation.y = 192;
        const playerMemoryTier = player.clientSystemInfo?.memoryTier ?? 0;
        const molangMap = new MolangVariableMap();
        molangMap.setVector3("speed", { x: 0, y: playerY, z: playerMemoryTier });
        player.spawnParticle(particleEffect, particleLocation, molangMap);
      });
    }, 1 * TicksPerSecond3);
  }
});

// data/scripts/modules/environmental_probe/environmental_probe_strategies.ts
import { BlockPermutation, MolangVariableMap as MolangVariableMap2, TicksPerSecond as TicksPerSecond4, system as system7, world as world6 } from "@minecraft/server";
function safeBlockOperation(dimension, location, operation) {
  if (!dimension.isChunkLoaded(location)) {
    return false;
  }
  operation();
  return true;
}
function getBlockParticle(blockTypeId) {
  return BLOCK_PARTICLE_MAP[blockTypeId];
}
function getSnowPermutation(height) {
  if (!snowPermutationCache) {
    snowPermutationCache = [];
    for (let h = 0; h <= 7; h++) {
      snowPermutationCache[h] = BlockPermutation.resolve("mythicus_sn:snow_layer", { "mythicus_sn:height": h });
    }
  }
  return snowPermutationCache[height];
}
function getSeasonStrategies(season, weather) {
  return SEASON_STRATEGY_MAP[season]?.[weather] ?? [];
}
var SEASON_STAGE_KEY, HEIGHT_STATE_KEY, BLOCK_PARTICLE_MAP, BLOCK_PARTICLE_KEYS, IceBelowStrategy, IceWaterStrategy, BlowingLeavesStrategy, NEIGHBOR_OFFSETS, snowPermutationCache, SnowAboveStrategy, BlizzardDriftsStrategy, LightningStrikeStrategy, BLOWING_LEAVES, SNOW_STRATEGY, ICE_STRATEGY, ICE_WATER_STRATEGY, LIGHTNING_STRATEGY, BLIZZARD_DRIFTS, SEASON_STRATEGY_MAP;
var init_environmental_probe_strategies = __esm({
  "data/scripts/modules/environmental_probe/environmental_probe_strategies.ts"() {
    "use strict";
    init_lib();
    init_particles();
    init_weather_data();
    init_season_core();
    init_environmental_probe();
    SEASON_STAGE_KEY = "mythicus_sn:season_stage";
    HEIGHT_STATE_KEY = "mythicus_sn:height";
    BLOCK_PARTICLE_MAP = {
      "mythicus_sn:red_leaves_oak": "mythicus_sn:airborne_red_leaves",
      "mythicus_sn:orange_leaves_oak": "mythicus_sn:airborne_orange_leaves",
      "mythicus_sn:yellow_leaves_oak": "mythicus_sn:airborne_yellow_leaves",
      "mythicus_sn:leaves_birch": "mythicus_sn:airborne_birch_leaves",
      "mythicus_sn:leaves_spruce": "mythicus_sn:airborne_spruce_leaves",
      "mythicus_sn:dark_oak_leaves": "mythicus_sn:airborne_dark_oak_leaves",
      "mythicus_sn:cherry_leaves": "mythicus_sn:airborne_cherry_leaves"
    };
    BLOCK_PARTICLE_KEYS = new Set(Object.keys(BLOCK_PARTICLE_MAP));
    IceBelowStrategy = class _IceBelowStrategy {
      static MAX_ICICLES_NEARBY = 3;
      static RADIUS = 4;
      getCandidates(results) {
        return results.filter((b) => !b.isAir && b.isAirBelow && b.isSurface && b.typeId != "mythicus_sn:icicle");
      }
      apply(probe, chosenBlock) {
        if (!chosenBlock.block) return;
        if (Math.random() >= 0.25) return;
        if (!probe.dimension.isChunkLoaded(chosenBlock.location)) return;
        const blockX = chosenBlock.block.x;
        const blockY = chosenBlock.block.y - 1;
        const blockZ = chosenBlock.block.z;
        const below = { x: blockX, y: blockY, z: blockZ };
        const blockBelow = probe.getBlock(below);
        if (!blockBelow?.isAir) return;
        let nearbyCount = 0;
        const radius = _IceBelowStrategy.RADIUS;
        const maxIcicles = _IceBelowStrategy.MAX_ICICLES_NEARBY;
        outer: for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            const check = probe.getBlock({ x: blockX + dx, y: blockY, z: blockZ + dz });
            if (check?.typeId === "mythicus_sn:icicle") {
              if (++nearbyCount >= maxIcicles) break outer;
            }
          }
        }
        if (nearbyCount >= maxIcicles) return;
        safeBlockOperation(probe.dimension, below, () => {
          blockBelow.setType("mythicus_sn:icicle");
        });
      }
    };
    IceWaterStrategy = class {
      getCandidates(results) {
        return results.filter((b) => b.isAirAbove && b.typeId == "minecraft:water");
      }
      apply(probe, chosenBlock) {
        if (!chosenBlock?.isLiquid || !chosenBlock.block) return;
        if (!probe.dimension.isChunkLoaded(chosenBlock.location)) return;
        safeBlockOperation(probe.dimension, chosenBlock.location, () => {
          chosenBlock.block.setType("mythicus_sn:ice");
        });
      }
    };
    BlowingLeavesStrategy = class {
      getCandidates(results) {
        const fallingLeavesEnabled = world6.getDynamicProperty(FALLING_LEAVES_ENABLED_PROPERTY) ?? true;
        if (!fallingLeavesEnabled) return [];
        return results.filter((b) => BLOCK_PARTICLE_KEYS.has(b.typeId));
      }
      apply(probe, chosenBlock) {
        if (!chosenBlock.block) return;
        if (!probe.dimension.isChunkLoaded(chosenBlock.location)) return;
        const particle = getBlockParticle(chosenBlock.block.typeId);
        if (!particle) return;
        const seasonStage = chosenBlock.block.permutation.getState(SEASON_STAGE_KEY);
        const molangMap = new MolangVariableMap2();
        molangMap.setVector3("data", { x: seasonStage, y: 0, z: 0 });
        safeSpawnParticle(chosenBlock.block.dimension, particle, chosenBlock.block, molangMap);
      }
    };
    NEIGHBOR_OFFSETS = Object.freeze(
      [
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
        { x: 1, z: 1 },
        { x: 1, z: -1 },
        { x: -1, z: 1 },
        { x: -1, z: -1 }
      ]
    );
    snowPermutationCache = null;
    SnowAboveStrategy = class {
      getCandidates(results) {
        const snowAccumulationEnabled = world6.getDynamicProperty(SNOW_ACCUMULATION_ENABLED_PROPERTY) ?? true;
        if (!snowAccumulationEnabled) return [];
        const priority = [];
        const rest = [];
        for (const b of results) {
          if (!b.isSurface || !b.isSkyExposed || b.isLiquid || b.typeId === "minecraft:ice") continue;
          if (b.isAir && !b.isSnowable) continue;
          const isSnowLayer = b.typeId === "mythicus_sn:snow_layer";
          if (!b.isSnowable && !b.isAirAbove && !isSnowLayer) continue;
          if (b.isAirAbove && !isSnowLayer) {
            priority.push(b);
          } else {
            rest.push(b);
          }
        }
        return priority.length > 0 ? priority.concat(rest) : rest;
      }
      apply(probe, chosenBlock) {
        if (!chosenBlock.block) return;
        if (!probe.dimension.isChunkLoaded(chosenBlock.location)) return;
        {
          const block = chosenBlock.block;
          if (!block?.isValid) return;
          const blockX = block.x;
          const blockY = block.y;
          const blockZ = block.z;
          if (chosenBlock.isSnowable) {
            probe.dimension.runCommand(
              `setblock ${blockX} ${blockY} ${blockZ} mythicus_sn:snow_layer ["mythicus_sn:height"=0]`
            );
            return;
          }
          if (chosenBlock.isAirAbove && block.typeId !== "mythicus_sn:snow_layer") {
            const above = block.above();
            if (above?.isAir) {
              const aboveLocation = { x: blockX, y: blockY + 1, z: blockZ };
              safeBlockOperation(probe.dimension, aboveLocation, () => {
                above.setPermutation(getSnowPermutation(0));
              });
            }
            return;
          }
          if (block.typeId === "mythicus_sn:snow_layer") {
            const currentHeight = block.permutation.getState(HEIGHT_STATE_KEY);
            let heightSum = 0;
            let neighborCount = 0;
            for (let i = 0; i < NEIGHBOR_OFFSETS.length; i++) {
              const offset = NEIGHBOR_OFFSETS[i];
              const neighbor = probe.getBlock({
                x: blockX + offset.x,
                y: blockY,
                z: blockZ + offset.z
              });
              if (neighbor?.typeId === "mythicus_sn:snow_layer") {
                const h = neighbor.permutation.getState(HEIGHT_STATE_KEY);
                if (typeof h === "number") {
                  heightSum += h;
                  neighborCount++;
                }
              }
            }
            const avgNeighborHeight = neighborCount > 0 ? heightSum / neighborCount : currentHeight;
            if (currentHeight < 7 && currentHeight <= avgNeighborHeight && Math.random() < 0.7) {
              const newHeight = currentHeight + 1;
              safeBlockOperation(probe.dimension, chosenBlock.location, () => {
                block.setPermutation(getSnowPermutation(newHeight));
              });
            }
            for (let i = 0; i < NEIGHBOR_OFFSETS.length; i++) {
              const offset = NEIGHBOR_OFFSETS[i];
              const neighbourPos = {
                x: blockX + offset.x,
                y: blockY,
                z: blockZ + offset.z
              };
              const neighbour = probe.getBlock(neighbourPos);
              if (neighbour && !neighbour.isAir) continue;
              const belowNeighbour = probe.dimension.getBlockBelow(neighbourPos);
              if (!belowNeighbour) continue;
              if (belowNeighbour.typeId === "mythicus_sn:snow_layer") {
                const neighborHeight = belowNeighbour.permutation.getState(HEIGHT_STATE_KEY);
                if (typeof neighborHeight === "number" && neighborHeight >= 0 && neighborHeight < 7) {
                  const increasedHeight = currentHeight <= avgNeighborHeight ? neighborHeight + 1 : neighborHeight;
                  const clampedHeight = Math.min(7, increasedHeight);
                  safeBlockOperation(probe.dimension, belowNeighbour, () => {
                    belowNeighbour.setPermutation(getSnowPermutation(clampedHeight));
                  });
                }
              } else {
                const isValidSurface = !belowNeighbour.isAir && !belowNeighbour.hasTag("mythicus_sn:non_solid") && !INVALID_SURFACE_BLOCKS.has(belowNeighbour.typeId);
                if (!isValidSurface) continue;
                if (SNOWABLE_BLOCKS.has(belowNeighbour.typeId)) {
                  belowNeighbour.setType("mythicus_sn:snow_layer");
                } else {
                  const aboveBelowNeighbour = probe.getBlock(Vector3Utils.add(belowNeighbour, { y: 1 }));
                  if (aboveBelowNeighbour?.isAir) {
                    aboveBelowNeighbour.setType("mythicus_sn:snow_layer");
                  }
                }
              }
            }
          }
        }
      }
    };
    BlizzardDriftsStrategy = class _BlizzardDriftsStrategy {
      static PARTICLE_CHANCE = 0.15;
      // 15% chance to spawn particle
      static MIN_HEIGHT = 50;
      // Minimum Y level for atmospheric effects
      static PARTICLE = "mythicus_sn:blizzard_drifts";
      getCandidates(results) {
        return results.filter(
          (b) => b.isAir && b.isSkyExposed && b.location.y >= _BlizzardDriftsStrategy.MIN_HEIGHT
        );
      }
      apply(probe, chosenBlock) {
        if (!chosenBlock.block) return;
        if (Math.random() > _BlizzardDriftsStrategy.PARTICLE_CHANCE) return;
        if (!probe.dimension.isChunkLoaded(chosenBlock.location)) return;
        const locX = chosenBlock.location.x;
        const locY = chosenBlock.location.y;
        const locZ = chosenBlock.location.z;
        const blockBelow = probe.getBlock({
          x: locX,
          y: locY - 1,
          z: locZ
        });
        if (!blockBelow || blockBelow.typeId !== "mythicus_sn:snow_layer") return;
        const randomOffset = {
          x: locX + (Math.random() - 0.5) * 3,
          y: locY - 1 + Math.random() * 0.5,
          z: locZ + (Math.random() - 0.5) * 3
        };
        safeSpawnParticle(probe.dimension, _BlizzardDriftsStrategy.PARTICLE, randomOffset);
      }
    };
    LightningStrikeStrategy = class _LightningStrikeStrategy {
      static LIGHTNING_CHANCE = 0.01;
      // 1% chance of lightning strike
      static MIN_HEIGHT_FOR_STRIKE = 60;
      // Minimum Y level for lightning
      static COOLDOWN_TICKS = 30 * TicksPerSecond4;
      // 30 seconds cooldown
      hasStruck = false;
      // Track if lightning has struck in this probe cycle
      lastStrikeTick = -999999;
      // Track when last strike occurred globally
      getCandidates(results) {
        this.hasStruck = false;
        const currentTick = system7.currentTick;
        if (currentTick - this.lastStrikeTick < _LightningStrikeStrategy.COOLDOWN_TICKS) {
          return [];
        }
        const lightningRods = [];
        const surfaceCandidates = [];
        const minHeight = _LightningStrikeStrategy.MIN_HEIGHT_FOR_STRIKE;
        for (const b of results) {
          if (b.typeId === "minecraft:lightning_rod") {
            lightningRods.push(b);
          } else if (b.isSurface && b.isSkyExposed && b.isAirAbove && !b.isAir && !b.isLiquid && b.location.y >= minHeight) {
            surfaceCandidates.push(b);
          }
        }
        return lightningRods.length > 0 ? lightningRods : surfaceCandidates;
      }
      apply(probe, chosenBlock) {
        if (!chosenBlock.block) return;
        if (this.hasStruck) return;
        if (Math.random() > _LightningStrikeStrategy.LIGHTNING_CHANCE) return;
        if (!probe.dimension.isChunkLoaded(chosenBlock.location)) return;
        this.hasStruck = true;
        this.lastStrikeTick = system7.currentTick;
        const block = chosenBlock.block;
        const isLightningRod = chosenBlock.typeId === "minecraft:lightning_rod";
        const strikeLocation = {
          x: block.x + 0.5,
          y: isLightningRod ? block.y : block.y + 1,
          z: block.z + 0.5
        };
        if (!probe.dimension.isChunkLoaded(strikeLocation)) return;
        probe.dimension.spawnEntity("minecraft:lightning_bolt", strikeLocation);
      }
    };
    BLOWING_LEAVES = new BlowingLeavesStrategy();
    SNOW_STRATEGY = new SnowAboveStrategy();
    ICE_STRATEGY = new IceBelowStrategy();
    ICE_WATER_STRATEGY = new IceWaterStrategy();
    LIGHTNING_STRATEGY = new LightningStrikeStrategy();
    BLIZZARD_DRIFTS = new BlizzardDriftsStrategy();
    SEASON_STRATEGY_MAP = {
      ["spring" /* Spring */]: {
        ["clear" /* Clear */]: [],
        ["rain" /* Rain */]: [],
        ["storm" /* Storm */]: [LIGHTNING_STRATEGY]
      },
      ["summer" /* Summer */]: {
        ["clear" /* Clear */]: [],
        ["rain" /* Rain */]: [],
        ["storm" /* Storm */]: [LIGHTNING_STRATEGY]
      },
      ["fall" /* Fall */]: {
        ["clear" /* Clear */]: [BLOWING_LEAVES],
        ["foggy" /* Foggy */]: [BLOWING_LEAVES],
        ["rain" /* Rain */]: [BLOWING_LEAVES],
        ["storm" /* Storm */]: [BLOWING_LEAVES, LIGHTNING_STRATEGY]
      },
      ["winter" /* Winter */]: {
        ["clear" /* Clear */]: [ICE_WATER_STRATEGY],
        ["storm" /* Storm */]: [LIGHTNING_STRATEGY],
        ["flurries" /* Flurries */]: [SNOW_STRATEGY, ICE_STRATEGY, ICE_WATER_STRATEGY],
        ["snowing" /* Snowing */]: [SNOW_STRATEGY, ICE_STRATEGY, ICE_WATER_STRATEGY],
        ["blizzard" /* Blizzard */]: [SNOW_STRATEGY, ICE_STRATEGY, ICE_WATER_STRATEGY, BLIZZARD_DRIFTS]
      }
    };
  }
});

// data/scripts/modules/environmental_probe/environmental_probe.ts
import { BlockVolume, TicksPerSecond as TicksPerSecond5, system as system8, world as world7 } from "@minecraft/server";
function isInSeasonalBiome(dimension, location) {
  if (!dimension.isChunkLoaded(location)) return false;
  const biome = dimension.getBiome(location);
  return biome.id.startsWith("mythicus_sn:seasonal");
}
function getSurfaceY(dimension, x, z, minHeight = 1) {
  const block = dimension.getTopmostBlock({ x, z });
  if (block) {
    return block.y + 1;
  }
  return minHeight;
}
function getCurrentForecastWeather() {
  const forecastRaw = world7.getDynamicProperty(FIVE_DAY_FORESCAST_PROPERTY);
  if (!forecastRaw) return "clear" /* Clear */;
  const forecast2 = safeParse(forecastRaw);
  return forecast2?.[0]?.weather ?? "clear" /* Clear */;
}
var PROBE_SIZE, PROBE_HEIGHT, BATCH_SIZE, PROBE_RADIUS, PROBE_INTERVAL, ENVIRONMENTAL_PROBE_ENABLED_PROPERTY, SNOW_ACCUMULATION_ENABLED_PROPERTY, FALLING_LEAVES_ENABLED_PROPERTY, BLOCKS_PER_PROBE_WEATHER, SNOWABLE_BLOCKS, INVALID_SURFACE_BLOCKS, Probe2;
var init_environmental_probe = __esm({
  "data/scripts/modules/environmental_probe/environmental_probe.ts"() {
    "use strict";
    init_lib();
    init_players();
    init_particles();
    init_safe_parse();
    init_weather_data();
    init_weather_system();
    init_season_core();
    init_environmental_probe_strategies();
    PROBE_SIZE = 9;
    PROBE_HEIGHT = 4;
    BATCH_SIZE = 9;
    PROBE_RADIUS = 32;
    PROBE_INTERVAL = 1 * TicksPerSecond5;
    ENVIRONMENTAL_PROBE_ENABLED_PROPERTY = "mythicus_sn:environmental_probe_enabled";
    SNOW_ACCUMULATION_ENABLED_PROPERTY = "mythicus_sn:snow_accumulation_enabled";
    FALLING_LEAVES_ENABLED_PROPERTY = "mythicus_sn:falling_leaves_enabled";
    BLOCKS_PER_PROBE_WEATHER = {
      ["clear" /* Clear */]: 8,
      ["foggy" /* Foggy */]: 8,
      ["rain" /* Rain */]: 8,
      ["sleet" /* Sleet */]: 8,
      ["storm" /* Storm */]: 8,
      ["flurries" /* Flurries */]: 8,
      ["snowing" /* Snowing */]: 8,
      ["blizzard" /* Blizzard */]: 64
    };
    SNOWABLE_BLOCKS = /* @__PURE__ */ new Set([
      "minecraft:short_grass",
      "minecraft:bush",
      "minecraft:tall_grass"
    ]);
    INVALID_SURFACE_BLOCKS = /* @__PURE__ */ new Set([
      "minecraft:air",
      "mythicus_sn:ice",
      "minecraft:water",
      "minecraft:flowing_water",
      "minecraft:lava",
      "minecraft:flowing_lava",
      "minecraft:snow",
      "minecraft:snow_layer",
      "minecraft:fire",
      "minecraft:soul_fire",
      "minecraft:torch",
      "minecraft:soul_torch",
      "minecraft:redstone_torch",
      "minecraft:lantern",
      "minecraft:soul_lantern",
      "minecraft:copper_lantern",
      "minecraft:exposed_copper_lantern",
      "minecraft:weathered_copper_lantern",
      "minecraft:oxidized_copper_lantern",
      "minecraft:waxed_copper_lantern",
      "minecraft:waxed_exposed_copper_lantern",
      "minecraft:waxed_weathered_copper_lantern",
      "minecraft:waxed_oxidized_copper_lantern",
      "minecraft:wheat",
      "minecraft:carrots",
      "minecraft:potatoes",
      "minecraft:beetroot",
      "minecraft:nether_wart",
      "minecraft:kelp",
      "minecraft:seagrass",
      "minecraft:sea_pickle",
      "minecraft:ladder",
      "minecraft:vine",
      "minecraft:twisting_vines",
      "minecraft:weeping_vines",
      "minecraft:scaffolding",
      "minecraft:powder_snow",
      "minecraft:rail",
      "minecraft:powered_rail",
      "minecraft:detector_rail",
      "minecraft:activator_rail",
      "minecraft:redstone_wire",
      "minecraft:lever",
      "minecraft:tripwire",
      "minecraft:tripwire_hook",
      "minecraft:dirt_path",
      "minecraft:grass_path",
      "minecraft:oak_slab",
      "minecraft:spruce_slab",
      "minecraft:birch_slab",
      "minecraft:jungle_slab",
      "minecraft:acacia_slab",
      "minecraft:dark_oak_slab",
      "minecraft:stone_slab",
      "minecraft:sandstone_slab",
      "minecraft:nether_brick_slab",
      "minecraft:quartz_slab",
      "minecraft:oak_stairs",
      "minecraft:spruce_stairs",
      "minecraft:birch_stairs",
      "minecraft:jungle_stairs",
      "minecraft:acacia_stairs",
      "minecraft:dark_oak_stairs",
      "minecraft:stone_brick_stairs",
      "minecraft:nether_brick_stairs",
      "minecraft:quartz_stairs",
      "minecraft:oak_fence",
      "minecraft:spruce_fence",
      "minecraft:birch_fence",
      "minecraft:jungle_fence",
      "minecraft:acacia_fence",
      "minecraft:dark_oak_fence",
      "minecraft:cobblestone_wall",
      "minecraft:mossy_cobblestone_wall",
      "minecraft:stone_brick_wall",
      "minecraft:mossy_stone_brick_wall",
      "minecraft:nether_brick_wall",
      "minecraft:oak_door",
      "minecraft:spruce_door",
      "minecraft:birch_door",
      "minecraft:jungle_door",
      "minecraft:acacia_door",
      "minecraft:dark_oak_door",
      "minecraft:iron_door",
      "minecraft:oak_trapdoor",
      "minecraft:spruce_trapdoor",
      "minecraft:birch_trapdoor",
      "minecraft:jungle_trapdoor",
      "minecraft:acacia_trapdoor",
      "minecraft:dark_oak_trapdoor",
      "minecraft:iron_trapdoor",
      "minecraft:stone_pressure_plate",
      "minecraft:wooden_pressure_plate",
      "minecraft:oak_pressure_plate",
      "minecraft:spruce_pressure_plate",
      "minecraft:birch_pressure_plate",
      "minecraft:jungle_pressure_plate",
      "minecraft:acacia_pressure_plate",
      "minecraft:dark_oak_pressure_plate",
      "minecraft:glass",
      "minecraft:white_glass",
      "minecraft:orange_glass",
      "minecraft:magenta_glass",
      "minecraft:light_blue_glass",
      "minecraft:yellow_glass",
      "minecraft:lime_glass",
      "minecraft:pink_glass",
      "minecraft:gray_glass",
      "minecraft:light_gray_glass",
      "minecraft:cyan_glass",
      "minecraft:purple_glass",
      "minecraft:blue_glass",
      "minecraft:brown_glass",
      "minecraft:green_glass",
      "minecraft:red_glass",
      "minecraft:black_glass",
      "minecraft:glass_pane",
      "minecraft:white_carpet",
      "minecraft:orange_carpet",
      "minecraft:magenta_carpet",
      "minecraft:light_blue_carpet",
      "minecraft:yellow_carpet",
      "minecraft:lime_carpet",
      "minecraft:pink_carpet",
      "minecraft:gray_carpet",
      "minecraft:light_gray_carpet",
      "minecraft:cyan_carpet",
      "minecraft:purple_carpet",
      "minecraft:blue_carpet",
      "minecraft:brown_carpet",
      "minecraft:green_carpet",
      "minecraft:red_carpet",
      "minecraft:black_carpet",
      "minecraft:tall_grass",
      "minecraft:fern",
      "minecraft:large_fern",
      "minecraft:rose_bush",
      "minecraft:peony",
      "minecraft:dandelion",
      "minecraft:poppy",
      "minecraft:allium",
      "minecraft:azure_bluet",
      "minecraft:red_tulip",
      "minecraft:orange_tulip",
      "minecraft:white_tulip",
      "minecraft:pink_tulip",
      "minecraft:oxeye_daisy",
      "minecraft:cornflower",
      "minecraft:lily_of_the_valley",
      "minecraft:sunflower",
      "minecraft:lilac",
      "minecraft:torch",
      "minecraft:rail",
      "minecraft:powered_rail",
      "minecraft:detector_rail",
      "minecraft:activator_rail",
      "minecraft:redstone_wire",
      "minecraft:lever",
      "minecraft:stone_button",
      "minecraft:wooden_button",
      "minecraft:tripwire",
      "minecraft:tripwire_hook",
      "minecraft:daylight_detector",
      "minecraft:water",
      "minecraft:flowing_water",
      "minecraft:lava",
      "minecraft:flowing_lava",
      "minecraft:wheat",
      "minecraft:carrots",
      "minecraft:potatoes",
      "minecraft:beetroots",
      "minecraft:nether_wart",
      "minecraft:sugar_cane",
      "minecraft:cactus",
      "minecraft:melon_stem",
      "minecraft:pumpkin_stem",
      "minecraft:bamboo",
      "minecraft:sweet_berry_bush",
      "minecraft:kelp",
      "minecraft:seagrass",
      "minecraft:fern",
      "minecraft:large_fern",
      "minecraft:barrier"
    ]);
    Probe2 = class {
      center;
      dimension;
      size;
      results;
      blockCache;
      constructor(center, dimension, size, debug = false) {
        this.center = center;
        this.dimension = dimension;
        this.size = size;
        this.results = [];
        this.blockCache = /* @__PURE__ */ new Map();
        if (debug) this.showProbeCenter();
      }
      showProbeCenter() {
        safeSpawnParticle(this.dimension, "minecraft:basic_flame_particle", {
          x: this.center.x + 0.5,
          y: this.center.y + 0.5,
          z: this.center.z + 0.5
        });
      }
      dispose() {
        this.results.length = 0;
        this.blockCache.clear();
      }
      getBlock(location) {
        const key = Vector3Utils.toString(location);
        let block = this.blockCache.get(key);
        if (block !== void 0) {
          return block;
        }
        if (this.dimension.isChunkLoaded(location)) {
          block = this.dimension.getBlock(location);
          if (block) {
            this.blockCache.set(key, block);
            return block;
          }
        }
        this.blockCache.set(key, null);
        return null;
      }
      async scan(batchSize) {
        const half = Math.floor(this.size / 2);
        const halfHeight = Math.floor(PROBE_HEIGHT / 2);
        const from = {
          x: this.center.x - half,
          y: this.center.y - halfHeight,
          z: this.center.z - half
        };
        const to = {
          x: this.center.x + half,
          y: this.center.y + halfHeight,
          z: this.center.z + half
        };
        const volume = new BlockVolume(from, to);
        const iterator = volume.getBlockLocationIterator();
        return new Promise((resolve) => {
          const processBatch = () => {
            let count = 0;
            for (const loc of iterator) {
              if (loc.y < this.center.y - Math.floor(PROBE_HEIGHT / 2) || loc.y > this.center.y + Math.floor(PROBE_HEIGHT / 2)) {
                continue;
              }
              const block = this.getBlock(loc);
              if (block && block.isValid) {
                const blockAbove = this.getBlock(Vector3Utils.add(loc, { y: 1 }));
                const blockBelow = this.getBlock(Vector3Utils.subtract(loc, { y: 1 }));
                const locationAbove = Vector3Utils.add(loc, { x: 0, y: 1, z: 0 });
                let isSkyExposed = false;
                if (this.dimension.isChunkLoaded(locationAbove)) {
                  isSkyExposed = !this.dimension.getBlockAbove(locationAbove);
                }
                this.results.push({
                  block,
                  location: loc,
                  typeId: block.typeId,
                  isAir: block.isAir,
                  isLiquid: block.isLiquid,
                  isSnowable: SNOWABLE_BLOCKS.has(block.typeId),
                  isSurface: !block.hasTag("mythicus_sn:non_solid") && !INVALID_SURFACE_BLOCKS.has(block.typeId),
                  isSkyExposed,
                  isAirAbove: blockAbove ? blockAbove.isAir : true,
                  isAirBelow: blockBelow ? blockBelow.isAir : true
                });
              }
              if (++count >= batchSize) {
                system8.run(processBatch);
                return;
              }
            }
            resolve();
          };
          processBatch();
        });
      }
    };
    system8.runInterval(async () => {
      const probeEnabled = world7.getDynamicProperty(ENVIRONMENTAL_PROBE_ENABLED_PROPERTY) ?? true;
      if (!probeEnabled) return;
      const currentWeather = getCurrentForecastWeather();
      const currentSeason2 = getCurrentSeason();
      const players = getAllPlayers();
      if (players.length === 0) return;
      const dimension = players[0].dimension;
      const baseBlocksPerProbe = BLOCKS_PER_PROBE_WEATHER[currentWeather] ?? 3;
      const player1 = players[Math.floor(Math.random() * players.length)];
      const player2 = players.length > 1 ? players[Math.floor(Math.random() * players.length)] : player1;
      const centerX = (player1.location.x + player2.location.x) / 2;
      const centerZ = (player1.location.z + player2.location.z) / 2;
      const offsetX = Math.floor(Math.random() * (PROBE_RADIUS * 2) - PROBE_RADIUS);
      const offsetZ = Math.floor(Math.random() * (PROBE_RADIUS * 2) - PROBE_RADIUS);
      const surfaceY = getSurfaceY(dimension, Math.floor(centerX + offsetX), Math.floor(centerZ + offsetZ));
      const probeLocation = { x: centerX + offsetX, y: surfaceY, z: centerZ + offsetZ };
      if (!dimension.isChunkLoaded(probeLocation)) {
        return;
      }
      if (!isInSeasonalBiome(dimension, probeLocation)) {
        return;
      }
      const probe = new Probe2(probeLocation, dimension, PROBE_SIZE, false);
      await probe.scan(BATCH_SIZE);
      const strategies = getSeasonStrategies(currentSeason2, currentWeather);
      for (const strategy of strategies) {
        const candidates = strategy.getCandidates(probe.results);
        if (candidates.length === 0) continue;
        const chosen = [];
        for (let i = 0; i < Math.min(baseBlocksPerProbe, candidates.length); i++) {
          const index = Math.floor(Math.random() * candidates.length);
          chosen.push(candidates.splice(index, 1)[0]);
        }
        for (const block of chosen) {
          strategy.apply(probe, block);
        }
      }
      probe.dispose();
    }, PROBE_INTERVAL);
  }
});

// data/scripts/modules/biome.ts
import { TicksPerSecond as TicksPerSecond6, system as system9 } from "@minecraft/server";
function getCurrentBiome(player) {
  const biome = player.getDynamicProperty("mythicus_sn:current_biome");
  if (typeof biome === "string") {
    return biome;
  }
}
var init_biome = __esm({
  "data/scripts/modules/biome.ts"() {
    "use strict";
    init_players();
    system9.runInterval(() => {
      getAllPlayers().forEach((player) => {
        const dimension = player.dimension;
        const location = player.location;
        if (!dimension.isChunkLoaded(location)) {
          return;
        }
        const biome = dimension.getBiome(location);
        player.setDynamicProperty("mythicus_sn:current_biome", biome.id);
      });
    }, 0.5 * TicksPerSecond6);
  }
});

// data/scripts/modules/sound_layers/layer1.ts
import { TicksPerSecond as TicksPerSecond7, system as system10 } from "@minecraft/server";
function soundLayer1(player) {
  const season = getCurrentSeason();
  const biome = getCurrentBiome(player);
  if (!biome) return;
  const prev = biomeStore.get(player);
  if (prev) {
    if (prev.biome === biome && prev.season === season && prev.endTick > system10.currentTick) {
      return;
    }
    player.runCommand(`stopsound @s mythicus_sn.layer1.${prev.biome}.${prev.season}`);
  }
  const duration = soundPools[biome]?.[season];
  if (!duration) return;
  biomeStore.set(player, {
    biome,
    season,
    endTick: system10.currentTick + duration * TicksPerSecond7
  });
  player.playSound(`mythicus_sn.layer1.${biome}.${season}`, { volume: 0.8 });
}
function stopSoundLayer1(player) {
  biomeStore.delete(player);
  const season = getCurrentSeason();
  const biome = getCurrentBiome(player);
  if (biome) {
    player.runCommand(`stopsound @s mythicus_sn.layer1.${biome}.${season}`);
  }
}
var soundPools, biomeStore;
var init_layer1 = __esm({
  "data/scripts/modules/sound_layers/layer1.ts"() {
    "use strict";
    init_biome();
    init_season_core();
    soundPools = {
      // [Biomes.SeasonalAppleGrove]: {
      //     [Season.Spring]: 30,
      //     [Season.Summer]: 30,
      //     [Season.Fall]: 30,
      //     [Season.Winter]: 30,
      // },
      ["mythicus_sn:seasonal_birch_forest" /* SeasonalBirchForest */]: {
        ["spring" /* Spring */]: 30,
        ["summer" /* Summer */]: 30,
        ["fall" /* Fall */]: 30,
        ["winter" /* Winter */]: 30
      },
      // [Biomes.SeasonalCherryGrove]: {
      //     [Season.Spring]: 30,
      //     [Season.Summer]: 30,
      //     [Season.Fall]: 30,
      //     [Season.Winter]: 30,
      // },
      // [Biomes.SeasonalMixedForest]: {
      //     [Season.Spring]: 30,
      //     [Season.Summer]: 30,
      //     [Season.Fall]: 30,
      //     [Season.Winter]: 30,
      // },
      ["mythicus_sn:seasonal_oak_forest" /* SeasonalOakForest */]: {
        ["spring" /* Spring */]: 30,
        ["summer" /* Summer */]: 30,
        ["fall" /* Fall */]: 30,
        ["winter" /* Winter */]: 30
      },
      // [Biomes.SeasonalPlains]: {
      //     [Season.Spring]: 30,
      //     [Season.Summer]: 30,
      //     [Season.Fall]: 30,
      //     [Season.Winter]: 30,
      // },
      // [Biomes.SeasonalRoofedForest]: {
      //     [Season.Spring]: 30,
      //     [Season.Summer]: 30,
      //     [Season.Fall]: 30,
      //     [Season.Winter]: 30,
      // },
      // [Biomes.SeasonalSwamp]: {
      //     [Season.Spring]: 30,
      //     [Season.Summer]: 30,
      //     [Season.Fall]: 30,
      //     [Season.Winter]: 30,
      // },
      ["mythicus_sn:seasonal_taiga" /* SeasonalTaiga */]: {
        ["spring" /* Spring */]: 30,
        ["summer" /* Summer */]: 30,
        ["fall" /* Fall */]: 30,
        ["winter" /* Winter */]: 30
      }
    };
    biomeStore = /* @__PURE__ */ new WeakMap();
  }
});

// data/scripts/modules/status_abilities/constants.ts
import { TicksPerSecond as TicksPerSecond8 } from "@minecraft/server";
var ABILITY_MAX_LEVELS, FLUSH_INTERVAL_TICKS, SOUNDS;
var init_constants = __esm({
  "data/scripts/modules/status_abilities/constants.ts"() {
    "use strict";
    ABILITY_MAX_LEVELS = {
      // Chance abilities
      doubleXP: 50,
      doubleHarvest: 50,
      doubleLoot: 50,
      doubleOre: 50,
      regenerationOnHit: 50,
      // Increase abilities
      increaseDamage: 5,
      increaseHearts: 5,
      increaseDefense: 5
    };
    FLUSH_INTERVAL_TICKS = TicksPerSecond8 * 5;
    SOUNDS = {
      SKILL_POINT_ADD: "sound.mythicus.skillpointadd",
      SKILL_FAIL: "sound.mythicus.skillfail",
      DOUBLE_XP_TRIGGER: "sound.mythicus_sn.chancexp"
    };
  }
});

// ../../node_modules/@shapescape/storage/dist/index.mjs
var PropertyStorage;
var init_dist = __esm({
  "../../node_modules/@shapescape/storage/dist/index.mjs"() {
    PropertyStorage = class _PropertyStorage {
      /**
       * Maximum allowed byte size for a value.
       * @private
       */
      MAX_BYTE_SIZE = 32 * 1024 - 1;
      /**
       * The underlying storage backend.
       */
      storage;
      /**
       * Optional prefix for keys.
       */
      prefix;
      /**
       * Creates a new PropertyStorage instance.
       * @param storage - The dynamic storage object.
       * @param prefix - Optional key prefix.
       */
      constructor(storage2, prefix) {
        this.storage = storage2;
        this.prefix = prefix ?? "";
      }
      /**
       * Sets a value in the storage.
       * @param key - The key to set.
       * @param value - The value to set, can be any JSON-serializable value.
       * @param options - Optional serialization options.
       */
      set(key, value, options) {
        key = this.prefix + key;
        value = this.serialize(value, options);
        this.getStorage().setDynamicProperty(key, value);
      }
      /**
       * Removes a value from the storage.
       * @param key - The key to remove.
       */
      drop(key) {
        key = this.prefix + key;
        this.getStorage().setDynamicProperty(key);
      }
      /**
       * Clears all values from the storage.
       * This method deletes keys matching the pattern in the main storage.
       * If includeSubStorages is true, it also recursively clears values within each sub-storage,
       * leaving the sub-storage container itself intact.
       * @param pattern - Pattern to match keys against. If omitted, defaults to the storage prefix.
       * @param includeSubStorages - Whether to clear values in sub-storages.
       */
      clear(pattern, includeSubStorages = true) {
        const effectivePattern = pattern ? this.prefix + pattern : this.prefix;
        const keys = this.getStorage().getDynamicPropertyIds();
        const subStorages = this.get("subStorages", false, []);
        for (const key of keys) {
          if (key.startsWith(effectivePattern)) {
            if (subStorages.includes(key)) continue;
            this.getStorage().setDynamicProperty(key);
          }
        }
        if (includeSubStorages) {
          for (const sub of subStorages) {
            const subStore = this.getSubStorage(sub);
            subStore.clear(void 0, false);
          }
        }
      }
      /**
       * Gets a value from the storage.
       * @param key - The key to get.
       * @param deserialize - Whether to deserialize the value.
       * @param defaultValue - A default value returned if the key does not exist.
       * @param options - Optional deserialization options.
       * @returns The stored value or the default value.
       */
      get(key, deserialize = true, defaultValue, options) {
        key = this.prefix + key;
        const value = this.getStorage().getDynamicProperty(key);
        if (value === void 0) return defaultValue;
        if (typeof value === "string" && deserialize)
          return this.deserialize(value, options);
        return value;
      }
      /**
       * Gets all values from the storage.
       * @param pattern - Pattern to match keys against.
       * @param deserialize - Whether to deserialize the returned values.
       * @param options - Optional deserialization options.
       * @returns Array of key-value pair objects.
       */
      getAll(pattern, deserialize, options) {
        const properties = [];
        const keys = this.getStorage().getDynamicPropertyIds();
        if (!pattern) pattern = this.prefix;
        else pattern = this.prefix + pattern;
        for (let key of keys) {
          if (key.startsWith(pattern)) {
            key = key.slice(this.prefix.length);
            let value = this.get(key, deserialize, void 0, options);
            properties.push({ [key]: value });
          }
        }
        return properties;
      }
      /**
       * Retrieves all keys matching a given pattern.
       * @param pattern - The pattern to match keys against.
       * @returns An array of keys (without the prefix).
       */
      getKeys(pattern) {
        const keys = this.getStorage().getDynamicPropertyIds();
        if (!pattern) pattern = this.prefix;
        else pattern = this.prefix + pattern;
        return keys.filter((key) => key.startsWith(pattern)).map((key) => key.slice(this.prefix.length));
      }
      /**
       * Pushes a value to the end of an array stored in the storage.
       * @param key - The key of the array.
       * @param value - The value to push.
       */
      rPush(key, value) {
        const property = this.assertArray(key, true);
        property.push(value);
        this.set(key, property);
      }
      /**
       * Pushes a value to the beginning of an array stored in the storage.
       * @param key - The key of the array.
       * @param value - The value to push.
       */
      lPush(key, value) {
        const property = this.assertArray(key, true);
        property.unshift(value);
        this.set(key, property);
      }
      /**
       * Pops a value from the end of an array.
       * @param key - The key of the array.
       * @returns The value popped.
       */
      rPop(key) {
        const property = this.assertArray(key);
        const value = property.pop();
        this.set(key, property);
        return value;
      }
      /**
       * Pops a value from the beginning of an array.
       * @param key - The key of the array.
       * @returns The value popped.
       */
      lPop(key) {
        const property = this.assertArray(key);
        const value = property.shift();
        this.set(key, property);
        return value;
      }
      /**
       * Calculates the byte size of a stored value.
       * @param key - The key of the value.
       * @returns The byte length.
       */
      getByteSize(key) {
        return this.encodeValue(this.get(key, false)).byteLength;
      }
      /**
       * Retrieves the underlying storage object.
       * @returns The dynamic storage.
       */
      getStorage() {
        return this.storage;
      }
      /**
       * Builds a sub-storage prefix based on a given identifier.
       * @param prefix - The sub-storage identifier.
       * @returns The full prefix.
       */
      getSubStoragePrefix(prefix) {
        return this.prefix + "_" + prefix + "_";
      }
      /**
       * Registers a sub-storage.
       * @param prefix - The sub-storage identifier.
       */
      registerSubStorage(prefix) {
        const subStorages = this.get("subStorages", true, []);
        if (!subStorages.includes(prefix)) {
          subStorages.push(prefix);
          this.set("subStorages", subStorages);
        }
      }
      /**
       * Retrieves a sub-storage.
       * @param prefix - The sub-storage identifier.
       * @returns A new PropertyStorage instance with the updated prefix.
       */
      getSubStorage(prefix) {
        this.registerSubStorage(prefix);
        return new _PropertyStorage(this.storage, this.getSubStoragePrefix(prefix));
      }
      /**
       * Encodes a value to a Uint8Array.
       * @param value - The value to encode.
       * @returns The encoded Uint8Array.
       */
      encodeValue(value) {
        const binStr = decodeURIComponent(encodeURIComponent(value)), arr = new Uint8Array(binStr.length);
        const split = binStr.split("");
        for (let i = 0; i < split.length; i++) {
          arr[i] = split[i].charCodeAt(0);
        }
        return arr;
      }
      /**
       * Serializes a value to a JSON string.
       * @param data - The data to serialize.
       * @param options - Optional serialization options.
       * @returns The serialized string.
       */
      serialize(data, options) {
        if (typeof data !== "string")
          return JSON.stringify(data, options?.replacer, options?.space);
        return data;
      }
      /**
       * Deserializes a JSON string to a value.
       * @param data - The string to deserialize.
       * @param options - Optional deserialization options.
       * @returns The deserialized value.
       */
      deserialize(data, options) {
        try {
          return JSON.parse(data, options?.reviver);
        } catch (ignored) {
          return data;
        }
      }
      /**
       * Ensures that a storage key corresponds to an array.
       * @param key - The key to verify.
       * @param init - Whether to initialize the array if not exists.
       * @returns The array stored at the key.
       */
      assertArray(key, init = false) {
        let property = this.get(key);
        if (!property) {
          property = [];
          if (init) this.set(key, []);
        } else if (!Array.isArray(property)) {
          throw new TypeError(`${key} is not an array`);
        }
        return property;
      }
      /**
       * Stores multiple key-value pairs.
       * @param pairs - An object with keys and corresponding values.
       * @param options - Optional serialization options.
       */
      storeBulk(pairs, options) {
        for (const key in pairs) {
          this.set(key, pairs[key], options);
        }
      }
      /**
       * Retrieves multiple keys at once.
       * @param keys - An array of keys.
       * @param deserialize - Whether to deserialize the values.
       * @param options - Optional deserialization options.
       * @returns An array of values.
       */
      fetchBulk(keys, deserialize = true, options) {
        return keys.map((key) => this.get(key, deserialize, void 0, options));
      }
      /**
       * Checks whether a key exists.
       * @param key - The key to check.
       * @returns True if exists, false otherwise.
       */
      keyExists(key) {
        return this.get(key) !== void 0;
      }
      /**
       * Searches keys matching a given pattern.
       * @param pattern - The pattern to match.
       * @returns An array of matching keys (without the prefix).
       */
      searchKeys(pattern) {
        const allKeys = this.getStorage().getDynamicPropertyIds();
        if (!pattern) return allKeys.map((k) => k.substring(this.prefix.length));
        return allKeys.filter((k) => k.startsWith(this.prefix + pattern)).map((k) => k.substring(this.prefix.length));
      }
    };
  }
});

// data/scripts/modules/status_abilities/storage.ts
function createDefaultData() {
  return {
    // Skill points
    skillPoints: 0,
    advanceSkillPoints: 0,
    masterSkillPoints: 0,
    // Chance abilities
    doubleHarvest: 0,
    doubleLoot: 0,
    doubleOre: 0,
    doubleXP: 0,
    regenerationOnHit: 0,
    // Increase abilities
    increaseDamage: 0,
    increaseHearts: 0,
    increaseDefense: 0
  };
}
function getPlayerAbilityData(player) {
  let cached = playerAbilityCache.get(player.id);
  if (!cached) {
    const storage2 = new PropertyStorage(player, "mythicus_sn:abilities");
    const stored = storage2.get("data");
    const data = stored ? { ...stored } : createDefaultData();
    cached = {
      data,
      dirty: false,
      storage: storage2
    };
    playerAbilityCache.set(player.id, cached);
  }
  return cached.data;
}
function markDirty(player) {
  const cached = playerAbilityCache.get(player.id);
  if (cached) {
    cached.dirty = true;
  }
}
function flushAll() {
  for (const [_playerId, cached] of playerAbilityCache) {
    if (cached.dirty) {
      cached.storage.set("data", cached.data);
      cached.dirty = false;
    }
  }
}
function cleanupStaleCache(activePlayerIds) {
  for (const playerId of playerAbilityCache.keys()) {
    if (!activePlayerIds.has(playerId)) {
      playerAbilityCache.delete(playerId);
    }
  }
}
var playerAbilityCache;
var init_storage = __esm({
  "data/scripts/modules/status_abilities/storage.ts"() {
    "use strict";
    init_dist();
    playerAbilityCache = /* @__PURE__ */ new Map();
  }
});

// data/scripts/modules/status_abilities/ui/status_ui_config.ts
var STATUS_ABILITIES_FORM_CONFIG, ABILITIES_INFO_FORM_CONFIG, ABILITY_INFO_PAGE_CONFIG, ABILITY_UPGRADE_PREVIEW_CONFIG, STATUS_ABILITIES_BODY_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES;
var init_status_ui_config = __esm({
  "data/scripts/modules/status_abilities/ui/status_ui_config.ts"() {
    "use strict";
    STATUS_ABILITIES_FORM_CONFIG = {
      title: "ui.mythicus_sn.status_abilities.title",
      buttons: {
        abilitiesInfo: "ui.mythicus_sn.status_abilities.button.abilities_info",
        doubleXP: "ui.mythicus_sn.status_abilities.button.double_xp",
        doubleHarvest: "ui.mythicus_sn.status_abilities.button.double_harvest",
        doubleLoot: "ui.mythicus_sn.status_abilities.button.double_loot",
        doubleOre: "ui.mythicus_sn.status_abilities.button.double_ore",
        regeneration: "ui.mythicus_sn.status_abilities.button.regeneration",
        increaseDamage: "ui.mythicus_sn.status_abilities.button.increase_damage",
        increaseHearts: "ui.mythicus_sn.status_abilities.button.increase_hearts",
        increaseDefense: "ui.mythicus_sn.status_abilities.button.increase_defense",
        back: "ui.mythicus_sn.button.back",
        close: "ui.mythicus_sn.button.close"
      },
      icons: {
        abilitiesInfo: "textures/ui/icon_book_writable",
        back: "textures/mythicus/sn/ui/back",
        close: "textures/mythicus/sn/ui/close",
        doubleXP: "textures/mythicus/sn/ui/double_xp",
        doubleHarvest: "textures/mythicus/sn/ui/double_harvest",
        doubleLoot: "textures/mythicus/sn/ui/double_loot",
        doubleOre: "textures/mythicus/sn/ui/double_ore",
        regeneration: "textures/mythicus/sn/ui/double_regen",
        increaseDamage: "textures/mythicus/sn/ui/increase_damage",
        increaseHearts: "textures/mythicus/sn/ui/increase_hearts",
        increaseDefense: "textures/mythicus/sn/ui/increase_defense"
      }
    };
    ABILITIES_INFO_FORM_CONFIG = {
      title: "ui.mythicus_sn.status_abilities.abilities_info.title",
      body: "ui.mythicus_sn.status_abilities.abilities_info.body",
      buttons: [
        {
          translationKey: "ui.mythicus_sn.button.back",
          icon: "textures/mythicus/sn/ui/back",
          action: "back"
        },
        {
          translationKey: "ui.mythicus_sn.button.close",
          icon: "textures/mythicus/sn/ui/close",
          action: "close"
        }
      ]
    };
    ABILITY_INFO_PAGE_CONFIG = {
      placeholder1: {
        buttonLabel: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_1",
        title: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_1_title",
        body: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_1_body"
      },
      placeholder2: {
        buttonLabel: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_2",
        title: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_2_title",
        body: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_2_body"
      },
      placeholder3: {
        buttonLabel: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_3",
        title: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_3_title",
        body: "ui.mythicus_sn.status_abilities.abilities_info.placeholder_3_body"
      }
    };
    ABILITY_UPGRADE_PREVIEW_CONFIG = {
      labels: {
        currentLevel: "ui.mythicus_sn.status_abilities.preview.current_level",
        currentStats: "ui.mythicus_sn.status_abilities.preview.current_stats",
        nextLevel: "ui.mythicus_sn.status_abilities.preview.next_level",
        nextStats: "ui.mythicus_sn.status_abilities.preview.next_stats",
        requires: "ui.mythicus_sn.status_abilities.preview.requires",
        youHave: "ui.mythicus_sn.status_abilities.preview.you_have",
        skillPoint: "ui.mythicus_sn.status_abilities.preview.skill_point",
        advanceSkillPoint: "ui.mythicus_sn.status_abilities.preview.advance_skill_point",
        masterSkillPoint: "ui.mythicus_sn.status_abilities.preview.master_skill_point"
      },
      buttons: {
        confirm: "ui.mythicus_sn.status_abilities.preview.confirm",
        cancel: "ui.mythicus_sn.status_abilities.preview.cancel"
      }
    };
    STATUS_ABILITIES_BODY_CONFIG = {
      skillPoints: "ui.mythicus_sn.status_abilities.skill_points",
      advanceSkillPoints: "ui.mythicus_sn.status_abilities.advance_skill_points",
      masterSkillPoints: "ui.mythicus_sn.status_abilities.master_skill_points",
      headers: {
        chance: "ui.mythicus_sn.status_abilities.header.chance",
        increase: "ui.mythicus_sn.status_abilities.header.increase"
      },
      abilities: {
        doubleXP: "ui.mythicus_sn.status_abilities.double_xp",
        doubleHarvest: "ui.mythicus_sn.status_abilities.double_harvest",
        doubleLoot: "ui.mythicus_sn.status_abilities.double_loot",
        doubleOre: "ui.mythicus_sn.status_abilities.double_ore",
        regeneration: "ui.mythicus_sn.status_abilities.regeneration",
        increaseDamage: "ui.mythicus_sn.status_abilities.increase_damage",
        increaseHearts: "ui.mythicus_sn.status_abilities.increase_hearts",
        increaseDefense: "ui.mythicus_sn.status_abilities.increase_defense"
      }
    };
    ERROR_MESSAGES = {
      maxed: "ui.mythicus_sn.status_abilities.error.maxed",
      needSkillPoints: "ui.mythicus_sn.status_abilities.error.need_skill_points",
      needAdvancePoints: "ui.mythicus_sn.status_abilities.error.need_advance_points",
      needMasterPoints: "ui.mythicus_sn.status_abilities.error.need_master_points"
    };
    SUCCESS_MESSAGES = {
      upgraded: "ui.mythicus_sn.status_abilities.success.upgraded"
    };
  }
});

// data/scripts/modules/status_abilities/abilities/increase_hearts.ts
var increase_hearts_exports = {};
__export(increase_hearts_exports, {
  applyHealthBoost: () => applyHealthBoost
});
import { world as world8 } from "@minecraft/server";
function applyHealthBoost(player) {
  const data = getPlayerAbilityData(player);
  if (data.increaseHearts <= 0) {
    player.runCommand("effect @s clear health_boost");
    return;
  }
  const amplifier = data.increaseHearts - 1;
  player.runCommand(`effect @s health_boost infinite ${amplifier} true`);
}
var init_increase_hearts = __esm({
  "data/scripts/modules/status_abilities/abilities/increase_hearts.ts"() {
    "use strict";
    init_storage();
    world8.afterEvents.playerSpawn.subscribe((event) => {
      applyHealthBoost(event.player);
    });
  }
});

// data/scripts/modules/status_abilities/ui/status_ui.ts
import { ActionFormData } from "@minecraft/server-ui";
function createFormWithDynamicButtons(title, body, buttons) {
  const form = new ActionFormData().title({ rawtext: [{ translate: title }] }).body({ rawtext: [{ translate: body }] });
  buttons.forEach((buttonConfig) => {
    const buttonText = buttonConfig.textPrefix ? {
      rawtext: [
        { text: buttonConfig.textPrefix },
        { translate: buttonConfig.translationKey }
      ]
    } : { rawtext: [{ translate: buttonConfig.translationKey }] };
    if (buttonConfig.icon) {
      form.button(buttonText, buttonConfig.icon);
    } else {
      form.button(buttonText);
    }
  });
  return form;
}
async function showStatusUI(player, onClose) {
  const data = getPlayerAbilityData(player);
  const form = new ActionFormData().title({ rawtext: [{ translate: STATUS_ABILITIES_FORM_CONFIG.title }] }).body(buildUIBodyRawtext(data));
  form.button({
    rawtext: [
      { text: "\xA76" },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.abilitiesInfo }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.abilitiesInfo);
  form.button({
    rawtext: [
      { text: "\xA7u[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.doubleXP }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.doubleXP);
  form.button({
    rawtext: [
      { text: "\xA7u[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.doubleHarvest }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.doubleHarvest);
  form.button({
    rawtext: [
      { text: "\xA7u[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.doubleLoot }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.doubleLoot);
  form.button({
    rawtext: [
      { text: "\xA7u[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.doubleOre }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.doubleOre);
  form.button({
    rawtext: [
      { text: "\xA7u[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.regeneration }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.regeneration);
  form.button({
    rawtext: [
      { text: "\xA7t[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.increaseDamage }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.increaseDamage);
  form.button({
    rawtext: [
      { text: "\xA7t[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.increaseHearts }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.increaseHearts);
  form.button({
    rawtext: [
      { text: "\xA7t[+1] " },
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.increaseDefense }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.increaseDefense);
  form.button({
    rawtext: [
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.back }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.back);
  form.button({
    rawtext: [
      { translate: STATUS_ABILITIES_FORM_CONFIG.buttons.close }
    ]
  }, STATUS_ABILITIES_FORM_CONFIG.icons.close);
  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  switch (response.selection) {
    case 0:
      await showAbilitiesInfoPage(player, onClose);
      break;
    case 1:
      await showAbilityUpgradePreview(player, "doubleXP", data, onClose);
      break;
    case 2:
      await showAbilityUpgradePreview(player, "doubleHarvest", data, onClose);
      break;
    case 3:
      await showAbilityUpgradePreview(player, "doubleLoot", data, onClose);
      break;
    case 4:
      await showAbilityUpgradePreview(player, "doubleOre", data, onClose);
      break;
    case 5:
      await showAbilityUpgradePreview(player, "regenerationOnHit", data, onClose);
      break;
    case 6:
      await showAbilityUpgradePreview(player, "increaseDamage", data, onClose);
      break;
    case 7:
      await showAbilityUpgradePreview(player, "increaseHearts", data, onClose);
      break;
    case 8:
      await showAbilityUpgradePreview(player, "increaseDefense", data, onClose);
      break;
    case 9:
      await showGuidebook(player);
      break;
    case 10:
      break;
    default:
      break;
  }
}
async function showAbilitiesInfoPage(player, onClose) {
  const form = createFormWithDynamicButtons(
    ABILITIES_INFO_FORM_CONFIG.title,
    ABILITIES_INFO_FORM_CONFIG.body,
    ABILITIES_INFO_FORM_CONFIG.buttons
  );
  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  if (response.selection === void 0) return;
  const selectedButton = ABILITIES_INFO_FORM_CONFIG.buttons[response.selection];
  await handleAbilitiesInfoAction(player, selectedButton.action, onClose);
}
async function handleAbilitiesInfoAction(player, action, onClose) {
  if (action in ABILITY_INFO_PAGE_CONFIG) {
    await showAbilityInfoDescriptionPage(
      player,
      action,
      onClose
    );
    return;
  }
  switch (action) {
    case "back":
      await showStatusUI(player, onClose);
      break;
    case "close":
      break;
  }
}
async function showAbilityInfoDescriptionPage(player, placeholderKey, onClose) {
  const config = ABILITY_INFO_PAGE_CONFIG[placeholderKey];
  const form = new ActionFormData().title({ rawtext: [{ translate: config.title }] }).body({ rawtext: [{ translate: config.body }] });
  form.button({
    rawtext: [{ translate: "ui.mythicus_sn.button.back" }]
  }, "textures/mythicus/sn/ui/back");
  form.button({
    rawtext: [{ translate: "ui.mythicus_sn.button.close" }]
  }, "textures/mythicus/sn/ui/close");
  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  switch (response.selection) {
    case 0:
      await showAbilitiesInfoPage(player, onClose);
      break;
    case 1:
      break;
    default:
      break;
  }
}
function buildUIBodyRawtext(data) {
  return {
    rawtext: [
      { text: "\xA7e" },
      { translate: STATUS_ABILITIES_BODY_CONFIG.skillPoints },
      { text: `\xA76${data.skillPoints}
` },
      { text: "\xA7e" },
      { translate: STATUS_ABILITIES_BODY_CONFIG.advanceSkillPoints },
      { text: `\xA76${data.advanceSkillPoints}
` },
      { text: "\xA7e" },
      { translate: STATUS_ABILITIES_BODY_CONFIG.masterSkillPoints },
      { text: `\xA76${data.masterSkillPoints}

` },
      { text: "\xA7l\xA7a" },
      { translate: STATUS_ABILITIES_BODY_CONFIG.headers.chance },
      { text: "\n\xA7r" },
      { text: `+${data.doubleXP}%% ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.doubleXP },
      { text: "\n" },
      { text: `+${data.doubleHarvest}%% ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.doubleHarvest },
      { text: "\n" },
      { text: `+${data.doubleLoot}%% ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.doubleLoot },
      { text: "\n" },
      { text: `+${data.doubleOre}%% ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.doubleOre },
      { text: "\n" },
      { text: `+${(data.regenerationOnHit * 0.2).toFixed(1)}%% ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.regeneration },
      { text: "\n\n" },
      { text: "\xA7l\xA7b" },
      { translate: STATUS_ABILITIES_BODY_CONFIG.headers.increase },
      { text: "\n\xA7r" },
      { text: `+${(data.increaseDamage * 0.5).toFixed(1)} ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.increaseDamage },
      { text: "\n" },
      { text: `+${data.increaseHearts * 2} ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.increaseHearts },
      { text: "\n" },
      { text: `+${(data.increaseDefense * 0.5).toFixed(1)}%% ` },
      { translate: STATUS_ABILITIES_BODY_CONFIG.abilities.increaseDefense },
      { text: "\n\n" }
    ]
  };
}
function getAbilityTranslationKey(abilityName) {
  const keyMap = {
    doubleXP: "ui.mythicus_sn.status_abilities.button.double_xp",
    doubleHarvest: "ui.mythicus_sn.status_abilities.button.double_harvest",
    doubleLoot: "ui.mythicus_sn.status_abilities.button.double_loot",
    doubleOre: "ui.mythicus_sn.status_abilities.button.double_ore",
    regenerationOnHit: "ui.mythicus_sn.status_abilities.button.regeneration",
    increaseDamage: "ui.mythicus_sn.status_abilities.button.increase_damage",
    increaseHearts: "ui.mythicus_sn.status_abilities.button.increase_hearts",
    increaseDefense: "ui.mythicus_sn.status_abilities.button.increase_defense",
    skillPoints: "",
    advanceSkillPoints: "",
    masterSkillPoints: ""
  };
  return keyMap[abilityName] || "";
}
function formatStatWithDescription(abilityName, value) {
  if (abilityName === "doubleXP" || abilityName === "doubleHarvest" || abilityName === "doubleLoot" || abilityName === "doubleOre" || abilityName === "regenerationOnHit") {
    return `${value} chance to trigger`;
  }
  if (abilityName === "increaseDamage") {
    return `${value} bonus damage`;
  }
  if (abilityName === "increaseDefense") {
    return `${value} damage reduction`;
  }
  if (abilityName === "increaseHearts") {
    return `${value} max health`;
  }
  return value;
}
function calculateAbilityValue(abilityName, level) {
  if (abilityName === "regenerationOnHit") {
    return `${(level * 0.2).toFixed(1)}%%`;
  }
  if (abilityName === "increaseDamage" || abilityName === "increaseDefense") {
    return `+${(level * 0.5).toFixed(1)}`;
  }
  if (abilityName === "increaseHearts") {
    return `+${level * 2}`;
  }
  return `${level}%%`;
}
function getAbilityInfo(abilityName, data) {
  const currentLevel = data[abilityName];
  const isIncreaseAbility = abilityName === "increaseDamage" || abilityName === "increaseHearts" || abilityName === "increaseDefense";
  const maxLevel = ABILITY_MAX_LEVELS[abilityName];
  const nextLevel = currentLevel + 1;
  const atMaxLevel = currentLevel >= maxLevel;
  let requiredPointsKey;
  let requiredPointsTranslationKey;
  if (isIncreaseAbility) {
    requiredPointsKey = "masterSkillPoints";
    requiredPointsTranslationKey = ABILITY_UPGRADE_PREVIEW_CONFIG.labels.masterSkillPoint;
  } else {
    if (currentLevel < 20) {
      requiredPointsKey = "skillPoints";
      requiredPointsTranslationKey = ABILITY_UPGRADE_PREVIEW_CONFIG.labels.skillPoint;
    } else if (currentLevel < 40) {
      requiredPointsKey = "advanceSkillPoints";
      requiredPointsTranslationKey = ABILITY_UPGRADE_PREVIEW_CONFIG.labels.advanceSkillPoint;
    } else {
      requiredPointsKey = "masterSkillPoints";
      requiredPointsTranslationKey = ABILITY_UPGRADE_PREVIEW_CONFIG.labels.masterSkillPoint;
    }
  }
  const upgradeCost = (currentLevel + 1) * 2;
  const hasEnoughPoints = data[requiredPointsKey] >= upgradeCost;
  const currentValue = calculateAbilityValue(abilityName, currentLevel);
  const nextValue = atMaxLevel ? currentValue : calculateAbilityValue(abilityName, nextLevel);
  return {
    translationKey: getAbilityTranslationKey(abilityName),
    currentLevel,
    nextLevel,
    currentValue,
    nextValue,
    maxLevel,
    atMaxLevel,
    requiredPointsKey,
    requiredPointsTranslationKey,
    hasEnoughPoints,
    isIncreaseAbility,
    upgradeCost
  };
}
async function showAbilityUpgradePreview(player, abilityName, data, onClose) {
  const info = getAbilityInfo(abilityName, data);
  const preview = new ActionFormData().title({ rawtext: [{ translate: info.translationKey }] }).body({
    rawtext: [
      { text: "\xA73" },
      { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.labels.currentLevel },
      {
        text: ` \xA77${info.currentLevel}
`
      },
      { text: "\xA73" },
      { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.labels.currentStats },
      {
        text: ` \xA77${formatStatWithDescription(abilityName, info.currentValue)}

`
      },
      { text: "\xA7b" },
      { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.labels.nextLevel },
      {
        text: ` ${info.atMaxLevel ? "\xA7cMaxed" : `\xA7f${info.nextLevel}`}
`
      },
      { text: "\xA7b" },
      { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.labels.nextStats },
      {
        text: ` \xA7f${formatStatWithDescription(abilityName, info.nextValue)}

`
      },
      { text: info.atMaxLevel ? "\xA7c" : "\xA76" },
      { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.labels.requires },
      { text: info.atMaxLevel ? " \xA7cMaxed" : ` \xA7f${info.upgradeCost} ` },
      ...info.atMaxLevel ? [] : [{ translate: info.requiredPointsTranslationKey }],
      { text: "\n\xA7a" },
      { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.labels.youHave },
      { text: ` \xA7f${data[info.requiredPointsKey]} ` },
      { translate: info.requiredPointsTranslationKey }
    ]
  });
  if (!info.atMaxLevel) {
    preview.button({
      rawtext: [
        { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.buttons.confirm }
      ]
    });
  }
  preview.button({
    rawtext: [
      { translate: ABILITY_UPGRADE_PREVIEW_CONFIG.buttons.cancel }
    ]
  });
  const response = await preview.show(player);
  if (response.canceled) {
    await showStatusUI(player, onClose);
    return;
  }
  if (!info.atMaxLevel && response.selection === 0) {
    performUpgrade(player, abilityName, data, info, onClose);
  } else {
    await showStatusUI(player, onClose);
  }
}
function performUpgrade(player, abilityName, data, info, onClose) {
  if (info.atMaxLevel) {
    player.onScreenDisplay.setActionBar({
      rawtext: [
        { text: "\xA7l\xA76[Season Add-on]\xA7r\xA7c " },
        { translate: ERROR_MESSAGES.maxed }
      ]
    });
    player.playSound(SOUNDS.SKILL_FAIL);
    return;
  }
  if (!info.hasEnoughPoints) {
    const errorKeys = {
      skillPoints: ERROR_MESSAGES.needSkillPoints,
      advanceSkillPoints: ERROR_MESSAGES.needAdvancePoints,
      masterSkillPoints: ERROR_MESSAGES.needMasterPoints
    };
    player.onScreenDisplay.setActionBar({
      rawtext: [
        { text: "\xA7l\xA76[Season Add-on]\xA7r\xA7c " },
        { translate: errorKeys[info.requiredPointsKey] }
      ]
    });
    player.playSound(SOUNDS.SKILL_FAIL);
    return;
  }
  data[info.requiredPointsKey] -= info.upgradeCost;
  data[abilityName]++;
  markDirty(player);
  if (abilityName === "increaseHearts") {
    Promise.resolve().then(() => (init_increase_hearts(), increase_hearts_exports)).then(({ applyHealthBoost: applyHealthBoost2 }) => {
      applyHealthBoost2(player);
    });
  }
  player.onScreenDisplay.setActionBar({
    rawtext: [
      { text: "\xA7l\xA76[Season Add-on]\xA7r\xA7q " },
      { translate: SUCCESS_MESSAGES.upgraded }
    ]
  });
  player.playSound(SOUNDS.SKILL_POINT_ADD);
  const updatedData = getPlayerAbilityData(player);
  showAbilityUpgradePreview(player, abilityName, updatedData, onClose);
}
var init_status_ui = __esm({
  "data/scripts/modules/status_abilities/ui/status_ui.ts"() {
    "use strict";
    init_guidebook();
    init_constants();
    init_storage();
    init_status_ui_config();
  }
});

// data/scripts/modules/temperature/environment_temp_manager.ts
import { EntityComponentTypes, world as world9 } from "@minecraft/server";
var EnvironmentTemperatureManager;
var init_environment_temp_manager = __esm({
  "data/scripts/modules/temperature/environment_temp_manager.ts"() {
    "use strict";
    init_season_core();
    init_fog_system();
    init_weather_data();
    init_weather_system();
    EnvironmentTemperatureManager = class _EnvironmentTemperatureManager {
      static instance;
      // Temperature modifiers per weather type
      WEATHER_TEMP_MODIFIERS = {
        ["clear" /* Clear */]: 0.05,
        ["foggy" /* Foggy */]: -0.1,
        ["rain" /* Rain */]: -0.25,
        ["storm" /* Storm */]: -0.35,
        ["sleet" /* Sleet */]: -0.5,
        ["flurries" /* Flurries */]: -0.6,
        ["snowing" /* Snowing */]: -0.75,
        ["blizzard" /* Blizzard */]: -1
      };
      // Base temperature offset per season (additive with weather)
      SEASON_TEMP_OFFSETS = {
        ["spring" /* Spring */]: 0.15,
        ["summer" /* Summer */]: 0.3,
        ["fall" /* Fall */]: -0.15,
        ["winter" /* Winter */]: -0.3
      };
      // Season multiplier for light source warmth
      SEASON_LIGHT_MULTIPLIERS = {
        ["spring" /* Spring */]: 1,
        ["summer" /* Summer */]: 0.8,
        ["fall" /* Fall */]: 1,
        ["winter" /* Winter */]: 1.5
      };
      // Season multiplier for water temperature
      SEASON_WATER_MULTIPLIERS = {
        ["spring" /* Spring */]: 1,
        ["summer" /* Summer */]: 0.8,
        ["fall" /* Fall */]: 1.2,
        ["winter" /* Winter */]: 1.8
      };
      constructor() {
      }
      static getInstance() {
        if (!_EnvironmentTemperatureManager.instance) {
          _EnvironmentTemperatureManager.instance = new _EnvironmentTemperatureManager();
        }
        return _EnvironmentTemperatureManager.instance;
      }
      calculateTargetTemperature(player) {
        const currentBiome = player.getDynamicProperty("mythicus_sn:current_biome");
        if (!isSeasonalBiome(currentBiome)) {
          return 50;
        }
        const isUnderShelter = this.isPlayerSheltered(player);
        let target = 50;
        if (!isUnderShelter) {
          target += this.getWeatherModifier() * 40;
        }
        target += this.getSeasonModifier() * 60;
        const timeModifier = this.getTimeOfDayModifier();
        target += timeModifier * 30 * (isUnderShelter ? 0.5 : 1);
        target += this.getLightSourceModifier(player.location, player.dimension, isUnderShelter) * 30;
        target += this.getWaterModifier(player) * 50;
        target += this.getOnFireModifier(player) * 50;
        if (isUnderShelter) {
          const shelterPull = 0.2;
          target = target * (1 - shelterPull) + 50 * shelterPull;
        }
        return Math.max(0, Math.min(100, target));
      }
      calculateLocationTemperature(location, dimension) {
        if (!dimension.isChunkLoaded(location)) return 50;
        const block = dimension.getBlock(location);
        if (!block) return 50;
        const biome = block.dimension.getBiome(location);
        if (biome && !isSeasonalBiome(biome.id)) return 50;
        const isUnderShelter = this.isLocationSheltered(location, dimension);
        let target = 50;
        if (!isUnderShelter) {
          target += this.getWeatherModifier() * 40;
        }
        target += this.getSeasonModifier() * 60;
        const timeModifier = this.getTimeOfDayModifier();
        target += timeModifier * 30 * (isUnderShelter ? 0.5 : 1);
        target += this.getLightSourceModifier(location, dimension, isUnderShelter) * 30;
        if (isUnderShelter) {
          const shelterPull = 0.2;
          target = target * (1 - shelterPull) + 50 * shelterPull;
        }
        return Math.max(0, Math.min(100, target));
      }
      getWaterModifier(player) {
        if (!player.isInWater) return 0;
        const season = getCurrentSeason();
        const seasonMultiplier = this.SEASON_WATER_MULTIPLIERS[season] ?? 1;
        return -0.5 * seasonMultiplier;
      }
      getOnFireModifier(player) {
        if (!player.hasComponent(EntityComponentTypes.OnFire) && !player.getEffect("fire_resistance")) {
          return 0;
        }
        const location = player.location;
        const dimension = player.dimension;
        if (!dimension.isChunkLoaded(location)) return 0;
        const blockBelow = dimension.getBlock({
          x: Math.floor(location.x),
          y: Math.floor(location.y) - 1,
          z: Math.floor(location.z)
        });
        const blockAt = dimension.getBlock({
          x: Math.floor(location.x),
          y: Math.floor(location.y),
          z: Math.floor(location.z)
        });
        const fireBlocks = ["minecraft:fire", "minecraft:lava", "minecraft:flowing_lava"];
        if (blockBelow && fireBlocks.includes(blockBelow.typeId) || blockAt && fireBlocks.includes(blockAt.typeId)) {
          return 1.2;
        }
        return 0;
      }
      isPlayerSheltered(player) {
        return this.isLocationSheltered(player.location, player.dimension);
      }
      isLocationSheltered(location, dimension) {
        const rayOptions = {
          maxDistance: 20,
          includeLiquidBlocks: false,
          includePassableBlocks: false
        };
        const rayResult = dimension.getBlockFromRay(
          location,
          { x: 0, y: 1, z: 0 },
          rayOptions
        );
        return rayResult !== void 0;
      }
      getLightSourceModifier(location, dimension, isUnderShelter) {
        if (!dimension.isChunkLoaded(location)) return 0;
        const block = dimension.getBlock(location);
        if (!block) return 0;
        const lightLevel = block.getLightLevel();
        const season = getCurrentSeason();
        const shelterMultiplier = isUnderShelter ? 1 : 0.75;
        const seasonMultiplier = this.SEASON_LIGHT_MULTIPLIERS[season] ?? 1;
        const lightMod = lightLevel >= 10 ? 0.6 : 0;
        return lightMod * seasonMultiplier * shelterMultiplier;
      }
      getWeatherModifier() {
        if (forecast.length === 0) {
          return 0;
        }
        const currentWeather = forecast[0].weather;
        return this.WEATHER_TEMP_MODIFIERS[currentWeather] ?? 0;
      }
      getSeasonModifier() {
        const season = getCurrentSeason();
        return this.SEASON_TEMP_OFFSETS[season] ?? 0;
      }
      getTimeOfDayModifier() {
        const time = world9.getTimeOfDay();
        const weatherMod = this.getWeatherModifier();
        if (forecast.length > 0) {
          const currentWeather = forecast[0].weather;
          if (currentWeather === "blizzard" /* Blizzard */) {
            return 0;
          }
        }
        const timeRadians = (time - 6e3) / 24e3 * 2 * Math.PI;
        const baseModifier = Math.cos(timeRadians);
        const scaledModifier = baseModifier * 0.15;
        if (time >= 4e3 && time <= 8e3) {
          const distanceFromNoon = Math.abs(time - 6e3);
          const noonBonus = (1 - distanceFromNoon / 2e3) * 0.5;
          return scaledModifier + noonBonus;
        }
        if (scaledModifier > 0.05 && weatherMod > 0) {
          return scaledModifier + 0.05;
        } else if (scaledModifier < -0.05 && weatherMod < 0) {
          return scaledModifier - 0.05;
        }
        return scaledModifier;
      }
      getTemperatureBreakdown(player) {
        const weather = this.getWeatherModifier();
        const season = this.getSeasonModifier();
        const time = this.getTimeOfDayModifier();
        const isUnderShelter = this.isPlayerSheltered(player);
        const light = this.getLightSourceModifier(player.location, player.dimension, isUnderShelter);
        const water = this.getWaterModifier(player);
        const fire = this.getOnFireModifier(player);
        return `Weather: ${weather.toFixed(2)}, Season: ${season.toFixed(2)}, Time: ${time.toFixed(2)}, Light: ${light.toFixed(2)}, Water: ${water.toFixed(2)}, Fire: ${fire.toFixed(2)}, Sheltered: ${isUnderShelter}`;
      }
    };
  }
});

// data/scripts/modules/temperature/player_particle_effect_system.ts
import { MolangVariableMap as MolangVariableMap3 } from "@minecraft/server";
var PlayerParticleEffectSystem;
var init_player_particle_effect_system = __esm({
  "data/scripts/modules/temperature/player_particle_effect_system.ts"() {
    "use strict";
    init_particles();
    PlayerParticleEffectSystem = class {
      player;
      effects = /* @__PURE__ */ new Map();
      constructor(player) {
        this.player = player;
        this.registerEffect("cold_breath", {
          interval: 2,
          timer: 0,
          particleId: "mythicus_sn:cold_breath",
          enabled: false
        });
        this.registerEffect("freezing_breath", {
          interval: 2,
          timer: 0,
          particleId: "mythicus_sn:cold_breath",
          enabled: false
        });
        this.registerEffect("sweat_hot", {
          interval: 2,
          timer: 0,
          particleId: "mythicus_sn:sweat",
          enabled: false
        });
        this.registerEffect("sweat_burning", {
          interval: 1,
          timer: 0,
          particleId: "mythicus_sn:sweat",
          enabled: false
        });
        this.registerEffect("shiver_cold", {
          interval: 5,
          timer: 0,
          particleId: "",
          enabled: false
        });
        this.registerEffect("shiver_freezing", {
          interval: 3,
          timer: 0,
          particleId: "",
          enabled: false
        });
      }
      registerEffect(name, effect) {
        this.effects.set(name, effect);
      }
      enableEffect(name) {
        const effect = this.effects.get(name);
        if (effect) {
          effect.enabled = true;
        }
      }
      disableEffect(name) {
        const effect = this.effects.get(name);
        if (effect) {
          effect.enabled = false;
        }
      }
      tick() {
        this.effects.forEach((effect, name) => {
          if (!effect.enabled) return;
          effect.timer++;
          if (effect.timer >= effect.interval) {
            this.spawnParticle(name, effect);
            effect.timer = 0;
          }
        });
      }
      spawnParticle(effectName, effect) {
        const headLocation = this.player.getHeadLocation();
        const viewDirection = this.player.getViewDirection();
        const headBlock = this.player.dimension.getBlock(headLocation);
        if (headBlock && headBlock.isLiquid) {
          return;
        }
        switch (effectName) {
          case "cold_breath":
            this.spawnColdBreathParticle(headLocation, viewDirection, effect.particleId, 12);
            break;
          case "freezing_breath":
            this.spawnColdBreathParticle(headLocation, viewDirection, effect.particleId, 24);
            break;
          case "sweat_hot":
          case "sweat_burning":
            this.spawnSweatParticle(headLocation, effect.particleId);
            break;
          case "shiver_cold":
            this.applyShiverEffect(0.1, 0.7);
            break;
          case "shiver_freezing":
            this.applyShiverEffect(0.1, 1.3);
            break;
          default:
        }
      }
      spawnColdBreathParticle(headLocation, viewDirection, particleId, amount) {
        const molang = new MolangVariableMap3();
        const velocity = this.player.getVelocity();
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const particleSpeed = 0.15 + speed * 2;
        const length = Math.sqrt(viewDirection.x ** 2 + viewDirection.y ** 2 + viewDirection.z ** 2);
        const forward = {
          x: viewDirection.x / length,
          y: viewDirection.y / length,
          z: viewDirection.z / length
        };
        const worldUp = { x: 0, y: 1, z: 0 };
        const right = {
          x: forward.y * worldUp.z - forward.z * worldUp.y,
          y: forward.z * worldUp.x - forward.x * worldUp.z,
          z: forward.x * worldUp.y - forward.y * worldUp.x
        };
        const rightLength = Math.sqrt(right.x ** 2 + right.y ** 2 + right.z ** 2);
        if (rightLength > 1e-3) {
          right.x /= rightLength;
          right.y /= rightLength;
          right.z /= rightLength;
        }
        const up = {
          x: right.y * forward.z - right.z * forward.y,
          y: right.z * forward.x - right.x * forward.z,
          z: right.x * forward.y - right.y * forward.x
        };
        const spawnOffset = {
          x: forward.x * 0.7 - up.x * 0.15,
          y: forward.y * 0.7 - up.y * 0.15,
          z: forward.z * 0.7 - up.z * 0.15
        };
        molang.setFloat("variable.direction_x", viewDirection.x);
        molang.setFloat("variable.direction_y", viewDirection.y);
        molang.setFloat("variable.direction_z", viewDirection.z);
        molang.setFloat("variable.speed", particleSpeed);
        molang.setFloat("variable.amount", amount);
        safeSpawnParticle(
          this.player.dimension,
          particleId,
          {
            x: headLocation.x + spawnOffset.x,
            y: headLocation.y + spawnOffset.y,
            z: headLocation.z + spawnOffset.z
          },
          molang
        );
      }
      spawnSweatParticle(headLocation, particleId) {
        const molang = new MolangVariableMap3();
        const viewDirection = this.player.getViewDirection();
        const length = Math.sqrt(viewDirection.x ** 2 + viewDirection.y ** 2 + viewDirection.z ** 2);
        const forward = {
          x: viewDirection.x / length,
          y: viewDirection.y / length,
          z: viewDirection.z / length
        };
        const worldUp = { x: 0, y: 1, z: 0 };
        const right = {
          x: forward.y * worldUp.z - forward.z * worldUp.y,
          y: forward.z * worldUp.x - forward.x * worldUp.z,
          z: forward.x * worldUp.y - forward.y * worldUp.x
        };
        const rightLength = Math.sqrt(right.x ** 2 + right.y ** 2 + right.z ** 2);
        if (rightLength > 1e-3) {
          right.x /= rightLength;
          right.y /= rightLength;
          right.z /= rightLength;
        }
        const up = {
          x: right.y * forward.z - right.z * forward.y,
          y: right.z * forward.x - right.x * forward.z,
          z: right.x * forward.y - right.y * forward.x
        };
        const offsetForward = (Math.random() - 0.5) * 0.1;
        const offsetRight = (Math.random() - 0.5) * 0.2;
        const spawnOffset = {
          x: forward.x * 0.5 + up.x * 0.2 + right.x * offsetRight + forward.x * offsetForward,
          y: forward.y * 0.5 + up.y * 0.2 + right.y * offsetRight + forward.y * offsetForward,
          z: forward.z * 0.5 + up.z * 0.2 + right.z * offsetRight + forward.z * offsetForward
        };
        safeSpawnParticle(
          this.player.dimension,
          particleId,
          {
            x: headLocation.x + spawnOffset.x,
            y: headLocation.y + spawnOffset.y,
            z: headLocation.z + spawnOffset.z
          },
          molang
        );
      }
      applyShiverEffect(intensity, seconds) {
        const cameraShakeEnabled = this.player.getDynamicProperty("mythicus_sn:camera_shake_enabled") ?? true;
        if (!cameraShakeEnabled) return;
        this.player.runCommand(`camerashake add @s ${intensity} ${seconds} positional`);
      }
      isEffectEnabled(name) {
        const effect = this.effects.get(name);
        return effect ? effect.enabled : false;
      }
      disableAllEffects() {
        this.effects.forEach((effect) => {
          effect.enabled = false;
        });
      }
    };
  }
});

// data/scripts/modules/temperature/temperature_component.ts
import { EntityComponentTypes as EntityComponentTypes2, EquipmentSlot, TicksPerSecond as TicksPerSecond9 } from "@minecraft/server";
var PlayerTemperatureComponent;
var init_temperature_component = __esm({
  "data/scripts/modules/temperature/temperature_component.ts"() {
    "use strict";
    init_fog_system();
    init_player_particle_effect_system();
    PlayerTemperatureComponent = class {
      player;
      temperatureLevel = 3 /* Temperate */;
      temperatureValue = 50;
      heatResistance = 1;
      coldResistance = 1;
      // Thresholds for temperature levels (based on 0-100 scale)
      LEVEL_THRESHOLDS = {
        [0 /* Freezing */]: 0,
        [1 /* Cold */]: 10,
        [2 /* Cool */]: 40,
        [3 /* Temperate */]: 50,
        [4 /* Warm */]: 60,
        [5 /* Hot */]: 75,
        [6 /* Burning */]: 90
      };
      constructor(player, initialTemperature) {
        this.player = player;
        this.particleSystem = new PlayerParticleEffectSystem(player);
        if (initialTemperature !== void 0) {
          this.temperatureValue = Math.max(0, Math.min(100, initialTemperature));
          this.updateTemperatureLevel();
        }
      }
      // Convergence rates with human-readable time estimates:
      // - FAST: Moving towards temperate (50) - ~30s from extreme to temperate
      // - BASE: Neutral movement - ~30s to traverse 30 units
      // - SLOW: Moving away from temperate - ~60s from temperate (50) to cold (20) or warm (80)
      CONVERGENCE_RATE_BASE = 0.01;
      // Base: ~30s for major temp change
      CONVERGENCE_RATE_FAST = 0.01;
      // Fast: ~30s from extreme → temperate
      CONVERGENCE_RATE_SLOW = 25e-4;
      // Slow: ~60s from temperate → extreme
      TEMPERATE_TARGET = 50;
      // The ideal temperature value
      previousLevel = 3 /* Temperate */;
      comfortBuffDuration = 0;
      // Ticks remaining for comfort buff
      particleSystem;
      updateTowardTarget(targetTemp, deltaTime) {
        const difference = targetTemp - this.temperatureValue;
        const onFireComponent = this.player.getComponent(EntityComponentTypes2.OnFire);
        if (onFireComponent && onFireComponent.onFireTicksRemaining > 0) {
          this.temperatureValue = Math.min(100, this.temperatureValue + 10);
        }
        let convergenceRate = this.CONVERGENCE_RATE_BASE;
        const currentDistanceFromTemperate = Math.abs(this.temperatureValue - this.TEMPERATE_TARGET);
        const targetDistanceFromTemperate = Math.abs(targetTemp - this.TEMPERATE_TARGET);
        if (targetDistanceFromTemperate < currentDistanceFromTemperate) {
          convergenceRate = this.CONVERGENCE_RATE_FAST;
        } else if (targetDistanceFromTemperate > currentDistanceFromTemperate) {
          convergenceRate = this.CONVERGENCE_RATE_SLOW;
        }
        let change = difference * convergenceRate * deltaTime;
        if (change > 0) {
          change *= this.heatResistance;
        } else if (change < 0) {
          change *= this.coldResistance;
        }
        this.temperatureValue += change;
        this.temperatureValue = Math.max(0, Math.min(100, this.temperatureValue));
        this.previousLevel = this.temperatureLevel;
        this.updateTemperatureLevel();
        this.checkComfortTransition();
        this.particleSystem.tick();
        this.applyStatusEffects();
      }
      checkComfortTransition() {
        const wasHot = this.previousLevel === 5 /* Hot */ || this.previousLevel === 6 /* Burning */;
        const wasCold = this.previousLevel === 1 /* Cold */ || this.previousLevel === 0 /* Freezing */;
        const nowCool = this.temperatureLevel === 2 /* Cool */;
        const nowWarm = this.temperatureLevel === 4 /* Warm */;
        const hasRefreshed = wasHot && nowCool || wasCold && nowWarm;
        if (hasRefreshed && this.previousLevel !== this.temperatureLevel) {
          this.comfortBuffDuration = 10 * 20;
          this.player.onScreenDisplay.setActionBar({ translate: "temperature.message.refreshed" });
        }
      }
      modifyTemperature(amount, environmentalModifier) {
        if (amount > 0) {
          amount *= this.heatResistance;
        } else if (amount < 0) {
          amount *= this.coldResistance;
        }
        const equilibriumTarget = 50 + environmentalModifier * 50;
        const wouldOvershoot = amount > 0 && this.temperatureValue > equilibriumTarget || amount < 0 && this.temperatureValue < equilibriumTarget;
        if (wouldOvershoot) {
          amount *= 0.1;
        }
        this.temperatureValue += amount;
      }
      updateTemperatureLevel() {
        if (this.temperatureValue >= this.LEVEL_THRESHOLDS[6 /* Burning */]) {
          this.temperatureLevel = 6 /* Burning */;
        } else if (this.temperatureValue >= this.LEVEL_THRESHOLDS[5 /* Hot */]) {
          this.temperatureLevel = 5 /* Hot */;
        } else if (this.temperatureValue >= this.LEVEL_THRESHOLDS[4 /* Warm */]) {
          this.temperatureLevel = 4 /* Warm */;
        } else if (this.temperatureValue >= this.LEVEL_THRESHOLDS[3 /* Temperate */]) {
          this.temperatureLevel = 3 /* Temperate */;
        } else if (this.temperatureValue >= this.LEVEL_THRESHOLDS[2 /* Cool */]) {
          this.temperatureLevel = 2 /* Cool */;
        } else if (this.temperatureValue >= this.LEVEL_THRESHOLDS[1 /* Cold */]) {
          this.temperatureLevel = 1 /* Cold */;
        } else {
          this.temperatureLevel = 0 /* Freezing */;
        }
      }
      updateResistances() {
        if (!this.player?.isValid) return;
        const equipment = this.player.getComponent(EntityComponentTypes2.Equippable);
        if (!equipment) return;
        let totalHeatRes = 1;
        let totalColdRes = 1;
        const helmet = equipment.getEquipment(EquipmentSlot.Head);
        const chestplate = equipment.getEquipment(EquipmentSlot.Chest);
        const leggings = equipment.getEquipment(EquipmentSlot.Legs);
        const boots = equipment.getEquipment(EquipmentSlot.Feet);
        totalHeatRes *= this.getArmorHeatResistance(helmet);
        totalHeatRes *= this.getArmorHeatResistance(chestplate);
        totalHeatRes *= this.getArmorHeatResistance(leggings);
        totalHeatRes *= this.getArmorHeatResistance(boots);
        totalColdRes *= this.getArmorColdResistance(helmet);
        totalColdRes *= this.getArmorColdResistance(chestplate);
        totalColdRes *= this.getArmorColdResistance(leggings);
        totalColdRes *= this.getArmorColdResistance(boots);
        this.heatResistance = totalHeatRes;
        this.coldResistance = totalColdRes;
      }
      getTemperatureLevel() {
        return this.temperatureLevel;
      }
      getTemperatureLevelName() {
        switch (this.temperatureLevel) {
          case 0 /* Freezing */:
            return "temperature.level.freezing";
          case 1 /* Cold */:
            return "temperature.level.cold";
          case 2 /* Cool */:
            return "temperature.level.cool";
          case 3 /* Temperate */:
            return "temperature.level.temperate";
          case 4 /* Warm */:
            return "temperature.level.warm";
          case 5 /* Hot */:
            return "temperature.level.hot";
          case 6 /* Burning */:
            return "temperature.level.burning";
          default:
            return "temperature.level.temperate";
        }
      }
      getTemperatureValue() {
        return this.temperatureValue;
      }
      getArmorHeatResistance(item) {
        if (!item) return 1;
        const armorType = item.typeId;
        const HEAT_RESISTANCE = {
          // Leather - breathable but traps some heat
          "minecraft:leather_helmet": 1.15,
          "minecraft:leather_chestplate": 1.2,
          "minecraft:leather_leggings": 1.15,
          "minecraft:leather_boots": 1.1,
          // Chainmail - metal but breathable
          "minecraft:chainmail_helmet": 1,
          "minecraft:chainmail_chestplate": 1,
          "minecraft:chainmail_leggings": 1,
          "minecraft:chainmail_boots": 1,
          // Gold - conducts heat well (bad in hot environments)
          "minecraft:golden_helmet": 1.25,
          "minecraft:golden_chestplate": 1.3,
          "minecraft:golden_leggings": 1.25,
          "minecraft:golden_boots": 1.2,
          // Iron - heavy metal, traps heat
          "minecraft:iron_helmet": 1.2,
          "minecraft:iron_chestplate": 1.25,
          "minecraft:iron_leggings": 1.2,
          "minecraft:iron_boots": 1.15,
          // Diamond - reflective, excellent heat protection
          "minecraft:diamond_helmet": 0.75,
          "minecraft:diamond_chestplate": 0.7,
          "minecraft:diamond_leggings": 0.75,
          "minecraft:diamond_boots": 0.8,
          // Netherite - fire resistant, excellent heat protection
          "minecraft:netherite_helmet": 0.65,
          "minecraft:netherite_chestplate": 0.6,
          "minecraft:netherite_leggings": 0.65,
          "minecraft:netherite_boots": 0.7,
          // Fall Clothing
          "mythicus_sn:normal_fall_helmet": 1.05,
          "mythicus_sn:normal_fall_chestplate": 1.1,
          "mythicus_sn:normal_fall_leggings": 1.05,
          "mythicus_sn:normal_fall_boots": 1,
          // Winter Clothing
          "mythicus_sn:normal_winter_helmet": 1.15,
          "mythicus_sn:normal_winter_chestplate": 1.2,
          "mythicus_sn:normal_winter_leggings": 1.15,
          "mythicus_sn:normal_winter_boots": 1.1,
          // Spring Clothing
          "mythicus_sn:normal_spring_helmet": 0.7,
          "mythicus_sn:normal_spring_chestplate": 0.65,
          "mythicus_sn:normal_spring_leggings": 0.7,
          "mythicus_sn:normal_spring_boots": 0.75,
          // Summer Clothing
          "mythicus_sn:normal_summer_helmet": 0.6,
          "mythicus_sn:normal_summer_chestplate": 0.5,
          "mythicus_sn:normal_summer_leggings": 0.55,
          "mythicus_sn:normal_summer_boots": 0.6
        };
        return HEAT_RESISTANCE[armorType] ?? 1;
      }
      getArmorColdResistance(item) {
        if (!item) return 1;
        const armorType = item.typeId;
        const COLD_RESISTANCE = {
          // Leather - decent insulation
          "minecraft:leather_helmet": 0.8,
          "minecraft:leather_chestplate": 0.75,
          "minecraft:leather_leggings": 0.8,
          "minecraft:leather_boots": 0.85,
          // Chainmail - metal conducts cold
          "minecraft:chainmail_helmet": 1.05,
          "minecraft:chainmail_chestplate": 1.1,
          "minecraft:chainmail_leggings": 1.05,
          "minecraft:chainmail_boots": 1,
          // Gold - poor insulation, conducts cold
          "minecraft:golden_helmet": 1.15,
          "minecraft:golden_chestplate": 1.2,
          "minecraft:golden_leggings": 1.15,
          "minecraft:golden_boots": 1.1,
          // Iron - good insulation when layered
          "minecraft:iron_helmet": 0.85,
          "minecraft:iron_chestplate": 0.8,
          "minecraft:iron_leggings": 0.85,
          "minecraft:iron_boots": 0.9,
          // Diamond - reflective and insulating
          "minecraft:diamond_helmet": 0.7,
          "minecraft:diamond_chestplate": 0.65,
          "minecraft:diamond_leggings": 0.7,
          "minecraft:diamond_boots": 0.75,
          // Netherite - excellent all-around protection
          "minecraft:netherite_helmet": 0.6,
          "minecraft:netherite_chestplate": 0.55,
          "minecraft:netherite_leggings": 0.6,
          "minecraft:netherite_boots": 0.65,
          // Fall Clothing
          "mythicus_sn:normal_fall_helmet": 0.7,
          "mythicus_sn:normal_fall_chestplate": 0.65,
          "mythicus_sn:normal_fall_leggings": 0.7,
          "mythicus_sn:normal_fall_boots": 0.75,
          // Winter Clothing
          "mythicus_sn:normal_winter_helmet": 0.6,
          "mythicus_sn:normal_winter_chestplate": 0.5,
          "mythicus_sn:normal_winter_leggings": 0.55,
          "mythicus_sn:normal_winter_boots": 0.6,
          // Spring Clothing
          "mythicus_sn:normal_spring_helmet": 1.05,
          "mythicus_sn:normal_spring_chestplate": 1.1,
          "mythicus_sn:normal_spring_leggings": 1.05,
          "mythicus_sn:normal_spring_boots": 1,
          // Summer Clothing
          "mythicus_sn:normal_summer_helmet": 1.15,
          "mythicus_sn:normal_summer_chestplate": 1.2,
          "mythicus_sn:normal_summer_leggings": 1.15,
          "mythicus_sn:normal_summer_boots": 1.1
        };
        return COLD_RESISTANCE[armorType] ?? 1;
      }
      setHeatResistance(value) {
        this.heatResistance = value;
      }
      setColdResistance(value) {
        this.coldResistance = value;
      }
      getPlayer() {
        return this.player;
      }
      getEnvironmentDisplay(targetTemp, isValidReading = true) {
        if (!isValidReading) {
          return { translate: "temperature.message.invalid_reading" };
        }
        const currentColor = this.getColorCodeForLevel(this.temperatureLevel);
        const currentLevelKey = this.getTemperatureLevelName();
        const targetLevel = this.calculateLevelFromValue(targetTemp);
        const targetColor = this.getColorCodeForLevel(targetLevel);
        const targetLevelKey = this.getLevelNameFromLevel(targetLevel);
        if (this.temperatureLevel === targetLevel) {
          return { rawtext: [{ text: currentColor }, { translate: currentLevelKey }] };
        } else {
          return {
            rawtext: [
              { text: currentColor },
              { translate: currentLevelKey },
              { text: " \xA77\u2192 " },
              { text: targetColor },
              { translate: targetLevelKey }
            ]
          };
        }
      }
      getLevelNameFromLevel(level) {
        switch (level) {
          case 0 /* Freezing */:
            return "temperature.level.freezing";
          case 1 /* Cold */:
            return "temperature.level.cold";
          case 2 /* Cool */:
            return "temperature.level.cool";
          case 3 /* Temperate */:
            return "temperature.level.temperate";
          case 4 /* Warm */:
            return "temperature.level.warm";
          case 5 /* Hot */:
            return "temperature.level.hot";
          case 6 /* Burning */:
            return "temperature.level.burning";
          default:
            return "temperature.level.temperate";
        }
      }
      getColorCodeForLevel(level) {
        switch (level) {
          case 0 /* Freezing */:
            return "\xA7d";
          // Violet
          case 1 /* Cold */:
            return "\xA79";
          // Blue
          case 2 /* Cool */:
            return "\xA7b";
          // Aqua
          case 3 /* Temperate */:
            return "\xA7a";
          // Green
          case 4 /* Warm */:
            return "\xA7e";
          // Yellow
          case 5 /* Hot */:
            return "\xA76";
          // Gold/Orange
          case 6 /* Burning */:
            return "\xA7c";
          // Red
          default:
            return "\xA7f";
        }
      }
      calculateLevelFromValue(value) {
        if (value >= this.LEVEL_THRESHOLDS[6 /* Burning */]) {
          return 6 /* Burning */;
        } else if (value >= this.LEVEL_THRESHOLDS[5 /* Hot */]) {
          return 5 /* Hot */;
        } else if (value >= this.LEVEL_THRESHOLDS[4 /* Warm */]) {
          return 4 /* Warm */;
        } else if (value >= this.LEVEL_THRESHOLDS[3 /* Temperate */]) {
          return 3 /* Temperate */;
        } else if (value >= this.LEVEL_THRESHOLDS[2 /* Cool */]) {
          return 2 /* Cool */;
        } else if (value >= this.LEVEL_THRESHOLDS[1 /* Cold */]) {
          return 1 /* Cold */;
        } else {
          return 0 /* Freezing */;
        }
      }
      applyStatusEffects() {
        if (this.comfortBuffDuration > 0) {
          this.applyComfortBuff();
          this.comfortBuffDuration--;
        }
        this.particleSystem.disableAllEffects();
        const currentBiome = this.player.getDynamicProperty("mythicus_sn:current_biome");
        if (!currentBiome || !isSeasonalBiome(currentBiome)) {
          return;
        }
        const visualEffectsEnabled = this.player.getDynamicProperty("mythicus_sn:temperature_visual_effects") ?? true;
        switch (this.temperatureLevel) {
          case 6 /* Burning */:
            this.applyBurningEffects(visualEffectsEnabled);
            break;
          case 5 /* Hot */:
            this.applyHotEffects(visualEffectsEnabled);
            break;
          case 4 /* Warm */:
            this.applyWarmEffects(visualEffectsEnabled);
            break;
          case 2 /* Cool */:
            this.applyCoolEffects(visualEffectsEnabled);
            break;
          case 1 /* Cold */:
            this.applyColdEffects(visualEffectsEnabled);
            break;
          case 0 /* Freezing */:
            this.applyFreezingEffects(visualEffectsEnabled);
            break;
        }
      }
      applyComfortBuff() {
        this.player.addEffect("speed", 2 * TicksPerSecond9, { amplifier: 0, showParticles: false });
        this.player.addEffect("haste", 2 * TicksPerSecond9, { amplifier: 0, showParticles: false });
      }
      applyBurningEffects(visualEffectsEnabled) {
        const statusEffectsEnabled = this.player.getDynamicProperty("mythicus_sn:temperature_status_effects") ?? false;
        if (statusEffectsEnabled) {
          this.player.addEffect("mining_fatigue", 2 * TicksPerSecond9, { amplifier: 1, showParticles: false });
          this.player.addEffect("weakness", 2 * TicksPerSecond9, { amplifier: 1, showParticles: false });
          this.player.addEffect("slowness", 2 * TicksPerSecond9, { amplifier: 1, showParticles: false });
          if (Math.random() < 0.1) {
            const healthComponent = this.player.getComponent(EntityComponentTypes2.Health);
            if (healthComponent && healthComponent.currentValue > 1) {
              this.player.applyDamage(1);
              this.player.playSound("mob.player.hurt_on_fire", { volume: 0.5, pitch: 1 });
            }
          }
        }
        if (visualEffectsEnabled) {
          this.particleSystem.enableEffect("sweat_burning");
        }
      }
      applyHotEffects(visualEffectsEnabled) {
        const statusEffectsEnabled = this.player.getDynamicProperty("mythicus_sn:temperature_status_effects") ?? false;
        if (statusEffectsEnabled) {
          this.player.addEffect("slowness", 2 * TicksPerSecond9, { amplifier: 0, showParticles: false });
        }
        if (visualEffectsEnabled) {
          this.particleSystem.enableEffect("sweat_hot");
        }
      }
      applyWarmEffects(visualEffectsEnabled) {
        if (visualEffectsEnabled) {
          this.particleSystem.enableEffect("sweat_warm");
        }
      }
      applyCoolEffects(visualEffectsEnabled) {
        if (visualEffectsEnabled) {
          this.particleSystem.enableEffect("cool_breath");
        }
      }
      applyColdEffects(visualEffectsEnabled) {
        const statusEffectsEnabled = this.player.getDynamicProperty("mythicus_sn:temperature_status_effects") ?? false;
        if (statusEffectsEnabled) {
          this.player.addEffect("slowness", 2 * TicksPerSecond9, { amplifier: 0, showParticles: false });
        }
        if (visualEffectsEnabled) {
          this.particleSystem.enableEffect("cold_breath");
          this.particleSystem.enableEffect("shiver_cold");
        }
      }
      applyFreezingEffects(visualEffectsEnabled) {
        const statusEffectsEnabled = this.player.getDynamicProperty("mythicus_sn:temperature_status_effects") ?? false;
        if (statusEffectsEnabled) {
          this.player.addEffect("slowness", 2 * TicksPerSecond9, { amplifier: 2, showParticles: false });
          this.player.addEffect("weakness", 2 * TicksPerSecond9, { amplifier: 1, showParticles: false });
          this.player.addEffect("mining_fatigue", 2 * TicksPerSecond9, { amplifier: 0, showParticles: false });
          if (Math.random() < 0.1) {
            const healthComponent = this.player.getComponent(EntityComponentTypes2.Health);
            if (healthComponent && healthComponent.currentValue > 1) {
              this.player.applyDamage(1);
              this.player.playSound("mob.player.hurt_freeze", { volume: 0.5, pitch: 1 });
            }
          }
        }
        if (visualEffectsEnabled) {
          this.particleSystem.enableEffect("freezing_breath");
          this.particleSystem.enableEffect("shiver_freezing");
        }
      }
    };
  }
});

// data/scripts/modules/temperature/temperature_manager.ts
import { EntityComponentTypes as EntityComponentTypes3, EquipmentSlot as EquipmentSlot2, TicksPerSecond as TicksPerSecond10, system as system11, world as world10 } from "@minecraft/server";
function temperatureDataTransfer(player) {
  const currentTick = system11.currentTick;
  const controllerIndex = Math.floor(currentTick / (20 * 120) % 30);
  const newController = `controller.animation.mythicus_sn.player.temp_data_transfer_${controllerIndex}`;
  if (lastTempController) {
    player.playAnimation(`animation.mythicus_sn.player.temp_data_transfer_clear`, {
      controller: lastTempController,
      stopExpression: "",
      players: [player],
      blendOutTime: 0,
      nextState: "default"
    });
  }
  const tempComponent = tempManager.getPlayerTemperatureByPlayer(player);
  if (!tempComponent) return;
  const currentBiome = player.getDynamicProperty("mythicus_sn:current_biome");
  const inSeasonalBiome = currentBiome ? isSeasonalBiome(currentBiome) : false;
  let stopExpression;
  if (inSeasonalBiome) {
    const targetTemp = environmentManager.calculateTargetTemperature(player);
    const targetTempLevel = tempComponent.calculateLevelFromValue(targetTemp);
    stopExpression = `v.env_temperature=${targetTemp};v.env_temp_level=${targetTempLevel};v.player_temperature=${tempComponent.getTemperatureValue()};v.player_temp_level=${tempComponent.getTemperatureLevel()};v.temp_valid_reading=1;`;
  } else {
    stopExpression = `v.env_temperature=-1;v.env_temp_level=-1;v.player_temperature=-1;v.player_temp_level=-1;v.temp_valid_reading=0;`;
  }
  const animId = `animation.mythicus_sn.player.temp_data_transfer_${tempDataIndex}`;
  player.playAnimation(animId, {
    controller: newController,
    stopExpression,
    players: [player],
    blendOutTime: 0,
    nextState: "default"
  });
  lastTempController = newController;
  tempDataIndex = 1 - tempDataIndex;
}
var TEMPERATURE_ENGINE_ENABLED_PROPERTY, PlayerTemperatureManager, tempManager, environmentManager, lastTempController, tempDataIndex;
var init_temperature_manager = __esm({
  "data/scripts/modules/temperature/temperature_manager.ts"() {
    "use strict";
    init_players();
    init_fog_system();
    init_environment_temp_manager();
    init_temperature_component();
    TEMPERATURE_ENGINE_ENABLED_PROPERTY = "mythicus_sn:temperature_engine_enabled";
    PlayerTemperatureManager = class _PlayerTemperatureManager {
      static instance;
      playerTemperatures;
      constructor() {
        this.playerTemperatures = /* @__PURE__ */ new Map();
        this.initializeEventListeners();
      }
      static getInstance() {
        if (!_PlayerTemperatureManager.instance) {
          _PlayerTemperatureManager.instance = new _PlayerTemperatureManager();
        }
        return _PlayerTemperatureManager.instance;
      }
      initializeEventListeners() {
        world10.afterEvents.playerSpawn.subscribe((event) => {
          if (event.initialSpawn) {
            this.addPlayer(event.player);
          }
        });
        world10.afterEvents.playerLeave.subscribe((event) => {
          this.removePlayer(event.playerId);
        });
      }
      addPlayer(player) {
        const playerId = player.id;
        if (!this.playerTemperatures.has(playerId)) {
          const savedTemp = player.getDynamicProperty("mythicus_sn:current_temperature");
          const tempComponent = new PlayerTemperatureComponent(player, savedTemp);
          this.playerTemperatures.set(playerId, tempComponent);
        }
      }
      removePlayer(playerId) {
        this.playerTemperatures.delete(playerId);
      }
      getPlayerTemperature(playerId) {
        return this.playerTemperatures.get(playerId);
      }
      getPlayerTemperatureByPlayer(player) {
        return this.playerTemperatures.get(player.id);
      }
      saveAllTemperatures() {
        for (const [, tempComponent] of this.playerTemperatures) {
          const player = tempComponent.getPlayer();
          if (!player?.isValid) continue;
          const currentTemp = tempComponent.getTemperatureValue();
          player.setDynamicProperty("mythicus_sn:current_temperature", currentTemp);
        }
      }
      getAllPlayerTemperatures() {
        return Array.from(this.playerTemperatures.values());
      }
      getPlayerCount() {
        return this.playerTemperatures.size;
      }
    };
    tempManager = PlayerTemperatureManager.getInstance();
    environmentManager = EnvironmentTemperatureManager.getInstance();
    lastTempController = null;
    tempDataIndex = 0;
    system11.runInterval(() => {
      const temperatureEngineEnabled = world10.getDynamicProperty(TEMPERATURE_ENGINE_ENABLED_PROPERTY) ?? true;
      if (!temperatureEngineEnabled) return;
      if (tempManager.getPlayerCount() <= 0) return;
      const players = getAllPlayers();
      for (const player of players) {
        const tempComponent = tempManager.getPlayerTemperatureByPlayer(player);
        if (!tempComponent) continue;
        tempComponent.updateResistances();
        const currentBiome = player.getDynamicProperty("mythicus_sn:current_biome");
        const inSeasonalBiome = currentBiome ? isSeasonalBiome(currentBiome) : false;
        const targetTemp = inSeasonalBiome ? environmentManager.calculateTargetTemperature(player) : 0;
        tempComponent.updateTowardTarget(targetTemp, 1);
        temperatureDataTransfer(player);
        const inventory = player.getComponent(EntityComponentTypes3.Inventory);
        if (inventory) {
          const mainHandItem = inventory.container?.getItem(player.selectedSlotIndex);
          const offHandItem = player.getComponent(EntityComponentTypes3.Equippable)?.getEquipment(EquipmentSlot2.Offhand);
          const hasThermometer = mainHandItem && mainHandItem.typeId === "mythicus_sn:thermometer" || offHandItem && offHandItem.typeId === "mythicus_sn:thermometer";
          if (hasThermometer) {
            if (inSeasonalBiome) {
              player.onScreenDisplay.setActionBar(tempComponent.getEnvironmentDisplay(targetTemp, true));
            } else {
              player.onScreenDisplay.setActionBar(tempComponent.getEnvironmentDisplay(0, false));
            }
          }
        }
      }
      tempManager.saveAllTemperatures();
    }, 1 * TicksPerSecond10);
  }
});

// data/scripts/modules/guidebook/guidebookConfig.ts
import { world as world11 } from "@minecraft/server";
var BOOK_IDENTIFIER, MAIN_FORM_CONFIG, ITEM_LIST_CONFIG, OTHER_INFO_CONFIG;
var init_guidebookConfig = __esm({
  "data/scripts/modules/guidebook/guidebookConfig.ts"() {
    "use strict";
    init_environmental_probe();
    init_temperature_manager();
    init_weather_system();
    init_guidebook();
    world11.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
      if (initialSpawn) {
        giveGuidebook(player);
        if (player.getDynamicProperty("mythicus_sn:fogs_enabled") === void 0) {
          player.setDynamicProperty("mythicus_sn:fogs_enabled", true);
        }
        if (player.getDynamicProperty("mythicus_sn:lens_enabled") === void 0) {
          player.setDynamicProperty("mythicus_sn:lens_enabled", true);
        }
        if (player.getDynamicProperty("mythicus_sn:ambient_sounds_enabled") === void 0) {
          player.setDynamicProperty("mythicus_sn:ambient_sounds_enabled", true);
        }
        if (player.getDynamicProperty("mythicus_sn:camera_shake_enabled") === void 0) {
          player.setDynamicProperty("mythicus_sn:camera_shake_enabled", true);
        }
        if (player.getDynamicProperty("mythicus_sn:temperature_status_effects") === void 0) {
          player.setDynamicProperty("mythicus_sn:temperature_status_effects", false);
        }
        if (player.getDynamicProperty("mythicus_sn:temperature_visual_effects") === void 0) {
          player.setDynamicProperty("mythicus_sn:temperature_visual_effects", true);
        }
        if (player.getDynamicProperty("mythicus_sn:weather_particles") === void 0) {
          player.setDynamicProperty("mythicus_sn:weather_particles", true);
        }
        if (world11.getDynamicProperty(TEMPERATURE_ENGINE_ENABLED_PROPERTY) === void 0) {
          world11.setDynamicProperty(TEMPERATURE_ENGINE_ENABLED_PROPERTY, true);
        }
        if (world11.getDynamicProperty(WEATHER_ENGINE_ENABLED_PROPERTY) === void 0) {
          world11.setDynamicProperty(WEATHER_ENGINE_ENABLED_PROPERTY, true);
        }
        if (world11.getDynamicProperty(ENVIRONMENTAL_PROBE_ENABLED_PROPERTY) === void 0) {
          world11.setDynamicProperty(ENVIRONMENTAL_PROBE_ENABLED_PROPERTY, true);
        }
        if (world11.getDynamicProperty(SNOW_ACCUMULATION_ENABLED_PROPERTY) === void 0) {
          world11.setDynamicProperty(SNOW_ACCUMULATION_ENABLED_PROPERTY, true);
        }
        if (world11.getDynamicProperty(FALLING_LEAVES_ENABLED_PROPERTY) === void 0) {
          world11.setDynamicProperty(FALLING_LEAVES_ENABLED_PROPERTY, true);
        }
      }
    });
    BOOK_IDENTIFIER = "mythicus_sn:season_guidebook";
    MAIN_FORM_CONFIG = {
      title: "ui.mythicus_sn.form.guidebook",
      body: [
        "ui.mythicus_sn.guidebook.body_1",
        "ui.mythicus_sn.guidebook.body_2"
      ],
      buttons: {
        systems: "ui.mythicus_sn.guidebook.button.systems",
        itemList: "ui.mythicus_sn.guidebook.button.items",
        statusAbilities: "ui.mythicus_sn.button.status_abilities",
        settings: "ui.mythicus_sn.guidebook.button.settings",
        close: "ui.mythicus_sn.guidebook.button.close"
      }
    };
    ITEM_LIST_CONFIG = {
      crops: {
        category: "crops",
        categoryIcon: "textures/items/wheat",
        description: "ui.mythicus_sn.category.crops.description",
        items: [
          {
            id: "seasonal_crops",
            iconPath: "textures/items/wheat",
            translationKey: "ui.mythicus_sn.item.seasonal_crops",
            detailsTitle: "ui.mythicus_sn.content.seasonal_crops.title",
            content: [
              "ui.mythicus_sn.content.seasonal_crops.text_0",
              "ui.mythicus_sn.content.seasonal_crops.text_1",
              "ui.mythicus_sn.content.seasonal_crops.text_2",
              "ui.mythicus_sn.content.seasonal_crops.text_3",
              "ui.mythicus_sn.content.seasonal_crops.text_4",
              "ui.mythicus_sn.content.seasonal_crops.text_5",
              "ui.mythicus_sn.content.seasonal_crops.text_6",
              "ui.mythicus_sn.content.seasonal_crops.text_7",
              "ui.mythicus_sn.content.seasonal_crops.text_8",
              "ui.mythicus_sn.content.seasonal_crops.text_9",
              "ui.mythicus_sn.content.seasonal_crops.text_10",
              "ui.mythicus_sn.content.seasonal_crops.text_11",
              "ui.mythicus_sn.content.seasonal_crops.text_12",
              "ui.mythicus_sn.content.seasonal_crops.text_13",
              "ui.mythicus_sn.content.seasonal_crops.text_14",
              "ui.mythicus_sn.content.seasonal_crops.text_15",
              "ui.mythicus_sn.content.seasonal_crops.text_16"
            ]
          }
        ]
      },
      preserverjar: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/preserves_jar",
        description: "ui.mythicus_sn.category.artisan.description",
        items: [
          {
            id: "preserverjar",
            iconPath: "textures/mythicus/sn/ui/preserves_jar",
            translationKey: "ui.mythicus_sn.item.preserverjar",
            detailsTitle: "ui.mythicus_sn.content.preserverjar.title",
            content: [
              "ui.mythicus_sn.content.preserverjar.text_0",
              "ui.mythicus_sn.content.preserverjar.text_1",
              "ui.mythicus_sn.content.preserverjar.text_2"
            ]
          }
        ]
      },
      dehydrator: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/dehydrator",
        description: "ui.mythicus_sn.category.artisan.description",
        items: [
          {
            id: "dehydrator",
            iconPath: "textures/mythicus/sn/ui/dehydrator",
            translationKey: "ui.mythicus_sn.item.dehydrator",
            detailsTitle: "ui.mythicus_sn.content.dehydrator.title",
            content: [
              "ui.mythicus_sn.content.dehydrator.text_0",
              "ui.mythicus_sn.content.dehydrator.text_1",
              "ui.mythicus_sn.content.dehydrator.text_2"
            ]
          }
        ]
      },
      keg: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/keg",
        description: "ui.mythicus_sn.category.artisan.description",
        items: [
          {
            id: "keg",
            iconPath: "textures/mythicus/sn/ui/keg",
            translationKey: "ui.mythicus_sn.item.keg",
            detailsTitle: "ui.mythicus_sn.content.keg.title",
            content: [
              "ui.mythicus_sn.content.keg.text_0",
              "ui.mythicus_sn.content.keg.text_1",
              "ui.mythicus_sn.content.keg.text_2"
            ]
          }
        ]
      },
      mortarpestle: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/mortar_and_pestle",
        description: "ui.mythicus_sn.category.artisan.description",
        items: [
          {
            id: "mortarpestle",
            iconPath: "textures/mythicus/sn/ui/mortar_and_pestle",
            translationKey: "ui.mythicus_sn.item.mortarpestle",
            detailsTitle: "ui.mythicus_sn.content.mortarpestle.title",
            content: [
              "ui.mythicus_sn.content.mortarpestle.text_0",
              "ui.mythicus_sn.content.mortarpestle.text_1",
              "ui.mythicus_sn.content.mortarpestle.text_2"
            ]
          }
        ]
      },
      loom: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/loom",
        description: "ui.mythicus_sn.category.artisan.description",
        items: [
          {
            id: "loom",
            iconPath: "textures/mythicus/sn/ui/loom",
            translationKey: "ui.mythicus_sn.item.loom",
            detailsTitle: "ui.mythicus_sn.content.loom.title",
            content: [
              "ui.mythicus_sn.content.loom.text_0",
              "ui.mythicus_sn.content.loom.text_1",
              "ui.mythicus_sn.content.loom.text_2"
            ]
          }
        ]
      },
      cheesepress: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/cheese_press",
        description: "ui.mythicus_sn.category.artisan.description",
        items: [
          {
            id: "cheesepress",
            iconPath: "textures/mythicus/sn/ui/cheese_press",
            translationKey: "ui.mythicus_sn.item.cheesepress",
            detailsTitle: "ui.mythicus_sn.content.cheesepress.title",
            content: [
              "ui.mythicus_sn.content.cheesepress.text_0",
              "ui.mythicus_sn.content.cheesepress.text_1",
              "ui.mythicus_sn.content.cheesepress.text_2"
            ]
          }
        ]
      },
      mayonnaisemachine: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/mayonnaise_machine",
        description: "ui.mythicus_sn.category.mayonnaisemachine.description",
        items: [
          {
            id: "mayonnaisemachine",
            iconPath: "textures/mythicus/sn/ui/mayonnaise_machine",
            translationKey: "ui.mythicus_sn.item.mayonnaisemachine",
            detailsTitle: "ui.mythicus_sn.content.mayonnaisemachine.title",
            content: [
              "ui.mythicus_sn.content.mayonnaisemachine.text_0",
              "ui.mythicus_sn.content.mayonnaisemachine.text_1",
              "ui.mythicus_sn.content.mayonnaisemachine.text_2"
            ]
          }
        ]
      },
      vendor: {
        category: "artisan",
        categoryIcon: "textures/mythicus/sn/ui/vendor_block",
        description: "ui.mythicus_sn.category.mayonnaisemachine.description",
        items: [
          {
            id: "vendor",
            iconPath: "textures/mythicus/sn/ui/vendor_block",
            translationKey: "ui.mythicus_sn.item.vendor",
            detailsTitle: "ui.mythicus_sn.content.vendor.title",
            content: [
              "ui.mythicus_sn.content.vendor.text_0",
              "ui.mythicus_sn.content.vendor.text_1",
              "ui.mythicus_sn.content.vendor.text_2"
            ]
          }
        ]
      }
    };
    OTHER_INFO_CONFIG = {
      title: "ui.mythicus_sn.form.systems",
      description: "ui.mythicus_sn.systems.description",
      items: [
        {
          id: "season_cycle",
          translationKey: "ui.mythicus_sn.systems.spring",
          detailsTitle: "ui.mythicus_sn.content.spring.title",
          content: [
            "ui.mythicus_sn.content.spring.text_0",
            "ui.mythicus_sn.content.spring.text_1",
            "ui.mythicus_sn.content.spring.text_2",
            "ui.mythicus_sn.content.spring.text_3"
          ],
          iconPath: "textures/mythicus/sn/ui/spring"
        },
        {
          id: "weather",
          translationKey: "ui.mythicus_sn.systems.summer",
          detailsTitle: "ui.mythicus_sn.content.summer.title",
          content: [
            "ui.mythicus_sn.content.summer.text_0",
            "ui.mythicus_sn.content.summer.text_1",
            "ui.mythicus_sn.content.summer.text_2",
            "ui.mythicus_sn.content.summer.text_3"
          ],
          iconPath: "textures/mythicus/sn/ui/summer"
        },
        {
          id: "wildlife",
          translationKey: "ui.mythicus_sn.systems.fall",
          detailsTitle: "ui.mythicus_sn.content.fall.title",
          content: [
            "ui.mythicus_sn.content.fall.text_0",
            "ui.mythicus_sn.content.fall.text_1",
            "ui.mythicus_sn.content.fall.text_2",
            "ui.mythicus_sn.content.fall.text_3"
          ],
          iconPath: "textures/mythicus/sn/ui/fall"
        },
        {
          id: "trading",
          translationKey: "ui.mythicus_sn.systems.winter",
          detailsTitle: "ui.mythicus_sn.content.winter.title",
          content: [
            "ui.mythicus_sn.content.winter.text_0",
            "ui.mythicus_sn.content.winter.text_1",
            "ui.mythicus_sn.content.winter.text_2"
          ],
          iconPath: "textures/mythicus/sn/ui/winter"
        },
        {
          id: "tools",
          translationKey: "ui.mythicus_sn.systems.tools",
          detailsTitle: "ui.mythicus_sn.content.tools.title",
          content: [
            "ui.mythicus_sn.content.tools.text_0",
            "ui.mythicus_sn.content.tools.text_1",
            "ui.mythicus_sn.content.tools.text_2"
          ],
          iconPath: "textures/mythicus/sn/ui/tools"
        },
        {
          id: "world_dynamics",
          translationKey: "ui.mythicus_sn.systems.world_dynamics",
          detailsTitle: "ui.mythicus_sn.content.world_dynamics.title",
          content: [
            "ui.mythicus_sn.content.world_dynamics.text_0",
            "ui.mythicus_sn.content.world_dynamics.text_1",
            "ui.mythicus_sn.content.world_dynamics.text_2",
            "ui.mythicus_sn.content.world_dynamics.text_3"
          ],
          iconPath: "textures/mythicus/sn/particle/snowing"
        },
        {
          id: "hot_cold",
          translationKey: "ui.mythicus_sn.systems.hot_cold",
          detailsTitle: "ui.mythicus_sn.content.hot_cold.title",
          content: [
            "ui.mythicus_sn.content.hot_cold.text_0",
            "ui.mythicus_sn.content.hot_cold.text_1",
            "ui.mythicus_sn.content.hot_cold.text_2",
            "ui.mythicus_sn.content.hot_cold.text_3",
            "ui.mythicus_sn.content.hot_cold.text_4",
            "ui.mythicus_sn.content.hot_cold.text_5"
          ],
          iconPath: "textures/mythicus/sn/items/thermometer/thermometer"
        }
      ]
    };
  }
});

// data/scripts/modules/guidebook/guidebook.ts
var guidebook_exports = {};
__export(guidebook_exports, {
  giveGuidebook: () => giveGuidebook,
  hasReceivedGuidebook: () => hasReceivedGuidebook,
  showGuidebook: () => showGuidebook,
  showToggleListForm: () => showToggleListForm
});
import { EntityInventoryComponent, ItemStack as ItemStack2, world as world12 } from "@minecraft/server";
import { ActionFormData as ActionFormData2, ModalFormData } from "@minecraft/server-ui";
function hasReceivedGuidebook(player) {
  const receivedProperty = player.getDynamicProperty(GUIDEBOOK_RECEIVED_KEY);
  return receivedProperty === true;
}
function giveGuidebook(player) {
  if (!hasReceivedGuidebook(player)) {
    const guidebook = new ItemStack2(BOOK_IDENTIFIER, 1);
    const calendar = new ItemStack2("mythicus_sn:season_calendar", 1);
    const inventory = player.getComponent(EntityInventoryComponent.componentId);
    if (inventory && inventory.container) {
      inventory.container.addItem(guidebook);
      inventory.container.addItem(calendar);
      player.setDynamicProperty(GUIDEBOOK_RECEIVED_KEY, true);
    }
  }
}
async function showGuidebook(player) {
  const form = new ActionFormData2().title({ rawtext: [{ translate: MAIN_FORM_CONFIG.title }] });
  const bodyRawtext = {
    rawtext: MAIN_FORM_CONFIG.body.map((section) => ({
      translate: section
    })).reduce((acc, curr, index) => {
      acc.push(curr);
      if (index < MAIN_FORM_CONFIG.body.length - 1) {
        acc.push({ text: "\xA7r\n\n" });
      }
      return acc;
    }, [])
  };
  form.body(bodyRawtext);
  form.button({ rawtext: [{ translate: MAIN_FORM_CONFIG.buttons.systems }] }, "textures/mythicus/sn/ui/season");
  form.button({ rawtext: [{ translate: MAIN_FORM_CONFIG.buttons.itemList }] }, "textures/mythicus/sn/ui/cauliflower");
  form.button({ rawtext: [{ translate: MAIN_FORM_CONFIG.buttons.statusAbilities }] }, "textures/mythicus/sn/ui/master_skill_point");
  form.button({ rawtext: [{ translate: MAIN_FORM_CONFIG.buttons.settings }] }, "textures/mythicus/sn/ui/icon_setting");
  form.button({ rawtext: [{ translate: MAIN_FORM_CONFIG.buttons.close }] }, "textures/mythicus/sn/ui/close");
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled) return;
  handleMainFormResponse(player, response);
}
async function handleMainFormResponse(player, response) {
  switch (response.selection) {
    case 0:
      showOtherInfoForm(player);
      break;
    case 1:
      showItemListForm(player);
      break;
    case 2:
      await showStatusUI(player, () => showGuidebook(player));
      break;
    case 3:
      showToggleListForm(player);
      break;
  }
}
async function showItemListForm(player) {
  const form = new ActionFormData2().title({ rawtext: [{ translate: "ui.mythicus_sn.form.items" }] }).body({ rawtext: [{ translate: "ui.mythicus_sn.items.description" }] });
  const categories = Object.entries(ITEM_LIST_CONFIG);
  categories.forEach(([key, category]) => {
    const iconPath = category.categoryIcon || category.items[0]?.iconPath || "textures/ui/icon_recipe_item";
    form.button({ rawtext: [{ translate: `ui.mythicus_sn.category.${key}.title` }] }, iconPath);
  });
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.back" }] }, "textures/mythicus/sn/ui/back");
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.close" }] }, "textures/mythicus/sn/ui/close");
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === categories.length) {
    showGuidebook(player);
  } else if (response.selection === categories.length + 1) {
    return;
  } else if (response.selection !== void 0 && response.selection < categories.length) {
    const [_categoryKey, category] = categories[response.selection];
    const firstItem = category.items[0];
    await showDetailsForm(player, firstItem, () => showItemListForm(player));
  }
}
async function showToggleListForm(player) {
  const form = new ActionFormData2().title({ rawtext: [{ translate: "ui.mythicus_sn.form.settings" }] }).body({ rawtext: [{ translate: "ui.mythicus_sn.settings.description" }] });
  const isOp = isOperator(player);
  if (isOp) {
    form.button({ rawtext: [{ translate: "ui.mythicus_sn.settings.performance" }] }, "textures/ui/icon_setting.png");
  }
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.settings.ambience" }] }, "textures/ui/icon_fall");
  if (isOp) {
    form.button({ rawtext: [{ translate: "ui.mythicus_sn.settings.world_dynamics" }] }, "textures/mythicus/sn/ui/winter");
    form.button({ rawtext: [{ translate: "ui.mythicus_sn.settings.temperature" }] }, "textures/mythicus/sn/items/thermometer/thermometer");
    form.button({ rawtext: [{ translate: "ui.mythicus_sn.settings.weather" }] }, "textures/mythicus/sn/ui/water_droplet");
    form.button({ rawtext: [{ translate: "ui.mythicus_sn.settings.cycle" }] }, "textures/mythicus/sn/ui/season");
  }
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.back" }] }, "textures/mythicus/sn/ui/back");
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.close" }] }, "textures/mythicus/sn/ui/close");
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled || response.selection === void 0) {
    return;
  }
  if (isOp) {
    switch (response.selection) {
      case 0:
        await showPerformanceGuide(player);
        break;
      case 1:
        await showAmbienceSettings(player);
        break;
      case 2:
        await showWorldDynamicsSettings(player);
        break;
      case 3:
        await showTemperatureSettings(player);
        break;
      case 4:
        await showWeatherSettings(player);
        break;
      case 5:
        await showSeasonCycleForm(player);
        break;
      case 6:
        showGuidebook(player);
        break;
      default:
        break;
    }
  } else {
    switch (response.selection) {
      case 0:
        await showAmbienceSettings(player);
        break;
      case 1:
        showGuidebook(player);
        break;
      default:
        break;
    }
  }
}
async function showAmbienceSettings(player) {
  const lensFlareState = player.getDynamicProperty("mythicus_sn:lens_enabled") ?? true;
  const ambientSoundsState = player.getDynamicProperty("mythicus_sn:ambient_sounds_enabled") ?? true;
  const cameraShakeState = player.getDynamicProperty("mythicus_sn:camera_shake_enabled") ?? true;
  const form = new ModalFormData().title({ rawtext: [{ translate: "ui.mythicus_sn.form.ambience" }] }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.lens" }] }, { defaultValue: lensFlareState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.ambient_sounds" }] }, { defaultValue: ambientSoundsState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.camera_shake" }] }, { defaultValue: cameraShakeState }).submitButton({ rawtext: [{ translate: "ui.mythicus_sn.button.submit_back" }] });
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  if (!response.formValues) {
    return;
  }
  const lensEnabled = response.formValues[0] === true;
  const ambientSoundsEnabled = response.formValues[1] === true;
  const cameraShakeEnabled = response.formValues[2] === true;
  player.setDynamicProperty("mythicus_sn:lens_enabled", lensEnabled);
  player.setDynamicProperty("mythicus_sn:ambient_sounds_enabled", ambientSoundsEnabled);
  player.setDynamicProperty("mythicus_sn:camera_shake_enabled", cameraShakeEnabled);
  if (lensFlareState !== lensEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.ambience" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.lensSettings" },
        { translate: lensEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  if (ambientSoundsState !== ambientSoundsEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.ambience" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.ambientSoundsSettings" },
        { translate: ambientSoundsEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
    if (ambientSoundsEnabled) {
      soundLayer1(player);
    } else {
      stopSoundLayer1(player);
    }
  }
  if (cameraShakeState !== cameraShakeEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.ambience" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.cameraShakeSettings" },
        { translate: cameraShakeEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  showToggleListForm(player);
}
async function showWorldDynamicsSettings(player) {
  if (!isOperator(player)) {
    player.sendMessage({ translate: "chat.mythicus_sn.settings_denied" });
    return;
  }
  const worldDynamicsState = world12.getDynamicProperty(ENVIRONMENTAL_PROBE_ENABLED_PROPERTY) ?? true;
  const snowAccumulationState = world12.getDynamicProperty(SNOW_ACCUMULATION_ENABLED_PROPERTY) ?? true;
  const fallingLeavesState = world12.getDynamicProperty(FALLING_LEAVES_ENABLED_PROPERTY) ?? true;
  const form = new ModalFormData().title({ rawtext: [{ translate: "ui.mythicus_sn.form.world_dynamics" }] }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.world_dynamics_engine" }] }, { defaultValue: worldDynamicsState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.snow_accumulation" }] }, { defaultValue: snowAccumulationState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.falling_leaves" }] }, { defaultValue: fallingLeavesState }).submitButton({ rawtext: [{ translate: "ui.mythicus_sn.button.submit_back" }] });
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  if (!response.formValues) {
    return;
  }
  const worldDynamicsEnabled = response.formValues[0] === true;
  let snowAccumulationEnabled = response.formValues[1] === true;
  let fallingLeavesEnabled = response.formValues[2] === true;
  if (!worldDynamicsEnabled) {
    snowAccumulationEnabled = false;
    fallingLeavesEnabled = false;
  }
  world12.setDynamicProperty(ENVIRONMENTAL_PROBE_ENABLED_PROPERTY, worldDynamicsEnabled);
  world12.setDynamicProperty(SNOW_ACCUMULATION_ENABLED_PROPERTY, snowAccumulationEnabled);
  world12.setDynamicProperty(FALLING_LEAVES_ENABLED_PROPERTY, fallingLeavesEnabled);
  if (worldDynamicsState !== worldDynamicsEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.world_dynamics" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.worldDynamicsEngineSettings" },
        { translate: worldDynamicsEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  if (snowAccumulationState !== snowAccumulationEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.world_dynamics" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.snowAccumulationSettings" },
        { translate: snowAccumulationEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  if (fallingLeavesState !== fallingLeavesEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.world_dynamics" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.fallingLeavesSettings" },
        { translate: fallingLeavesEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  showToggleListForm(player);
}
async function showTemperatureSettings(player) {
  if (!isOperator(player)) {
    player.sendMessage({ translate: "chat.mythicus_sn.settings_denied" });
    return;
  }
  const temperatureEngineState = world12.getDynamicProperty(TEMPERATURE_ENGINE_ENABLED_PROPERTY) ?? true;
  const temperatureStatusEffectsState = player.getDynamicProperty("mythicus_sn:temperature_status_effects") ?? false;
  const temperatureVisualEffectsState = player.getDynamicProperty("mythicus_sn:temperature_visual_effects") ?? true;
  const form = new ModalFormData().title({ rawtext: [{ translate: "ui.mythicus_sn.form.temperature" }] }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.temperature_engine" }] }, { defaultValue: temperatureEngineState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.temperature_status_effects" }] }, { defaultValue: temperatureStatusEffectsState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.temperature_visual_effects" }] }, { defaultValue: temperatureVisualEffectsState }).submitButton({ rawtext: [{ translate: "ui.mythicus_sn.button.submit_back" }] });
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  if (!response.formValues) {
    return;
  }
  const temperatureEngineEnabled = response.formValues[0] === true;
  let temperatureStatusEffectsEnabled = response.formValues[1] === true;
  let temperatureVisualEffectsEnabled = response.formValues[2] === true;
  if (!temperatureEngineEnabled) {
    temperatureStatusEffectsEnabled = false;
    temperatureVisualEffectsEnabled = false;
  }
  world12.setDynamicProperty(TEMPERATURE_ENGINE_ENABLED_PROPERTY, temperatureEngineEnabled);
  player.setDynamicProperty("mythicus_sn:temperature_status_effects", temperatureStatusEffectsEnabled);
  player.setDynamicProperty("mythicus_sn:temperature_visual_effects", temperatureVisualEffectsEnabled);
  if (temperatureEngineState !== temperatureEngineEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.temperature" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.temperatureEngineSettings" },
        { translate: temperatureEngineEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  if (temperatureStatusEffectsState !== temperatureStatusEffectsEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.temperature" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.temperatureStatusEffectsSettings" },
        { translate: temperatureStatusEffectsEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  if (temperatureVisualEffectsState !== temperatureVisualEffectsEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.temperature" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.temperatureVisualEffectsSettings" },
        { translate: temperatureVisualEffectsEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  showToggleListForm(player);
}
async function showWeatherSettings(player) {
  if (!isOperator(player)) {
    player.sendMessage({ translate: "chat.mythicus_sn.settings_denied" });
    return;
  }
  const weatherEngineState = world12.getDynamicProperty(WEATHER_ENGINE_ENABLED_PROPERTY) ?? true;
  const weatherParticlesState = player.getDynamicProperty("mythicus_sn:weather_particles") ?? true;
  const fogState = player.getDynamicProperty("mythicus_sn:fogs_enabled") ?? true;
  const form = new ModalFormData().title({ rawtext: [{ translate: "ui.mythicus_sn.form.weather" }] }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.weather_engine" }] }, { defaultValue: weatherEngineState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.weather_particles" }] }, { defaultValue: weatherParticlesState }).toggle({ rawtext: [{ translate: "ui.mythicus_sn.toggles.fogs" }] }, { defaultValue: fogState }).submitButton({ rawtext: [{ translate: "ui.mythicus_sn.button.submit_back" }] });
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  if (!response.formValues) {
    return;
  }
  const weatherEngineEnabled = response.formValues[0] === true;
  let weatherParticlesEnabled = response.formValues[1] === true;
  let fogEnabled = response.formValues[2] === true;
  if (!weatherEngineEnabled) {
    weatherParticlesEnabled = false;
    fogEnabled = false;
  }
  world12.setDynamicProperty(WEATHER_ENGINE_ENABLED_PROPERTY, weatherEngineEnabled);
  player.setDynamicProperty("mythicus_sn:weather_particles", weatherParticlesEnabled);
  player.setDynamicProperty("mythicus_sn:fogs_enabled", fogEnabled);
  if (weatherEngineState !== weatherEngineEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.weather" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.weatherEngineSettings" },
        { translate: weatherEngineEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  if (weatherParticlesState !== weatherParticlesEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.weather" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.weatherParticlesSettings" },
        { translate: weatherParticlesEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  if (fogState !== fogEnabled) {
    player.sendMessage({
      rawtext: [
        { translate: "ui.mythicus_sn.category.weather" },
        { text: " " },
        { translate: "ui.mythicus_sn.toggles.fogSettings" },
        { translate: fogEnabled ? "ui.mythicus_sn.toggles.on" : "ui.mythicus_sn.toggles.off" }
      ]
    });
  }
  showToggleListForm(player);
}
async function showOtherInfoForm(player) {
  const form = new ActionFormData2().title({ rawtext: [{ translate: OTHER_INFO_CONFIG.title }] });
  form.body({ rawtext: [{ translate: OTHER_INFO_CONFIG.description }] });
  OTHER_INFO_CONFIG.items.forEach((item) => {
    form.button({ rawtext: [{ translate: item.translationKey }] }, item.iconPath);
  });
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.back" }] }, "textures/mythicus/sn/ui/back");
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.close" }] }, "textures/mythicus/sn/ui/close");
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled) return;
  handleOtherInfoResponse(player, response, OTHER_INFO_CONFIG.items);
}
async function handleOtherInfoResponse(player, response, infoItems) {
  if (response.canceled || response.selection === void 0) {
    return;
  }
  if (response.selection === infoItems.length) {
    showGuidebook(player);
    return;
  }
  if (response.selection === infoItems.length + 1) {
    return;
  }
  if (response.selection >= 0 && response.selection < infoItems.length) {
    const selectedItem = infoItems[response.selection];
    await showDetailsForm(player, selectedItem, showOtherInfoForm);
  }
}
async function showDetailsForm(player, item, backFunction) {
  const form = new ActionFormData2().title({ rawtext: [{ translate: item.detailsTitle }] });
  const bodyContent = item.content.flatMap((contentKey) => [
    { translate: contentKey },
    { text: "\xA7r\n\n" }
  ]);
  if (bodyContent.length > 0) {
    bodyContent.pop();
  }
  form.body({ rawtext: bodyContent });
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.back" }] }, "textures/mythicus/sn/ui/back");
  form.button({ rawtext: [{ translate: "ui.mythicus_sn.button.close" }] }, "textures/mythicus/sn/ui/close");
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (!response.canceled && response.selection === 0) {
    backFunction(player);
  }
}
var GUIDEBOOK_RECEIVED_KEY;
var init_guidebook = __esm({
  "data/scripts/modules/guidebook/guidebook.ts"() {
    "use strict";
    init_permissions();
    init_environmental_probe();
    init_season_system();
    init_layer1();
    init_status_ui();
    init_temperature_manager();
    init_weather_system();
    init_guidebookConfig();
    GUIDEBOOK_RECEIVED_KEY = `${BOOK_IDENTIFIER}_received`;
  }
});

// data/scripts/modules/season_system/season_cycle_presets.ts
import { world as world13 } from "@minecraft/server";
import { ActionFormData as ActionFormData3, MessageFormData } from "@minecraft/server-ui";
function getActiveSeasonDuration() {
  const preset = world13.getDynamicProperty(SEASON_CYCLE_PRESET_PROPERTY);
  if (!preset || !(preset in SEASON_CYCLE_CONFIGS)) {
    return 16;
  }
  return SEASON_CYCLE_CONFIGS[preset].days;
}
function getActiveSeasonPreset() {
  const preset = world13.getDynamicProperty(SEASON_CYCLE_PRESET_PROPERTY);
  if (!preset || !(preset in SEASON_CYCLE_CONFIGS)) {
    return "natural";
  }
  return preset;
}
function setSeasonCyclePreset(preset) {
  world13.setDynamicProperty(SEASON_CYCLE_PRESET_PROPERTY, preset);
}
async function showSeasonCycleForm(player) {
  if (!isOperator(player)) {
    player.sendMessage({ translate: "chat.mythicus_sn.cycle_preset_denied" });
    return;
  }
  const currentPreset = getActiveSeasonPreset();
  const form = new ActionFormData3().title({ translate: "ui.mythicus_sn.form.cycle" }).body({
    rawtext: [
      { translate: "ui.mythicus_sn.cycle.description" },
      { text: "\n\n" },
      { translate: "ui.mythicus_sn.cycle.current" },
      { translate: SEASON_CYCLE_CONFIGS[currentPreset].translationKey }
    ]
  });
  for (const preset of PRESET_ORDER) {
    const config = SEASON_CYCLE_CONFIGS[preset];
    form.button({ translate: config.translationKey });
  }
  form.button({ translate: "ui.mythicus_sn.button.back" }, "textures/mythicus/sn/ui/back");
  form.button({ translate: "ui.mythicus_sn.button.close" }, "textures/mythicus/sn/ui/close");
  player.playSound("item.book.page_turn", { volume: 1, pitch: 1 });
  const response = await form.show(player);
  if (response.canceled || response.selection === void 0) return;
  if (response.selection === PRESET_ORDER.length) {
    const { showToggleListForm: showToggleListForm2 } = await Promise.resolve().then(() => (init_guidebook(), guidebook_exports));
    await showToggleListForm2(player);
    return;
  }
  if (response.selection === PRESET_ORDER.length + 1) {
    return;
  }
  if (response.selection >= PRESET_ORDER.length) {
    return;
  }
  const selectedPreset = PRESET_ORDER[response.selection];
  if (selectedPreset === currentPreset) {
    player.sendMessage({ translate: "chat.mythicus_sn.cycle_preset_same" });
    return;
  }
  await showCycleConfirmation(player, selectedPreset);
}
async function showCycleConfirmation(player, preset) {
  const config = SEASON_CYCLE_CONFIGS[preset];
  const confirmForm = new MessageFormData().title({ translate: "ui.mythicus_sn.cycle.confirm.title" }).body({
    rawtext: [
      { translate: "ui.mythicus_sn.cycle.confirm.body" },
      { text: "\n\n" },
      { translate: config.translationKey },
      { text: "\n" },
      { translate: config.descriptionKey }
    ]
  }).button1({ translate: "ui.mythicus_sn.cycle.confirm.yes" }).button2({ translate: "ui.mythicus_sn.cycle.confirm.no" });
  const response = await confirmForm.show(player);
  if (response.canceled || response.selection !== 0) {
    await showSeasonCycleForm(player);
    return;
  }
  setSeasonCyclePreset(preset);
  player.playSound("random.levelup", { volume: 0.5, pitch: 1.2 });
  world13.sendMessage({
    rawtext: [
      { translate: "ui.mythicus_sn.category.cycle" },
      { text: " " },
      { translate: "chat.mythicus_sn.cycle_preset_set" },
      { text: " " },
      { translate: config.translationKey }
    ]
  });
}
var SEASON_CYCLE_PRESET_PROPERTY, SEASON_CYCLE_CONFIGS, PRESET_ORDER;
var init_season_cycle_presets = __esm({
  "data/scripts/modules/season_system/season_cycle_presets.ts"() {
    "use strict";
    init_permissions();
    SEASON_CYCLE_PRESET_PROPERTY = "mythicus_sn:season_cycle_preset";
    SEASON_CYCLE_CONFIGS = {
      rapid: {
        days: 4,
        translationKey: "ui.mythicus_sn.cycle.rapid",
        descriptionKey: "ui.mythicus_sn.cycle.rapid.description"
      },
      balanced: {
        days: 8,
        translationKey: "ui.mythicus_sn.cycle.balanced",
        descriptionKey: "ui.mythicus_sn.cycle.balanced.description"
      },
      natural: {
        days: 16,
        translationKey: "ui.mythicus_sn.cycle.natural",
        descriptionKey: "ui.mythicus_sn.cycle.natural.description"
      },
      realistic: {
        days: 91,
        translationKey: "ui.mythicus_sn.cycle.realistic",
        descriptionKey: "ui.mythicus_sn.cycle.realistic.description"
      }
    };
    PRESET_ORDER = ["rapid", "balanced", "natural", "realistic"];
  }
});

// ../../node_modules/denque/index.js
var require_denque = __commonJS({
  "../../node_modules/denque/index.js"(exports, module) {
    "use strict";
    function Denque2(array, options) {
      var options = options || {};
      this._capacity = options.capacity;
      this._head = 0;
      this._tail = 0;
      if (Array.isArray(array)) {
        this._fromArray(array);
      } else {
        this._capacityMask = 3;
        this._list = new Array(4);
      }
    }
    Denque2.prototype.peekAt = function peekAt(index) {
      var i = index;
      if (i !== (i | 0)) {
        return void 0;
      }
      var len = this.size();
      if (i >= len || i < -len) return void 0;
      if (i < 0) i += len;
      i = this._head + i & this._capacityMask;
      return this._list[i];
    };
    Denque2.prototype.get = function get(i) {
      return this.peekAt(i);
    };
    Denque2.prototype.peek = function peek() {
      if (this._head === this._tail) return void 0;
      return this._list[this._head];
    };
    Denque2.prototype.peekFront = function peekFront() {
      return this.peek();
    };
    Denque2.prototype.peekBack = function peekBack() {
      return this.peekAt(-1);
    };
    Object.defineProperty(Denque2.prototype, "length", {
      get: function length() {
        return this.size();
      }
    });
    Denque2.prototype.size = function size() {
      if (this._head === this._tail) return 0;
      if (this._head < this._tail) return this._tail - this._head;
      else return this._capacityMask + 1 - (this._head - this._tail);
    };
    Denque2.prototype.unshift = function unshift(item) {
      if (arguments.length === 0) return this.size();
      var len = this._list.length;
      this._head = this._head - 1 + len & this._capacityMask;
      this._list[this._head] = item;
      if (this._tail === this._head) this._growArray();
      if (this._capacity && this.size() > this._capacity) this.pop();
      if (this._head < this._tail) return this._tail - this._head;
      else return this._capacityMask + 1 - (this._head - this._tail);
    };
    Denque2.prototype.shift = function shift() {
      var head = this._head;
      if (head === this._tail) return void 0;
      var item = this._list[head];
      this._list[head] = void 0;
      this._head = head + 1 & this._capacityMask;
      if (head < 2 && this._tail > 1e4 && this._tail <= this._list.length >>> 2) this._shrinkArray();
      return item;
    };
    Denque2.prototype.push = function push(item) {
      if (arguments.length === 0) return this.size();
      var tail = this._tail;
      this._list[tail] = item;
      this._tail = tail + 1 & this._capacityMask;
      if (this._tail === this._head) {
        this._growArray();
      }
      if (this._capacity && this.size() > this._capacity) {
        this.shift();
      }
      if (this._head < this._tail) return this._tail - this._head;
      else return this._capacityMask + 1 - (this._head - this._tail);
    };
    Denque2.prototype.pop = function pop() {
      var tail = this._tail;
      if (tail === this._head) return void 0;
      var len = this._list.length;
      this._tail = tail - 1 + len & this._capacityMask;
      var item = this._list[this._tail];
      this._list[this._tail] = void 0;
      if (this._head < 2 && tail > 1e4 && tail <= len >>> 2) this._shrinkArray();
      return item;
    };
    Denque2.prototype.removeOne = function removeOne(index) {
      var i = index;
      if (i !== (i | 0)) {
        return void 0;
      }
      if (this._head === this._tail) return void 0;
      var size = this.size();
      var len = this._list.length;
      if (i >= size || i < -size) return void 0;
      if (i < 0) i += size;
      i = this._head + i & this._capacityMask;
      var item = this._list[i];
      var k;
      if (index < size / 2) {
        for (k = index; k > 0; k--) {
          this._list[i] = this._list[i = i - 1 + len & this._capacityMask];
        }
        this._list[i] = void 0;
        this._head = this._head + 1 + len & this._capacityMask;
      } else {
        for (k = size - 1 - index; k > 0; k--) {
          this._list[i] = this._list[i = i + 1 + len & this._capacityMask];
        }
        this._list[i] = void 0;
        this._tail = this._tail - 1 + len & this._capacityMask;
      }
      return item;
    };
    Denque2.prototype.remove = function remove(index, count) {
      var i = index;
      var removed;
      var del_count = count;
      if (i !== (i | 0)) {
        return void 0;
      }
      if (this._head === this._tail) return void 0;
      var size = this.size();
      var len = this._list.length;
      if (i >= size || i < -size || count < 1) return void 0;
      if (i < 0) i += size;
      if (count === 1 || !count) {
        removed = new Array(1);
        removed[0] = this.removeOne(i);
        return removed;
      }
      if (i === 0 && i + count >= size) {
        removed = this.toArray();
        this.clear();
        return removed;
      }
      if (i + count > size) count = size - i;
      var k;
      removed = new Array(count);
      for (k = 0; k < count; k++) {
        removed[k] = this._list[this._head + i + k & this._capacityMask];
      }
      i = this._head + i & this._capacityMask;
      if (index + count === size) {
        this._tail = this._tail - count + len & this._capacityMask;
        for (k = count; k > 0; k--) {
          this._list[i = i + 1 + len & this._capacityMask] = void 0;
        }
        return removed;
      }
      if (index === 0) {
        this._head = this._head + count + len & this._capacityMask;
        for (k = count - 1; k > 0; k--) {
          this._list[i = i + 1 + len & this._capacityMask] = void 0;
        }
        return removed;
      }
      if (i < size / 2) {
        this._head = this._head + index + count + len & this._capacityMask;
        for (k = index; k > 0; k--) {
          this.unshift(this._list[i = i - 1 + len & this._capacityMask]);
        }
        i = this._head - 1 + len & this._capacityMask;
        while (del_count > 0) {
          this._list[i = i - 1 + len & this._capacityMask] = void 0;
          del_count--;
        }
        if (index < 0) this._tail = i;
      } else {
        this._tail = i;
        i = i + count + len & this._capacityMask;
        for (k = size - (count + index); k > 0; k--) {
          this.push(this._list[i++]);
        }
        i = this._tail;
        while (del_count > 0) {
          this._list[i = i + 1 + len & this._capacityMask] = void 0;
          del_count--;
        }
      }
      if (this._head < 2 && this._tail > 1e4 && this._tail <= len >>> 2) this._shrinkArray();
      return removed;
    };
    Denque2.prototype.splice = function splice(index, count) {
      var i = index;
      if (i !== (i | 0)) {
        return void 0;
      }
      var size = this.size();
      if (i < 0) i += size;
      if (i > size) return void 0;
      if (arguments.length > 2) {
        var k;
        var temp;
        var removed;
        var arg_len = arguments.length;
        var len = this._list.length;
        var arguments_index = 2;
        if (!size || i < size / 2) {
          temp = new Array(i);
          for (k = 0; k < i; k++) {
            temp[k] = this._list[this._head + k & this._capacityMask];
          }
          if (count === 0) {
            removed = [];
            if (i > 0) {
              this._head = this._head + i + len & this._capacityMask;
            }
          } else {
            removed = this.remove(i, count);
            this._head = this._head + i + len & this._capacityMask;
          }
          while (arg_len > arguments_index) {
            this.unshift(arguments[--arg_len]);
          }
          for (k = i; k > 0; k--) {
            this.unshift(temp[k - 1]);
          }
        } else {
          temp = new Array(size - (i + count));
          var leng = temp.length;
          for (k = 0; k < leng; k++) {
            temp[k] = this._list[this._head + i + count + k & this._capacityMask];
          }
          if (count === 0) {
            removed = [];
            if (i != size) {
              this._tail = this._head + i + len & this._capacityMask;
            }
          } else {
            removed = this.remove(i, count);
            this._tail = this._tail - leng + len & this._capacityMask;
          }
          while (arguments_index < arg_len) {
            this.push(arguments[arguments_index++]);
          }
          for (k = 0; k < leng; k++) {
            this.push(temp[k]);
          }
        }
        return removed;
      } else {
        return this.remove(i, count);
      }
    };
    Denque2.prototype.clear = function clear() {
      this._list = new Array(this._list.length);
      this._head = 0;
      this._tail = 0;
    };
    Denque2.prototype.isEmpty = function isEmpty() {
      return this._head === this._tail;
    };
    Denque2.prototype.toArray = function toArray() {
      return this._copyArray(false);
    };
    Denque2.prototype._fromArray = function _fromArray(array) {
      var length = array.length;
      var capacity = this._nextPowerOf2(length);
      this._list = new Array(capacity);
      this._capacityMask = capacity - 1;
      this._tail = length;
      for (var i = 0; i < length; i++) this._list[i] = array[i];
    };
    Denque2.prototype._copyArray = function _copyArray(fullCopy, size) {
      var src = this._list;
      var capacity = src.length;
      var length = this.length;
      size = size | length;
      if (size == length && this._head < this._tail) {
        return this._list.slice(this._head, this._tail);
      }
      var dest = new Array(size);
      var k = 0;
      var i;
      if (fullCopy || this._head > this._tail) {
        for (i = this._head; i < capacity; i++) dest[k++] = src[i];
        for (i = 0; i < this._tail; i++) dest[k++] = src[i];
      } else {
        for (i = this._head; i < this._tail; i++) dest[k++] = src[i];
      }
      return dest;
    };
    Denque2.prototype._growArray = function _growArray() {
      if (this._head != 0) {
        var newList = this._copyArray(true, this._list.length << 1);
        this._tail = this._list.length;
        this._head = 0;
        this._list = newList;
      } else {
        this._tail = this._list.length;
        this._list.length <<= 1;
      }
      this._capacityMask = this._capacityMask << 1 | 1;
    };
    Denque2.prototype._shrinkArray = function _shrinkArray() {
      this._list.length >>>= 1;
      this._capacityMask >>>= 1;
    };
    Denque2.prototype._nextPowerOf2 = function _nextPowerOf2(num) {
      var log2 = Math.log(num) / Math.log(2);
      var nextPow2 = 1 << log2 + 1;
      return Math.max(nextPow2, 4);
    };
    module.exports = Denque2;
  }
});

// data/scripts/lib/async.ts
import { system as system12 } from "@minecraft/server";
function runJobAsync(generator) {
  return new Promise((resolve, reject) => {
    system12.runJob(function* () {
      try {
        yield* generator;
        resolve();
      } catch (err) {
        reject(err);
      }
    }());
  });
}
var init_async = __esm({
  "data/scripts/lib/async.ts"() {
    "use strict";
  }
});

// data/scripts/modules/season_system/season_update_manager.ts
import { system as system13, world as world14 } from "@minecraft/server";
var import_denque, SEASON_STAGE_STATE, SEASON_STAGE_STATE_KEY, CACHE_DURATION_TICKS, SeasonUpdateManager;
var init_season_update_manager = __esm({
  "data/scripts/modules/season_system/season_update_manager.ts"() {
    "use strict";
    init_lib2();
    import_denque = __toESM(require_denque(), 1);
    init_async();
    init_players();
    init_season_constants();
    init_season_core();
    init_season_cycle_presets();
    SEASON_STAGE_STATE = "mythicus_sn:season_stage";
    SEASON_STAGE_STATE_KEY = SEASON_STAGE_STATE;
    CACHE_DURATION_TICKS = 20;
    SeasonUpdateManager = class _SeasonUpdateManager {
      static instance;
      updateQueue = new import_denque.default();
      seasonCache = null;
      BATCH_SIZE = 50;
      MAX_QUEUE_SIZE = 100;
      PLAYER_RADIUS = 64;
      PLAYER_RADIUS_SQUARED = 64 * 64;
      YIELD_FREQUENCY = 10;
      performanceMode = "medium";
      playerLocationCache = null;
      PLAYER_CACHE_DURATION = 60;
      metrics = {
        totalBlocksProcessed: 0,
        totalBatchesProcessed: 0,
        lastProcessingTime: 0,
        queueSize: 0
      };
      constructor() {
        system13.run(() => this.processBlocks());
      }
      static getInstance() {
        if (!_SeasonUpdateManager.instance) {
          _SeasonUpdateManager.instance = new _SeasonUpdateManager();
        }
        return _SeasonUpdateManager.instance;
      }
      queueBlockUpdate(block, isNewlyPlaced = false) {
        const typeId = block.typeId;
        if (typeId.startsWith("minecraft:")) {
          return;
        }
        const targetStage = this.getSeasonCalculation().targetStage;
        const permutation = block.permutation;
        let currentStage;
        if (!isNewlyPlaced) {
          currentStage = permutation.getState(SEASON_STAGE_STATE_KEY);
          if (currentStage === targetStage) {
            return;
          }
        }
        while (this.updateQueue.length >= this.MAX_QUEUE_SIZE) {
          this.updateQueue.shift();
        }
        this.updateQueue.push({
          block,
          typeId,
          isNewlyPlaced,
          timestamp: system13.currentTick,
          currentStage
        });
        this.metrics.queueSize = this.updateQueue.length;
      }
      async processBlocks() {
        if (this.updateQueue.length > 0) {
          await runJobAsync(this.processBatch());
          this.metrics.totalBatchesProcessed++;
          this.metrics.queueSize = this.updateQueue.length;
        }
        system13.runTimeout(() => this.processBlocks(), 1);
      }
      *processBatch() {
        const seasonCalculation = this.getSeasonCalculation();
        for (let i = 0; i < this.BATCH_SIZE; i++) {
          const request = this.updateQueue.shift();
          if (!request) continue;
          const validated = this.validateAndFetchBlock(request, seasonCalculation);
          if (validated.valid) {
            if (!Number.isFinite(seasonCalculation.targetStage)) {
              continue;
            }
            if (!validated.block?.isValid) continue;
            const blockDimension = validated.dimension.id;
            if (blockDimension !== MinecraftDimensionTypes.Overworld) {
              if (validated.currentStage !== 8) {
                const fallPermutation = validated.permutation.withState(SEASON_STAGE_STATE_KEY, 8);
                validated.block.setPermutation(fallPermutation);
              }
            } else {
              const newPermutation = validated.permutation.withState(
                SEASON_STAGE_STATE_KEY,
                seasonCalculation.targetStage
              );
              validated.block.setPermutation(newPermutation);
            }
            this.metrics.totalBlocksProcessed++;
          }
          if ((i + 1) % this.YIELD_FREQUENCY === 0) {
            yield;
          }
        }
      }
      validateAndFetchBlock(request, seasonCalculation) {
        const { block, typeId } = request;
        const dimension = block.dimension;
        if (!dimension.isChunkLoaded(block)) {
          return { valid: false };
        }
        if (block.typeId !== typeId) {
          return { valid: false };
        }
        if (!this.isBlockNearPlayers(block)) {
          return { valid: false };
        }
        const permutation = block.permutation;
        let currentStage;
        if (request.currentStage !== void 0) {
          currentStage = request.currentStage;
        } else {
          currentStage = permutation.getState(SEASON_STAGE_STATE_KEY) ?? 0;
        }
        if (currentStage === seasonCalculation.targetStage) {
          return { valid: false };
        }
        return {
          valid: true,
          dimension,
          block,
          permutation,
          currentStage
        };
      }
      isBlockNearPlayers(location) {
        const currentTick = system13.currentTick;
        if (!this.playerLocationCache || currentTick - this.playerLocationCache.tick > this.PLAYER_CACHE_DURATION) {
          const players = getAllPlayers();
          this.playerLocationCache = {
            locations: players.map((p) => p.location),
            tick: currentTick
          };
        }
        for (const playerLoc of this.playerLocationCache.locations) {
          const dx = location.x - playerLoc.x;
          const dy = location.y - playerLoc.y;
          const dz = location.z - playerLoc.z;
          if (dx * dx + dy * dy + dz * dz <= this.PLAYER_RADIUS_SQUARED) {
            return true;
          }
        }
        return false;
      }
      getSeasonCalculation() {
        const currentTick = system13.currentTick;
        if (this.seasonCache && currentTick - this.seasonCache.timestamp < CACHE_DURATION_TICKS) {
          return this.seasonCache;
        }
        const currentDay = world14.getDay();
        const globalSeason = getCurrentSeason();
        const globalSeasonIndex = getSeasonIndex(globalSeason);
        const globalSeasonStartDate = world14.getDynamicProperty(SEASON_START_DAY_PROPERTY) ?? currentDay;
        let daysIntoCurrentSeason = currentDay - globalSeasonStartDate;
        if (daysIntoCurrentSeason < 0) {
          daysIntoCurrentSeason = 0;
          world14.setDynamicProperty(SEASON_START_DAY_PROPERTY, currentDay);
        }
        const transitionDurationPerSubStage = getActiveSeasonDuration() / 4;
        let subStageIndex = Math.floor(daysIntoCurrentSeason / transitionDurationPerSubStage);
        subStageIndex = Math.max(0, Math.min(3, subStageIndex));
        const targetMinecraftSeasonStage = globalSeasonIndex * 4 + subStageIndex;
        const targetStage = Math.max(0, Math.min(15, targetMinecraftSeasonStage));
        this.seasonCache = {
          globalSeason,
          globalSeasonStartDate,
          currentDay,
          daysIntoCurrentSeason,
          subStageIndex,
          targetStage,
          timestamp: currentTick
        };
        return this.seasonCache;
      }
      getCurrentTargetStage() {
        return this.getSeasonCalculation().targetStage;
      }
      getCurrentSubStageIndex() {
        return this.getSeasonCalculation().subStageIndex;
      }
      getMetrics() {
        return { ...this.metrics };
      }
      async forceProcessAll() {
        const maxBatchesPerTick = 3;
        while (this.updateQueue.length > 0) {
          for (let b = 0; b < maxBatchesPerTick && this.updateQueue.length > 0; b++) {
            await runJobAsync(this.processBatch());
            this.metrics.totalBatchesProcessed++;
            this.metrics.queueSize = this.updateQueue.length;
          }
          await system13.waitTicks(1);
        }
      }
      clearQueue() {
        this.updateQueue.clear();
        this.metrics.queueSize = 0;
      }
      getConfiguration() {
        return {
          mode: this.performanceMode,
          batchSize: this.BATCH_SIZE,
          maxQueueSize: this.MAX_QUEUE_SIZE,
          cacheDurationTicks: CACHE_DURATION_TICKS,
          playerRadius: this.PLAYER_RADIUS
        };
      }
      getPerformanceMode() {
        return this.performanceMode;
      }
      setPerformanceConfiguration(mode, config) {
        const nextConfig = {
          batchSize: Math.max(20, Math.floor(config.batchSize)),
          maxQueueSize: Math.max(100, Math.floor(config.maxQueueSize)),
          playerRadius: Math.max(16, Math.floor(config.playerRadius))
        };
        this.BATCH_SIZE = nextConfig.batchSize;
        this.MAX_QUEUE_SIZE = nextConfig.maxQueueSize;
        this.PLAYER_RADIUS = nextConfig.playerRadius;
        this.PLAYER_RADIUS_SQUARED = nextConfig.playerRadius * nextConfig.playerRadius;
        this.performanceMode = mode;
        if (this.updateQueue.length > this.MAX_QUEUE_SIZE) {
          this.updateQueue.splice(0, this.updateQueue.length - this.MAX_QUEUE_SIZE);
        }
        this.metrics.queueSize = this.updateQueue.length;
        this.seasonCache = null;
      }
    };
  }
});

// data/scripts/modules/season_system/season_core.ts
import { TicksPerSecond as TicksPerSecond11, system as system14, world as world15 } from "@minecraft/server";
function getCurrentSeason() {
  if (currentSeason) {
    return currentSeason;
  }
  const season = world15.getDynamicProperty("mythicus_sn:current_season");
  if (typeof season === "string") {
    return season;
  }
  setCurrentSeason("spring" /* Spring */);
  return "spring" /* Spring */;
}
function setCurrentSeason(season) {
  currentSeason = season;
  world15.setDynamicProperty("mythicus_sn:current_season", season);
}
function getSeasonIndex(season) {
  switch (season) {
    case "spring" /* Spring */:
      return 0;
    case "summer" /* Summer */:
      return 1;
    case "fall" /* Fall */:
      return 2;
    case "winter" /* Winter */:
      return 3;
    default:
      return 0;
  }
}
function getDaysIntoCurrentSeason() {
  const currentDay = Math.floor(world15.getDay());
  const globalSeasonStartDate = world15.getDynamicProperty(SEASON_START_DAY_PROPERTY) ?? currentDay;
  let days = currentDay - globalSeasonStartDate;
  if (days < 0) days = 0;
  return days;
}
function getNextSeason(current) {
  switch (current) {
    case "spring" /* Spring */:
      return "summer" /* Summer */;
    case "summer" /* Summer */:
      return "fall" /* Fall */;
    case "fall" /* Fall */:
      return "winter" /* Winter */;
    case "winter" /* Winter */:
      return "spring" /* Spring */;
  }
}
async function updateGlobalSeason() {
  let currentGlobalSeason = getCurrentSeason();
  const newGlobalSeason = getNextSeason(currentGlobalSeason);
  setCurrentSeason(newGlobalSeason);
  world15.setDynamicProperty(SEASON_START_DAY_PROPERTY, world15.getDay());
  await seasonUpdateManager.forceProcessAll();
}
function checkSeasonProgress() {
  const currentDay = world15.getDay();
  const globalSeasonStartDate = world15.getDynamicProperty(SEASON_START_DAY_PROPERTY) ?? currentDay;
  if (currentDay >= globalSeasonStartDate + getActiveSeasonDuration()) {
    if (!isUpdatingSeasons) {
      isUpdatingSeasons = true;
      updateGlobalSeason().then(() => {
        isUpdatingSeasons = false;
      });
    }
  }
}
var currentSeason, seasonUpdateManager, isUpdatingSeasons;
var init_season_core = __esm({
  "data/scripts/modules/season_system/season_core.ts"() {
    "use strict";
    init_season_constants();
    init_season_cycle_presets();
    init_season_update_manager();
    seasonUpdateManager = SeasonUpdateManager.getInstance();
    isUpdatingSeasons = false;
    world15.afterEvents.worldLoad.subscribe(() => {
      if (world15.getDynamicProperty(SEASON_START_DAY_PROPERTY) === void 0) {
        world15.setDynamicProperty(SEASON_START_DAY_PROPERTY, world15.getDay());
      }
    });
    system14.beforeEvents.startup.subscribe((initEvent) => {
      initEvent.blockComponentRegistry.registerCustomComponent("mythicus_sn:season_change", {
        onPlace: (event, custom) => {
          const config = custom.params;
          if (config?.has_season_state) {
            seasonUpdateManager.queueBlockUpdate(event.block, true);
          }
        },
        onTick: (event, custom) => {
          const config = custom.params;
          if (config?.has_season_state) {
            seasonUpdateManager.queueBlockUpdate(event.block, false);
          }
        }
      });
    });
    system14.runInterval(checkSeasonProgress, TicksPerSecond11 * 10);
  }
});

// data/scripts/modules/season_system/season_constants.ts
var SEASON_START_DAY_PROPERTY, SEASON_PERFORMANCE_MODE_PROPERTY, SEASON_PERFORMANCE_INITIALIZED_PROPERTY, SEASON_TIME_ADJUSTMENTS;
var init_season_constants = __esm({
  "data/scripts/modules/season_system/season_constants.ts"() {
    "use strict";
    init_season_core();
    SEASON_START_DAY_PROPERTY = "mythicus_sn:season_start_day";
    SEASON_PERFORMANCE_MODE_PROPERTY = "mythicus_sn:season_optimization_mode";
    SEASON_PERFORMANCE_INITIALIZED_PROPERTY = "mythicus_sn:season_optimization_initialized";
    SEASON_TIME_ADJUSTMENTS = {
      ["spring" /* Spring */]: { dayTicks: 0, nightTicks: 0 },
      ["summer" /* Summer */]: { dayTicks: -50, nightTicks: 100 },
      ["fall" /* Fall */]: { dayTicks: 80, nightTicks: -50 },
      ["winter" /* Winter */]: { dayTicks: 150, nightTicks: -100 }
    };
  }
});

// data/scripts/modules/season_system/season_performance_config.ts
import { MemoryTier, system as system15, world as world16 } from "@minecraft/server";
function getPerformanceConfig(mode) {
  return PERFORMANCE_CONFIGS[mode] ?? PERFORMANCE_CONFIGS[DEFAULT_PERFORMANCE_MODE];
}
function isSeasonPerformanceModeValue(value) {
  return value === "low" || value === "medium" || value === "high" || value === "marketing";
}
function getModeForMemoryTier(tier) {
  switch (tier) {
    case MemoryTier.SuperLow:
    case MemoryTier.Low:
    case MemoryTier.Mid:
      return "low";
    case MemoryTier.High:
      return "medium";
    case MemoryTier.SuperHigh:
      return "high";
    default:
      return DEFAULT_PERFORMANCE_MODE;
  }
}
function applyPerformanceMode(mode) {
  const nextConfig = getPerformanceConfig(mode);
  seasonUpdateManager2.setPerformanceConfiguration(mode, nextConfig);
  return mode;
}
function ensureSeasonPerformanceModeInitialized() {
  const stored = world16.getDynamicProperty(SEASON_PERFORMANCE_MODE_PROPERTY);
  let migratedMode = null;
  if (stored === "superLow") {
    migratedMode = "low";
  } else if (stored === "superHigh") {
    migratedMode = "high";
  } else if (isSeasonPerformanceModeValue(stored)) {
    migratedMode = stored;
  }
  const fallback = getPerformanceRecommendationFromServer();
  const activeMode = migratedMode ?? fallback;
  applyPerformanceMode(activeMode);
  world16.setDynamicProperty(SEASON_PERFORMANCE_MODE_PROPERTY, activeMode);
  return activeMode;
}
function getSeasonPerformanceMode() {
  const stored = world16.getDynamicProperty(SEASON_PERFORMANCE_MODE_PROPERTY);
  if (isSeasonPerformanceModeValue(stored)) {
    return stored;
  }
  return seasonUpdateManager2.getPerformanceMode();
}
function getPerformanceModes() {
  return SEASON_PERFORMANCE_MODES;
}
function getAllPerformanceModes() {
  return ALL_SEASON_PERFORMANCE_MODES;
}
function getPerformanceModeTranslationKey(mode) {
  return MODE_TRANSLATIONS[mode] ?? MODE_TRANSLATIONS[DEFAULT_PERFORMANCE_MODE];
}
function getPerformanceModeSummaryKey(mode) {
  return MODE_SUMMARY_TRANSLATIONS[mode] ?? MODE_SUMMARY_TRANSLATIONS[DEFAULT_PERFORMANCE_MODE];
}
function getPerformanceRecommendationFromServer() {
  return getModeForMemoryTier(system15.serverSystemInfo?.memoryTier ?? 0);
}
function getPerformanceRecommendationForPlayer(player) {
  return getModeForMemoryTier(player.clientSystemInfo?.memoryTier ?? 0);
}
function setSeasonPerformanceMode(mode, options = {}) {
  const { announce = false, changedBy } = options;
  const previousMode = seasonUpdateManager2.getPerformanceMode();
  const stored = world16.getDynamicProperty(SEASON_PERFORMANCE_MODE_PROPERTY);
  if (previousMode === mode && isSeasonPerformanceModeValue(stored) && stored === mode) {
    return previousMode;
  }
  const appliedMode = applyPerformanceMode(mode);
  world16.setDynamicProperty(SEASON_PERFORMANCE_MODE_PROPERTY, appliedMode);
  if (announce) {
    const translationKey = getPerformanceModeTranslationKey(appliedMode);
    let message;
    if (changedBy) {
      const actorName = typeof changedBy === "string" ? changedBy : changedBy.name;
      message = {
        rawtext: [
          { translate: "ui.mythicus_sn.category.performance" },
          { text: " " },
          { translate: "chat.mythicus_sn.performance_mode_set_by" },
          { text: " " },
          { text: actorName },
          { text: ": " },
          { translate: translationKey }
        ]
      };
    } else {
      message = {
        rawtext: [
          { translate: "ui.mythicus_sn.category.performance" },
          { text: " " },
          { translate: "chat.mythicus_sn.performance_mode_set" },
          { text: " " },
          { translate: translationKey }
        ]
      };
    }
    world16.sendMessage(message);
  }
  return appliedMode;
}
var seasonUpdateManager2, DEFAULT_PERFORMANCE_MODE, SEASON_PERFORMANCE_MODES, ALL_SEASON_PERFORMANCE_MODES, PERFORMANCE_CONFIGS, MODE_TRANSLATIONS, MODE_SUMMARY_TRANSLATIONS;
var init_season_performance_config = __esm({
  "data/scripts/modules/season_system/season_performance_config.ts"() {
    "use strict";
    init_season_constants();
    init_season_update_manager();
    seasonUpdateManager2 = SeasonUpdateManager.getInstance();
    DEFAULT_PERFORMANCE_MODE = "low";
    SEASON_PERFORMANCE_MODES = ["low", "medium", "high"];
    ALL_SEASON_PERFORMANCE_MODES = ["low", "medium", "high", "marketing"];
    PERFORMANCE_CONFIGS = {
      low: { batchSize: 50, maxQueueSize: 200, playerRadius: 80 },
      medium: { batchSize: 80, maxQueueSize: 400, playerRadius: 100 },
      high: { batchSize: 100, maxQueueSize: 500, playerRadius: 150 },
      marketing: { batchSize: 5e3, maxQueueSize: 25e3, playerRadius: 150 }
    };
    MODE_TRANSLATIONS = {
      low: "ui.mythicus_sn.performance_mode.label.low",
      medium: "ui.mythicus_sn.performance_mode.label.medium",
      high: "ui.mythicus_sn.performance_mode.label.high",
      marketing: "ui.mythicus_sn.performance_mode.label.marketing"
    };
    MODE_SUMMARY_TRANSLATIONS = {
      low: "ui.mythicus_sn.performance_mode.summary.low",
      medium: "ui.mythicus_sn.performance_mode.summary.medium",
      high: "ui.mythicus_sn.performance_mode.summary.high",
      marketing: "ui.mythicus_sn.performance_mode.summary.marketing"
    };
    world16.afterEvents.worldLoad.subscribe(() => {
      if (world16.getDynamicProperty(SEASON_PERFORMANCE_INITIALIZED_PROPERTY) === void 0) {
        world16.setDynamicProperty(SEASON_PERFORMANCE_INITIALIZED_PROPERTY, false);
      }
      ensureSeasonPerformanceModeInitialized();
    });
    world16.afterEvents.playerSpawn.subscribe((event) => {
      const { player, initialSpawn } = event;
      if (!initialSpawn) {
        return;
      }
      const alreadyInitialized = world16.getDynamicProperty(SEASON_PERFORMANCE_INITIALIZED_PROPERTY);
      if (alreadyInitialized === true) {
        return;
      }
      const recommendedMode = getPerformanceRecommendationForPlayer(player);
      setSeasonPerformanceMode(recommendedMode, { announce: true, changedBy: player });
      world16.setDynamicProperty(SEASON_PERFORMANCE_INITIALIZED_PROPERTY, true);
    });
  }
});

// data/scripts/modules/season_system/season_performance_mode.ts
import { ActionFormData as ActionFormData4, MessageFormData as MessageFormData2 } from "@minecraft/server-ui";
async function showPerformanceGuide(player) {
  if (!isOperator(player)) {
    player.sendMessage({ translate: "chat.mythicus_sn.performance_mode_denied" });
    return;
  }
  const modes = getPerformanceModes();
  if (!player?.isValid) return;
  while (true) {
    if (!player?.isValid) return;
    const currentMode = getSeasonPerformanceMode();
    const playerRecommendation = getPerformanceRecommendationForPlayer(player);
    const serverRecommendation = getPerformanceRecommendationFromServer();
    const form = new ActionFormData4().title({ translate: "ui.mythicus_sn.performance_mode.title" }).body({
      rawtext: [
        { translate: "ui.mythicus_sn.performance_mode.description" },
        { text: "\n\n" },
        { translate: "ui.mythicus_sn.performance_mode.current" },
        { text: " " },
        { translate: getPerformanceModeTranslationKey(currentMode) },
        { text: "\n" },
        { translate: "ui.mythicus_sn.performance_mode.recommendation.player" },
        { text: " " },
        { translate: getPerformanceModeTranslationKey(playerRecommendation) },
        { text: "\n" },
        { translate: "ui.mythicus_sn.performance_mode.recommendation.server" },
        { text: " " },
        { translate: getPerformanceModeTranslationKey(serverRecommendation) }
      ]
    });
    modes.forEach((mode) => {
      form.button({ translate: MODE_BUTTON_TRANSLATIONS[mode] });
    });
    const backButtonIndex = modes.length;
    form.button({ translate: "ui.mythicus_sn.button.back" }, "textures/mythicus/sn/ui/back");
    const response = await form.show(player);
    if (response.canceled || response.selection === void 0) {
      return;
    }
    if (response.selection === backButtonIndex) {
      const { showToggleListForm: showToggleListForm2 } = await Promise.resolve().then(() => (init_guidebook(), guidebook_exports));
      await showToggleListForm2(player);
      return;
    }
    const selectedMode = modes[response.selection];
    if (!selectedMode) {
      continue;
    }
    const confirmationResult = await confirmPerformanceChange(player, selectedMode);
    if (confirmationResult === "confirmed") {
      if (selectedMode === currentMode) {
        player.sendMessage({ translate: "chat.mythicus_sn.performance_mode_same" });
        continue;
      }
      setSeasonPerformanceMode(selectedMode, { announce: true, changedBy: player });
      return;
    }
    if (confirmationResult === "retry") {
      continue;
    }
    return;
  }
}
async function confirmPerformanceChange(player, mode) {
  const confirmForm = new MessageFormData2().title({ translate: "ui.mythicus_sn.performance_mode.confirm.title" }).body({
    rawtext: [
      { translate: "ui.mythicus_sn.performance_mode.confirm.intro" },
      { text: "\n\n" },
      { translate: getPerformanceModeTranslationKey(mode) },
      { text: "\n" },
      { translate: getPerformanceModeSummaryKey(mode) }
    ]
  }).button1({ translate: "ui.mythicus_sn.performance_mode.confirm.yes" }).button2({ translate: "ui.mythicus_sn.performance_mode.confirm.no" });
  if (!player?.isValid) return "cancelled";
  const response = await confirmForm.show(player);
  if (response.canceled || response.selection === void 0) {
    return "cancelled";
  }
  if (response.selection === 0) {
    return "confirmed";
  }
  return "retry";
}
async function showDevPerformanceGuide(player) {
  if (!isOperator(player)) {
    player.sendMessage({ translate: "chat.mythicus_sn.performance_mode_denied" });
    return;
  }
  const modes = getAllPerformanceModes();
  if (!player?.isValid) return;
  while (true) {
    if (!player?.isValid) return;
    const currentMode = getSeasonPerformanceMode();
    const playerRecommendation = getPerformanceRecommendationForPlayer(player);
    const serverRecommendation = getPerformanceRecommendationFromServer();
    const form = new ActionFormData4().title({ translate: "ui.mythicus_sn.dev_performance_mode.title" }).body({
      rawtext: [
        { translate: "ui.mythicus_sn.dev_performance_mode.description" },
        { text: "\n\n" },
        { translate: "ui.mythicus_sn.performance_mode.current" },
        { text: " " },
        { translate: getPerformanceModeTranslationKey(currentMode) },
        { text: "\n" },
        { translate: "ui.mythicus_sn.performance_mode.recommendation.player" },
        { text: " " },
        { translate: getPerformanceModeTranslationKey(playerRecommendation) },
        { text: "\n" },
        { translate: "ui.mythicus_sn.performance_mode.recommendation.server" },
        { text: " " },
        { translate: getPerformanceModeTranslationKey(serverRecommendation) }
      ]
    });
    modes.forEach((mode) => {
      form.button({ translate: MODE_BUTTON_TRANSLATIONS[mode] });
    });
    const backButtonIndex = modes.length;
    form.button({ translate: "ui.mythicus_sn.button.back" }, "textures/mythicus/sn/ui/back");
    const response = await form.show(player);
    if (response.canceled || response.selection === void 0) {
      return;
    }
    if (response.selection === backButtonIndex) {
      const { showToggleListForm: showToggleListForm2 } = await Promise.resolve().then(() => (init_guidebook(), guidebook_exports));
      await showToggleListForm2(player);
      return;
    }
    const selectedMode = modes[response.selection];
    if (!selectedMode) {
      continue;
    }
    const confirmationResult = await confirmPerformanceChange(player, selectedMode);
    if (confirmationResult === "confirmed") {
      if (selectedMode === currentMode) {
        player.sendMessage({ translate: "chat.mythicus_sn.performance_mode_same" });
        continue;
      }
      setSeasonPerformanceMode(selectedMode, { announce: true, changedBy: player });
      return;
    }
    if (confirmationResult === "retry") {
      continue;
    }
    return;
  }
}
var MODE_BUTTON_TRANSLATIONS;
var init_season_performance_mode = __esm({
  "data/scripts/modules/season_system/season_performance_mode.ts"() {
    "use strict";
    init_permissions();
    init_season_performance_config();
    MODE_BUTTON_TRANSLATIONS = {
      low: "ui.mythicus_sn.performance_mode.button.low",
      medium: "ui.mythicus_sn.performance_mode.button.medium",
      high: "ui.mythicus_sn.performance_mode.button.high",
      marketing: "ui.mythicus_sn.performance_mode.button.marketing"
    };
  }
});

// data/scripts/modules/season_system/index.ts
import { Player as Player16, system as system16 } from "@minecraft/server";
var init_season_system = __esm({
  "data/scripts/modules/season_system/index.ts"() {
    "use strict";
    init_season_constants();
    init_season_cycle_presets();
    init_season_performance_config();
    init_season_performance_mode();
    init_season_update_manager();
    init_season_performance_mode();
    system16.afterEvents.scriptEventReceive.subscribe((event) => {
      if (event.id !== "mythicus_sn:season_system") return;
      const message = event.message.trim();
      const sourceEntity = event.sourceEntity;
      if (!sourceEntity || !(sourceEntity instanceof Player16)) return;
      if (message === "dev_config") {
        showDevPerformanceGuide(sourceEntity);
      }
    });
  }
});

// data/scripts/modules/lens_flare.ts
init_lib();
init_lib2();
init_dimension();
import { TicksPerSecond, system as system3, world as world3 } from "@minecraft/server";

// data/scripts/lib/linear_map.ts
var LinearMap = class {
  #points;
  constructor(points) {
    this.#points = new Map(points);
  }
  get(input) {
    const sign = Math.sign(input);
    input = Math.abs(input);
    let lowerKey;
    let upperKey;
    for (const key of this.#points.keys()) {
      if (key <= input) {
        lowerKey = key;
      }
      if (key > input && upperKey === void 0) {
        upperKey = key;
        break;
      }
    }
    if (lowerKey === void 0 || upperKey === void 0) {
      return 0;
    }
    const lowerVal = this.#points.get(lowerKey);
    const upperVal = this.#points.get(upperKey);
    const interpolated = lowerVal + (input - lowerKey) * (upperVal - lowerVal) / (upperKey - lowerKey);
    return sign * interpolated;
  }
};

// data/scripts/modules/lens_flare.ts
var LENS_FLARE_ENTITY_ID = "mythicus_sn:lens_flare";
var LENS_FLARE_INTERVAL_TICKS = 0.15 * TicksPerSecond;
var lensFlareEntities = /* @__PURE__ */ new Map();
function getFlareKey(player, phase) {
  return `${player.id}:${phase}`;
}
function removeLensFlare(key) {
  const entity = lensFlareEntities.get(key);
  if (entity && entity.isValid) {
    entity.remove();
  }
  lensFlareEntities.delete(key);
}
var sunPositionMap = new LinearMap([
  [0, 0],
  [1e3, 650],
  [2e3, 1450],
  [3e3, 2300],
  [4e3, 3200],
  [5e3, 4150],
  [6e3, 5150],
  [7e3, 6200]
]);
var moonPositionMap = new LinearMap([
  [0, 0],
  [1e3, 1150],
  [2e3, 2350],
  [3e3, 3525],
  [4e3, 4675],
  [5e3, 5775],
  [6e3, 6850]
]);
function getSunDirection(timeOfDay) {
  const time = (timeOfDay + 6e3) % 24e3 - 12e3;
  if (Math.abs(time) > 7e3) {
    return;
  }
  const angle = sunPositionMap.get(time) / 12e3 * Math.PI;
  return new Vector3Builder({ x: -Math.sin(angle), y: Math.cos(angle), z: 0 });
}
function getMoonDirection(timeOfDay) {
  const time = (timeOfDay + 18e3) % 24e3 - 12e3;
  if (Math.abs(time) > 6e3) {
    return;
  }
  const angle = moonPositionMap.get(time) / 12e3 * Math.PI;
  return new Vector3Builder({ x: -Math.sin(angle), y: Math.cos(angle), z: 0 });
}
function spawnOrUpdateLensFlare(player, direction, key, phase) {
  const overworld = getDimension(MinecraftDimensionTypes.Overworld);
  const lens_enabled = player.getDynamicProperty("mythicus_sn:lens_enabled");
  if (!overworld || !lens_enabled) {
    removeLensFlare(key);
    return;
  }
  if (direction.dot(player.getViewDirection()) <= 0.6) {
    removeLensFlare(key);
    return;
  }
  const hit = overworld.getBlockFromRay(player.getHeadLocation(), direction, {
    maxDistance: 1e3,
    includeLiquidBlocks: true,
    includePassableBlocks: false
  });
  if (hit) {
    removeLensFlare(key);
    return;
  }
  const location = direction.scale(64).add(player.getHeadLocation());
  const blockLocation = {
    x: Math.floor(location.x),
    y: Math.floor(location.y),
    z: Math.floor(location.z)
  };
  if (!overworld.isChunkLoaded(blockLocation)) {
    removeLensFlare(key);
    return;
  }
  const existing = lensFlareEntities.get(key);
  if (existing && existing.isValid) {
    existing.teleport(location, { dimension: overworld, keepVelocity: false });
    existing.setProperty("mythicus_sn:is_sun", phase == "sun" ? true : false);
    return;
  }
  let entity;
  entity = overworld.spawnEntity(LENS_FLARE_ENTITY_ID, location);
  if (entity) {
    lensFlareEntities.set(key, entity);
    entity.setProperty("mythicus_sn:is_sun", phase == "sun" ? true : false);
  }
}
system3.runInterval(() => {
  const overworld = getDimension(MinecraftDimensionTypes.Overworld);
  const activeKeys = /* @__PURE__ */ new Set();
  const timeOfDay = world3.getTimeOfDay();
  const sunDirection = getSunDirection(timeOfDay);
  const moonDirection = getMoonDirection(timeOfDay);
  for (const player of overworld.getPlayers()) {
    if (sunDirection) {
      const key = getFlareKey(player, "sun");
      spawnOrUpdateLensFlare(player, sunDirection, key, "sun");
      activeKeys.add(key);
    }
    if (moonDirection) {
      const key = getFlareKey(player, "moon");
      spawnOrUpdateLensFlare(player, moonDirection, key, "moon");
      activeKeys.add(key);
    }
  }
  for (const [key] of lensFlareEntities) {
    if (!activeKeys.has(key)) {
      removeLensFlare(key);
    }
  }
}, LENS_FLARE_INTERVAL_TICKS);

// data/scripts/modules/leaf_decay.ts
init_lib2();
import { ItemStack, system as system4 } from "@minecraft/server";
var saplingBlocks = [
  "mythicus_sn:orange_leaves_oak",
  "mythicus_sn:red_leaves_oak",
  "mythicus_sn:yellow_leaves_oak",
  "mythicus_sn:leaves_spruce",
  "mythicus_sn:leaves_birch",
  "mythicus_sn:dark_oak_leaves",
  "mythicus_sn:cherry_leaves"
];
var saplingDrop = [
  "mythicus_sn:sapling_oak",
  "mythicus_sn:sapling_oak",
  "mythicus_sn:sapling_oak",
  "mythicus_sn:sapling_spruce",
  "mythicus_sn:sapling_birch",
  "mythicus_sn:sapling_dark_oak",
  "mythicus_sn:sapling_cherry"
];
var leafFirstSeenTime = /* @__PURE__ */ new Map();
var GRACE_PERIOD_TICKS = 60;
system4.beforeEvents.startup.subscribe((e) => {
  e.blockComponentRegistry.registerCustomComponent("mythicus_sn:decay", {
    onRandomTick: leafRandomTick
  });
});
function leafRandomTick(eventData) {
  const block = eventData.block;
  const locationKey = `${block.x},${block.y},${block.z}`;
  if (!leafFirstSeenTime.has(locationKey)) {
    leafFirstSeenTime.set(locationKey, system4.currentTick);
    return;
  }
  const firstSeenTick = leafFirstSeenTime.get(locationKey);
  const ticksElapsed = system4.currentTick - firstSeenTick;
  if (ticksElapsed < GRACE_PERIOD_TICKS) {
    return;
  }
  if (shouldDestroy(block)) {
    if (Math.random() < 0.05) {
      const blockIndex = saplingBlocks.indexOf(block.typeId);
      if (blockIndex !== -1) {
        system4.run(() => {
          const dropItem = new ItemStack(saplingDrop[blockIndex], 1);
          block.dimension.spawnItem(dropItem, block);
        });
      }
    }
    block.setType(MinecraftBlockTypes.Air);
    leafFirstSeenTime.delete(locationKey);
  }
}
function shouldDestroy(block, depth = 0) {
  const handPlaced = getCustomState(block, "mythicus_sn:hand_placed");
  if (Boolean(handPlaced)) return false;
  const parentDirection = getCustomState(block, "mythicus_sn:parent_block");
  if (!parentDirection) return false;
  if (parentDirection == "c") return false;
  let parent = getParent(block);
  if (!parent) return false;
  if (!parent?.isValid) return false;
  if (depth > 10) return true;
  if (!isLog(parent) && !isLeaf(parent)) {
    return true;
  }
  return shouldDestroy(parent, depth + 1);
}
function getParent(block) {
  if (!isLeaf(block)) return null;
  if (!block?.isValid) return null;
  const parentDirection = getCustomState(block, "mythicus_sn:parent_block");
  switch (parentDirection) {
    case "a":
      return block.above();
    case "b":
      return block.below();
    case "n":
      return block.north();
    case "s":
      return block.south();
    case "w":
      return block.west();
    case "e":
      return block.east();
    default:
      return null;
  }
}
function isLog(block) {
  return block && (block.hasTag("log") || block.hasTag("minecraft:logs") || block.typeId.includes("_log") || block.typeId.includes("_wood")) && block.typeId.startsWith("minecraft");
}
function isLeaf(block) {
  return block && block.hasTag("leaves") && block.typeId.startsWith("mythicus");
}
function getCustomState(block, stateId) {
  return block.permutation.getState(stateId);
}

// data/scripts/main.ts
init_season_system();

// data/scripts/modules/sweetberry_growth.ts
import { EntityComponentTypes as EntityComponentTypes4, EquipmentSlot as EquipmentSlot3, GameMode, ItemStack as ItemStack3, system as system17, world as world17 } from "@minecraft/server";
var BONE_MEAL_GROWTH_AMOUNT = 1;
var MAX_GROWTH_STAGE = 3;
var HARVESTABLE_STAGE = 2;
var lastGrowthDayByBlock = /* @__PURE__ */ new Map();
function getBlockKey(block) {
  const { x, y, z } = block;
  return `${block.dimension.id}:${x},${y},${z}`;
}
function getLastGrowthDay(block) {
  return lastGrowthDayByBlock.get(getBlockKey(block));
}
function setLastGrowthDay(block, day = world17.getDay()) {
  lastGrowthDayByBlock.set(getBlockKey(block), day);
}
function clearLastGrowthDay(block) {
  lastGrowthDayByBlock.delete(getBlockKey(block));
}
function growSweetberry(block, stages = 1) {
  const permutation = block.permutation;
  const currentStage = Number(permutation.getState("mythicus_sn:grow_stage"));
  const newStage = Math.min(currentStage + stages, MAX_GROWTH_STAGE);
  if (newStage !== currentStage) {
    const newPermutation = permutation.withState("mythicus_sn:grow_stage", newStage);
    block.setPermutation(newPermutation);
    setLastGrowthDay(block);
  }
}
function dropSweetberries(block, count) {
  if (count <= 0) return;
  const location = {
    x: block.x + 0.5,
    y: block.y + 0.5,
    z: block.z + 0.5
  };
  const itemStack = new ItemStack3("minecraft:sweet_berries", count);
  block.dimension.spawnItem(itemStack, location);
}
function harvestBerries(block) {
  const permutation = block.permutation;
  const currentStage = Number(permutation.getState("mythicus_sn:grow_stage"));
  if (currentStage === HARVESTABLE_STAGE) {
    return 1 + Math.floor(Math.random() * 2);
  } else if (currentStage === MAX_GROWTH_STAGE) {
    return 2 + Math.floor(Math.random() * 2);
  }
  return 0;
}
var SweetberryGrowableComponent = {
  onPlace({ block }) {
    setLastGrowthDay(block);
  },
  onPlayerBreak({ block }) {
    clearLastGrowthDay(block);
  },
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const permutation = block.permutation;
    const currentStage = Number(permutation.getState("mythicus_sn:grow_stage"));
    const equippable = player.getComponent(EntityComponentTypes4.Equippable);
    if (!equippable) return;
    const mainhand = equippable.getEquipmentSlot(EquipmentSlot3.Mainhand);
    if (mainhand.hasItem() && mainhand.typeId === "minecraft:bone_meal") {
      if (currentStage < MAX_GROWTH_STAGE) {
        growSweetberry(block, BONE_MEAL_GROWTH_AMOUNT);
        if (player.getGameMode() !== GameMode.Creative) {
          if (mainhand.amount > 1) {
            mainhand.amount--;
          } else {
            mainhand.setItem(void 0);
          }
        }
        const effectLocation = {
          x: block.x + 0.5,
          y: block.y + 0.5,
          z: block.z + 0.5
        };
        block.dimension.playSound("item.bone_meal.use", effectLocation);
        block.dimension.spawnParticle("minecraft:crop_growth_emitter", effectLocation);
        for (let i = 0; i < 15; i++) {
          block.dimension.spawnParticle("minecraft:bone_meal_particles", {
            x: block.x + Math.random(),
            y: block.y + Math.random() * 0.5,
            z: block.z + Math.random()
          });
        }
      }
    } else {
      if (currentStage >= HARVESTABLE_STAGE) {
        const berryCount = harvestBerries(block);
        if (berryCount > 0) {
          dropSweetberries(block, berryCount);
          const newPermutation = permutation.withState("mythicus_sn:grow_stage", 1);
          block.setPermutation(newPermutation);
          setLastGrowthDay(block);
          block.dimension.playSound("block.sweet_berry_bush.pick_berries", {
            x: block.x + 0.5,
            y: block.y + 0.5,
            z: block.z + 0.5
          });
        }
      }
    }
  },
  onTick({ block }) {
    updateSweetberryGrowth(block);
  }
};
function updateSweetberryGrowth(block) {
  const currentDay = world17.getDay();
  const lastGrowthDay = getLastGrowthDay(block);
  if (lastGrowthDay === void 0) {
    setLastGrowthDay(block, currentDay);
    return;
  }
  const permutation = block.permutation;
  const currentStage = Number(permutation.getState("mythicus_sn:grow_stage"));
  if (currentStage >= MAX_GROWTH_STAGE) {
    if (lastGrowthDay !== currentDay) {
      setLastGrowthDay(block, currentDay);
    }
    return;
  }
  const daysElapsed = currentDay - lastGrowthDay;
  if (daysElapsed <= 0) return;
  const stagesToGrow = Math.min(daysElapsed, MAX_GROWTH_STAGE - currentStage);
  if (stagesToGrow <= 0) {
    setLastGrowthDay(block, currentDay);
    return;
  }
  growSweetberry(block, stagesToGrow);
}
system17.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("mythicus_sn:sweetberry_growable", SweetberryGrowableComponent);
});

// data/scripts/modules/leaves_pile_growth.ts
import {
  EntityComponentTypes as EntityComponentTypes5,
  EquipmentSlot as EquipmentSlot4,
  GameMode as GameMode2,
  MolangVariableMap as MolangVariableMap4,
  system as system18
} from "@minecraft/server";
var PILE_GROWTH_COMPONENT_ID = "mythicus_sn:pile_growth";
var PILE_STAGE_STATE = "mythicus_sn:pile_stage";
var PILE_STAGE_KEY = PILE_STAGE_STATE;
var SEASON_STAGE_STATE2 = "mythicus_sn:season_stage";
var SEASON_STAGE_KEY2 = SEASON_STAGE_STATE2;
var MAX_PILE_STAGE = 4;
var LEAF_PARTICLE_MAP = {
  "mythicus_sn:red_piles_of_leaves": "mythicus_sn:red_leaves",
  "mythicus_sn:orange_piles_of_leaves": "mythicus_sn:orange_leaves",
  "mythicus_sn:yellow_piles_of_leaves": "mythicus_sn:yellow_leaves"
};
var lastStepTick = /* @__PURE__ */ new Map();
function getBlockKey2(x, y, z) {
  return `${x},${y},${z}`;
}
function getPileStage(permutation) {
  const states = permutation.getAllStates();
  if (!Object.prototype.hasOwnProperty.call(states, PILE_STAGE_STATE)) {
    return void 0;
  }
  const value = states[PILE_STAGE_KEY];
  return typeof value === "number" ? value : void 0;
}
function setPileStage(block, permutation, stage) {
  const clampedStage = Math.max(0, Math.min(stage, MAX_PILE_STAGE));
  const updated = permutation.withState(PILE_STAGE_KEY, clampedStage);
  block.setPermutation(updated);
}
function createLeafExplosion(block) {
  const dimension = block.dimension;
  dimension.playSound("dig.grass", block, { pitch: 1.2, volume: 1.5 });
  const seasonStage = block.permutation.getState(SEASON_STAGE_KEY2);
  const molangMap = new MolangVariableMap4();
  molangMap.setVector3("data", { x: seasonStage, y: 0, z: 0 });
  for (let i = 0; i < 2; i++) {
    const offsetX = (Math.random() - 0.5) * 0.5;
    const offsetY = 0;
    const offsetZ = (Math.random() - 0.5) * 0.5;
    const particleId = LEAF_PARTICLE_MAP[block.typeId];
    if (!particleId) return;
    dimension.spawnParticle(particleId, {
      x: block.x + offsetX,
      y: block.y + 0.25 + offsetY,
      z: block.z + offsetZ
    }, molangMap);
  }
}
function handleEntityFallOn(event) {
  const { entity, block } = event;
  if (!entity || entity.typeId !== "minecraft:player") {
    return;
  }
  if (!block || block.isAir || block.typeId.indexOf("piles_of_leaves") === -1) {
    return;
  }
  const blockKey = getBlockKey2(block.x, block.y, block.z);
  const currentTick = system18.currentTick;
  const permutation = block.permutation;
  if (!permutation) {
    return;
  }
  const pileStage = getPileStage(permutation);
  if (pileStage === void 0) {
    return;
  }
  lastStepTick.set(blockKey, currentTick);
  createLeafExplosion(block);
  if (pileStage === 0) {
    block.setType("minecraft:air");
    lastStepTick.delete(blockKey);
  } else {
    const newStage = pileStage - 1;
    setPileStage(block, permutation, newStage);
  }
}
system18.beforeEvents.startup.subscribe((startupEvent) => {
  startupEvent.blockComponentRegistry.registerCustomComponent(PILE_GROWTH_COMPONENT_ID, {
    onPlace(event) {
      const block = event.block;
      if (block.isAir) {
        return;
      }
      const permutation = block.permutation;
      if (!permutation) {
        return;
      }
      setPileStage(block, permutation, 0);
    },
    onEntityFallOn(event) {
      handleEntityFallOn(event);
    },
    onPlayerInteract(event) {
      const { block, player } = event;
      if (!player || block.isAir) {
        return;
      }
      const equippable = player.getComponent(EntityComponentTypes5.Equippable);
      if (!equippable) {
        return;
      }
      const heldItem = equippable.getEquipment(EquipmentSlot4.Mainhand);
      if (!heldItem || heldItem.typeId !== block.typeId) {
        return;
      }
      const permutation = block.permutation;
      if (!permutation) {
        return;
      }
      const currentStage = getPileStage(permutation);
      if (currentStage === void 0 || currentStage >= MAX_PILE_STAGE) {
        return;
      }
      setPileStage(block, permutation, currentStage + 1);
      block.dimension.playSound("dig.grass", block, { pitch: 1, volume: 1 });
      if (player.getGameMode() !== GameMode2.Creative) {
        if (heldItem.amount > 1) {
          heldItem.amount -= 1;
          equippable.setEquipment(EquipmentSlot4.Mainhand, heldItem);
        } else {
          equippable.setEquipment(EquipmentSlot4.Mainhand, void 0);
        }
      }
    }
  });
});

// data/scripts/modules/crops_growth.ts
init_lib2();
init_dist();
init_particles();
import {
  EntityComponentTypes as EntityComponentTypes7,
  EquipmentSlot as EquipmentSlot5,
  GameMode as GameMode3,
  ItemComponentTypes,
  ItemStack as ItemStack5,
  TicksPerDay,
  TicksPerSecond as TicksPerSecond12,
  system as system20,
  world as world18
} from "@minecraft/server";

// data/scripts/modules/lore/lore.ts
init_players();
import { EntityComponentTypes as EntityComponentTypes6, ItemStack as ItemStack4, system as system19 } from "@minecraft/server";

// data/scripts/modules/lore/configs/armor.ts
var ARMOR_CONFIG = {
  // Spring Armor
  "mythicus_sn:spring_n_helmet": { lore: [""] },
  "mythicus_sn:spring_n_chestplate": { lore: [""] },
  "mythicus_sn:spring_n_leggings": { lore: [""] },
  "mythicus_sn:spring_n_boots": { lore: [""] },
  // Summer Armor
  "mythicus_sn:summer_n_helmet": { lore: [""] },
  "mythicus_sn:summer_n_chestplate": { lore: [""] },
  "mythicus_sn:summer_n_leggings": { lore: [""] },
  "mythicus_sn:summer_n_boots": { lore: [""] },
  // Fall Armor
  "mythicus_sn:fall_n_helmet": { lore: [""] },
  "mythicus_sn:fall_n_chestplate": { lore: [""] },
  "mythicus_sn:fall_n_leggings": { lore: [""] },
  "mythicus_sn:fall_n_boots": { lore: [""] },
  // Winter Armor
  "mythicus_sn:winter_n_helmet": { lore: [""] },
  "mythicus_sn:winter_n_chestplate": { lore: [""] },
  "mythicus_sn:winter_n_leggings": { lore: [""] },
  "mythicus_sn:winter_n_boots": { lore: [""] }
};

// data/scripts/modules/lore/configs/food.ts
var FOOD_CONFIG = {
  // Fresh Crops
  "mythicus_sn:beet": {
    lore: ["\xA7r\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Keg"]
  },
  "mythicus_sn:blueberry": {
    lore: ["\xA7r\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Keg"]
  },
  "mythicus_sn:broccoli": {
    lore: ["\xA7r\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Mortal & Pestle"]
  },
  "mythicus_sn:cauliflower": {
    lore: ["\xA7r\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA775 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Mortal & Pestle"]
  },
  "mythicus_sn:corn": {
    lore: ["\xA7r\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Mortal & Pestle"]
  },
  "mythicus_sn:cranberry": {
    lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA775 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Keg"]
  },
  "mythicus_sn:eggplant": {
    lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA774 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- ehydrator", " \xA7r\xA77- Mortal & Pestle"]
  },
  "mythicus_sn:garlic": {
    lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7710 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Mortal & Pestle"]
  },
  "mythicus_sn:green_bean": {
    lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Mortal & Pestle"]
  },
  "mythicus_sn:hot_pepper": {
    lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA772 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Mortal & Pestle"]
  },
  "mythicus_sn:strawberry": {
    lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Keg"]
  },
  "mythicus_sn:tomatoes": {
    lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Preserves Jar", " \xA7r\xA77- Dehydrator", " \xA7r\xA77- Keg"]
  },
  // Dairy Products
  "mythicus_sn:bottle_of_milk": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Cheese Press"] },
  "mythicus_sn:cheese": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  "mythicus_sn:mayonnaise": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  // Dried Crops
  "mythicus_sn:dried_beet": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA772 Polished Emeralds"] },
  "mythicus_sn:dried_blueberry": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA772 Polished Emeralds"] },
  "mythicus_sn:dried_broccoli": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA776 Polished Emeralds"] },
  "mythicus_sn:dried_cauliflower": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7710 Polished Emeralds"] },
  "mythicus_sn:dried_corn": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA776 Polished Emeralds"] },
  "mythicus_sn:dried_cranberry": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7710 Polished Emeralds"] },
  "mythicus_sn:dried_eggplant": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA778 Polished Emeralds"] },
  "mythicus_sn:dried_garlic": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7720 Polished Emeralds"] },
  "mythicus_sn:dried_green_beans": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA776 Polished Emeralds"] },
  "mythicus_sn:dried_hot_peppers": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA774 Polished Emeralds"] },
  "mythicus_sn:dried_strawberry": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  "mythicus_sn:dried_tomato": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA772 Polished Emeralds"] },
  // Flour
  "mythicus_sn:cauliflower_flour": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA778 Polished Emeralds"] },
  "mythicus_sn:corn_flour": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA775 Polished Emeralds"] },
  // Jam
  "mythicus_sn:blueberry_jam": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  "mythicus_sn:cranberry_jam": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7715 Polished Emeralds"] },
  "mythicus_sn:strawberry_jam": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  // Juice
  "mythicus_sn:beet_juice": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA774 Polished Emeralds"] },
  "mythicus_sn:blueberry_juice": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA774 Polished Emeralds"] },
  "mythicus_sn:cranberry_juice": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7720 Polished Emeralds"] },
  "mythicus_sn:strawberry_juice": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA774 Polished Emeralds"] },
  "mythicus_sn:tomato_juice": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA775 Polished Emeralds"] },
  // Paste
  "mythicus_sn:broccoli_paste": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA775 Polished Emeralds"] },
  "mythicus_sn:eggplant_paste": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA776 Polished Emeralds"] },
  "mythicus_sn:green_beans_paste": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA775 Polished Emeralds"] },
  "mythicus_sn:hot_pepper_paste": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  // Pickled
  "mythicus_sn:pickled_beet": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  "mythicus_sn:pickled_broccoli": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA779 Polished Emeralds"] },
  "mythicus_sn:pickled_cauliflower": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7715 Polished Emeralds"] },
  "mythicus_sn:pickled_corn": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA779 Polished Emeralds"] },
  "mythicus_sn:pickled_eggplant": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7712 Polished Emeralds"] },
  "mythicus_sn:pickled_garlic": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7730 Polished Emeralds"] },
  "mythicus_sn:pickled_green_beans": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA779 Polished Emeralds"] },
  "mythicus_sn:pickled_hot_peppers": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA776 Polished Emeralds"] },
  "mythicus_sn:pickled_tomato": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA774 Polished Emeralds"] },
  // Powder
  "mythicus_sn:garlic_powder": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA7715 Polished Emeralds"] }
};

// data/scripts/modules/lore/configs/misc.ts
var MISC_CONFIG = {
  // Skill Points
  "mythicus_sn:skill_point": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Hold interact to gain +1 Skill point."] },
  "mythicus_sn:advance_skill_point": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Hold interact to gain +1 Advance Skill point."] },
  "mythicus_sn:master_skill_point": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Hold interact to gain +1 Master Skill point."] },
  // Seasonal Tools
  "mythicus_sn:season_clock": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Tracks the seasons."] },
  "mythicus_sn:thermometer": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Measures temperature when held in the main or off-hand."] },
  "mythicus_sn:season_calendar": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Interact to display the season calendar."] },
  "mythicus_sn:season_guidebook": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Interact to open the guidebook."] },
  // Materials
  "mythicus_sn:thick_pelt": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds"] },
  "mythicus_sn:polished_emerald": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Can be used for trading and crafting emeralds"] },
  "mythicus_sn:quality_honey": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds"] },
  "mythicus_sn:fabric": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA772 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Loom "] },
  "mythicus_sn:cloth": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Loom "] },
  "mythicus_sn:carpet": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA775 Polished Emeralds"] },
  "mythicus_sn:quality_wool": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Loom "] },
  // Animal Products
  "mythicus_sn:egg": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds", "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Good:", " \xA7r\xA77- Mayonnaise Machine "] },
  "mythicus_sn:feather": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA771 Polished Emeralds"] },
  // Special Items
  "mythicus_sn:fertilizer": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Interact whith any plant to grow fast."] },
  "mythicus_sn:golden_fertilizer": { lore: ["\xA7l\xA77\u25A0 \xA7r\xA77Interact whith any plant to grow extremly fast."] },
  "mythicus_sn:truffle": { lore: ["\xA7l\xA7a\u25A0 \xA7r\xA7aSells: \xA7r\xA773 Polished Emeralds"] },
  // Artisan Blocks
  "mythicus_sn:preservers_jar": {
    lore: [
      "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Crops:",
      " \xA7r\xA77- Beet",
      " \xA7r\xA77- Blueberry",
      " \xA7r\xA77- Broccoli",
      " \xA7r\xA77- Cauliflower",
      " \xA7r\xA77- Corn",
      " \xA7r\xA77- Cranberry",
      " \xA7r\xA77- Eggplant",
      " \xA7r\xA77- Garlic",
      " \xA7r\xA77- Green Bean",
      " \xA7r\xA77- Hot Pepper",
      " \xA7r\xA77- Strawberry",
      " \xA7r\xA77- Tomatoe"
    ]
  },
  "mythicus_sn:dehydrator": {
    lore: [
      "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Crops:",
      " \xA7r\xA77- Beet",
      " \xA7r\xA77- Blueberry",
      " \xA7r\xA77- Broccoli",
      " \xA7r\xA77- Cauliflower",
      " \xA7r\xA77- Corn",
      " \xA7r\xA77- Cranberry",
      " \xA7r\xA77- Eggplant",
      " \xA7r\xA77- Garlic",
      " \xA7r\xA77- Green Bean",
      " \xA7r\xA77- Hot Pepper",
      " \xA7r\xA77- Strawberry",
      " \xA7r\xA77- Tomatoe"
    ]
  },
  "mythicus_sn:keg": { lore: ["\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Crops:", " \xA7r\xA77- Beet", " \xA7r\xA77- Blueberry", " \xA7r\xA77- Cranberry", " \xA7r\xA77- Strawberry", " \xA7r\xA77- Tomatoe"] },
  "mythicus_sn:mortar_pestle": {
    lore: [
      "\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Crops:",
      " \xA7r\xA77- Broccoli",
      " \xA7r\xA77- Cauliflower",
      " \xA7r\xA77- Corn",
      " \xA7r\xA77- Eggplant",
      " \xA7r\xA77- Garlic",
      " \xA7r\xA77- Green Bean",
      " \xA7r\xA77- Hot Pepper"
    ]
  },
  "mythicus_sn:loom": { lore: ["\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Items:", " \xA7r\xA77- Quality Wool", " \xA7r\xA77- Fabric", " \xA7r\xA77- Cloth"] },
  "mythicus_sn:cheese_press": { lore: ["\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Items:", " \xA7r\xA77- Bottle of Milk "] },
  "mythicus_sn:mayonnaise_machine": { lore: ["\xA7l\xA7n\u25A0 \xA7r\xA7nArtisan Items:", " \xA7r\xA77- Chicken Egg "] },
  "mythicus_sn:vendor_block": {
    lore: [
      "\xA7l\xA77\u25A0 \xA7r\xA77Interact while holding any new crop or artisan good in your main hand to sell it.",
      "\xA7l\xA77\u25A0 \xA7r\xA77Crouch + Intearct to summon trading villagers."
    ]
  }
};

// data/scripts/modules/lore/configs/seeds.ts
var SEEDS_CONFIG = {
  // Seeds
  "mythicus_sn:beet_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Fall", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 3 days"] },
  "mythicus_sn:broccoli_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Fall", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 5 days"] },
  "mythicus_sn:cauliflower_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Spring", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 7 days"] },
  "mythicus_sn:corn_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Summer", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 7 days"] },
  "mythicus_sn:eggplant_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Fall", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 9 days"] },
  "mythicus_sn:garlic_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Spring", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 9 days"] },
  "mythicus_sn:green_bean_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Spring", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 5 days"] },
  "mythicus_sn:hot_pepper_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Summer", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 9 days"] },
  "mythicus_sn:tomatoes_seed": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Summer", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 5 days"] },
  // Bushes
  "mythicus_sn:blueberry_bush": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Summer", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 3 days"] },
  "mythicus_sn:cranberry_bush": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Fall", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 7 days"] },
  "mythicus_sn:strawberry_bush": { lore: ["\xA7c\xA7l\u25A0 \xA7r\xA77Grows in Spring", "\xA7c\xA7l\u25A0 \xA7r\xA77Growth time: 3 days"] }
};

// data/scripts/modules/lore/lore.ts
var LORE_CACHE = /* @__PURE__ */ new Map();
var LORE_UPDATE_INTERVAL = 20;
function getItemLore(itemId) {
  if (LORE_CACHE.has(itemId)) {
    return LORE_CACHE.get(itemId);
  }
  let lore;
  lore = FOOD_CONFIG[itemId]?.lore || SEEDS_CONFIG[itemId]?.lore || ARMOR_CONFIG[itemId]?.lore || MISC_CONFIG[itemId]?.lore;
  if (lore) {
    LORE_CACHE.set(itemId, lore);
  }
  return lore;
}
function addItemLore(player) {
  const inventory = player.getComponent(EntityComponentTypes6.Inventory);
  if (!inventory || !inventory.container) return;
  for (let i = 0; i < inventory.container.size; i++) {
    const item = inventory.container.getItem(i);
    if (!item) continue;
    const currentLore = item.getLore();
    if (currentLore.length > 0) continue;
    const loreLines = getItemLore(item.typeId);
    if (loreLines) {
      const newItem = new ItemStack4(item.typeId, item.amount);
      newItem.setLore(loreLines);
      inventory.container.setItem(i, newItem);
    }
  }
}
system19.runInterval(() => {
  const players = getAllPlayers();
  players.forEach((player) => {
    addItemLore(player);
  });
}, LORE_UPDATE_INTERVAL);

// data/scripts/modules/crops_growth.ts
init_season_core();
function calculateGrowthIntervalTicks(maxStage, growthDays) {
  const totalTicks = growthDays * TicksPerDay;
  const interval = Math.max(1, Math.round(totalTicks / Math.max(1, maxStage)));
  return interval;
}
var DEFAULT_CROP_CONFIG = {
  maxStage: 4,
  growthIntervalTicks: TicksPerDay
};
var CROP_CONFIGS = {
  "mythicus_sn:beet": { maxStage: 4, growthIntervalTicks: calculateGrowthIntervalTicks(4, 3) },
  "mythicus_sn:strawberry_bush": { maxStage: 3, growthIntervalTicks: calculateGrowthIntervalTicks(3, 3) },
  "mythicus_sn:cauliflower": { maxStage: 7, growthIntervalTicks: calculateGrowthIntervalTicks(7, 7) },
  "mythicus_sn:green_bean": { maxStage: 5, growthIntervalTicks: calculateGrowthIntervalTicks(5, 5) },
  "mythicus_sn:garlic": { maxStage: 9, growthIntervalTicks: calculateGrowthIntervalTicks(9, 9) },
  "mythicus_sn:blueberry_bush": { maxStage: 3, growthIntervalTicks: calculateGrowthIntervalTicks(3, 3) },
  "mythicus_sn:tomatoes": { maxStage: 7, growthIntervalTicks: calculateGrowthIntervalTicks(7, 5) },
  "mythicus_sn:corn": { maxStage: 8, growthIntervalTicks: calculateGrowthIntervalTicks(8, 7) },
  "mythicus_sn:hot_pepper": { maxStage: 8, growthIntervalTicks: calculateGrowthIntervalTicks(8, 9) },
  "mythicus_sn:cranberry_bush": { maxStage: 3, growthIntervalTicks: calculateGrowthIntervalTicks(3, 7) },
  "mythicus_sn:broccoli": { maxStage: 7, growthIntervalTicks: calculateGrowthIntervalTicks(7, 5) },
  "mythicus_sn:eggplant": { maxStage: 8, growthIntervalTicks: calculateGrowthIntervalTicks(8, 9) }
};
var CROP_DROP_CONFIG = {
  "mythicus_sn:tomatoes": { itemId: "mythicus_sn:tomatoes", minCount: 4, maxCount: 4 },
  "mythicus_sn:garlic": { itemId: "mythicus_sn:garlic", minCount: 1, maxCount: 1 },
  "mythicus_sn:corn": { itemId: "mythicus_sn:corn", minCount: 2, maxCount: 2 },
  "mythicus_sn:hot_pepper": { itemId: "mythicus_sn:hot_pepper", minCount: 5, maxCount: 5 },
  "mythicus_sn:eggplant": { itemId: "mythicus_sn:eggplant", minCount: 3, maxCount: 3 },
  "mythicus_sn:broccoli": { itemId: "mythicus_sn:broccoli", minCount: 1, maxCount: 1 },
  "mythicus_sn:cauliflower": { itemId: "mythicus_sn:cauliflower", minCount: 1, maxCount: 1 },
  "mythicus_sn:green_bean": { itemId: "mythicus_sn:green_bean", minCount: 1, maxCount: 1 },
  "mythicus_sn:beet": { itemId: "mythicus_sn:beet", minCount: 1, maxCount: 1 }
};
var CROP_SEASONS = {
  "mythicus_sn:strawberry_bush": "spring" /* Spring */,
  "mythicus_sn:cauliflower": "spring" /* Spring */,
  "mythicus_sn:green_bean": "spring" /* Spring */,
  "mythicus_sn:garlic": "spring" /* Spring */,
  "mythicus_sn:blueberry_bush": "summer" /* Summer */,
  "mythicus_sn:tomatoes": "summer" /* Summer */,
  "mythicus_sn:corn": "summer" /* Summer */,
  "mythicus_sn:hot_pepper": "summer" /* Summer */,
  "mythicus_sn:cranberry_bush": "fall" /* Fall */,
  "mythicus_sn:broccoli": "fall" /* Fall */,
  "mythicus_sn:eggplant": "fall" /* Fall */,
  "mythicus_sn:beet": "fall" /* Fall */
};
var BERRY_LOOT_TABLES = {
  "mythicus_sn:strawberry_bush": "mythicus/sn/blocks/crops/strawberry/stage_mature",
  "mythicus_sn:blueberry_bush": "mythicus/sn/blocks/crops/blueberry/stage_mature",
  "mythicus_sn:cranberry_bush": "mythicus/sn/blocks/crops/cranberry/stage_mature"
};
var BERRY_DROP_CONFIG = {
  "mythicus_sn:strawberry_bush": { itemId: "mythicus_sn:strawberry", minCount: 2, maxCount: 3 },
  "mythicus_sn:blueberry_bush": { itemId: "mythicus_sn:blueberry", minCount: 2, maxCount: 3 },
  "mythicus_sn:cranberry_bush": { itemId: "mythicus_sn:cranberry", minCount: 2, maxCount: 3 }
};
function getCropConfig(block) {
  return CROP_CONFIGS[block.typeId] ?? DEFAULT_CROP_CONFIG;
}
var cropStorage = new PropertyStorage(world18, "mythicus_sn:crops");
var CACHE_FLUSH_INTERVAL_TICKS = TicksPerSecond12 * 5;
var cropCache;
var cropCacheDirty = false;
function ensureCropCache() {
  if (!cropCache) {
    const stored = cropStorage.get("crops", true);
    cropCache = stored ? { ...stored } : {};
  }
  return cropCache;
}
function markCropCacheDirty() {
  cropCacheDirty = true;
}
function flushCropCache() {
  if (!cropCacheDirty || !cropCache) {
    return;
  }
  cropStorage.set("crops", cropCache);
  cropCacheDirty = false;
}
var FERTILIZER_CONFIGS = {
  ["minecraft:bone_meal" /* BONE_MEAL */]: { timeReduction: 100, type: "minecraft:bone_meal" /* BONE_MEAL */, canRevive: false },
  ["mythicus_sn:fertilizer" /* FERTILIZER */]: { timeReduction: 1e3, type: "mythicus_sn:fertilizer" /* FERTILIZER */, canRevive: true },
  ["mythicus_sn:golden_fertilizer" /* GOLDEN_FERTILIZER */]: { timeReduction: 1e4, type: "mythicus_sn:golden_fertilizer" /* GOLDEN_FERTILIZER */, canRevive: true }
};
function getBlockKey3(block) {
  const { x, y, z } = block;
  return `${block.dimension.id}:${x},${y},${z}`;
}
function getCropData(block) {
  const blockKey = getBlockKey3(block);
  const cache2 = ensureCropCache();
  return cache2[blockKey];
}
function setCropData(block, data) {
  const blockKey = getBlockKey3(block);
  const cache2 = ensureCropCache();
  cache2[blockKey] = data;
  markCropCacheDirty();
}
function clearCropData(block) {
  const blockKey = getBlockKey3(block);
  const cache2 = ensureCropCache();
  if (cache2[blockKey]) {
    delete cache2[blockKey];
    markCropCacheDirty();
  }
}
function setCropDeathState(block, isDead) {
  const permutation = block.permutation;
  const newPermutation = permutation.withState("mythicus_sn:is_dead", isDead);
  block.setPermutation(newPermutation);
}
function setCropStuckState(block, isStuck) {
  const cropData = getCropData(block);
  if (!cropData) {
    return;
  }
  cropData.isStuck = isStuck;
  setCropData(block, cropData);
  const permutation = block.permutation;
  const newPermutation = permutation.withState("mythicus_sn:is_stuck", isStuck);
  block.setPermutation(newPermutation);
}
function growCrop(block, stages = 1) {
  const { maxStage } = getCropConfig(block);
  const permutation = block.permutation;
  const currentStage = Number(permutation.getState("mythicus_sn:growth_stage"));
  const newStage = Math.min(currentStage + stages, maxStage);
  if (newStage !== currentStage) {
    const newPermutation = permutation.withState("mythicus_sn:growth_stage", newStage);
    block.setPermutation(newPermutation);
    const cropData = getCropData(block);
    if (cropData) {
      cropData.lastUpdateTick = world18.getAbsoluteTime();
      setCropData(block, cropData);
    }
  }
}
function restoreCropStage(block, stage) {
  const permutation = block.permutation;
  const { maxStage } = getCropConfig(block);
  const targetStage = Math.min(Math.max(stage, 0), maxStage);
  const newPermutation = permutation.withState("mythicus_sn:growth_stage", targetStage);
  block.setPermutation(newPermutation);
}
function killCrop(block) {
  setCropDeathState(block, true);
  const cropData = getCropData(block);
  if (cropData) {
    cropData.isDead = true;
    setCropData(block, cropData);
  }
}
function reviveCrop(block, progressBonus = 0) {
  setCropDeathState(block, false);
  const cropData = getCropData(block);
  if (cropData) {
    cropData.isDead = false;
    cropData.lastUpdateTick = world18.getAbsoluteTime();
    if (progressBonus > 0) {
      const { growthIntervalTicks } = getCropConfig(block);
      const growthThreshold = growthIntervalTicks;
      const progressToAdd = Math.min(progressBonus, growthThreshold - cropData.growthProgress);
      cropData.growthProgress += progressToAdd;
      if (cropData.growthProgress > growthThreshold) {
        cropData.growthProgress = growthThreshold;
      }
    }
    setCropData(block, cropData);
  }
}
function isWaterAdjacent(block) {
  const { x, y, z } = block;
  const adjacentPositions = [
    { x: x + 1, y, z },
    { x: x - 1, y, z },
    { x, y, z: z + 1 },
    { x, y, z: z - 1 },
    { x, y: y + 1, z }
  ];
  for (const pos of adjacentPositions) {
    const adjacentBlock = block.dimension.getBlock(pos);
    if (adjacentBlock?.typeId === "minecraft:water" || adjacentBlock?.typeId === "minecraft:flowing_water") {
      return true;
    }
  }
  return false;
}
var SEED_MAP = {
  "mythicus_sn:cauliflower": "mythicus_sn:cauliflower_seed",
  "mythicus_sn:green_bean": "mythicus_sn:green_bean_seed",
  "mythicus_sn:garlic": "mythicus_sn:garlic_seed",
  "mythicus_sn:tomatoes": "mythicus_sn:tomatoes_seed",
  "mythicus_sn:corn": "mythicus_sn:corn_seed",
  "mythicus_sn:hot_pepper": "mythicus_sn:hot_pepper_seed",
  "mythicus_sn:broccoli": "mythicus_sn:broccoli_seed",
  "mythicus_sn:eggplant": "mythicus_sn:eggplant_seed",
  "mythicus_sn:beet": "mythicus_sn:beet_seed"
};
function dropCropSeeds(blockTypeId, dimension, location) {
  const seedItem = SEED_MAP[blockTypeId];
  if (!seedItem) {
    return;
  }
  const itemStack = new ItemStack5(seedItem, 1);
  const lore = getItemLore(seedItem);
  if (lore) {
    itemStack.setLore(lore);
  }
  dimension.spawnItem(itemStack, location);
}
function applyShearDurability(player) {
  const equippable = player.getComponent(EntityComponentTypes7.Equippable);
  if (!equippable) return;
  const slot = equippable.getEquipmentSlot(EquipmentSlot5.Mainhand);
  if (!slot.hasItem() || slot.typeId !== MinecraftItemTypes.Shears) return;
  const item = slot.getItem();
  if (!item) return;
  const durability = item.getComponent(ItemComponentTypes.Durability);
  if (!durability) return;
  const enchantable = item.getComponent(ItemComponentTypes.Enchantable);
  const unbreakingLevel = enchantable?.getEnchantment(MinecraftEnchantmentTypes.Unbreaking)?.level ?? 0;
  const damageChance = durability.getDamageChance(unbreakingLevel);
  if (Math.random() * 100 > damageChance) return;
  durability.damage += 1;
  if (durability.damage >= durability.maxDurability) {
    slot.setItem(void 0);
    player.playSound("random.break");
    return;
  }
  slot.setItem(item);
}
function handleBerryHarvest(block, player) {
  const dropConfig = BERRY_DROP_CONFIG[block.typeId];
  if (!dropConfig) return false;
  const { maxStage } = getCropConfig(block);
  const permutation = block.permutation;
  const currentStage = Number(permutation.getState("mythicus_sn:growth_stage"));
  if (currentStage < maxStage) return false;
  const dropCount = dropConfig.minCount + Math.floor(Math.random() * (dropConfig.maxCount - dropConfig.minCount + 1));
  const itemStack = new ItemStack5(dropConfig.itemId, dropCount);
  const lore = getItemLore(dropConfig.itemId);
  if (lore) {
    itemStack.setLore(lore);
  }
  block.dimension.spawnItem(itemStack, {
    x: block.x,
    y: block.y + 0.5,
    z: block.z
  });
  const newPermutation = permutation.withState("mythicus_sn:growth_stage", 0);
  block.setPermutation(newPermutation);
  const cropData = getCropData(block);
  if (cropData) {
    cropData.growthProgress = 0;
    cropData.lastUpdateTick = world18.getAbsoluteTime();
    setCropData(block, cropData);
  }
  block.dimension.playSound("block.sweet_berry_bush.pick", {
    x: block.x + 0.5,
    y: block.y + 0.5,
    z: block.z + 0.5
  });
  if (player) applyShearDurability(player);
  return true;
}
function initializeCrop(block) {
  const currentSeason2 = getCurrentSeason();
  const cropData = {
    growthProgress: 0,
    isDead: false,
    isStuck: false,
    plantedSeason: currentSeason2,
    lastUpdateTick: world18.getAbsoluteTime()
  };
  setCropData(block, cropData);
}
function updateCropGrowth(block) {
  const cropData = getCropData(block);
  if (!cropData) return;
  const { maxStage, growthIntervalTicks } = getCropConfig(block);
  const currentTick = world18.getAbsoluteTime();
  const currentSeason2 = getCurrentSeason();
  const permutation = block.permutation;
  const currentStage = Number(permutation.getState("mythicus_sn:growth_stage"));
  if (currentSeason2 === "winter" /* Winter */) {
    if (currentStage === maxStage && !cropData.isDead) {
      cropData.stageBeforeDeath = currentStage;
      killCrop(block);
      setCropData(block, cropData);
    } else if (currentStage < maxStage && !cropData.isStuck) {
      setCropStuckState(block, true);
    }
    return;
  }
  if (cropData.isDead) {
    reviveCrop(block, 0);
    if (cropData.stageBeforeDeath !== void 0) {
      restoreCropStage(block, cropData.stageBeforeDeath);
      cropData.stageBeforeDeath = void 0;
    }
    cropData.plantedSeason = currentSeason2;
    cropData.lastUpdateTick = currentTick;
    setCropData(block, cropData);
    return;
  }
  if (cropData.isStuck && cropData.plantedSeason !== currentSeason2) {
    setCropStuckState(block, false);
    cropData.plantedSeason = currentSeason2;
    cropData.lastUpdateTick = currentTick;
    setCropData(block, cropData);
    return;
  }
  const requiredSeason = CROP_SEASONS[block.typeId];
  if (requiredSeason !== void 0 && currentSeason2 !== requiredSeason) {
    if (currentStage < maxStage && !cropData.isStuck) {
      setCropStuckState(block, true);
      return;
    }
  }
  const elapsedTicks = currentTick - cropData.lastUpdateTick;
  if (elapsedTicks < 0) {
    cropData.lastUpdateTick = currentTick;
    setCropData(block, cropData);
    return;
  }
  cropData.growthProgress += elapsedTicks;
  if (cropData.isStuck) return;
  const growthThreshold = growthIntervalTicks;
  if (cropData.growthProgress >= growthThreshold) {
    if (currentStage < maxStage) {
      growCrop(block, 1);
      cropData.growthProgress -= growthThreshold;
    } else {
      cropData.growthProgress = 0;
    }
  }
  cropData.lastUpdateTick = currentTick;
  setCropData(block, cropData);
}
function applyFertilizerAcceleration(block, timeReduction, fertilizerType) {
  const cropData = getCropData(block);
  if (!cropData) return;
  const fertilizerConfig = FERTILIZER_CONFIGS[fertilizerType];
  const cropConfig = getCropConfig(block);
  const growthThreshold = cropConfig.growthIntervalTicks;
  const maxStage = cropConfig.maxStage;
  const wasDead = cropData.isDead;
  if (fertilizerType === "minecraft:bone_meal" /* BONE_MEAL */) {
    const permutation = block.permutation;
    const currentStage = Number(permutation.getState("mythicus_sn:growth_stage"));
    if (currentStage >= maxStage) {
      return;
    }
    if (cropData.isStuck) {
      setCropStuckState(block, false);
      cropData.isStuck = false;
      cropData.lastUpdateTick = world18.getAbsoluteTime();
    }
    if (cropData.isDead) {
      const effectLocation3 = {
        x: block.x + 0.5,
        y: block.y + 0.5,
        z: block.z + 0.5
      };
      block.dimension.playSound("item.shield.block", effectLocation3);
      safeSpawnParticle(block.dimension, "minecraft:crop_growth_emitter", effectLocation3);
      return;
    }
    const progressToAdd = Math.min(timeReduction, growthThreshold - cropData.growthProgress);
    cropData.growthProgress += progressToAdd;
    const newSeason = getCurrentSeason();
    cropData.plantedSeason = newSeason;
    cropData.lastUpdateTick = world18.getAbsoluteTime();
    if (cropData.growthProgress >= growthThreshold && currentStage < maxStage) {
      growCrop(block, 1);
      cropData.growthProgress -= growthThreshold;
    }
    setCropData(block, cropData);
    const effectLocation2 = {
      x: block.x + 0.5,
      y: block.y + 0.5,
      z: block.z + 0.5
    };
    block.dimension.playSound("item.bone_meal.use", effectLocation2);
    safeSpawnParticle(block.dimension, "minecraft:crop_growth_emitter", effectLocation2);
    return;
  }
  if (cropData.isDead) {
    if (fertilizerConfig.canRevive) {
      reviveCrop(block, timeReduction);
    } else {
      const effectLocation2 = {
        x: block.x + 0.5,
        y: block.y + 0.5,
        z: block.z + 0.5
      };
      block.dimension.playSound("item.shield.block", effectLocation2);
      safeSpawnParticle(block.dimension, "minecraft:crop_growth_emitter", effectLocation2);
      return;
    }
  } else if (cropData.isStuck) {
    setCropStuckState(block, false);
    cropData.isStuck = false;
    cropData.lastUpdateTick = world18.getAbsoluteTime();
    setCropData(block, cropData);
  }
  let progressAdded = 0;
  if (!wasDead || fertilizerConfig.canRevive) {
    progressAdded = Math.min(timeReduction, growthThreshold - cropData.growthProgress);
    cropData.growthProgress += progressAdded;
    if (cropData.growthProgress > growthThreshold) {
      cropData.growthProgress = growthThreshold;
    }
    const newSeason = getCurrentSeason();
    cropData.plantedSeason = newSeason;
    setCropData(block, cropData);
    if (cropData.growthProgress >= growthThreshold) {
      const permutation = block.permutation;
      const currentStage = Number(permutation.getState("mythicus_sn:growth_stage"));
      if (currentStage < maxStage) {
        growCrop(block, 1);
        cropData.growthProgress -= growthThreshold;
        setCropData(block, cropData);
      }
    }
  }
  const effectLocation = {
    x: block.x + 0.5,
    y: block.y + 0.5,
    z: block.z + 0.5
  };
  block.dimension.playSound("item.bone_meal.use", effectLocation);
  safeSpawnParticle(block.dimension, "minecraft:crop_growth_emitter", effectLocation);
}
function handleFertilizerInteraction(block, player) {
  const cropData = getCropData(block);
  if (!cropData) return;
  const permutation = block.permutation;
  const currentStage = Number(permutation.getState("mythicus_sn:growth_stage"));
  const { maxStage } = getCropConfig(block);
  if (currentStage >= maxStage) {
    return;
  }
  const equippable = player.getComponent(EntityComponentTypes7.Equippable);
  if (!equippable) return;
  const mainhand = equippable.getEquipmentSlot(EquipmentSlot5.Mainhand);
  if (!mainhand.hasItem()) return;
  const config = FERTILIZER_CONFIGS[mainhand.typeId];
  if (!config) return;
  applyFertilizerAcceleration(block, config.timeReduction, config.type);
  if (player.getGameMode() !== GameMode3.Creative) {
    if (mainhand.amount > 1) {
      mainhand.amount--;
    } else {
      mainhand.setItem(void 0);
    }
  }
}
var CropGrowableComponent = {
  onPlace({ block }) {
    initializeCrop(block);
  },
  onPlayerBreak({ block, player, brokenBlockPermutation }) {
    const blockTypeId = brokenBlockPermutation.type.id;
    const currentStage = Number(brokenBlockPermutation.getState("mythicus_sn:growth_stage"));
    const config = CROP_CONFIGS[blockTypeId];
    if (!config) {
      clearCropData(block);
      return;
    }
    const maxStage = config.maxStage;
    const dropLocation = {
      x: block.x + 0.5,
      y: block.y + 0.5,
      z: block.z + 0.5
    };
    if (BERRY_DROP_CONFIG[blockTypeId]) {
      if (currentStage >= maxStage) {
        const dropConfig = BERRY_DROP_CONFIG[blockTypeId];
        const dropCount = dropConfig.minCount + Math.floor(Math.random() * (dropConfig.maxCount - dropConfig.minCount + 1));
        const itemStack = new ItemStack5(dropConfig.itemId, dropCount);
        const lore = getItemLore(dropConfig.itemId);
        if (lore) {
          itemStack.setLore(lore);
        }
        block.dimension.spawnItem(itemStack, dropLocation);
      }
    }
    if (CROP_DROP_CONFIG[blockTypeId]) {
      if (currentStage >= maxStage) {
        const dropConfig = CROP_DROP_CONFIG[blockTypeId];
        const dropCount = dropConfig.minCount + Math.floor(Math.random() * (dropConfig.maxCount - dropConfig.minCount + 1));
        const itemStack = new ItemStack5(dropConfig.itemId, dropCount);
        const lore = getItemLore(dropConfig.itemId);
        if (lore) {
          itemStack.setLore(lore);
        }
        block.dimension.spawnItem(itemStack, dropLocation);
        if (Math.random() < 0.5) {
          dropCropSeeds(blockTypeId, block.dimension, dropLocation);
        }
      } else {
        dropCropSeeds(blockTypeId, block.dimension, dropLocation);
      }
    }
    clearCropData(block);
  },
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const equippable = player.getComponent(EntityComponentTypes7.Equippable);
    if (!equippable) return;
    const mainhand = equippable.getEquipmentSlot(EquipmentSlot5.Mainhand);
    if (mainhand.hasItem() && FERTILIZER_CONFIGS[mainhand.typeId]) {
      handleFertilizerInteraction(block, player);
      return;
    }
    if (BERRY_LOOT_TABLES[block.typeId]) {
      handleBerryHarvest(block, player);
    }
  },
  onTick({ block }) {
    if (isWaterAdjacent(block)) {
      const dropLocation = {
        x: block.x + 0.5,
        y: block.y + 0.5,
        z: block.z + 0.5
      };
      dropCropSeeds(block.typeId, block.dimension, dropLocation);
      clearCropData(block);
      block.setType("minecraft:air");
      return;
    }
    updateCropGrowth(block);
  }
};
system20.runInterval(flushCropCache, CACHE_FLUSH_INTERVAL_TICKS);
system20.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("mythicus_sn:crop_growable", CropGrowableComponent);
});

// data/scripts/modules/sapling_growth.ts
init_lib2();
import {
  BlockVolume as BlockVolume2,
  EntityComponentTypes as EntityComponentTypes8,
  EquipmentSlot as EquipmentSlot6,
  GameMode as GameMode4,
  StructureAnimationMode,
  StructureRotation,
  system as system21,
  world as world19
} from "@minecraft/server";
var growthStage = "mythicus_sn:growth_stage";
var treeTypes = {
  "mythicus_sn:sapling_birch": {
    structurePrefix: "mystructure:mythicus_sn/birch/birch_s_",
    variants: 14,
    size: 1,
    singleSapling: true
  },
  "mythicus_sn:sapling_oak": {
    structurePrefix: "mystructure:mythicus_sn/oak/oak_s_",
    variants: 7,
    size: 1,
    singleSapling: true
  },
  "mythicus_sn:sapling_spruce": {
    structurePrefix: "mystructure:mythicus_sn/spruce/pine_s_",
    variants: 28,
    size: 1,
    singleSapling: true
  },
  "mythicus_sn:sapling_dark_oak": {
    structurePrefix: "mystructure:mythicus_sn/dark_oak/dark_oak_",
    variants: 28,
    size: 2,
    singleSapling: false
  },
  "mythicus_sn:sapling_cherry": {
    structurePrefix: "mystructure:mythicus_sn/cherry/cherry_",
    variants: 28,
    size: 1,
    singleSapling: true
  }
};
system21.beforeEvents.startup.subscribe((e) => {
  e.blockComponentRegistry.registerCustomComponent("mythicus_sn:sapling", {
    onRandomTick: saplingRandomTick,
    onPlayerInteract: playerInteraction
  });
});
function saplingRandomTick(e) {
  let b = e.block;
  if (checkNaturalGrowthConditions(b)) {
    growTree(b);
  }
}
function growTree(b) {
  if (b.permutation.getState(growthStage) == 0) {
    b.setPermutation(b.permutation.withState(growthStage, 1));
  } else {
    if (checkBonemealGrowthConditions(b)) {
      spawnTree(b);
    }
  }
}
function playerInteraction(e) {
  if (!e.player) return;
  let equippable = e.player.getComponent(EntityComponentTypes8.Equippable);
  let creative = e.player.getGameMode() == GameMode4.Creative;
  if (consumeItem(equippable, MinecraftItemTypes.BoneMeal, creative)) {
    e.dimension.spawnParticle("minecraft:crop_growth_emitter", e.block.center());
    e.dimension.playSound("item.bone_meal.use", e.block.center());
    if (!checkBonemealGrowthConditions(e.block)) return;
    if (creative) {
      spawnTree(e.block);
    } else if (Math.random() < 0.45) {
      growTree(e.block);
    }
  }
}
function consumeItem(e, consumedItem, creative) {
  let equip = e.getEquipment(EquipmentSlot6.Mainhand);
  if (equip?.typeId != consumedItem) return false;
  if (creative) return true;
  if (equip.amount > 1) {
    equip.amount -= 1;
    e.setEquipment(EquipmentSlot6.Mainhand, equip);
  } else {
    e.setEquipment(EquipmentSlot6.Mainhand, void 0);
  }
  return true;
}
function checkNaturalGrowthConditions(b) {
  const blockAbove = b.above();
  return blockAbove?.isAir ?? false;
}
function checkBonemealGrowthConditions(b) {
  const blockAbove = b.above();
  return blockAbove?.isAir ?? false;
}
function check2x2SaplingPattern(sapling, saplingType) {
  const patterns = [
    [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: 1, z: 1 }],
    // This is NW corner
    [{ x: -1, z: 0 }, { x: 0, z: 0 }, { x: -1, z: 1 }, { x: 0, z: 1 }],
    // This is NE corner
    [{ x: 0, z: -1 }, { x: 1, z: -1 }, { x: 0, z: 0 }, { x: 1, z: 0 }],
    // This is SW corner
    [{ x: -1, z: -1 }, { x: 0, z: -1 }, { x: -1, z: 0 }, { x: 0, z: 0 }]
    // This is SE corner
  ];
  for (const pattern of patterns) {
    let allMatch = true;
    let minX = Infinity, minZ = Infinity;
    for (const offset of pattern) {
      const checkBlock = sapling.dimension.getBlock({
        x: sapling.x + offset.x,
        y: sapling.y,
        z: sapling.z + offset.z
      });
      if (!checkBlock || checkBlock.typeId !== saplingType) {
        allMatch = false;
        break;
      }
      minX = Math.min(minX, sapling.x + offset.x);
      minZ = Math.min(minZ, sapling.z + offset.z);
    }
    if (allMatch) {
      return { x: minX, y: sapling.y, z: minZ };
    }
  }
  return null;
}
function spawnTree(sapling) {
  const blockTypeId = sapling.typeId;
  const treeConfig = treeTypes[blockTypeId];
  if (!treeConfig) {
    return;
  }
  if (!treeConfig.singleSapling) {
    const nwCorner = check2x2SaplingPattern(sapling, blockTypeId);
    if (!nwCorner) {
      return;
    }
    const variantNum = Math.floor(Math.random() * treeConfig.variants) + 1;
    const structureName = `${treeConfig.structurePrefix}${variantNum}`;
    spawnStructure2x2(sapling.dimension, structureName, nwCorner);
  } else {
    const variantNum = Math.floor(Math.random() * treeConfig.variants) + 1;
    const structureName = `${treeConfig.structurePrefix}${variantNum}`;
    spawnStructure(sapling, structureName);
  }
}
function spawnStructure(sapling, structureName) {
  const str = world19.structureManager.get(structureName);
  if (!str) return;
  const dim = sapling.dimension;
  let corner = {
    x: sapling.x - Math.floor(str.size.x / 2),
    y: sapling.y,
    z: sapling.z - Math.floor(str.size.z / 2)
  };
  const replaceableBlocks = [
    "minecraft:grass",
    "minecraft:bush",
    "minecraft:grass_block",
    "minecraft:sand",
    "minecraft:tallgrass",
    "minecraft:fern",
    "minecraft:large_fern",
    "minecraft:short_grass",
    "minecraft:deadbush",
    "minecraft:vine",
    "minecraft:glow_lichen",
    "minecraft:sweet_berry_bush",
    "minecraft:torchflower_crop",
    "minecraft:pitcher_crop",
    "minecraft:oak_leaves",
    "minecraft:spruce_leaves",
    "minecraft:birch_leaves",
    "minecraft:jungle_leaves",
    "minecraft:acacia_leaves",
    "minecraft:dark_oak_leaves",
    "minecraft:azalea_leaves",
    "minecraft:azalea_leaves_flowered",
    "minecraft:flowering_azalea",
    "minecraft:mangrove_leaves",
    "minecraft:cherry_leaves",
    "minecraft:dandelion",
    "minecraft:wildflowers",
    "minecraft:poppy",
    "minecraft:blue_orchid",
    "minecraft:allium",
    "minecraft:azure_bluet",
    "minecraft:red_tulip",
    "minecraft:orange_tulip",
    "minecraft:white_tulip",
    "minecraft:pink_tulip",
    "minecraft:oxeye_daisy",
    "minecraft:cornflower",
    "minecraft:lily_of_the_valley",
    "minecraft:wither_rose",
    "minecraft:sunflower",
    "minecraft:lilac",
    "minecraft:rose_bush",
    "minecraft:peony",
    "minecraft:wheat",
    "minecraft:beetroot",
    "minecraft:carrots",
    "minecraft:potatoes",
    "minecraft:melon_stem",
    "minecraft:pumpkin_stem",
    "minecraft:nether_wart",
    "minecraft:cocoa",
    "minecraft:bamboo",
    "minecraft:cactus",
    "minecraft:kelp",
    "minecraft:seagrass",
    "minecraft:oak_sapling",
    "minecraft:spruce_sapling",
    "minecraft:birch_sapling",
    "minecraft:jungle_sapling",
    "minecraft:acacia_sapling",
    "minecraft:dark_oak_sapling",
    "minecraft:cherry_sapling",
    "minecraft:mangrove_propagule",
    "minecraft:azalea",
    "minecraft:flowering_azalea",
    "minecraft:coral",
    "minecraft:coral_fan",
    "minecraft:coral_fan_dead",
    // mythicus_sn custom blocks - grass and foliage
    "mythicus_sn:short_grass",
    "mythicus_sn:very_short_grass",
    "mythicus_sn:fern",
    "mythicus_sn:shrub",
    "mythicus_sn:tall_grass_bottom",
    "mythicus_sn:tall_grass_top",
    "mythicus_sn:large_fern_bottom",
    "mythicus_sn:large_fern_top",
    "mythicus_sn:vines",
    "mythicus_sn:lily_pad",
    "mythicus_sn:pine_needles",
    "mythicus_sn:dandelion",
    "mythicus_sn:poppy",
    "mythicus_sn:wildflowers",
    "mythicus_sn:blue_orchid",
    "mythicus_sn:tulips",
    "mythicus_sn:pink_petals",
    "mythicus_sn:peony_bottom",
    "mythicus_sn:peony_top",
    "mythicus_sn:rose_bottom",
    "mythicus_sn:rose_top",
    "mythicus_sn:lilac_bottom",
    "mythicus_sn:lilac_top",
    "mythicus_sn:brown_mushroom",
    "mythicus_sn:red_mushroom",
    "mythicus_sn:leaves_birch",
    "mythicus_sn:leaves_spruce",
    "mythicus_sn:orange_leaves_oak",
    "mythicus_sn:red_leaves_oak",
    "mythicus_sn:yellow_leaves_oak",
    "mythicus_sn:cherry_leaves",
    "mythicus_sn:dark_oak_leaves",
    "mythicus_sn:side_leaves_birch",
    "mythicus_sn:side_leaves_oak",
    "mythicus_sn:side_leaves_spruce",
    "mythicus_sn:ground_leaves",
    "mythicus_sn:orange_piles_of_leaves",
    "mythicus_sn:red_piles_of_leaves",
    "mythicus_sn:yellow_piles_of_leaves",
    "mythicus_sn:snow_layer"
  ];
  const treeDistanceCheck = 0;
  const boundingBox = {
    min: {
      x: corner.x - treeDistanceCheck,
      y: corner.y - 1,
      z: corner.z - treeDistanceCheck
    },
    max: {
      x: corner.x + str.size.x - 1 + treeDistanceCheck,
      y: corner.y + str.size.y - 1,
      z: corner.z + str.size.z - 1 + treeDistanceCheck
    }
  };
  const treeCheckVolume = new BlockVolume2(boundingBox.min, boundingBox.max);
  const treeLogFilter = {
    includeTypes: [
      "minecraft:oak_log",
      "minecraft:spruce_log",
      "minecraft:birch_log",
      "minecraft:jungle_log",
      "minecraft:acacia_log",
      "minecraft:dark_oak_log",
      "minecraft:mangrove_log",
      "minecraft:cherry_log"
    ]
  };
  if (dim.containsBlock(treeCheckVolume, treeLogFilter)) {
    return;
  }
  const structureVolume = new BlockVolume2(corner, {
    x: corner.x + str.size.x - 1,
    y: corner.y + str.size.y - 1,
    z: corner.z + str.size.z - 1
  });
  const blockingBlockFilter = {
    excludeTags: ["plant", "mythicus_sn:environment"],
    excludeTypes: ["minecraft:air", ...replaceableBlocks]
  };
  if (dim.containsBlock(structureVolume, blockingBlockFilter)) {
    return;
  }
  sapling.setType("minecraft:air");
  try {
    world19.structureManager.place(
      structureName,
      dim,
      { x: corner.x, y: corner.y, z: corner.z },
      {
        rotation: StructureRotation.None,
        includeEntities: true,
        animationMode: StructureAnimationMode.None,
        animationSeconds: 0.5
      }
    );
    return;
  } catch (e) {
    for (let x = 0; x < str.size.x; x++) {
      for (let y = 0; y < str.size.y; y++) {
        for (let z = 0; z < str.size.z; z++) {
          let strBlock = str.getBlockPermutation({ x, y, z });
          if (strBlock) {
            let worldLocation = {
              x: corner.x + x,
              y: corner.y + y,
              z: corner.z + z
            };
            const worldBlock = dim.getBlock(worldLocation);
            if (worldBlock) {
              worldBlock.setPermutation(strBlock);
            }
          }
        }
      }
    }
  }
}
function spawnStructure2x2(dim, structureName, nwCorner) {
  const str = world19.structureManager.get(structureName);
  if (!str) return;
  let corner = {
    x: nwCorner.x + 1 - Math.floor(str.size.x / 2) + 1,
    y: nwCorner.y,
    z: nwCorner.z + 1 - Math.floor(str.size.z / 2) + 1
  };
  const replaceableBlocks = [
    "minecraft:grass",
    "minecraft:bush",
    "minecraft:grass_block",
    "minecraft:sand",
    "minecraft:tallgrass",
    "minecraft:fern",
    "minecraft:large_fern",
    "minecraft:short_grass",
    "minecraft:deadbush",
    "minecraft:vine",
    "minecraft:glow_lichen",
    "minecraft:sweet_berry_bush",
    "minecraft:torchflower_crop",
    "minecraft:pitcher_crop",
    "minecraft:oak_leaves",
    "minecraft:spruce_leaves",
    "minecraft:birch_leaves",
    "minecraft:jungle_leaves",
    "minecraft:acacia_leaves",
    "minecraft:dark_oak_leaves",
    "minecraft:azalea_leaves",
    "minecraft:azalea_leaves_flowered",
    "minecraft:flowering_azalea",
    "minecraft:mangrove_leaves",
    "minecraft:cherry_leaves",
    "minecraft:dandelion",
    "minecraft:wildflowers",
    "minecraft:poppy",
    "minecraft:blue_orchid",
    "minecraft:allium",
    "minecraft:azure_bluet",
    "minecraft:red_tulip",
    "minecraft:orange_tulip",
    "minecraft:white_tulip",
    "minecraft:pink_tulip",
    "minecraft:oxeye_daisy",
    "minecraft:cornflower",
    "minecraft:lily_of_the_valley",
    "minecraft:wither_rose",
    "minecraft:sunflower",
    "minecraft:lilac",
    "minecraft:rose_bush",
    "minecraft:peony",
    "minecraft:wheat",
    "minecraft:beetroot",
    "minecraft:carrots",
    "minecraft:potatoes",
    "minecraft:melon_stem",
    "minecraft:pumpkin_stem",
    "minecraft:nether_wart",
    "minecraft:cocoa",
    "minecraft:bamboo",
    "minecraft:cactus",
    "minecraft:kelp",
    "minecraft:seagrass",
    "minecraft:oak_sapling",
    "minecraft:spruce_sapling",
    "minecraft:birch_sapling",
    "minecraft:jungle_sapling",
    "minecraft:acacia_sapling",
    "minecraft:dark_oak_sapling",
    "minecraft:cherry_sapling",
    "minecraft:mangrove_propagule",
    "minecraft:azalea",
    "minecraft:flowering_azalea",
    "minecraft:coral",
    "minecraft:coral_fan",
    "minecraft:coral_fan_dead",
    // mythicus_sn custom blocks - grass and foliage
    "mythicus_sn:short_grass",
    "mythicus_sn:very_short_grass",
    "mythicus_sn:fern",
    "mythicus_sn:shrub",
    "mythicus_sn:tall_grass_bottom",
    "mythicus_sn:tall_grass_top",
    "mythicus_sn:large_fern_bottom",
    "mythicus_sn:large_fern_top",
    "mythicus_sn:vines",
    "mythicus_sn:lily_pad",
    "mythicus_sn:pine_needles",
    "mythicus_sn:dandelion",
    "mythicus_sn:poppy",
    "mythicus_sn:wildflowers",
    "mythicus_sn:blue_orchid",
    "mythicus_sn:tulips",
    "mythicus_sn:pink_petals",
    "mythicus_sn:peony_bottom",
    "mythicus_sn:peony_top",
    "mythicus_sn:rose_bottom",
    "mythicus_sn:rose_top",
    "mythicus_sn:lilac_bottom",
    "mythicus_sn:lilac_top",
    "mythicus_sn:brown_mushroom",
    "mythicus_sn:red_mushroom",
    "mythicus_sn:leaves_birch",
    "mythicus_sn:leaves_spruce",
    "mythicus_sn:orange_leaves_oak",
    "mythicus_sn:red_leaves_oak",
    "mythicus_sn:yellow_leaves_oak",
    "mythicus_sn:cherry_leaves",
    "mythicus_sn:dark_oak_leaves",
    "mythicus_sn:side_leaves_birch",
    "mythicus_sn:side_leaves_oak",
    "mythicus_sn:side_leaves_spruce",
    "mythicus_sn:ground_leaves",
    "mythicus_sn:orange_piles_of_leaves",
    "mythicus_sn:red_piles_of_leaves",
    "mythicus_sn:yellow_piles_of_leaves",
    "mythicus_sn:snow_layer"
  ];
  const treeDistanceCheck = 0;
  const boundingBox = {
    min: {
      x: corner.x - treeDistanceCheck,
      y: corner.y - 1,
      z: corner.z - treeDistanceCheck
    },
    max: {
      x: corner.x + str.size.x - 1 + treeDistanceCheck,
      y: corner.y + str.size.y - 1,
      z: corner.z + str.size.z - 1 + treeDistanceCheck
    }
  };
  const treeCheckVolume = new BlockVolume2(boundingBox.min, boundingBox.max);
  const treeLogFilter = {
    includeTypes: [
      "minecraft:oak_log",
      "minecraft:spruce_log",
      "minecraft:birch_log",
      "minecraft:jungle_log",
      "minecraft:acacia_log",
      "minecraft:dark_oak_log",
      "minecraft:mangrove_log",
      "minecraft:cherry_log"
    ]
  };
  if (dim.containsBlock(treeCheckVolume, treeLogFilter)) {
    return;
  }
  const structureVolume = new BlockVolume2(corner, {
    x: corner.x + str.size.x - 1,
    y: corner.y + str.size.y - 1,
    z: corner.z + str.size.z - 1
  });
  const blockingBlockFilter = {
    excludeTags: ["plant", "mythicus_sn:environment"],
    excludeTypes: ["minecraft:air", ...replaceableBlocks]
  };
  if (dim.containsBlock(structureVolume, blockingBlockFilter)) {
    return;
  }
  for (let x = 0; x < 2; x++) {
    for (let z = 0; z < 2; z++) {
      const saplingBlock = dim.getBlock({
        x: nwCorner.x + x,
        y: nwCorner.y,
        z: nwCorner.z + z
      });
      if (saplingBlock) {
        saplingBlock.setType("minecraft:air");
      }
    }
  }
  try {
    world19.structureManager.place(
      structureName,
      dim,
      { x: corner.x, y: corner.y, z: corner.z },
      {
        rotation: StructureRotation.None,
        includeEntities: true,
        animationMode: StructureAnimationMode.None,
        animationSeconds: 0.5
      }
    );
    return;
  } catch (e) {
    for (let x = 0; x < str.size.x; x++) {
      for (let y = 0; y < str.size.y; y++) {
        for (let z = 0; z < str.size.z; z++) {
          let strBlock = str.getBlockPermutation({ x, y, z });
          if (strBlock) {
            let worldLocation = {
              x: corner.x + x,
              y: corner.y + y,
              z: corner.z + z
            };
            const worldBlock = dim.getBlock(worldLocation);
            if (worldBlock) {
              worldBlock.setPermutation(strBlock);
            }
          }
        }
      }
    }
  }
}

// data/scripts/modules/season_calendar_ui.ts
init_players();
init_season_system();
init_season_core();
init_weather_system();
import { EntityComponentTypes as EntityComponentTypes9, system as system22, world as world20 } from "@minecraft/server";
import { ActionFormData as ActionFormData5 } from "@minecraft/server-ui";
var playerHeldItems = /* @__PURE__ */ new Map();
function getSeasonNameKey(season) {
  return `ui.mythicus_sn.season.name.${season}`;
}
function getSeasonDescriptionKey(season) {
  return `ui.mythicus_sn.season.description.${season}`;
}
function getWeatherNameKey(weather) {
  return `weather.mythicus_sn.${weather}`;
}
async function showSeasonCalendar(player) {
  const season = getCurrentSeason();
  const worldDay = world20.getDay();
  const daysIntoCurrentSeason = getDaysIntoCurrentSeason();
  const remainingDays = getActiveSeasonDuration() - daysIntoCurrentSeason % getActiveSeasonDuration();
  const seasonName = getSeasonNameKey(season);
  const seasonDescription = getSeasonDescriptionKey(season);
  const nextSeason = getSeasonNameKey(getNextSeason(season));
  const form = new ActionFormData5().title({ translate: "ui.mythicus_sn.season_calendar.title" }).body({
    rawtext: [
      { text: "\n\xA7l\xA7b" },
      { translate: "ui.mythicus_sn.season_calendar.current_season" },
      { text: ": \xA7r" },
      { translate: seasonName },
      { text: "\n\xA77" },
      { translate: seasonDescription },
      { text: "\n\n" },
      { text: "\xA7l\xA7b" },
      { translate: "ui.mythicus_sn.season_calendar.weather" },
      { text: ": \xA7r" },
      { translate: getWeatherNameKey(forecast[0].weather) },
      { text: "\n" },
      { text: "\xA7l\xA7b" },
      { translate: "ui.mythicus_sn.season_calendar.forecast" },
      { text: ": \xA7r" },
      { translate: getWeatherNameKey(forecast[1].weather) },
      { text: " | " },
      { translate: getWeatherNameKey(forecast[2].weather) },
      { text: " | " },
      { translate: getWeatherNameKey(forecast[3].weather) },
      { text: " | " },
      { translate: getWeatherNameKey(forecast[4].weather) },
      { text: "\n\n" },
      { text: "\xA76" },
      { translate: "ui.mythicus_sn.season_calendar.days_until" },
      { text: ": \xA7r" },
      { text: `${remainingDays} ` },
      { translate: remainingDays === 1 ? "ui.mythicus_sn.season_calendar.day" : "ui.mythicus_sn.season_calendar.days" },
      { text: "\n\n" },
      { text: "\xA7a" },
      { translate: "ui.mythicus_sn.season_calendar.upcoming_season" },
      { text: ": \xA7r" },
      { translate: nextSeason },
      { text: "\n\n\xA79" },
      { translate: "ui.mythicus_sn.season_calendar.world_day" },
      { text: ": \xA7r" },
      { text: `${worldDay} days` }
    ]
  }).button({ translate: "ui.mythicus_sn.season_calendar.close" });
  if (!player?.isValid) return;
  const response = await form.show(player);
  if (response.canceled) return;
}
function showActionBarCalendar(player) {
  const season = getCurrentSeason();
  const daysIntoSeason = getDaysIntoCurrentSeason();
  const currentDay = daysIntoSeason % getActiveSeasonDuration() + 1;
  const translateKey = `item.mythicus_sn:season_calendar.interact.${season}`;
  player.onScreenDisplay.setActionBar({
    rawtext: [
      { translate: translateKey, with: [`${currentDay}`] }
    ]
  });
}
system22.runInterval(() => {
  for (const player of getAllPlayers()) {
    const inventory = player.getComponent(EntityComponentTypes9.Inventory);
    if (!inventory) continue;
    const heldItem = inventory.container?.getItem(player.selectedSlotIndex);
    const heldItemId = heldItem?.typeId ?? "";
    const previousHeldItemId = playerHeldItems.get(player.id) ?? "";
    if (heldItemId === "mythicus_sn:season_calendar" && previousHeldItemId !== heldItemId) {
      showActionBarCalendar(player);
    }
    playerHeldItems.set(player.id, heldItemId);
  }
}, 10);
world20.afterEvents.playerLeave.subscribe((event) => {
  playerHeldItems.delete(event.playerId);
});

// data/scripts/main.ts
init_guidebook();

// data/scripts/modules/item_components.ts
init_guidebook();
import { EntityComponentTypes as EntityComponentTypes10, GameMode as GameMode5, Player as Player20, system as system23 } from "@minecraft/server";
init_constants();
init_storage();
system23.beforeEvents.startup.subscribe((initEvent) => {
  initEvent.itemComponentRegistry.registerCustomComponent("mythicus_sn:guidebook_use", {
    onUse(event) {
      const { source } = event;
      if (source instanceof Player20) {
        showGuidebook(source);
      }
    }
  });
  initEvent.itemComponentRegistry.registerCustomComponent("mythicus_sn:calendar_use", {
    onUse(event) {
      const { source } = event;
      if (source instanceof Player20) {
        showSeasonCalendar(source);
      }
    }
  });
  initEvent.itemComponentRegistry.registerCustomComponent("mythicus_sn:skill_point_consume", {
    onUse(event) {
      const { source, itemStack } = event;
      if (!(source instanceof Player20) || !itemStack) return;
      const data = getPlayerAbilityData(source);
      data.skillPoints += 1;
      markDirty(source);
      if (source.getGameMode() !== GameMode5.Creative) {
        const inventory = source.getComponent(EntityComponentTypes10.Inventory);
        if (inventory?.container) {
          const slot = source.selectedSlotIndex;
          const item = inventory.container.getItem(slot);
          if (item) {
            if (item.amount > 1) {
              item.amount -= 1;
              inventory.container.setItem(slot, item);
            } else {
              inventory.container.setItem(slot, void 0);
            }
          }
        }
      }
      source.playSound(SOUNDS.SKILL_POINT_ADD);
      source.onScreenDisplay.setActionBar({
        rawtext: [
          { text: "\xA7l\xA76[Season Add-on]\xA7r " },
          { translate: "ui.mythicus_sn.status_abilities.success.point_added" }
        ]
      });
    }
  });
  initEvent.itemComponentRegistry.registerCustomComponent("mythicus_sn:advance_skill_point_consume", {
    onUse(event) {
      const { source, itemStack } = event;
      if (!(source instanceof Player20) || !itemStack) return;
      const data = getPlayerAbilityData(source);
      data.advanceSkillPoints += 1;
      markDirty(source);
      if (source.getGameMode() !== GameMode5.Creative) {
        const inventory = source.getComponent(EntityComponentTypes10.Inventory);
        if (inventory?.container) {
          const slot = source.selectedSlotIndex;
          const item = inventory.container.getItem(slot);
          if (item) {
            if (item.amount > 1) {
              item.amount -= 1;
              inventory.container.setItem(slot, item);
            } else {
              inventory.container.setItem(slot, void 0);
            }
          }
        }
      }
      source.playSound(SOUNDS.SKILL_POINT_ADD);
      source.onScreenDisplay.setActionBar({
        rawtext: [
          { text: "\xA7l\xA76[Season Add-on]\xA7r " },
          { translate: "ui.mythicus_sn.status_abilities.success.point_added" }
        ]
      });
    }
  });
  initEvent.itemComponentRegistry.registerCustomComponent("mythicus_sn:master_skill_point_consume", {
    onUse(event) {
      const { source, itemStack } = event;
      if (!(source instanceof Player20) || !itemStack) return;
      const data = getPlayerAbilityData(source);
      data.masterSkillPoints += 1;
      markDirty(source);
      if (source.getGameMode() !== GameMode5.Creative) {
        const inventory = source.getComponent(EntityComponentTypes10.Inventory);
        if (inventory?.container) {
          const slot = source.selectedSlotIndex;
          const item = inventory.container.getItem(slot);
          if (item) {
            if (item.amount > 1) {
              item.amount -= 1;
              inventory.container.setItem(slot, item);
            } else {
              inventory.container.setItem(slot, void 0);
            }
          }
        }
      }
      source.playSound(SOUNDS.SKILL_POINT_ADD);
      source.onScreenDisplay.setActionBar({
        rawtext: [
          { text: "\xA7l\xA76[Season Add-on]\xA7r " },
          { translate: "ui.mythicus_sn.status_abilities.success.point_added" }
        ]
      });
    }
  });
  initEvent.itemComponentRegistry.registerCustomComponent("mythicus_sn:milk_cleanse_effects", {
    onCompleteUse(event) {
      const { source } = event;
      if (!(source instanceof Player20)) return;
      for (const effect of source.getEffects()) {
        source.removeEffect(effect.typeId);
      }
    }
  });
});

// data/scripts/modules/artisan/registry.ts
init_dist();
init_dimension();
import {
  EntityComponentTypes as EntityComponentTypes14,
  EquipmentSlot as EquipmentSlot7,
  GameMode as GameMode6,
  ItemStack as ItemStack6,
  MolangVariableMap as MolangVariableMap5,
  TicksPerSecond as TicksPerSecond13,
  system as system30,
  world as world28
} from "@minecraft/server";

// data/scripts/modules/status_abilities/index.ts
init_players();
init_constants();
init_storage();
import { system as system29 } from "@minecraft/server";

// data/scripts/modules/status_abilities/abilities/double_xp.ts
init_constants();
init_storage();
import { Player as Player21, world as world21 } from "@minecraft/server";
var MOB_XP_VALUES = {
  // Passive mobs
  "minecraft:chicken": 1,
  "minecraft:cow": 1,
  "minecraft:pig": 1,
  "minecraft:sheep": 1,
  "minecraft:rabbit": 1,
  "minecraft:horse": 1,
  "minecraft:donkey": 1,
  "minecraft:mule": 1,
  "minecraft:llama": 1,
  "minecraft:fox": 1,
  "minecraft:panda": 1,
  "minecraft:turtle": 1,
  "minecraft:bee": 1,
  "minecraft:cat": 1,
  "minecraft:ocelot": 1,
  "minecraft:parrot": 1,
  "minecraft:wolf": 1,
  // Hostile mobs
  "minecraft:zombie": 5,
  "minecraft:skeleton": 5,
  "minecraft:creeper": 5,
  "minecraft:spider": 5,
  "minecraft:enderman": 5,
  "minecraft:witch": 5,
  "minecraft:blaze": 10,
  "minecraft:ghast": 5,
  "minecraft:magma_cube": 4,
  "minecraft:slime": 4,
  "minecraft:phantom": 5,
  "minecraft:drowned": 5,
  "minecraft:husk": 5,
  "minecraft:stray": 5,
  "minecraft:wither_skeleton": 5,
  "minecraft:hoglin": 5,
  "minecraft:piglin": 5,
  "minecraft:piglin_brute": 20,
  "minecraft:zoglin": 5,
  "minecraft:ravager": 20,
  "minecraft:vindicator": 5,
  "minecraft:pillager": 5,
  "minecraft:evoker": 10,
  "minecraft:vex": 3,
  "minecraft:guardian": 10,
  "minecraft:elder_guardian": 10,
  "minecraft:shulker": 5,
  "minecraft:silverfish": 5,
  "minecraft:cave_spider": 5,
  // Boss mobs
  "minecraft:ender_dragon": 500,
  "minecraft:wither": 50,
  // Neutral mobs
  "minecraft:iron_golem": 0,
  "minecraft:snow_golem": 0,
  "minecraft:dolphin": 0,
  "minecraft:polar_bear": 1,
  // Seasonal mobs (custom)
  "mythicus_sn:seasons_pig": 1,
  "mythicus_sn:seasons_cow": 1,
  "mythicus_sn:seasons_chicken": 1,
  "mythicus_sn:seasons_rabbit": 1,
  "mythicus_sn:seasons_sheep": 1,
  "mythicus_sn:seasons_fox": 1
};
function getMobXPValue(typeId) {
  return MOB_XP_VALUES[typeId] ?? 0;
}
function tryDoubleXP(player, baseXP) {
  if (baseXP <= 0) return;
  const abilityData = getPlayerAbilityData(player);
  if (abilityData.doubleXP <= 0) return;
  const chancePercent = abilityData.doubleXP;
  if (Math.random() * 100 < chancePercent) {
    player.addExperience(baseXP);
    player.playSound(SOUNDS.DOUBLE_XP_TRIGGER);
  }
}
world21.afterEvents.entityDie.subscribe((event) => {
  const damageSource = event.damageSource;
  if (!damageSource.damagingEntity || damageSource.damagingEntity.typeId !== "minecraft:player") {
    return;
  }
  const player = damageSource.damagingEntity;
  const deadEntity = event.deadEntity;
  const baseXP = getMobXPValue(deadEntity.typeId);
  if (baseXP > 0) {
    tryDoubleXP(player, baseXP);
  }
});
world21.afterEvents.itemUse.subscribe((event) => {
  if (!(event.source instanceof Player21)) return;
  if (event.itemStack.typeId !== "minecraft:experience_bottle") return;
  const player = event.source;
  tryDoubleXP(player, 7);
});

// data/scripts/modules/status_abilities/abilities/double_harvest.ts
init_storage();
import { EntityComponentTypes as EntityComponentTypes11, system as system24, world as world22 } from "@minecraft/server";
world22.beforeEvents.playerBreakBlock.subscribe((event) => {
  const block = event.block.permutation;
  if (!block.hasTag("minecraft:crop")) return;
  const data = getPlayerAbilityData(event.player);
  if (data.doubleHarvest <= 0) return;
  const roll = Math.random() * 100;
  if (roll >= data.doubleHarvest) return;
  const existingItems = new Set(
    event.block.dimension.getEntities({
      type: "minecraft:item",
      location: event.block.location,
      maxDistance: 3
    }).map((e) => e.id)
  );
  system24.runTimeout(() => {
    const items = event.block.dimension.getEntities({
      type: "minecraft:item",
      location: event.block.location,
      maxDistance: 3
    });
    let duplicatedAny = false;
    for (const itemEntity of items) {
      if (existingItems.has(itemEntity.id)) continue;
      const itemComponent = itemEntity.getComponent(EntityComponentTypes11.Item);
      if (itemComponent?.itemStack) {
        const clonedItem = itemComponent.itemStack.clone();
        event.block.dimension.spawnItem(clonedItem, itemEntity.location);
        duplicatedAny = true;
      }
    }
    if (duplicatedAny) {
      event.player.playSound("random.levelup");
    }
  }, 2);
});

// data/scripts/modules/status_abilities/abilities/double_loot.ts
init_storage();
import { EntityItemComponent as EntityItemComponent2, system as system25, world as world23 } from "@minecraft/server";
var recentDuplications = /* @__PURE__ */ new Map();
var COOLDOWN_TICKS = 60;
function getLocationKey(x, y, z, radius = 2) {
  const chunkX = Math.floor(x / radius);
  const chunkY = Math.floor(y / radius);
  const chunkZ = Math.floor(z / radius);
  return `${chunkX},${chunkY},${chunkZ}`;
}
world23.afterEvents.entityDie.subscribe((event) => {
  const damageSource = event.damageSource;
  if (!damageSource.damagingEntity || damageSource.damagingEntity.typeId !== "minecraft:player") {
    return;
  }
  const player = damageSource.damagingEntity;
  const data = getPlayerAbilityData(player);
  if (data.doubleLoot <= 0) return;
  const roll = Math.random() * 100;
  if (roll >= data.doubleLoot) {
    return;
  }
  const locationKey = getLocationKey(
    event.deadEntity.location.x,
    event.deadEntity.location.y,
    event.deadEntity.location.z
  );
  const lastDuplication = recentDuplications.get(locationKey);
  const currentTick = system25.currentTick;
  if (lastDuplication && currentTick - lastDuplication < COOLDOWN_TICKS) {
    return;
  }
  system25.runTimeout(() => {
    const items = event.deadEntity.dimension.getEntities({
      type: "minecraft:item",
      location: event.deadEntity.location,
      maxDistance: 3
    });
    if (items.length === 0) {
      return;
    }
    const randomIndex = Math.floor(Math.random() * items.length);
    const randomItem = items[randomIndex];
    const itemComponent = randomItem.getComponent(EntityItemComponent2.componentId);
    if (itemComponent?.itemStack) {
      const clonedItem = itemComponent.itemStack.clone();
      clonedItem.amount = 1;
      event.deadEntity.dimension.spawnItem(clonedItem, randomItem.location);
      player.playSound("random.levelup");
      recentDuplications.set(locationKey, currentTick);
    }
  }, 1);
});

// data/scripts/modules/status_abilities/abilities/double_ore.ts
init_storage();
import { EntityComponentTypes as EntityComponentTypes12, system as system26, world as world24 } from "@minecraft/server";
world24.beforeEvents.playerBreakBlock.subscribe((event) => {
  const blockType = event.block.permutation.type.id;
  if (!blockType.includes("ore")) return;
  const data = getPlayerAbilityData(event.player);
  if (data.doubleOre <= 0) return;
  const roll = Math.random() * 100;
  if (roll >= data.doubleOre) {
    return;
  }
  const existingItems = new Set(
    event.block.dimension.getEntities({
      type: "minecraft:item",
      location: event.block.location,
      maxDistance: 2
    }).map((e) => e.id)
  );
  system26.runTimeout(() => {
    const items = event.block.dimension.getEntities({
      type: "minecraft:item",
      location: event.block.location,
      maxDistance: 2
    });
    let duplicatedAny = false;
    for (const itemEntity of items) {
      if (existingItems.has(itemEntity.id)) {
        continue;
      }
      const itemComponent = itemEntity.getComponent(EntityComponentTypes12.Item);
      if (itemComponent?.itemStack) {
        const clonedItem = itemComponent.itemStack.clone();
        event.block.dimension.spawnItem(clonedItem, itemEntity.location);
        duplicatedAny = true;
      }
    }
    if (duplicatedAny) {
      event.player.playSound("random.levelup");
    }
  }, 1);
});

// data/scripts/modules/status_abilities/abilities/regeneration_on_hit.ts
init_storage();
import { Player as Player23, world as world25 } from "@minecraft/server";
world25.afterEvents.entityHurt.subscribe((event) => {
  if (!(event.hurtEntity instanceof Player23)) return;
  const player = event.hurtEntity;
  const data = getPlayerAbilityData(player);
  if (data.regenerationOnHit <= 0) return;
  const chance = data.regenerationOnHit * 0.2;
  const roll = Math.random() * 100;
  if (roll >= chance) return;
  player.addEffect("regeneration", 60, { amplifier: 4 });
  player.playSound("random.levelup");
});

// data/scripts/modules/status_abilities/abilities/increase_damage.ts
init_storage();
import { world as world26 } from "@minecraft/server";
world26.afterEvents.entityHurt.subscribe((event) => {
  const damageSource = event.damageSource;
  if (!damageSource.damagingEntity || damageSource.damagingEntity.typeId !== "minecraft:player") {
    return;
  }
  const player = damageSource.damagingEntity;
  const data = getPlayerAbilityData(player);
  if (data.increaseDamage <= 0) return;
  const bonusDamage = data.increaseDamage * 0.5;
  event.hurtEntity.applyDamage(bonusDamage, {
    cause: damageSource.cause,
    damagingEntity: player
  });
});

// data/scripts/modules/status_abilities/index.ts
init_increase_hearts();

// data/scripts/modules/status_abilities/abilities/increase_defense.ts
init_storage();
import { EntityComponentTypes as EntityComponentTypes13, Player as Player25, system as system27, world as world27 } from "@minecraft/server";
world27.afterEvents.entityHurt.subscribe((event) => {
  if (!(event.hurtEntity instanceof Player25)) return;
  const player = event.hurtEntity;
  const data = getPlayerAbilityData(player);
  if (data.increaseDefense <= 0) return;
  const reductionPercent = data.increaseDefense * 0.5;
  const damageReduced = event.damage * (reductionPercent / 100);
  system27.runTimeout(() => {
    const health = player.getComponent(EntityComponentTypes13.Health);
    if (!health || health.currentValue <= 0) return;
    const newHealth = Math.min(
      health.currentValue + damageReduced,
      health.effectiveMax
    );
    health.setCurrentValue(newHealth);
  }, 1);
});

// data/scripts/modules/status_abilities/commands.ts
init_dist();
init_storage();
import { Player as Player26, system as system28 } from "@minecraft/server";
system28.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== "mythicus_sn:status_ability") return;
  const message = event.message.trim();
  const sourceEntity = event.sourceEntity;
  if (!sourceEntity || !(sourceEntity instanceof Player26)) return;
  const player = sourceEntity;
  if (message === "reset") {
    resetPlayerAbilities(player);
  } else if (message === "add_points") {
    const data = getPlayerAbilityData(player);
    data.skillPoints += 100;
    data.advanceSkillPoints += 100;
    data.masterSkillPoints += 100;
    markDirty(player);
    player.sendMessage({
      rawtext: [{ translate: "ui.mythicus_sn.status_abilities.add_points_success" }]
    });
    player.playSound("random.click");
  }
});
function resetPlayerAbilities(player) {
  player.runCommand("effect @s clear health_boost");
  const storage2 = new PropertyStorage(player, "mythicus_sn:abilities");
  storage2.drop("data");
  playerAbilityCache.delete(player.id);
  player.sendMessage({
    rawtext: [{ translate: "ui.mythicus_sn.status_abilities.reset_success" }]
  });
  player.playSound("random.click");
}

// data/scripts/modules/status_abilities/index.ts
init_storage();
init_status_ui();
system29.runInterval(() => {
  flushAll();
}, FLUSH_INTERVAL_TICKS);
system29.runInterval(() => {
  const activePlayers = getAllPlayers();
  const activePlayerIds = new Set(activePlayers.map((p) => p.id));
  cleanupStaleCache(activePlayerIds);
}, FLUSH_INTERVAL_TICKS * 6);

// data/scripts/modules/artisan/registry.ts
var storage = new PropertyStorage(world28, "mythicus_sn:artisan_blocks");
var blocksById = /* @__PURE__ */ new Map();
var DEFAULT_STAGE_UPDATE_INTERVAL = TicksPerSecond13 * 4;
var DEFAULT_CACHE_FLUSH_INTERVAL = TicksPerSecond13 * 5;
var FACING_OFFSETS = {
  "north": { x: 0, z: -0.5 },
  "south": { x: 0, z: 0.5 },
  "east": { x: 0.5, z: 0 },
  "west": { x: -0.5, z: 0 }
};
var stageUpdateIntervalId;
var cacheFlushIntervalId;
var componentRegistry;
var registeredComponentIds = /* @__PURE__ */ new Set();
system30.beforeEvents.startup.subscribe((event) => {
  componentRegistry = event.blockComponentRegistry;
  for (const state of blocksById.values()) {
    registerComponent(state, componentRegistry);
  }
});
function activateIntervals() {
  if (stageUpdateIntervalId === void 0) {
    stageUpdateIntervalId = system30.runInterval(updateAllStages, DEFAULT_STAGE_UPDATE_INTERVAL);
  }
  if (cacheFlushIntervalId === void 0) {
    cacheFlushIntervalId = system30.runInterval(flushAllCaches, DEFAULT_CACHE_FLUSH_INTERVAL);
  }
}
function getBlockSafe(dimensionId, location) {
  const dimension = getDimension(dimensionId);
  if (!dimension.isChunkLoaded(location)) return void 0;
  return dimension.getBlock(location);
}
function getFacingOffset(block) {
  if (!block?.isValid) return { x: 0, z: 0 };
  const facing = block.permutation.getState("minecraft:cardinal_direction");
  if (facing && facing in FACING_OFFSETS) {
    return FACING_OFFSETS[facing];
  }
  return { x: 0, z: 0 };
}
function getCache(state) {
  if (!state.cache) {
    const stored = storage.get(state.config.storageKey, true);
    state.cache = stored ? { ...stored } : {};
  }
  return state.cache;
}
function markDirty2(state) {
  state.dirty = true;
}
function flushState(state) {
  if (!state.dirty || !state.cache) {
    return;
  }
  storage.set(state.config.storageKey, state.cache);
  state.dirty = false;
}
function flushAllCaches() {
  for (const state of blocksById.values()) {
    flushState(state);
  }
}
function getLocationKey2(dimensionId, location) {
  const x = Math.floor(location.x);
  const y = Math.floor(location.y);
  const z = Math.floor(location.z);
  return `${dimensionId}:${x},${y},${z}`;
}
function parseLocationKey(key) {
  const lastColonIndex = key.lastIndexOf(":");
  if (lastColonIndex === -1) {
    return void 0;
  }
  const dimensionId = key.substring(0, lastColonIndex);
  const coords = key.substring(lastColonIndex + 1);
  if (!dimensionId || !coords) {
    return void 0;
  }
  const [xString, yString, zString] = coords.split(",");
  const x = Number(xString);
  const y = Number(yString);
  const z = Number(zString);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return void 0;
  }
  return {
    dimensionId,
    location: { x, y, z }
  };
}
function getProcessingData(state, dimensionId, location) {
  const cache2 = getCache(state);
  return cache2[getLocationKey2(dimensionId, location)];
}
function setProcessingData(state, dimensionId, location, data) {
  const cache2 = getCache(state);
  cache2[getLocationKey2(dimensionId, location)] = data;
  markDirty2(state);
}
function clearProcessingData(state, dimensionId, location) {
  const cache2 = getCache(state);
  const key = getLocationKey2(dimensionId, location);
  if (cache2[key]) {
    delete cache2[key];
    markDirty2(state);
  }
}
function resetBlockState(block, processingState) {
  setProcessingStage(block, processingState, 0);
}
function setProcessingStage(block, processingState, stage) {
  const permutation = block.permutation;
  const currentValue = permutation.getState(processingState);
  if (typeof currentValue !== "number" || currentValue !== stage) {
    const updatedPermutation = permutation.withState(processingState, stage);
    block.setPermutation(updatedPermutation);
  }
}
function computeStage(elapsedTicks, totalTicks, progressStageCount, stageIntervalTicks) {
  if (elapsedTicks <= 0) {
    return 1;
  }
  const clampedProgressCount = Math.max(1, progressStageCount);
  const interval = Math.max(
    1,
    stageIntervalTicks ?? Math.floor(totalTicks / clampedProgressCount)
  );
  const rawStage = Math.floor(elapsedTicks / interval) + 1;
  return Math.max(1, Math.min(clampedProgressCount, rawStage));
}
function updateAllStages() {
  for (const state of blocksById.values()) {
    updateStagesForBlock(state);
  }
}
function updateStagesForBlock(state) {
  const cache2 = getCache(state);
  const keys = Object.keys(cache2);
  if (keys.length === 0) {
    return;
  }
  for (const key of keys) {
    const parsed = parseLocationKey(key);
    if (!parsed) {
      continue;
    }
    const { dimensionId, location } = parsed;
    const dimension = getDimension(dimensionId);
    if (!dimension.isChunkLoaded(location)) continue;
    const block = getBlockSafe(dimensionId, location);
    if (!block || block.typeId !== state.config.blockId) {
      clearProcessingData(state, dimensionId, location);
      continue;
    }
    const data = getProcessingData(state, dimensionId, location);
    if (!data) {
      resetBlockState(block, state.config.processingState);
      continue;
    }
    const elapsed = world28.getAbsoluteTime() - data.startTick;
    const effectiveStage = elapsed >= data.totalTicks ? state.config.progressStageCount : computeStage(
      elapsed,
      data.totalTicks,
      state.config.progressStageCount,
      state.config.stageIntervalTicks
    );
    setProcessingStage(block, state.config.processingState, effectiveStage);
    if (state.config.processingParticle && elapsed < data.totalTicks) {
      const particleConfig = state.config.processingParticle;
      const facingOffset = getFacingOffset(block);
      const molangVariables = new MolangVariableMap5();
      molangVariables.setFloat("variable.offset_x", facingOffset.x);
      molangVariables.setFloat("variable.offset_z", facingOffset.z);
      const baseOffsetX = particleConfig.offsetX ?? 0.5;
      const baseOffsetY = particleConfig.offsetY ?? 1;
      const baseOffsetZ = particleConfig.offsetZ ?? 0.5;
      block.dimension.spawnParticle(particleConfig.particleId, {
        x: block.x + baseOffsetX,
        y: block.y + baseOffsetY,
        z: block.z + baseOffsetZ
      }, molangVariables);
    }
  }
}
function setActionBar(player, translate, withArgs) {
  const rawtext = withArgs ? [
    {
      translate,
      with: withArgs.map((value) => String(value))
    }
  ] : [
    {
      translate
    }
  ];
  system30.run(() => {
    if (!player?.isValid) return;
    player.onScreenDisplay.setActionBar(rawtext);
  });
}
function formatTicksToDurationString(ticks) {
  const totalSeconds = Math.max(0, Math.ceil(ticks / TicksPerSecond13));
  let remainder = totalSeconds;
  const segments = [];
  const secondsPerDay = 86400;
  const secondsPerHour = 3600;
  const secondsPerMinute = 60;
  if (remainder >= secondsPerDay) {
    const days = Math.floor(remainder / secondsPerDay);
    segments.push(`${days}d`);
    remainder -= days * secondsPerDay;
  }
  if (remainder >= secondsPerHour) {
    const hours = Math.floor(remainder / secondsPerHour);
    if (hours > 0) {
      segments.push(`${hours}h`);
    }
    remainder -= hours * secondsPerHour;
  }
  if (remainder >= secondsPerMinute) {
    const minutes = Math.floor(remainder / secondsPerMinute);
    if (minutes > 0) {
      segments.push(`${minutes}m`);
    }
    remainder -= minutes * secondsPerMinute;
  }
  if (remainder > 0 || segments.length === 0) {
    segments.push(`${remainder}s`);
  }
  return segments.join(" ");
}
function playSound(block, soundId) {
  if (!soundId) {
    return;
  }
  const pitch = Math.random() * 0.1 + 0.95;
  block.dimension.playSound(soundId, {
    x: block.x + 0.5,
    y: block.y + 0.5,
    z: block.z + 0.5
  }, { volume: 1, pitch });
}
function spawnItem(block, itemId) {
  if (!block.dimension.isChunkLoaded(block)) return;
  const drop = new ItemStack6(itemId, 1);
  const lore = getItemLore(itemId);
  if (lore) {
    drop.setLore(lore);
  }
  block.dimension.spawnItem(drop, {
    x: block.x + 0.5,
    y: block.y + 0.5,
    z: block.z + 0.5
  });
}
function deliverFinishedProduct(block, player, data, state) {
  let outputItem;
  if (data.outputItemId) {
    outputItem = new ItemStack6(data.outputItemId, 1);
    const lore = getItemLore(data.outputItemId);
    if (lore) {
      outputItem.setLore(lore);
    }
  }
  if (!outputItem) {
    spawnItem(block, data.inputItemId);
    clearProcessingData(state, block.dimension.id, block);
    setProcessingStage(block, state.config.processingState, 0);
    return;
  }
  const spawnLocation = {
    x: block.x + 0.5,
    y: block.y + 1,
    z: block.z + 0.5
  };
  block.dimension.spawnItem(outputItem, spawnLocation);
  block.dimension.spawnParticle("minecraft:crop_growth_emitter", { x: block.x, y: block.y + 0.5, z: block.z });
  const byproductId = state.config.byproducts?.[data.inputItemId];
  if (byproductId) {
    spawnItem(block, byproductId);
  }
  if (player?.isValid && state.config.xpReward && state.config.xpReward > 0) {
    player.addExperience(state.config.xpReward);
    tryDoubleXP(player, state.config.xpReward);
  }
  playSound(block, state.config.sounds?.complete);
  setActionBar(player, state.config.messages.success);
  clearProcessingData(state, block.dimension.id, block);
  setProcessingStage(block, state.config.processingState, 0);
}
function startProcessing(block, inputItemId, outputItemId, state) {
  const data = {
    inputItemId,
    outputItemId,
    startTick: world28.getAbsoluteTime(),
    totalTicks: state.config.totalProcessTicks
  };
  setProcessingData(state, block.dimension.id, block, data);
  setProcessingStage(block, state.config.processingState, 1);
  playSound(block, state.config.sounds?.start);
  block.dimension.playSound("block.decorated_pot.insert", { x: block.x, y: block.y, z: block.z });
}
function consumeHeldItem(player, heldItem, slot) {
  if (!slot) {
    return;
  }
  if (player.getGameMode() === GameMode6.Creative) {
    return;
  }
  if (heldItem.amount > 1) {
    heldItem.amount -= 1;
    slot.setItem(heldItem);
  } else {
    slot.setItem();
  }
}
function handleInteraction(block, player, state) {
  const jarData = getProcessingData(state, block.dimension.id, block);
  const absoluteTime = world28.getAbsoluteTime();
  const equippable = player.getComponent(EntityComponentTypes14.Equippable);
  const mainhandSlot = equippable?.getEquipmentSlot(EquipmentSlot7.Mainhand);
  const heldItem = mainhandSlot?.getItem();
  if (jarData) {
    const elapsed = absoluteTime - jarData.startTick;
    if (elapsed >= jarData.totalTicks) {
      deliverFinishedProduct(block, player, jarData, state);
      return;
    }
    if (heldItem) {
      setActionBar(player, state.config.messages.busy);
    } else {
      const ticksRemaining = Math.max(jarData.totalTicks - elapsed, 0);
      const formattedDuration = formatTicksToDurationString(ticksRemaining);
      setActionBar(player, state.config.messages.duration, [formattedDuration]);
    }
    playSound(block, state.config.sounds?.deny);
    return;
  }
  if (!heldItem) {
    setActionBar(player, state.config.messages.insertItem);
    playSound(block, state.config.sounds?.deny);
    return;
  }
  const outputItemId = state.config.recipes[heldItem.typeId];
  if (!outputItemId) {
    setActionBar(player, state.config.messages.invalidItem);
    playSound(block, state.config.sounds?.deny);
    return;
  }
  startProcessing(block, heldItem.typeId, outputItemId, state);
  consumeHeldItem(player, heldItem, mainhandSlot);
}
function handleBlockBreak(state, dimensionId, location) {
  const data = getProcessingData(state, dimensionId, location);
  if (!data) {
    return;
  }
  const elapsed = world28.getAbsoluteTime() - data.startTick;
  const dropItemId = elapsed >= data.totalTicks ? data.outputItemId : data.inputItemId;
  const block = getBlockSafe(dimensionId, location);
  if (block && block.typeId === state.config.blockId) {
    spawnItem(block, dropItemId);
    setProcessingStage(block, state.config.processingState, 0);
  } else {
    const dimension = getDimension(dimensionId);
    if (dimension.isChunkLoaded(location)) {
      const itemStack = new ItemStack6(dropItemId, 1);
      const lore = getItemLore(dropItemId);
      if (lore) {
        itemStack.setLore(lore);
      }
      dimension.spawnItem(itemStack, {
        x: location.x + 0.5,
        y: location.y + 0.5,
        z: location.z + 0.5
      });
    }
  }
  clearProcessingData(state, dimensionId, location);
}
function registerComponent(state, registry) {
  if (!registry) {
    return;
  }
  if (registeredComponentIds.has(state.componentId)) {
    return;
  }
  const component = {
    onPlace: (event) => {
      resetBlockState(event.block, state.config.processingState);
      clearProcessingData(state, event.dimension.id, event.block);
    },
    onPlayerBreak: (event) => {
      handleBlockBreak(state, event.dimension.id, event.block);
    },
    onPlayerInteract: (event) => {
      if (!event.player) {
        return;
      }
      handleInteraction(event.block, event.player, state);
    }
  };
  component.onBreak = (event) => {
    handleBlockBreak(state, event.dimension.id, event.block);
  };
  registry.registerCustomComponent(state.componentId, component);
  registeredComponentIds.add(state.componentId);
}
function computeComponentId(blockId) {
  const [namespace, name] = blockId.split(":");
  if (!namespace || !name) {
    throw new Error(`Invalid block identifier "${blockId}"`);
  }
  return `${namespace}:${name}_component`;
}
function registerArtisanBlock(config) {
  if (blocksById.has(config.blockId)) {
    throw new Error(`Artisan block already registered for ${config.blockId}`);
  }
  if (config.progressStageCount <= 0) {
    throw new Error(`progressStageCount must be greater than zero for ${config.blockId}`);
  }
  const componentId = config.componentId ?? computeComponentId(config.blockId);
  const state = {
    config,
    componentId,
    dirty: false
  };
  blocksById.set(config.blockId, state);
  registerComponent(state, componentRegistry);
  activateIntervals();
}

// data/scripts/modules/artisan/blocks/preserves_jar.ts
var PRESERVES_JAR_RECIPES = {
  "mythicus_sn:strawberry": "mythicus_sn:strawberry_jam",
  "mythicus_sn:cauliflower": "mythicus_sn:pickled_cauliflower",
  "mythicus_sn:green_bean": "mythicus_sn:pickled_green_beans",
  "mythicus_sn:garlic": "mythicus_sn:pickled_garlic",
  "mythicus_sn:blueberry": "mythicus_sn:blueberry_jam",
  "mythicus_sn:tomatoes": "mythicus_sn:pickled_tomato",
  "mythicus_sn:corn": "mythicus_sn:pickled_corn",
  "mythicus_sn:hot_pepper": "mythicus_sn:pickled_hot_peppers",
  "mythicus_sn:broccoli": "mythicus_sn:pickled_broccoli",
  "mythicus_sn:eggplant": "mythicus_sn:pickled_eggplant",
  "mythicus_sn:beet": "mythicus_sn:pickled_beet",
  "mythicus_sn:cranberry": "mythicus_sn:cranberry_jam"
};
var PRESERVES_JAR_CONFIG = {
  blockId: "mythicus_sn:preservers_jar",
  processingState: "mythicus_sn:processing_stage",
  storageKey: "preservesJar",
  componentId: "mythicus_sn:preserves_jar_component",
  recipes: PRESERVES_JAR_RECIPES,
  totalProcessTicks: 96e3,
  progressStageCount: 4,
  xpReward: 12,
  sounds: {
    start: "season.mythicus_sn.preserve_jar.fill",
    complete: "season.mythicus_sn.preserve_jar.empty",
    deny: "season.mythicus_sn.preserve_jar.deny"
  },
  messages: {
    busy: "artisan.block.fail2",
    invalidItem: "artisan.block.fail1",
    insertItem: "artisan.block.insert",
    duration: "artisan.block.duration",
    success: "artisan.block.ending"
  },
  processingParticle: {
    particleId: "mythicus_sn:keg_process",
    interval: 20
  }
};
registerArtisanBlock(PRESERVES_JAR_CONFIG);

// data/scripts/modules/artisan/blocks/dehydrator.ts
var DEHYDRATOR_RECIPES = {
  "mythicus_sn:strawberry": "mythicus_sn:dried_strawberry",
  "mythicus_sn:cauliflower": "mythicus_sn:dried_cauliflower",
  "mythicus_sn:green_bean": "mythicus_sn:dried_green_beans",
  "mythicus_sn:garlic": "mythicus_sn:dried_garlic",
  "mythicus_sn:blueberry": "mythicus_sn:dried_blueberry",
  "mythicus_sn:tomatoes": "mythicus_sn:dried_tomato",
  "mythicus_sn:corn": "mythicus_sn:dried_corn",
  "mythicus_sn:hot_pepper": "mythicus_sn:dried_hot_peppers",
  "mythicus_sn:cranberry": "mythicus_sn:dried_cranberry",
  "mythicus_sn:broccoli": "mythicus_sn:dried_broccoli",
  "mythicus_sn:eggplant": "mythicus_sn:dried_eggplant",
  "mythicus_sn:beet": "mythicus_sn:dried_beet"
};
var DEHYDRATOR_CONFIG = {
  blockId: "mythicus_sn:dehydrator",
  processingState: "mythicus_sn:processing_stage",
  storageKey: "dehydrator",
  componentId: "mythicus_sn:dehydrator_component",
  recipes: DEHYDRATOR_RECIPES,
  totalProcessTicks: 48e3,
  progressStageCount: 2,
  stageIntervalTicks: 24e3,
  xpReward: 6,
  sounds: {
    start: "season.mythicus_sn.dehydrator.fill",
    complete: "season.mythicus_sn.dehydrator.empty",
    deny: "season.mythicus_sn.dehydrator.deny"
  },
  messages: {
    busy: "artisan.block.fail2",
    invalidItem: "artisan.block.fail1",
    insertItem: "artisan.block.insert",
    duration: "artisan.block.duration",
    success: "artisan.block.ending"
  },
  processingParticle: {
    particleId: "mythicus_sn:dehydrator_process",
    interval: 20
  }
};
registerArtisanBlock(DEHYDRATOR_CONFIG);

// data/scripts/modules/artisan/blocks/keg.ts
var KEG_RECIPES = {
  "mythicus_sn:strawberry": "mythicus_sn:strawberry_juice",
  "mythicus_sn:blueberry": "mythicus_sn:blueberry_juice",
  "mythicus_sn:tomatoes": "mythicus_sn:tomato_juice",
  "mythicus_sn:cranberry": "mythicus_sn:cranberry_juice",
  "mythicus_sn:beet": "mythicus_sn:beet_juice"
};
var KEG_CONFIG = {
  blockId: "mythicus_sn:keg",
  processingState: "mythicus_sn:processing_stage",
  storageKey: "keg",
  componentId: "mythicus_sn:keg_component",
  recipes: KEG_RECIPES,
  totalProcessTicks: 12e4,
  progressStageCount: 5,
  stageIntervalTicks: 24e3,
  xpReward: 15,
  sounds: {
    start: "season.mythicus_sn.keg.fill",
    complete: "season.mythicus_sn.keg.empty",
    deny: "season.mythicus_sn.keg.deny"
  },
  messages: {
    busy: "artisan.block.fail2",
    invalidItem: "artisan.block.fail1",
    insertItem: "artisan.block.insert",
    duration: "artisan.block.duration",
    success: "artisan.block.ending"
  },
  processingParticle: {
    particleId: "mythicus_sn:keg_process",
    interval: 20
  }
};
registerArtisanBlock(KEG_CONFIG);

// data/scripts/modules/artisan/blocks/mortar_pestle.ts
var MORTAR_PESTLE_RECIPES = {
  "mythicus_sn:cauliflower": "mythicus_sn:cauliflower_flour",
  "mythicus_sn:green_bean": "mythicus_sn:green_beans_paste",
  "mythicus_sn:garlic": "mythicus_sn:garlic_powder",
  "mythicus_sn:corn": "mythicus_sn:corn_flour",
  "mythicus_sn:hot_pepper": "mythicus_sn:hot_pepper_paste",
  "mythicus_sn:broccoli": "mythicus_sn:broccoli_paste",
  "mythicus_sn:eggplant": "mythicus_sn:eggplant_paste"
};
var MORTAR_PESTLE_CONFIG = {
  blockId: "mythicus_sn:mortar_pestle",
  processingState: "mythicus_sn:processing_stage",
  storageKey: "mortarPestle",
  componentId: "mythicus_sn:mortar_pestle_component",
  recipes: MORTAR_PESTLE_RECIPES,
  totalProcessTicks: 24e3,
  progressStageCount: 1,
  xpReward: 3,
  sounds: {
    start: "season.mythicus_sn.mp.fill",
    complete: "season.mythicus_sn.mp.empty",
    deny: "season.mythicus_sn.mp.deny"
  },
  messages: {
    busy: "artisan.block.fail2",
    invalidItem: "artisan.block.fail1",
    insertItem: "artisan.block.insert",
    duration: "artisan.block.duration",
    success: "artisan.block.ending"
  },
  processingParticle: {
    particleId: "mythicus_sn:mortar_process",
    interval: 20
  }
};
registerArtisanBlock(MORTAR_PESTLE_CONFIG);

// data/scripts/modules/artisan/blocks/loom.ts
var WOOL_ITEM_IDS = [
  "mythicus_sn:quality_wool"
];
var LOOM_RECIPES = {
  "mythicus_sn:fabric": "mythicus_sn:cloth",
  "mythicus_sn:cloth": "mythicus_sn:carpet"
};
for (const woolId of WOOL_ITEM_IDS) {
  LOOM_RECIPES[woolId] = "mythicus_sn:fabric";
}
var LOOM_CONFIG = {
  blockId: "mythicus_sn:loom",
  processingState: "mythicus_sn:processing_stage",
  storageKey: "loom",
  componentId: "mythicus_sn:loom_component",
  recipes: LOOM_RECIPES,
  totalProcessTicks: 24e3,
  progressStageCount: 1,
  xpReward: 3,
  sounds: {
    start: "season.mythicus_sn.loom.fill",
    complete: "season.mythicus_sn.loom.empty",
    deny: "season.mythicus_sn.loom.deny"
  },
  messages: {
    busy: "artisan.block.fail2",
    invalidItem: "artisan.block.fail1",
    insertItem: "artisan.block.insert",
    duration: "artisan.block.duration",
    success: "artisan.block.ending"
  },
  processingParticle: {
    particleId: "mythicus_sn:loom_process",
    interval: 20
  }
};
registerArtisanBlock(LOOM_CONFIG);

// data/scripts/modules/artisan/blocks/cheese_press.ts
var CHEESE_PRESS_RECIPES = {
  "mythicus_sn:bottle_of_milk": "mythicus_sn:cheese"
};
var CHEESE_PRESS_BYPRODUCTS = {
  "mythicus_sn:bottle_of_milk": "minecraft:glass_bottle"
};
var CHEESE_PRESS_CONFIG = {
  blockId: "mythicus_sn:cheese_press",
  processingState: "mythicus_sn:processing_stage",
  storageKey: "cheesePress",
  componentId: "mythicus_sn:cheese_press_component",
  recipes: CHEESE_PRESS_RECIPES,
  byproducts: CHEESE_PRESS_BYPRODUCTS,
  totalProcessTicks: 24e3,
  progressStageCount: 1,
  stageIntervalTicks: 24e3,
  xpReward: 3,
  sounds: {
    start: "season.mythicus_sn.cheese_press.fill",
    complete: "season.mythicus_sn.cheese_press.empty",
    deny: "season.mythicus_sn.cheese_press.deny"
  },
  messages: {
    busy: "artisan.block.fail2",
    invalidItem: "artisan.block.fail1",
    insertItem: "artisan.block.insert",
    duration: "artisan.block.duration",
    success: "artisan.block.ending"
  },
  processingParticle: {
    particleId: "mythicus_sn:cheese_process",
    interval: 20
  }
};
registerArtisanBlock(CHEESE_PRESS_CONFIG);

// data/scripts/modules/artisan/blocks/mayonnaise_machine.ts
var MAYONNAISE_RECIPES = {
  "mythicus_sn:egg": "mythicus_sn:mayonnaise"
};
var MAYONNAISE_MACHINE_CONFIG = {
  blockId: "mythicus_sn:mayonnaise_machine",
  processingState: "mythicus_sn:processing_stage",
  storageKey: "mayonnaiseMachine",
  componentId: "mythicus_sn:mayonnaise_machine_component",
  recipes: MAYONNAISE_RECIPES,
  totalProcessTicks: 24e3,
  progressStageCount: 2,
  stageIntervalTicks: 12e3,
  xpReward: 3,
  sounds: {
    start: "season.mythicus_sn.mayo_machine.fill",
    complete: "season.mythicus_sn.mayo_machine.empty",
    deny: "season.mythicus_sn.mayo_machine.deny"
  },
  messages: {
    busy: "artisan.block.fail2",
    invalidItem: "artisan.block.fail1",
    insertItem: "artisan.block.insert",
    duration: "artisan.block.duration",
    success: "artisan.block.ending"
  },
  processingParticle: {
    particleId: "mythicus_sn:mayo_process",
    interval: 20
  }
};
registerArtisanBlock(MAYONNAISE_MACHINE_CONFIG);

// data/scripts/modules/vendor/vendor_block.ts
init_lib();
init_particles();
import {
  EntityComponentTypes as EntityComponentTypes15,
  EquipmentSlot as EquipmentSlot8,
  GameMode as GameMode7,
  ItemStack as ItemStack7,
  TicksPerSecond as TicksPerSecond14,
  system as system31
} from "@minecraft/server";
var VENDOR_PRICES = {
  "mythicus_sn:beet": 1,
  "mythicus_sn:blueberry": 1,
  "mythicus_sn:broccoli": 3,
  "mythicus_sn:cauliflower": 5,
  "mythicus_sn:corn": 3,
  "mythicus_sn:cranberry": 5,
  "mythicus_sn:eggplant": 4,
  "mythicus_sn:garlic": 10,
  "mythicus_sn:green_bean": 3,
  "mythicus_sn:hot_pepper": 2,
  "mythicus_sn:strawberry": 1,
  "mythicus_sn:tomatoes": 1,
  "mythicus_sn:blueberry_jam": 3,
  "mythicus_sn:cranberry_jam": 15,
  "mythicus_sn:strawberry_jam": 3,
  "mythicus_sn:beet_juice": 4,
  "mythicus_sn:blueberry_juice": 4,
  "mythicus_sn:cranberry_juice": 20,
  "mythicus_sn:strawberry_juice": 4,
  "mythicus_sn:tomato_juice": 5,
  "mythicus_sn:dried_beet": 2,
  "mythicus_sn:dried_blueberry": 2,
  "mythicus_sn:dried_broccoli": 6,
  "mythicus_sn:dried_cauliflower": 10,
  "mythicus_sn:dried_corn": 6,
  "mythicus_sn:dried_cranberry": 10,
  "mythicus_sn:dried_eggplant": 8,
  "mythicus_sn:dried_garlic": 20,
  "mythicus_sn:dried_green_beans": 6,
  "mythicus_sn:dried_hot_peppers": 4,
  "mythicus_sn:dried_strawberry": 3,
  "mythicus_sn:dried_tomato": 2,
  "mythicus_sn:broccoli_paste": 5,
  "mythicus_sn:eggplant_paste": 6,
  "mythicus_sn:green_beans_paste": 5,
  "mythicus_sn:hot_pepper_paste": 3,
  "mythicus_sn:pickled_beet": 3,
  "mythicus_sn:pickled_broccoli": 9,
  "mythicus_sn:pickled_cauliflower": 15,
  "mythicus_sn:pickled_corn": 9,
  "mythicus_sn:pickled_eggplant": 12,
  "mythicus_sn:pickled_garlic": 30,
  "mythicus_sn:pickled_green_beans": 9,
  "mythicus_sn:pickled_hot_peppers": 6,
  "mythicus_sn:pickled_tomato": 4,
  "mythicus_sn:bottle_of_milk": 1,
  "mythicus_sn:cheese": 3,
  "mythicus_sn:mayonnaise": 3,
  "mythicus_sn:carpet": 5,
  "mythicus_sn:cloth": 3,
  "mythicus_sn:fabric": 2,
  "mythicus_sn:quality_wool": 1,
  "mythicus_sn:cauliflower_flour": 8,
  "mythicus_sn:corn_flour": 5,
  "mythicus_sn:garlic_powder": 15,
  "mythicus_sn:truffle": 3,
  "mythicus_sn:quality_honey": 1,
  "mythicus_sn:thick_pelt": 1,
  "mythicus_sn:feather": 1,
  "mythicus_sn:egg": 1
};
function handleVendorInteraction(block, player) {
  const equippable = player.getComponent(EntityComponentTypes15.Equippable);
  const mainhandSlot = equippable?.getEquipmentSlot(EquipmentSlot8.Mainhand);
  const heldItem = mainhandSlot?.getItem();
  if (!heldItem) {
    setActionBar2(player, "ui.mythicus_sn.vendor.hold_item");
    playSound2(block, "random.click");
    return;
  }
  const price = VENDOR_PRICES[heldItem.typeId];
  if (!price) {
    playSound2(block, "block.false_permissions");
    setActionBar2(player, "ui.mythicus_sn.vendor.cannot_sell");
    return;
  }
  const amount = heldItem.amount;
  const totalEmeralds = price * amount;
  consumeHeldItem2(player, mainhandSlot);
  spawnPolishedEmeralds(block, totalEmeralds);
  playSound2(block, "sounds.mythicus.vendor.sale");
  spawnSuccessParticle(block);
  setActionBar2(player, "ui.mythicus_sn.vendor.sold_success", [amount, totalEmeralds]);
}
var vendorCooldownMap = /* @__PURE__ */ new Map();
var VENDOR_COOLDOWN_TICKS = 300 * TicksPerSecond14;
function handleVendorSneakInteract(block, player) {
  const playerId = player.id;
  const currentTick = system31.currentTick;
  const spawnlocation1 = block.location;
  const spawnlocation2 = Vector3Utils.add(block.location, { x: 1, y: 0, z: 1 });
  const lastInteraction = vendorCooldownMap.get(playerId);
  if (lastInteraction && currentTick - lastInteraction < VENDOR_COOLDOWN_TICKS) {
    const ticksElapsed = currentTick - lastInteraction;
    const ticksRemaining = VENDOR_COOLDOWN_TICKS - ticksElapsed;
    const remainingMinutes = Math.ceil(ticksRemaining / (60 * TicksPerSecond14));
    setActionBar2(player, "ui.mythicus_sn.vendor.cooldown", [remainingMinutes]);
    playSound2(block, "season.mythicus_sn.cheese_press.deny");
    return;
  }
  block.dimension.spawnEntity("mythicus_sn:skill_trader", spawnlocation1);
  block.dimension.spawnEntity("mythicus_sn:botanist_trader", spawnlocation2);
  vendorCooldownMap.set(playerId, currentTick);
  setActionBar2(player, "ui.mythicus_sn.vendor.traders_spawned");
  playSound2(block, "season.mythicus_sn.vendor_block.spawn");
}
function consumeHeldItem2(player, slot) {
  if (!slot) {
    return;
  }
  if (player.getGameMode() === GameMode7.Creative) {
    return;
  }
  slot.setItem();
}
function spawnPolishedEmeralds(block, amount) {
  const MAX_STACK = 255;
  const spawnLocation = {
    x: block.x + 0.5,
    y: block.y + 1,
    z: block.z + 0.5
  };
  if (!block.dimension.isChunkLoaded(block)) return;
  while (amount > 0) {
    const spawnAmount = Math.min(amount, MAX_STACK);
    const emeraldStack = new ItemStack7("mythicus_sn:polished_emerald", spawnAmount);
    block.dimension.spawnItem(emeraldStack, spawnLocation);
    amount -= spawnAmount;
  }
}
function spawnSuccessParticle(block) {
  safeSpawnParticle(block.dimension, "mythicus_sn:vendor_sale", {
    x: block.x + 0.5,
    y: block.y + 1.5,
    z: block.z + 0.5
  });
}
function playSound2(block, soundId) {
  if (!block?.isValid) return;
  const randomPitch = 1 + (Math.random() * 0.1 - 0.05);
  block.dimension.playSound(soundId, {
    x: block.x + 0.5,
    y: block.y + 0.5,
    z: block.z + 0.5
  }, { pitch: randomPitch });
}
function setActionBar2(player, translate, withArgs) {
  const rawtext = withArgs ? [
    {
      translate,
      with: withArgs.map((value) => String(value))
    }
  ] : [{ translate }];
  if (!player?.isValid) return;
  player.onScreenDisplay.setActionBar({ rawtext });
}
system31.beforeEvents.startup.subscribe((event) => {
  const component = {
    onPlayerInteract: (event2) => {
      if (!event2.player) {
        return;
      }
      if (!event2.player.isSneaking) {
        handleVendorInteraction(event2.block, event2.player);
      } else {
        handleVendorSneakInteract(event2.block, event2.player);
      }
    }
  };
  event.blockComponentRegistry.registerCustomComponent("mythicus_sn:vendor_block_component", component);
});

// data/scripts/main.ts
init_weather_system();
init_biome();
init_environmental_probe();

// data/scripts/modules/ground_block.ts
init_lib();
init_lib2();
init_particles();
import {
  BlockPermutation as BlockPermutation4,
  Direction,
  EntityComponentTypes as EntityComponentTypes16,
  EquipmentSlot as EquipmentSlot9,
  ItemComponentTypes as ItemComponentTypes2,
  ItemStack as ItemStack8,
  system as system32,
  world as world29
} from "@minecraft/server";
var COMPONENT_ID = "mythicus_sn:custom_ground_behaviour";
var CUSTOM_GROUND_TAG = "mythicus_sn:custom_ground_block";
var CUSTOM_GROUND_ID = "mythicus_sn:custom_ground_block";
var MIN_SPREAD_LIGHT = 9;
var HORIZONTAL_SPREAD_RANGE = 3;
var VERTICAL_SPREAD_RANGE = 1;
var SPREAD_ATTEMPTS = 4;
var SPREAD_CHANCE_PER_TICK = 0.35;
var SEASON_STAGE_STATE3 = "mythicus_sn:season_stage";
var BONE_MEAL_FOLIAGE = [
  { type: "mythicus_sn:short_grass", weight: 20 },
  { type: "mythicus_sn:very_short_grass", weight: 30 },
  { type: "mythicus_sn:fern", weight: 10 },
  { type: "minecraft:air", weight: 50 }
  // null = do nothing
];
var NON_BLOCKING_BLOCKS = [
  "minecraft:oak_fence",
  "minecraft:spruce_fence",
  "minecraft:birch_fence",
  "minecraft:jungle_fence",
  "minecraft:acacia_fence",
  "minecraft:dark_oak_fence",
  "minecraft:mangrove_fence",
  "minecraft:cherry_fence",
  "minecraft:bamboo_fence",
  "minecraft:crimson_fence",
  "minecraft:warped_fence",
  "minecraft:nether_brick_fence",
  "minecraft:pale_oak_fence",
  "minecraft:oak_fence_gate",
  "minecraft:spruce_fence_gate",
  "minecraft:birch_fence_gate",
  "minecraft:jungle_fence_gate",
  "minecraft:acacia_fence_gate",
  "minecraft:dark_oak_fence_gate",
  "minecraft:mangrove_fence_gate",
  "minecraft:cherry_fence_gate",
  "minecraft:bamboo_fence_gate",
  "minecraft:crimson_fence_gate",
  "minecraft:warped_fence_gate",
  "minecraft:nether_brick_fence_gate",
  "minecraft:pale_oak_fence_gate",
  "mythicus_sn:dehydrator",
  "mythicus_sn:preservers_jar",
  "mythicus_sn:mayonnaise_machine",
  "mythicus_sn:orange_leaves_oak",
  "mythicus_sn:red_leaves_oak",
  "mythicus_sn:yellow_leaves_oak",
  "mythicus_sn:leaves_birch",
  "mythicus_sn:leaves_oak",
  "mythicus_sn:cherry_leaves",
  "mythicus_sn:dark_leaves_oak",
  "minecraft:short_grass",
  "minecraft:tall_grass",
  "minecraft:fern",
  "minecraft:large_fern",
  "minecraft:dead_bush",
  "minecraft:seagrass",
  "minecraft:tall_seagrass",
  "minecraft:wildflowers",
  "minecraft:leaf_litter",
  "minecraft:poppy",
  "minecraft:dandelion",
  "minecraft:blue_orchid",
  "minecraft:allium",
  "minecraft:azure_bluet",
  "minecraft:red_tulip",
  "minecraft:orange_tulip",
  "minecraft:white_tulip",
  "minecraft:pink_tulip",
  "minecraft:oxeye_daisy",
  "minecraft:cornflower",
  "minecraft:lily_of_the_valley",
  "minecraft:wither_rose",
  "minecraft:sunflower",
  "minecraft:lilac",
  "minecraft:rose_bush",
  "minecraft:peony",
  "minecraft:torchflower",
  "minecraft:pitcher_plant",
  "minecraft:oak_sapling",
  "minecraft:spruce_sapling",
  "minecraft:birch_sapling",
  "minecraft:jungle_sapling",
  "minecraft:acacia_sapling",
  "minecraft:dark_oak_sapling",
  "minecraft:cherry_sapling",
  "minecraft:mangrove_propagule",
  "minecraft:azalea",
  "minecraft:flowering_azalea",
  "minecraft:brown_mushroom",
  "minecraft:red_mushroom",
  "minecraft:crimson_fungus",
  "minecraft:warped_fungus",
  "minecraft:torch",
  "minecraft:soul_torch",
  "minecraft:redstone_torch",
  "minecraft:lantern",
  "minecraft:soul_lantern",
  "minecraft:sea_pickle",
  "minecraft:candle",
  "minecraft:white_candle",
  "minecraft:orange_candle",
  "minecraft:magenta_candle",
  "minecraft:light_blue_candle",
  "minecraft:yellow_candle",
  "minecraft:lime_candle",
  "minecraft:pink_candle",
  "minecraft:gray_candle",
  "minecraft:light_gray_candle",
  "minecraft:cyan_candle",
  "minecraft:purple_candle",
  "minecraft:blue_candle",
  "minecraft:brown_candle",
  "minecraft:green_candle",
  "minecraft:red_candle",
  "minecraft:black_candle",
  "minecraft:redstone_wire",
  "minecraft:lever",
  "minecraft:stone_button",
  "minecraft:oak_button",
  "minecraft:spruce_button",
  "minecraft:birch_button",
  "minecraft:jungle_button",
  "minecraft:acacia_button",
  "minecraft:dark_oak_button",
  "minecraft:crimson_button",
  "minecraft:warped_button",
  "minecraft:cherry_button",
  "minecraft:bamboo_button",
  "minecraft:mangrove_button",
  "minecraft:stone_pressure_plate",
  "minecraft:oak_pressure_plate",
  "minecraft:spruce_pressure_plate",
  "minecraft:birch_pressure_plate",
  "minecraft:jungle_pressure_plate",
  "minecraft:acacia_pressure_plate",
  "minecraft:dark_oak_pressure_plate",
  "minecraft:crimson_pressure_plate",
  "minecraft:warped_pressure_plate",
  "minecraft:cherry_pressure_plate",
  "minecraft:bamboo_pressure_plate",
  "minecraft:mangrove_pressure_plate",
  "minecraft:tripwire",
  "minecraft:tripwire_hook",
  "minecraft:repeater",
  "minecraft:comparator",
  "minecraft:rail",
  "minecraft:powered_rail",
  "minecraft:detector_rail",
  "minecraft:activator_rail",
  "minecraft:snow",
  "minecraft:sugar_cane",
  "minecraft:cactus",
  "minecraft:cobweb",
  "minecraft:vine",
  "minecraft:glow_lichen",
  "minecraft:scaffolding",
  "minecraft:bamboo",
  "minecraft:sweet_berry_bush",
  "minecraft:pink_petals",
  "minecraft:spore_blossom",
  "minecraft:big_dripleaf",
  "minecraft:small_dripleaf",
  "minecraft:hanging_roots",
  "minecraft:oak_sign",
  "minecraft:spruce_sign",
  "minecraft:birch_sign",
  "minecraft:jungle_sign",
  "minecraft:acacia_sign",
  "minecraft:dark_oak_sign",
  "minecraft:crimson_sign",
  "minecraft:warped_sign",
  "minecraft:cherry_sign",
  "minecraft:bamboo_sign",
  "minecraft:mangrove_sign",
  "minecraft:flower_pot"
];
system32.beforeEvents.startup.subscribe((startup) => {
  startup.blockComponentRegistry.registerCustomComponent(COMPONENT_ID, {
    onRandomTick(event) {
      handleRandomTick(event);
    }
  });
});
world29.beforeEvents.playerInteractWithBlock.subscribe(handlePlayerInteractWithBlock);
function handleRandomTick(event) {
  const block = event.block;
  if (!block.isValid || !isCustomGround(block)) {
    return;
  }
  const above = block.above();
  if (!above || above.isAir) {
    if (Math.random() < SPREAD_CHANCE_PER_TICK) {
      trySpreadFrom(block);
    }
    return;
  }
  if (above.hasTag("mythicus_sn:non_blocking") || NON_BLOCKING_BLOCKS.includes(above.typeId)) {
    if (Math.random() < SPREAD_CHANCE_PER_TICK) {
      trySpreadFrom(block);
    }
    return;
  }
  convertToDirt(block);
}
function handlePlayerInteractWithBlock(event) {
  const { itemStack, block, player } = event;
  if (!isCustomGround(block)) {
    return;
  }
  if (isBlockedAbove(block) && event.blockFace === Direction.Up) {
    event.cancel = true;
    return;
  }
  if (!itemStack || !player) {
    return;
  }
  system32.run(() => {
    if (!block.isValid) {
      return;
    }
    let shouldDamage = false;
    if (itemStack.hasTag("minecraft:is_hoe")) {
      block.setPermutation(BlockPermutation4.resolve(MinecraftBlockTypes.Farmland));
      block.dimension.playSound("dig.grass", block, { volume: 0.5, pitch: 1 });
      shouldDamage = true;
    }
    if (itemStack.hasTag("minecraft:is_shovel")) {
      block.setPermutation(BlockPermutation4.resolve(MinecraftBlockTypes.GrassPath));
      block.dimension.playSound("dig.grass", block, { volume: 0.5, pitch: 1 });
      shouldDamage = true;
    }
    if (itemStack.typeId == "minecraft:bone_meal") {
      let grassPlaced = false;
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          const groundBlock = block.offset({ x, y: 0, z });
          if (!groundBlock || !groundBlock.isValid || groundBlock.typeId !== CUSTOM_GROUND_ID) {
            continue;
          }
          const aboveLocation = Vector3Utils.add(groundBlock.location, { x: 0, y: 1, z: 0 });
          const aboveBlock = block.dimension.getBlock(aboveLocation);
          if (aboveBlock?.typeId === "minecraft:air") {
            const foliageType = getWeightedRandomFoliage();
            if (foliageType) {
              block.dimension.setBlockType(aboveLocation, foliageType);
              grassPlaced = true;
            }
          }
        }
      }
      if (!grassPlaced) {
        return;
      }
      const centerLocation = Vector3Utils.add(block.location, { x: 0, y: 1, z: 0 });
      safeSpawnParticle(block.dimension, "minecraft:crop_growth_area_emitter", centerLocation);
      block.dimension.playSound("item.bone_meal.use", block, { volume: 1, pitch: 1 });
      const newAmount = itemStack.amount - 1;
      if (newAmount > 0) {
        const newItemStack = new ItemStack8(itemStack.typeId, newAmount);
        const equippable = player.getComponent(EntityComponentTypes16.Equippable);
        if (equippable) {
          equippable.setEquipment(EquipmentSlot9.Mainhand, newItemStack);
        }
      } else {
        const equippable = player.getComponent(EntityComponentTypes16.Equippable);
        if (equippable) {
          equippable.setEquipment(EquipmentSlot9.Mainhand, void 0);
        }
      }
    }
    if (shouldDamage) {
      damageItemByOnePoint(player);
    }
  });
}
function damageItemByOnePoint(player) {
  const equippable = player.getComponent(EntityComponentTypes16.Equippable);
  if (!equippable) return;
  const item = equippable.getEquipment(EquipmentSlot9.Mainhand);
  if (!item) return;
  const durability = item.getComponent(ItemComponentTypes2.Durability);
  if (!durability) return;
  const enchantable = item.getComponent(ItemComponentTypes2.Enchantable);
  const unbreakingLevel = enchantable?.getEnchantment(MinecraftEnchantmentTypes.Unbreaking)?.level ?? 0;
  const damageChance = durability.getDamageChance(unbreakingLevel);
  if (Math.random() * 100 > damageChance) return;
  durability.damage += 1;
  if (durability.damage >= durability.maxDurability) {
    equippable.setEquipment(EquipmentSlot9.Mainhand, void 0);
    player.playSound("random.break");
    return;
  }
  equippable.setEquipment(EquipmentSlot9.Mainhand, item);
}
function trySpreadFrom(source) {
  if (!source.isValid) {
    return;
  }
  for (let attempt = 0; attempt < SPREAD_ATTEMPTS; attempt++) {
    const offset = {
      x: getRandomInt(-HORIZONTAL_SPREAD_RANGE, HORIZONTAL_SPREAD_RANGE),
      y: getRandomInt(-VERTICAL_SPREAD_RANGE, VERTICAL_SPREAD_RANGE),
      z: getRandomInt(-HORIZONTAL_SPREAD_RANGE, HORIZONTAL_SPREAD_RANGE)
    };
    if (offset.x === 0 && offset.y === 0 && offset.z === 0) {
      continue;
    }
    const candidate = source.offset(offset);
    if (!candidate || !candidate.isValid || !canSpreadTo(candidate)) {
      continue;
    }
    if (isBlockedAbove(candidate)) {
      continue;
    }
    if (!hasRequiredSpreadLight(candidate)) {
      continue;
    }
    applySeasonalPermutation(source, candidate);
    playSoundAtBlock(candidate, "block.grass.place", 0.4, 1);
    break;
  }
}
function convertToDirt(block) {
  safeSetType(block, MinecraftBlockTypes.Dirt);
}
function canSpreadTo(block) {
  if (block.isAir) {
    return false;
  }
  if (block.typeId !== MinecraftBlockTypes.Dirt) {
    return false;
  }
  return true;
}
function hasRequiredSpreadLight(block) {
  const lightLevel = getLightLevelAtOffset(block, 1);
  return lightLevel === void 0 ? false : lightLevel >= MIN_SPREAD_LIGHT;
}
function isBlockedAbove(block) {
  const above = block.above();
  if (!above || above.isAir) {
    return false;
  }
  const fluidBlocks = [
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:lava",
    "minecraft:flowing_lava",
    "minecraft:powder_snow"
  ];
  if (fluidBlocks.includes(above.typeId)) {
    return false;
  }
  if (above.hasTag("mythicus_sn:environment")) {
    return false;
  }
  return true;
}
function safeSetType(block, type) {
  if (!block.dimension.isChunkLoaded(block.location)) return;
  if (!block?.isValid) return;
  block.setType(type);
}
function isCustomGround(block) {
  return !!block && !block.isAir && block.hasTag(CUSTOM_GROUND_TAG);
}
function getRandomInt(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}
function playSoundAtBlock(block, soundId, volume, pitch) {
  if (!block.isValid) {
    return;
  }
  block.dimension.playSound(soundId, block, { volume, pitch });
}
function applySeasonalPermutation(source, target) {
  const sourcePermutation = source.permutation;
  let stage = sourcePermutation.getState(SEASON_STAGE_STATE3);
  if (typeof stage !== "number") {
    stage = 0;
  }
  safeSetType(target, CUSTOM_GROUND_ID);
  if (!target.isValid) {
    return;
  }
  const targetPermutation = target.permutation;
  const targetStates = targetPermutation.getAllStates();
  if (!Object.prototype.hasOwnProperty.call(targetStates, SEASON_STAGE_STATE3)) {
    return;
  }
  if (!source.dimension.isChunkLoaded(target.location)) return;
  if (!target?.isValid) return;
  const updated = targetPermutation.withState(SEASON_STAGE_STATE3, stage);
  target.setPermutation(updated);
}
function getLightLevelAtOffset(block, offsetY) {
  const targetLoc = Vector3Utils.add(block, { y: offsetY });
  if (!block.dimension.isChunkLoaded(targetLoc)) return void 0;
  return block.dimension.getLightLevel(targetLoc);
}
function getWeightedRandomFoliage() {
  const totalWeight = BONE_MEAL_FOLIAGE.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of BONE_MEAL_FOLIAGE) {
    random -= item.weight;
    if (random <= 0) {
      return item.type;
    }
  }
  return null;
}

// data/scripts/modules/mobs/seasons_pig/index.ts
init_dimension();
init_season_core();
import { system as system34 } from "@minecraft/server";

// data/scripts/modules/mobs/seasons_pig/constants.ts
import { TicksPerSecond as TicksPerSecond15 } from "@minecraft/server";
var SEASONAL_PIG_TYPE_ID = "mythicus_sn:seasons_pig";
var PROPERTY_CLIMATE_VARIANT = "mythicus_sn:season_variant";
var PROPERTY_COVERED_IN_MUD = "mythicus_sn:covered_in_mud";
var PROPERTY_MUD_STATE = "mythicus_sn:mud_state";
var PROPERTY_IS_IN_WET_ENVIRONMENT = "mythicus_sn:is_in_wet_environment";
var PROPERTY_COVERED_IN_LEAVES = "mythicus_sn:covered_in_leaves";
var PROPERTY_LEAVES_LEVEL = "mythicus_sn:leaves_level";
var PROPERTY_COVERED_IN_SNOW = "mythicus_sn:covered_in_snow";
var PROPERTY_SNOW_LEVEL = "mythicus_sn:covered_in_snow_level";
var PROPERTY_IS_SHAKING = "mythicus_sn:is_shaking";
var PROPERTY_IS_WALLOWING = "mythicus_sn:is_wallowing";
var SCAN_INTERVAL_TICKS = 5;
var MUD_DRY_DELAY_TICKS = 10 * TicksPerSecond15;
var STALE_STATE_TICKS = 45 * TicksPerSecond15;
var LEAVES_LEVEL_DURATION_TICKS = 30 * TicksPerSecond15;
var MAX_LEAVES_LEVEL = 4;
var SNOW_LEVEL_DURATION_TICKS = 30 * TicksPerSecond15;
var MAX_SNOW_LEVEL = 4;
var SHAKE_DURATION_TICKS = 25;
var SHAKE_CHECK_INTERVAL_TICKS = 30 * TicksPerSecond15;
var SHAKE_CHANCE = 0.1;
var DIG_EVENT_ENABLE = "mythicus_sn:enable_dig_fall";
var DIG_EVENT_DISABLE = "mythicus_sn:disable_dig_fall";
var SUMMER_EVENT_ENABLE = "mythicus_sn:enable_summer_wallow";
var SUMMER_EVENT_DISABLE = "mythicus_sn:disable_summer_wallow";
var SUMMER_EVENT_START_WALLOW = "mythicus_sn:start_wallowing";
var SUMMER_EVENT_STOP_WALLOW = "mythicus_sn:stop_wallowing";
var SUMMER_EVENT_INTERRUPT_WALLOW = "mythicus_sn:interrupt_wallowing";
var SUMMER_EVENT_ENABLE_MOVEMENT = "mythicus_sn:enable_movement";
var WALLOW_DURATION_TICKS = 10 * TicksPerSecond15;
var WALLOW_COOLDOWN_TICKS = 10 * TicksPerSecond15;
var FARMLAND_BLOCK_ID = "minecraft:farmland";
var FARMLAND_MOISTURE_PROPERTY = "moisturized_amount";
var FARMLAND_MAX_MOISTURE = 7;
var FARMLAND_MIN_HYDRATION = 5;
var LOG_NAMESPACE = "SeasonsPig";

// data/scripts/modules/mobs/utils/state_tracker.ts
function resolveTrackedState(store, entity, tick, initializer) {
  const existing = store.get(entity.id);
  if (existing) {
    existing.lastSeenTick = tick;
    return existing;
  }
  const state = initializer(entity, tick);
  state.lastSeenTick = tick;
  store.set(entity.id, state);
  return state;
}
function cleanupTrackedStates(store, visibleThisTick, tick, staleThreshold) {
  for (const [entityId, state] of store) {
    if (visibleThisTick.has(entityId)) {
      continue;
    }
    if (tick - state.lastSeenTick >= staleThreshold) {
      store.delete(entityId);
    }
  }
}

// data/scripts/modules/mobs/seasons_pig/dig_behavior.ts
var pigDigStates = /* @__PURE__ */ new Map();
function updateDigBehavior(pig, tick) {
  const state = resolveTrackedState(pigDigStates, pig, tick, () => ({
    isDigEnabled: false,
    lastSeenTick: tick
  }));
  const shouldDig = true;
  if (shouldDig !== state.isDigEnabled) {
    const event = shouldDig ? DIG_EVENT_ENABLE : DIG_EVENT_DISABLE;
    if (!pig.isValid) return;
    pig.triggerEvent(event);
    state.isDigEnabled = shouldDig;
  }
}
function cleanupDigTracking(visibleThisTick, tick) {
  cleanupTrackedStates(pigDigStates, visibleThisTick, tick, STALE_STATE_TICKS);
}

// data/scripts/modules/mobs/seasons_pig/leaves_behavior.ts
init_season_core();

// data/scripts/modules/mobs/utils/entity_properties.ts
function setBooleanProperty(entity, identifier, value, namespace, context) {
  const current = entity.getProperty(identifier);
  if (typeof current === "boolean" && current === value) {
    return true;
  }
  if (!entity.isValid) return false;
  entity.setProperty(identifier, value);
  return true;
}
function setStringProperty(entity, identifier, value, namespace, context) {
  const current = entity.getProperty(identifier);
  if (typeof current === "string" && current === value) {
    return true;
  }
  if (!entity.isValid) return false;
  entity.setProperty(identifier, value);
  return true;
}
function setIntegerProperty(entity, identifier, value, namespace, context) {
  const current = entity.getProperty(identifier);
  if (typeof current === "number" && current === value) {
    return true;
  }
  if (!entity.isValid) return false;
  entity.setProperty(identifier, value);
  return true;
}
function toBoolean(value) {
  return value === true;
}
function toInteger(value, fallback = 0) {
  if (typeof value === "number") {
    return Math.floor(value);
  }
  return fallback;
}
function createPropertySetters(namespace) {
  return {
    setBoolean: (entity, propertyId, value, context) => setBooleanProperty(entity, propertyId, value, namespace, context),
    setString: (entity, propertyId, value, context) => setStringProperty(entity, propertyId, value, namespace, context),
    setInteger: (entity, propertyId, value, context) => setIntegerProperty(entity, propertyId, value, namespace, context),
    setProperty: (entity, propertyId, value, context) => typeof value === "boolean" ? setBooleanProperty(entity, propertyId, value, namespace, context) : setIntegerProperty(entity, propertyId, value, namespace, context)
  };
}

// data/scripts/modules/mobs/utils/seasonal_behaviors.ts
function updateSeasonalCoverage(entity, state, tick, config, isActiveSeason, setBoolean, setInteger) {
  if (state.isShaking && tick - state.shakeStartTick >= config.shakeDurationTicks) {
    if (setBoolean(entity, config.shakeProperty, false, config.context)) {
      state.isShaking = false;
    }
  }
  if (!isActiveSeason) {
    clearCoverage(entity, state, tick, config, setBoolean, setInteger);
    return;
  }
  if (entity.isInWater) {
    clearCoverage(entity, state, tick, config, setBoolean, setInteger);
    return;
  }
  accumulateCoverage(entity, state, tick, config, setBoolean, setInteger);
  attemptRandomShake(entity, state, tick, config, setBoolean, setInteger);
}
function accumulateCoverage(entity, state, tick, config, setBoolean, setInteger) {
  const timeSinceLastUpdate = tick - state.lastUpdateTick;
  if (state.coverageLevel === 0) {
    const newLevel = 1;
    if (setInteger(entity, config.levelProperty, newLevel, config.context)) {
      state.coverageLevel = newLevel;
      state.lastUpdateTick = tick;
    }
  } else if (state.coverageLevel < config.maxLevel && timeSinceLastUpdate >= config.levelDurationTicks) {
    const newLevel = state.coverageLevel + 1;
    if (setInteger(entity, config.levelProperty, newLevel, config.context)) {
      state.coverageLevel = newLevel;
      state.lastUpdateTick = tick;
    }
  }
  if (!state.isCovered) {
    if (setBoolean(entity, config.coveredProperty, true, config.context)) {
      state.isCovered = true;
    }
  }
}
function clearCoverage(entity, state, tick, config, setBoolean, setInteger) {
  let changed = false;
  const hadCoverage = state.coverageLevel > 0;
  if (state.coverageLevel !== 0) {
    if (setInteger(entity, config.levelProperty, 0, config.context)) {
      state.coverageLevel = 0;
      changed = true;
    }
  }
  if (state.isCovered) {
    if (setBoolean(entity, config.coveredProperty, false, config.context)) {
      state.isCovered = false;
      changed = true;
    }
  }
  if (changed) {
    state.lastUpdateTick = 0;
  }
  if (hadCoverage && !state.isShaking) {
    if (setBoolean(entity, config.shakeProperty, true, config.context)) {
      state.isShaking = true;
      state.shakeStartTick = tick;
    }
  }
  state.nextShakeCheckTick = tick + config.shakeCheckIntervalTicks;
}
function attemptRandomShake(entity, state, tick, config, setBoolean, setInteger) {
  if (!state.isCovered) {
    return;
  }
  if (tick < state.nextShakeCheckTick) {
    return;
  }
  state.nextShakeCheckTick = tick + config.shakeCheckIntervalTicks;
  if (state.coverageLevel < config.maxLevel) {
    return;
  }
  if (Math.random() > config.shakeChance) {
    return;
  }
  if (!state.isShaking) {
    if (setBoolean(entity, config.shakeProperty, true, config.context)) {
      state.isShaking = true;
      state.shakeStartTick = tick;
    }
  }
  if (state.coverageLevel !== 0) {
    if (setInteger(entity, config.levelProperty, 0, config.context)) {
      state.coverageLevel = 0;
    }
  }
  if (state.isCovered) {
    if (setBoolean(entity, config.coveredProperty, false, config.context)) {
      state.isCovered = false;
    }
  }
  state.lastUpdateTick = 0;
}
function initializeSeasonalCoverageState(entity, tick, config, toBoolean2, toInteger2) {
  const isCovered = toBoolean2(entity.getProperty(config.coveredProperty));
  const coverageLevel = toInteger2(entity.getProperty(config.levelProperty));
  const isShaking = toBoolean2(entity.getProperty(config.shakeProperty));
  return {
    lastUpdateTick: tick,
    lastSeenTick: tick,
    coverageLevel,
    isCovered,
    shakeStartTick: 0,
    isShaking,
    nextShakeCheckTick: tick + config.shakeCheckIntervalTicks
  };
}
function applySeasonVariant(entity, season, propertyId, setStringProperty2) {
  const currentVariant = entity.getProperty(propertyId);
  if (currentVariant !== season) {
    setStringProperty2(entity, propertyId, season, "Season");
  }
}

// data/scripts/modules/mobs/seasons_pig/leaves_behavior.ts
var entityProps = createPropertySetters(LOG_NAMESPACE);
var pigLeavesStates = /* @__PURE__ */ new Map();
var LEAVES_CONFIG = {
  coveredProperty: PROPERTY_COVERED_IN_LEAVES,
  levelProperty: PROPERTY_LEAVES_LEVEL,
  shakeProperty: PROPERTY_IS_SHAKING,
  maxLevel: MAX_LEAVES_LEVEL,
  levelDurationTicks: LEAVES_LEVEL_DURATION_TICKS,
  shakeDurationTicks: SHAKE_DURATION_TICKS,
  shakeCheckIntervalTicks: SHAKE_CHECK_INTERVAL_TICKS,
  shakeChance: SHAKE_CHANCE,
  context: "Leaves"
};
function updateLeavesBehavior(pig, tick, currentSeason2) {
  const state = resolvePigLeavesState(pig, tick);
  const isActiveSeason = currentSeason2 === "fall" /* Fall */;
  updateSeasonalCoverage(
    pig,
    state,
    tick,
    LEAVES_CONFIG,
    isActiveSeason,
    entityProps.setProperty,
    entityProps.setProperty
  );
}
function cleanupLeavesTracking(visibleThisTick, tick) {
  cleanupTrackedStates(pigLeavesStates, visibleThisTick, tick, STALE_STATE_TICKS);
}
function resolvePigLeavesState(pig, tick) {
  return resolveTrackedState(pigLeavesStates, pig, tick, () => {
    return initializeSeasonalCoverageState(pig, tick, LEAVES_CONFIG, toBoolean, toInteger);
  });
}

// data/scripts/modules/mobs/seasons_pig/mud_behavior.ts
init_season_core();
var entityProps2 = createPropertySetters(LOG_NAMESPACE);
var pigMudStates = /* @__PURE__ */ new Map();
function updateMudBehavior(pig, tick, currentSeason2) {
  const state = resolvePigState(pig, tick);
  if (state.isShaking && tick - state.shakeStartTick >= SHAKE_DURATION_TICKS) {
    if (entityProps2.setBoolean(pig, PROPERTY_IS_SHAKING, false, "Mud")) {
      state.isShaking = false;
    }
  }
  if (currentSeason2 !== "spring" /* Spring */) {
    clearMud(pig, state, tick);
    return;
  }
  const isInWetEnvironment = toBoolean(pig.getProperty(PROPERTY_IS_IN_WET_ENVIRONMENT));
  if (isInWetEnvironment) {
    handleWaterContact(pig, state, tick);
  } else {
    handleDrying(pig, state, tick);
  }
}
function cleanupMudTracking(visibleThisTick, tick) {
  cleanupTrackedStates(pigMudStates, visibleThisTick, tick, STALE_STATE_TICKS);
}
function resolvePigState(pig, tick) {
  return resolveTrackedState(pigMudStates, pig, tick, () => {
    const covered = toBoolean(pig.getProperty(PROPERTY_COVERED_IN_MUD));
    const mudState = toMudState(pig.getProperty(PROPERTY_MUD_STATE));
    const isShaking = toBoolean(pig.getProperty(PROPERTY_IS_SHAKING));
    return {
      lastWetTick: covered ? tick : null,
      lastSeenTick: tick,
      covered,
      mudState,
      shakeStartTick: 0,
      isShaking
    };
  });
}
function handleWaterContact(pig, state, tick) {
  state.lastWetTick = tick;
  let becameWet = false;
  if (!state.covered) {
    if (entityProps2.setBoolean(pig, PROPERTY_COVERED_IN_MUD, true, "Mud")) {
      state.covered = true;
      becameWet = true;
    }
  }
  if (state.mudState !== "wet") {
    if (entityProps2.setString(pig, PROPERTY_MUD_STATE, "wet", "Mud")) {
      state.mudState = "wet";
      becameWet = true;
    }
  }
  if (becameWet && !state.isShaking) {
    if (entityProps2.setBoolean(pig, PROPERTY_IS_SHAKING, true, "Mud")) {
      state.isShaking = true;
      state.shakeStartTick = tick;
    }
  }
}
function handleDrying(pig, state, tick) {
  if (state.covered && state.mudState === "wet" && state.lastWetTick !== null) {
    const timeSinceDry = tick - state.lastWetTick;
    if (timeSinceDry >= MUD_DRY_DELAY_TICKS) {
      if (entityProps2.setString(pig, PROPERTY_MUD_STATE, "dry", "Mud")) {
        state.mudState = "dry";
      }
    }
  }
}
function clearMud(pig, state, tick) {
  let changed = false;
  const hadMud = state.covered;
  if (state.covered) {
    if (entityProps2.setBoolean(pig, PROPERTY_COVERED_IN_MUD, false, "Mud")) {
      state.covered = false;
      changed = true;
    }
  }
  if (state.mudState !== "wet") {
    if (entityProps2.setString(pig, PROPERTY_MUD_STATE, "wet", "Mud")) {
      state.mudState = "wet";
      changed = true;
    }
  }
  if (changed) {
    state.lastWetTick = null;
  }
  if (hadMud && !state.isShaking) {
    if (entityProps2.setBoolean(pig, PROPERTY_IS_SHAKING, true, "Mud")) {
      state.isShaking = true;
      state.shakeStartTick = tick;
    }
  }
}
function toMudState(value) {
  return value === "dry" ? "dry" : "wet";
}

// data/scripts/modules/mobs/seasons_pig/season_variant.ts
init_season_core();
import { world as world30 } from "@minecraft/server";
var entityProps3 = createPropertySetters(LOG_NAMESPACE);
function applySeasonVariant2(pig, season) {
  applySeasonVariant(pig, season, PROPERTY_CLIMATE_VARIANT, entityProps3.setString);
}
world30.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (!entity.isValid || entity.typeId !== SEASONAL_PIG_TYPE_ID) {
    return;
  }
  applySeasonVariant2(entity, getCurrentSeason());
});

// data/scripts/modules/mobs/seasons_pig/snow_behavior.ts
init_season_core();
var entityProps4 = createPropertySetters(LOG_NAMESPACE);
var pigSnowStates = /* @__PURE__ */ new Map();
var SNOW_CONFIG = {
  coveredProperty: PROPERTY_COVERED_IN_SNOW,
  levelProperty: PROPERTY_SNOW_LEVEL,
  shakeProperty: PROPERTY_IS_SHAKING,
  maxLevel: MAX_SNOW_LEVEL,
  levelDurationTicks: SNOW_LEVEL_DURATION_TICKS,
  shakeDurationTicks: SHAKE_DURATION_TICKS,
  shakeCheckIntervalTicks: SHAKE_CHECK_INTERVAL_TICKS,
  shakeChance: SHAKE_CHANCE,
  context: "Snow"
};
function updateSnowBehavior(pig, tick, currentSeason2) {
  const state = resolvePigSnowState(pig, tick);
  const isActiveSeason = currentSeason2 === "winter" /* Winter */;
  updateSeasonalCoverage(
    pig,
    state,
    tick,
    SNOW_CONFIG,
    isActiveSeason,
    entityProps4.setProperty,
    entityProps4.setProperty
  );
}
function cleanupSnowTracking(visibleThisTick, tick) {
  cleanupTrackedStates(pigSnowStates, visibleThisTick, tick, STALE_STATE_TICKS);
}
function resolvePigSnowState(pig, tick) {
  return resolveTrackedState(pigSnowStates, pig, tick, () => {
    return initializeSeasonalCoverageState(pig, tick, SNOW_CONFIG, toBoolean, toInteger);
  });
}

// data/scripts/modules/mobs/seasons_pig/summer_behavior.ts
init_season_core();
import { TicksPerSecond as TicksPerSecond16, system as system33, world as world31 } from "@minecraft/server";
function getRandomWallowDuration() {
  const minSeconds = 5;
  const maxSeconds = 10;
  const randomSeconds = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  return Math.floor(randomSeconds * TicksPerSecond16);
}
var pigSummerStates = /* @__PURE__ */ new Map();
world31.afterEvents.dataDrivenEntityTrigger.subscribe(handleDataDrivenTrigger);
world31.afterEvents.dataDrivenEntityTrigger.subscribe(handleWallowInterrupt);
function cancelWallowAttempt(pig, state, tick, extendCooldown) {
  state.isWallowing = false;
  state.movementDisabled = false;
  state.wallowEndTick = 0;
  if (extendCooldown) {
    state.nextAllowedWallowTick = Math.max(state.nextAllowedWallowTick, tick + WALLOW_COOLDOWN_TICKS);
  }
  if (!pig.isValid) {
    return;
  }
  pig.triggerEvent(SUMMER_EVENT_STOP_WALLOW);
  state.movementDisabled = false;
}
function updateSummerBehavior(pig, tick, currentSeason2) {
  const state = resolveSummerState(pig, tick);
  const isSummer = currentSeason2 === "summer" /* Summer */;
  if (!isSummer) {
    if (state.isGoalEnabled) {
      setGoalState(pig, state, false);
    }
    if (state.isWallowing) {
      stopWallowing(pig, state, currentSeason2);
    }
    return;
  }
  if (state.isWallowing && tick >= state.wallowEndTick) {
    stopWallowing(pig, state, currentSeason2);
  }
  const shouldEnableGoal = !state.isWallowing && tick >= state.nextAllowedWallowTick;
  if (shouldEnableGoal !== state.isGoalEnabled) {
    setGoalState(pig, state, shouldEnableGoal);
  }
}
function cleanupSummerTracking(visibleThisTick, tick) {
  cleanupTrackedStates(pigSummerStates, visibleThisTick, tick, STALE_STATE_TICKS);
}
function resolveSummerState(pig, tick) {
  return resolveTrackedState(pigSummerStates, pig, tick, () => {
    const isWallowing = toBoolean(pig.getProperty(PROPERTY_IS_WALLOWING));
    return {
      lastSeenTick: tick,
      isGoalEnabled: false,
      isWallowing,
      wallowEndTick: isWallowing ? tick + getRandomWallowDuration() : 0,
      movementDisabled: isWallowing,
      nextAllowedWallowTick: tick
    };
  });
}
function handleDataDrivenTrigger(event) {
  const { entity, eventId } = event;
  if (eventId !== SUMMER_EVENT_START_WALLOW || entity.typeId !== SEASONAL_PIG_TYPE_ID || !entity.isValid) {
    return;
  }
  const tick = system33.currentTick;
  const state = resolveSummerState(entity, tick);
  if (state.isWallowing) {
    return;
  }
  if (tick < state.nextAllowedWallowTick) {
    cancelWallowAttempt(entity, state, tick, false);
    if (!state.isGoalEnabled) {
      setGoalState(entity, state, true);
    }
    return;
  }
  if (!isHydratedFarmland(entity)) {
    cancelWallowAttempt(entity, state, tick, true);
    return;
  }
  state.isWallowing = true;
  state.movementDisabled = true;
  state.wallowEndTick = tick + getRandomWallowDuration();
  if (state.isGoalEnabled) {
    setGoalState(entity, state, false);
  }
}
function handleWallowInterrupt(event) {
  const { entity, eventId } = event;
  if (eventId !== SUMMER_EVENT_INTERRUPT_WALLOW || entity.typeId !== SEASONAL_PIG_TYPE_ID) {
    return;
  }
  const tick = system33.currentTick;
  const state = pigSummerStates.get(entity.id);
  if (state && state.isWallowing) {
    state.isWallowing = false;
    state.movementDisabled = false;
    state.wallowEndTick = 0;
    state.nextAllowedWallowTick = tick + WALLOW_COOLDOWN_TICKS;
    state.lastSeenTick = tick;
  }
}
function stopWallowing(pig, state, currentSeason2) {
  if (!pig.isValid) {
    return;
  }
  const tick = system33.currentTick;
  if (state.isWallowing) {
    pig.triggerEvent(SUMMER_EVENT_STOP_WALLOW);
    state.isWallowing = false;
  }
  system33.runTimeout(() => {
    if (!pig.isValid) {
      return;
    }
    if (!pig.getComponent("minecraft:movement")) {
      pig.triggerEvent(SUMMER_EVENT_ENABLE_MOVEMENT);
    }
    state.movementDisabled = false;
  }, 2);
  state.wallowEndTick = 0;
  state.nextAllowedWallowTick = tick + WALLOW_COOLDOWN_TICKS;
  if (currentSeason2 === "summer" /* Summer */ && !state.isGoalEnabled) {
    setGoalState(pig, state, true);
  }
}
function setGoalState(pig, state, enable) {
  if (!pig.isValid) {
    return;
  }
  const eventName = enable ? SUMMER_EVENT_ENABLE : SUMMER_EVENT_DISABLE;
  pig.triggerEvent(eventName);
  state.isGoalEnabled = enable;
}
function isHydratedFarmland(pig) {
  if (!pig.isValid) {
    return false;
  }
  const dimension = pig.dimension;
  const location = pig.location;
  const blockX = Math.floor(location.x);
  const blockY = Math.floor(location.y - 0.01);
  const blockZ = Math.floor(location.z);
  let block = dimension.getBlock({ x: blockX, y: blockY, z: blockZ });
  if (!block) {
    return false;
  }
  if (!block || !block.isValid || block.typeId !== FARMLAND_BLOCK_ID) {
    block = dimension.getBlock({ x: blockX, y: blockY - 1, z: blockZ });
    if (!block) {
      return false;
    }
    if (!block || !block.isValid || block.typeId !== FARMLAND_BLOCK_ID) {
      return false;
    }
  }
  const states = block.permutation.getAllStates();
  const moistureValue = states[FARMLAND_MOISTURE_PROPERTY];
  if (typeof moistureValue !== "number") {
    return false;
  }
  if (moistureValue === FARMLAND_MAX_MOISTURE) {
    return true;
  }
  return moistureValue >= FARMLAND_MIN_HYDRATION;
}

// data/scripts/modules/mobs/seasons_pig/index.ts
system34.runInterval(() => {
  const tick = system34.currentTick;
  const currentSeason2 = getCurrentSeason();
  const visibleThisTick = /* @__PURE__ */ new Set();
  for (const dimension of getActiveDimensions()) {
    for (const pig of dimension.getEntities({ type: SEASONAL_PIG_TYPE_ID })) {
      if (!pig?.isValid) continue;
      visibleThisTick.add(pig.id);
      updateMudBehavior(pig, tick, currentSeason2);
      updateLeavesBehavior(pig, tick, currentSeason2);
      updateSnowBehavior(pig, tick, currentSeason2);
      updateDigBehavior(pig, tick);
      updateSummerBehavior(pig, tick, currentSeason2);
      applySeasonVariant2(pig, currentSeason2);
    }
  }
  cleanupMudTracking(visibleThisTick, tick);
  cleanupLeavesTracking(visibleThisTick, tick);
  cleanupSnowTracking(visibleThisTick, tick);
  cleanupDigTracking(visibleThisTick, tick);
  cleanupSummerTracking(visibleThisTick, tick);
}, SCAN_INTERVAL_TICKS);

// data/scripts/modules/mobs/seasons_cow/index.ts
init_dimension();
init_season_core();
import { system as system35 } from "@minecraft/server";

// data/scripts/modules/mobs/seasons_cow/constants.ts
import { TicksPerSecond as TicksPerSecond17 } from "@minecraft/server";
var SEASONAL_COW_TYPE_ID = "mythicus_sn:seasons_cow";
var PROPERTY_SEASON_VARIANT = "mythicus_sn:season_variant";
var PROPERTY_COVERED_IN_LEAVES2 = "mythicus_sn:covered_in_leaves";
var PROPERTY_LEAVES_LEVEL2 = "mythicus_sn:leaves_level";
var PROPERTY_COVERED_IN_SNOW2 = "mythicus_sn:covered_in_snow";
var PROPERTY_SNOW_LEVEL2 = "mythicus_sn:covered_in_snow_level";
var PROPERTY_IS_SHAKING2 = "mythicus_sn:is_shaking";
var SCAN_INTERVAL_TICKS2 = 5;
var STALE_STATE_TICKS2 = 45 * TicksPerSecond17;
var MAX_LEAVES_LEVEL2 = 4;
var LEAVES_LEVEL_DURATION_TICKS2 = 30 * TicksPerSecond17;
var MAX_SNOW_LEVEL2 = 4;
var SNOW_LEVEL_DURATION_TICKS2 = 30 * TicksPerSecond17;
var SHAKE_DURATION_TICKS2 = 25;
var SHAKE_CHECK_INTERVAL_TICKS2 = 30 * TicksPerSecond17;
var SHAKE_CHANCE2 = 0.1;
var LOG_NAMESPACE2 = "SeasonsCow";

// data/scripts/modules/mobs/seasons_cow/fertilizing_behavior.ts
init_season_core();
var cowFertilizingStates = /* @__PURE__ */ new Map();
var ADD_FERTILIZING_EVENT = "mythicus_sn:on_add_fertilize_behavior";
var REMOVE_FERTILIZING_EVENT = "mythicus_sn:on_remove_fertilize_behavior";
function updateFertilizingBehavior(cow, tick, currentSeason2) {
  const state = resolveFertilizingState(cow, tick);
  const isActiveSeason = currentSeason2 === "summer" /* Summer */;
  if (state.isActiveSeason && !isActiveSeason) {
    if (state.hasFertilizingTimer) {
      cow.triggerEvent(REMOVE_FERTILIZING_EVENT);
      state.hasFertilizingTimer = false;
    }
  } else if (!state.isActiveSeason && isActiveSeason) {
    if (!state.hasFertilizingTimer) {
      cow.triggerEvent(ADD_FERTILIZING_EVENT);
      state.hasFertilizingTimer = true;
    }
  }
  state.isActiveSeason = isActiveSeason;
  state.lastSeenTick = tick;
}
function cleanupFertilizingTracking(visibleThisTick, tick) {
  cleanupTrackedStates(
    cowFertilizingStates,
    visibleThisTick,
    tick,
    STALE_STATE_TICKS2
  );
}
function resolveFertilizingState(cow, tick) {
  return resolveTrackedState(cowFertilizingStates, cow, tick, () => {
    return {
      lastSeenTick: tick,
      hasFertilizingTimer: false,
      isActiveSeason: false
    };
  });
}

// data/scripts/modules/mobs/seasons_cow/leaves_behavior.ts
init_season_core();
var entityProps5 = createPropertySetters(LOG_NAMESPACE2);
var cowLeavesStates = /* @__PURE__ */ new Map();
var LEAVES_CONFIG2 = {
  coveredProperty: PROPERTY_COVERED_IN_LEAVES2,
  levelProperty: PROPERTY_LEAVES_LEVEL2,
  shakeProperty: PROPERTY_IS_SHAKING2,
  maxLevel: MAX_LEAVES_LEVEL2,
  levelDurationTicks: LEAVES_LEVEL_DURATION_TICKS2,
  shakeDurationTicks: SHAKE_DURATION_TICKS2,
  shakeCheckIntervalTicks: SHAKE_CHECK_INTERVAL_TICKS2,
  shakeChance: SHAKE_CHANCE2,
  context: "Leaves"
};
function updateLeavesBehavior2(cow, tick, currentSeason2) {
  const state = resolveCowLeavesState(cow, tick);
  const isActiveSeason = currentSeason2 === "fall" /* Fall */;
  updateSeasonalCoverage(
    cow,
    state,
    tick,
    LEAVES_CONFIG2,
    isActiveSeason,
    entityProps5.setProperty,
    entityProps5.setProperty
  );
}
function cleanupLeavesTracking2(visibleThisTick, tick) {
  cleanupTrackedStates(cowLeavesStates, visibleThisTick, tick, STALE_STATE_TICKS2);
}
function resolveCowLeavesState(cow, tick) {
  return resolveTrackedState(cowLeavesStates, cow, tick, () => {
    return initializeSeasonalCoverageState(cow, tick, LEAVES_CONFIG2, toBoolean, toInteger);
  });
}

// data/scripts/modules/mobs/seasons_cow/season_variant.ts
init_season_core();
import { world as world32 } from "@minecraft/server";
var entityProps6 = createPropertySetters(LOG_NAMESPACE2);
function applySeasonVariant3(cow, season) {
  applySeasonVariant(cow, season, PROPERTY_SEASON_VARIANT, entityProps6.setString);
}
world32.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (!entity.isValid || entity.typeId !== SEASONAL_COW_TYPE_ID) {
    return;
  }
  applySeasonVariant3(entity, getCurrentSeason());
});

// data/scripts/modules/mobs/seasons_cow/snow_behavior.ts
init_season_core();
var entityProps7 = createPropertySetters(LOG_NAMESPACE2);
var cowSnowStates = /* @__PURE__ */ new Map();
var SNOW_CONFIG2 = {
  coveredProperty: PROPERTY_COVERED_IN_SNOW2,
  levelProperty: PROPERTY_SNOW_LEVEL2,
  shakeProperty: PROPERTY_IS_SHAKING2,
  maxLevel: MAX_SNOW_LEVEL2,
  levelDurationTicks: SNOW_LEVEL_DURATION_TICKS2,
  shakeDurationTicks: SHAKE_DURATION_TICKS2,
  shakeCheckIntervalTicks: SHAKE_CHECK_INTERVAL_TICKS2,
  shakeChance: SHAKE_CHANCE2,
  context: "Snow"
};
function updateSnowBehavior2(cow, tick, currentSeason2) {
  const state = resolveCowSnowState(cow, tick);
  const isActiveSeason = currentSeason2 === "winter" /* Winter */;
  updateSeasonalCoverage(
    cow,
    state,
    tick,
    SNOW_CONFIG2,
    isActiveSeason,
    entityProps7.setProperty,
    entityProps7.setProperty
  );
}
function cleanupSnowTracking2(visibleThisTick, tick) {
  cleanupTrackedStates(cowSnowStates, visibleThisTick, tick, STALE_STATE_TICKS2);
}
function resolveCowSnowState(cow, tick) {
  return resolveTrackedState(cowSnowStates, cow, tick, () => {
    return initializeSeasonalCoverageState(cow, tick, SNOW_CONFIG2, toBoolean, toInteger);
  });
}

// data/scripts/modules/mobs/seasons_cow/index.ts
system35.runInterval(() => {
  const tick = system35.currentTick;
  const currentSeason2 = getCurrentSeason();
  const visibleThisTick = /* @__PURE__ */ new Set();
  for (const dimension of getActiveDimensions()) {
    for (const cow of dimension.getEntities({ type: SEASONAL_COW_TYPE_ID })) {
      if (!cow?.isValid) continue;
      visibleThisTick.add(cow.id);
      applySeasonVariant3(cow, currentSeason2);
      updateLeavesBehavior2(cow, tick, currentSeason2);
      updateSnowBehavior2(cow, tick, currentSeason2);
      updateFertilizingBehavior(cow, tick, currentSeason2);
    }
  }
  cleanupLeavesTracking2(visibleThisTick, tick);
  cleanupSnowTracking2(visibleThisTick, tick);
  cleanupFertilizingTracking(visibleThisTick, tick);
}, SCAN_INTERVAL_TICKS2);

// data/scripts/modules/mobs/seasons_chicken/index.ts
init_dimension();
init_season_core();
import { system as system37 } from "@minecraft/server";

// data/scripts/modules/mobs/seasons_chicken/bath_behavior.ts
init_season_core();
import { system as system36, world as world33 } from "@minecraft/server";

// data/scripts/modules/mobs/seasons_chicken/constants.ts
import { TicksPerSecond as TicksPerSecond18 } from "@minecraft/server";
var CHICKEN_TYPE_ID = "mythicus_sn:seasons_chicken";
var SCAN_INTERVAL_TICKS3 = 20;
var BATH_DURATION_TICKS = 15 * TicksPerSecond18;
var BATH_EVENT_STOP = "mythicus_sn:stop_bathing";
var DIG_EVENT_ENABLE2 = "mythicus_sn:enable_seed_dig";
var DIG_EVENT_DISABLE2 = "mythicus_sn:disable_seed_dig";
var DROP_CHECK_INTERVAL_MIN_TICKS = 3 * 60 * TicksPerSecond18;
var DROP_CHECK_INTERVAL_MAX_TICKS = 6 * 60 * TicksPerSecond18;
var DROP_CHANCE = 0.25;
var FEATHER_ITEM_ID = "mythicus_sn:feather";
var PROPERTY_IS_SHAKING3 = "mythicus_sn:is_shaking";
var STALE_STATE_TICKS3 = 1200;

// data/scripts/modules/mobs/seasons_chicken/bath_behavior.ts
var chickenBathStates = /* @__PURE__ */ new Map();
function updateBathBehavior(chicken, tick, currentSeason2) {
  const state = resolveBathState(chicken, tick);
  if (currentSeason2 !== "summer" /* Summer */) {
    if (state.isBathing) {
      stopBathing(chicken, state);
    }
    return;
  }
  if (state.isBathing && tick >= state.bathEndTick) {
    stopBathing(chicken, state);
  }
}
function resolveBathState(chicken, tick) {
  let state = chickenBathStates.get(chicken.id);
  if (!state) {
    const isBathing = chicken.getProperty(PROPERTY_IS_SHAKING3) === true;
    state = {
      isBathing,
      bathEndTick: isBathing ? tick + BATH_DURATION_TICKS : 0,
      lastSeenTick: tick
    };
    chickenBathStates.set(chicken.id, state);
  }
  state.lastSeenTick = tick;
  return state;
}
function stopBathing(chicken, state) {
  if (!chicken.isValid) return;
  chicken.triggerEvent(BATH_EVENT_STOP);
  state.isBathing = false;
  state.bathEndTick = 0;
}
world33.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
  if (event.eventId === "mythicus_sn:start_bathing" && event.entity.typeId === "mythicus_sn:seasons_chicken") {
    const tick = system36.currentTick;
    const state = resolveBathState(event.entity, tick);
    state.isBathing = true;
    state.bathEndTick = tick + BATH_DURATION_TICKS;
  }
});
function cleanupBathTracking(visibleThisTick, tick) {
  for (const [id, state] of chickenBathStates.entries()) {
    if (!visibleThisTick.has(id) && tick - state.lastSeenTick > STALE_STATE_TICKS3) {
      chickenBathStates.delete(id);
    }
  }
}

// data/scripts/modules/mobs/seasons_chicken/dig_behavior.ts
init_season_core();
var chickenDigStates = /* @__PURE__ */ new Map();
function updateDigBehavior2(chicken, tick, currentSeason2) {
  let state = chickenDigStates.get(chicken.id);
  if (!state) {
    state = {
      isDigEnabled: false,
      lastSeenTick: tick
    };
    chickenDigStates.set(chicken.id, state);
  }
  state.lastSeenTick = tick;
  const shouldDig = currentSeason2 === "summer" /* Summer */;
  if (shouldDig !== state.isDigEnabled) {
    const event = shouldDig ? DIG_EVENT_ENABLE2 : DIG_EVENT_DISABLE2;
    if (!chicken.isValid) return;
    chicken.triggerEvent(event);
    state.isDigEnabled = shouldDig;
  }
}
function cleanupDigTracking2(visibleThisTick, tick) {
  for (const [id, state] of chickenDigStates.entries()) {
    if (!visibleThisTick.has(id) && tick - state.lastSeenTick > STALE_STATE_TICKS3) {
      chickenDigStates.delete(id);
    }
  }
}

// data/scripts/modules/mobs/seasons_chicken/egg_drop_behavior.ts
import { ItemStack as ItemStack9 } from "@minecraft/server";
function getRandomDropInterval() {
  return DROP_CHECK_INTERVAL_MIN_TICKS + Math.random() * (DROP_CHECK_INTERVAL_MAX_TICKS - DROP_CHECK_INTERVAL_MIN_TICKS);
}
var chickenSpringDropStates = /* @__PURE__ */ new Map();
function updateSpringDropBehavior(chicken, tick, _currentSeason) {
  let state = chickenSpringDropStates.get(chicken.id);
  if (!state) {
    state = {
      lastSeenTick: tick,
      nextDropCheckTick: tick + getRandomDropInterval()
    };
    chickenSpringDropStates.set(chicken.id, state);
  }
  state.lastSeenTick = tick;
  if (tick < state.nextDropCheckTick) {
    return;
  }
  state.nextDropCheckTick = tick + getRandomDropInterval();
  if (Math.random() <= DROP_CHANCE) {
    if (!chicken.dimension.isChunkLoaded(chicken.location)) return;
    const location = chicken.location;
    const itemStack = new ItemStack9("mythicus_sn:egg", 1);
    const lore = getItemLore("mythicus_sn:egg");
    if (lore) {
      itemStack.setLore(lore);
    }
    chicken.dimension.spawnItem(itemStack, location);
  }
}
function cleanupSpringDropTracking(visibleThisTick, tick) {
  for (const [id, state] of chickenSpringDropStates.entries()) {
    if (!visibleThisTick.has(id) && tick - state.lastSeenTick > STALE_STATE_TICKS3) {
      chickenSpringDropStates.delete(id);
    }
  }
}

// data/scripts/modules/mobs/seasons_chicken/feather_drop_behavior.ts
import { ItemStack as ItemStack10 } from "@minecraft/server";
function getRandomDropInterval2() {
  return DROP_CHECK_INTERVAL_MIN_TICKS + Math.random() * (DROP_CHECK_INTERVAL_MAX_TICKS - DROP_CHECK_INTERVAL_MIN_TICKS);
}
var chickenFallDropStates = /* @__PURE__ */ new Map();
function updateFallDropBehavior(chicken, tick, _currentSeason) {
  let state = chickenFallDropStates.get(chicken.id);
  if (!state) {
    state = {
      lastSeenTick: tick,
      nextDropCheckTick: tick + getRandomDropInterval2()
    };
    chickenFallDropStates.set(chicken.id, state);
  }
  state.lastSeenTick = tick;
  if (tick < state.nextDropCheckTick) {
    return;
  }
  state.nextDropCheckTick = tick + getRandomDropInterval2();
  if (Math.random() <= DROP_CHANCE) {
    if (!chicken.dimension.isChunkLoaded(chicken.location)) return;
    const location = chicken.location;
    const itemStack = new ItemStack10(FEATHER_ITEM_ID, 1);
    const lore = getItemLore(FEATHER_ITEM_ID);
    if (lore) {
      itemStack.setLore(lore);
    }
    chicken.dimension.spawnItem(itemStack, location);
  }
}
function cleanupFallDropTracking(visibleThisTick, tick) {
  for (const [id, state] of chickenFallDropStates.entries()) {
    if (!visibleThisTick.has(id) && tick - state.lastSeenTick > STALE_STATE_TICKS3) {
      chickenFallDropStates.delete(id);
    }
  }
}

// data/scripts/modules/mobs/seasons_chicken/nest_behavior.ts
init_season_core();
var chickenNestStates = /* @__PURE__ */ new Map();
var NEST_EVENT_ENABLE = "mythicus_sn:enable_nesting";
var NEST_EVENT_DISABLE = "mythicus_sn:disable_nesting";
function updateNestBehavior(chicken, tick, currentSeason2) {
  let state = chickenNestStates.get(chicken.id);
  if (!state) {
    state = {
      isNestEnabled: false,
      lastSeenTick: tick
    };
    chickenNestStates.set(chicken.id, state);
  }
  state.lastSeenTick = tick;
  const shouldNest = currentSeason2 === "spring" /* Spring */;
  if (shouldNest !== state.isNestEnabled) {
    const event = shouldNest ? NEST_EVENT_ENABLE : NEST_EVENT_DISABLE;
    if (!chicken.isValid) return;
    chicken.triggerEvent(event);
    state.isNestEnabled = shouldNest;
  }
}
function cleanupNestTracking(visibleThisTick, tick) {
  for (const [id, state] of chickenNestStates.entries()) {
    if (!visibleThisTick.has(id) && tick - state.lastSeenTick > STALE_STATE_TICKS3) {
      chickenNestStates.delete(id);
    }
  }
}

// data/scripts/modules/mobs/seasons_chicken/roost_behavior.ts
init_season_core();
var chickenRoostStates = /* @__PURE__ */ new Map();
var ROOST_EVENT_ENABLE = "mythicus_sn:enable_winter_roost";
var ROOST_EVENT_DISABLE = "mythicus_sn:disable_winter_roost";
function updateRoostBehavior(chicken, tick, currentSeason2) {
  let state = chickenRoostStates.get(chicken.id);
  if (!state) {
    state = {
      isRoostEnabled: false,
      lastSeenTick: tick
    };
    chickenRoostStates.set(chicken.id, state);
  }
  state.lastSeenTick = tick;
  const shouldRoost = currentSeason2 === "winter" /* Winter */;
  if (shouldRoost !== state.isRoostEnabled) {
    const event = shouldRoost ? ROOST_EVENT_ENABLE : ROOST_EVENT_DISABLE;
    if (!chicken.isValid) return;
    chicken.triggerEvent(event);
    state.isRoostEnabled = shouldRoost;
  }
}
function cleanupRoostTracking(visibleThisTick, tick) {
  for (const [id, state] of chickenRoostStates.entries()) {
    if (!visibleThisTick.has(id) && tick - state.lastSeenTick > STALE_STATE_TICKS3) {
      chickenRoostStates.delete(id);
    }
  }
}

// data/scripts/modules/mobs/seasons_chicken/index.ts
system37.runInterval(() => {
  const tick = system37.currentTick;
  const currentSeason2 = getCurrentSeason();
  const visibleChickens = /* @__PURE__ */ new Set();
  for (const dimension of getActiveDimensions()) {
    for (const chicken of dimension.getEntities({ type: CHICKEN_TYPE_ID })) {
      if (!chicken.isValid) continue;
      visibleChickens.add(chicken.id);
      updateBathBehavior(chicken, tick, currentSeason2);
      updateDigBehavior2(chicken, tick, currentSeason2);
      updateFallDropBehavior(chicken, tick, currentSeason2);
      updateSpringDropBehavior(chicken, tick, currentSeason2);
      updateNestBehavior(chicken, tick, currentSeason2);
      updateRoostBehavior(chicken, tick, currentSeason2);
    }
  }
  cleanupBathTracking(visibleChickens, tick);
  cleanupDigTracking2(visibleChickens, tick);
  cleanupFallDropTracking(visibleChickens, tick);
  cleanupSpringDropTracking(visibleChickens, tick);
  cleanupNestTracking(visibleChickens, tick);
  cleanupRoostTracking(visibleChickens, tick);
}, SCAN_INTERVAL_TICKS3);

// data/scripts/modules/mobs/seasons_villager/index.ts
init_dimension();
init_season_core();
import { system as system38 } from "@minecraft/server";

// data/scripts/modules/mobs/seasons_villager/constants.ts
import { TicksPerSecond as TicksPerSecond19 } from "@minecraft/server";
var SEASONAL_ENTITY_TYPE_IDS = [
  "mythicus_sn:season_villager",
  "mythicus_sn:botanist_trader",
  "mythicus_sn:skill_trader"
];
var PROPERTY_SEASON_VARIANT2 = "mythicus_sn:season_variant";
var SCAN_INTERVAL_TICKS4 = 5;
var STALE_STATE_TICKS4 = 45 * TicksPerSecond19;
var LOG_NAMESPACE3 = "SeasonsVillager";

// data/scripts/modules/mobs/seasons_villager/season_variant.ts
init_season_core();
import { world as world34 } from "@minecraft/server";
var entityProps8 = createPropertySetters(LOG_NAMESPACE3);
function applySeasonVariant4(villager, season) {
  applySeasonVariant(villager, season, PROPERTY_SEASON_VARIANT2, entityProps8.setString);
}
world34.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (!entity.isValid || !SEASONAL_ENTITY_TYPE_IDS.includes(entity.typeId)) {
    return;
  }
  applySeasonVariant4(entity, getCurrentSeason());
});

// data/scripts/modules/mobs/seasons_villager/index.ts
system38.runInterval(() => {
  const currentSeason2 = getCurrentSeason();
  for (const dimension of getActiveDimensions()) {
    for (const entityTypeId of SEASONAL_ENTITY_TYPE_IDS) {
      for (const entity of dimension.getEntities({ type: entityTypeId })) {
        applySeasonVariant4(entity, currentSeason2);
      }
    }
  }
}, SCAN_INTERVAL_TICKS4);

// data/scripts/modules/mobs/seasons_rabbit/index.ts
init_dimension();
init_season_core();
import { system as system39 } from "@minecraft/server";

// data/scripts/modules/mobs/seasons_rabbit/constants.ts
import { TicksPerSecond as TicksPerSecond20 } from "@minecraft/server";
var SEASONAL_RABBIT_TYPE_ID = "mythicus_sn:seasons_rabbit";
var PROPERTY_SEASON_VARIANT3 = "mythicus_sn:season_variant";
var SCAN_INTERVAL_TICKS5 = 5;
var STALE_STATE_TICKS5 = 45 * TicksPerSecond20;
var LOG_NAMESPACE4 = "SeasonsRabbit";

// data/scripts/modules/mobs/seasons_rabbit/season_variant.ts
init_season_core();
import { world as world35 } from "@minecraft/server";
var entityProps9 = createPropertySetters(LOG_NAMESPACE4);
function applySeasonVariant5(rabbit, season) {
  applySeasonVariant(rabbit, season, PROPERTY_SEASON_VARIANT3, entityProps9.setString);
}
world35.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (!entity.isValid || entity.typeId !== SEASONAL_RABBIT_TYPE_ID) {
    return;
  }
  applySeasonVariant5(entity, getCurrentSeason());
});

// data/scripts/modules/mobs/seasons_rabbit/index.ts
system39.runInterval(() => {
  const currentSeason2 = getCurrentSeason();
  for (const dimension of getActiveDimensions()) {
    for (const rabbit of dimension.getEntities({ type: SEASONAL_RABBIT_TYPE_ID })) {
      applySeasonVariant5(rabbit, currentSeason2);
    }
  }
}, SCAN_INTERVAL_TICKS5);

// data/scripts/modules/mobs/seasons_sheep/index.ts
init_dimension();
init_season_core();
import { system as system40 } from "@minecraft/server";

// data/scripts/modules/mobs/seasons_sheep/constants.ts
import { TicksPerSecond as TicksPerSecond21 } from "@minecraft/server";
var SEASONAL_SHEEP_TYPE_ID = "mythicus_sn:seasons_sheep";
var PROPERTY_SEASON_VARIANT4 = "mythicus_sn:season_variant";
var PROPERTY_COVERED_IN_LEAVES3 = "mythicus_sn:covered_in_leaves";
var PROPERTY_LEAVES_LEVEL3 = "mythicus_sn:leaves_level";
var PROPERTY_COVERED_IN_SNOW3 = "mythicus_sn:covered_in_snow";
var PROPERTY_SNOW_LEVEL3 = "mythicus_sn:covered_in_snow_level";
var PROPERTY_IS_SHAKING4 = "mythicus_sn:is_shaking";
var SCAN_INTERVAL_TICKS6 = 5;
var STALE_STATE_TICKS6 = 45 * TicksPerSecond21;
var LEAVES_LEVEL_DURATION_TICKS3 = 30 * TicksPerSecond21;
var MAX_LEAVES_LEVEL3 = 4;
var SNOW_LEVEL_DURATION_TICKS3 = 30 * TicksPerSecond21;
var MAX_SNOW_LEVEL3 = 4;
var SHAKE_DURATION_TICKS3 = 25;
var SHAKE_CHECK_INTERVAL_TICKS3 = 30 * TicksPerSecond21;
var SHIVER_CHECK_INTERVAL_TICKS = 5 * TicksPerSecond21;
var SHAKE_CHANCE3 = 0.1;
var LOG_NAMESPACE5 = "SeasonsSheep";

// data/scripts/modules/mobs/seasons_sheep/leaves_behavior.ts
init_season_core();
var entityProps10 = createPropertySetters(LOG_NAMESPACE5);
var sheepLeavesStates = /* @__PURE__ */ new Map();
var LEAVES_CONFIG3 = {
  coveredProperty: PROPERTY_COVERED_IN_LEAVES3,
  levelProperty: PROPERTY_LEAVES_LEVEL3,
  shakeProperty: PROPERTY_IS_SHAKING4,
  maxLevel: MAX_LEAVES_LEVEL3,
  levelDurationTicks: LEAVES_LEVEL_DURATION_TICKS3,
  shakeDurationTicks: SHAKE_DURATION_TICKS3,
  shakeCheckIntervalTicks: SHAKE_CHECK_INTERVAL_TICKS3,
  shakeChance: SHAKE_CHANCE3,
  context: "Leaves"
};
function updateLeavesBehavior3(sheep, tick, currentSeason2) {
  const state = resolveSheepLeavesState(sheep, tick);
  const isActiveSeason = currentSeason2 === "fall" /* Fall */;
  updateSeasonalCoverage(sheep, state, tick, LEAVES_CONFIG3, isActiveSeason, entityProps10.setProperty, entityProps10.setProperty);
}
function cleanupLeavesTracking3(visibleThisTick, tick) {
  cleanupTrackedStates(sheepLeavesStates, visibleThisTick, tick, STALE_STATE_TICKS6);
}
function resolveSheepLeavesState(sheep, tick) {
  return resolveTrackedState(sheepLeavesStates, sheep, tick, () => {
    return initializeSeasonalCoverageState(sheep, tick, LEAVES_CONFIG3, toBoolean, toInteger);
  });
}

// data/scripts/modules/mobs/seasons_sheep/loot_behavior.ts
init_season_core();
var sheepLootStates = /* @__PURE__ */ new Map();
var SET_FALL_LOOT_EVENT = "mythicus_sn:set_fall_loot";
var SET_NORMAL_LOOT_EVENT = "mythicus_sn:set_normal_loot";
function updateLootBehavior(sheep, tick, currentSeason2) {
  const state = resolveSheepState(sheep, tick);
  const isFall = currentSeason2 === "fall" /* Fall */;
  const wasInFallLoot = state.currentLootSeason === "fall" /* Fall */;
  if (isFall && !wasInFallLoot) {
    sheep.triggerEvent(SET_FALL_LOOT_EVENT);
    state.currentLootSeason = "fall" /* Fall */;
  } else if (!isFall && wasInFallLoot) {
    sheep.triggerEvent(SET_NORMAL_LOOT_EVENT);
    state.currentLootSeason = currentSeason2;
  } else if (state.currentLootSeason === null) {
    state.currentLootSeason = currentSeason2;
    if (isFall) {
      sheep.triggerEvent(SET_FALL_LOOT_EVENT);
    }
  }
}
function cleanupLootTracking(visibleThisTick, tick) {
  cleanupTrackedStates(sheepLootStates, visibleThisTick, tick, STALE_STATE_TICKS6);
}
function resolveSheepState(sheep, tick) {
  return resolveTrackedState(sheepLootStates, sheep, tick, () => ({
    lastSeenTick: tick,
    currentLootSeason: null
  }));
}

// data/scripts/modules/mobs/seasons_sheep/season_variant.ts
init_season_core();
import { world as world36 } from "@minecraft/server";
var entityProps11 = createPropertySetters(LOG_NAMESPACE5);
function applySeasonVariant6(sheep, season) {
  applySeasonVariant(sheep, season, PROPERTY_SEASON_VARIANT4, entityProps11.setString);
}
world36.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (!entity.isValid || entity.typeId !== SEASONAL_SHEEP_TYPE_ID) {
    return;
  }
  applySeasonVariant6(entity, getCurrentSeason());
});

// data/scripts/modules/mobs/seasons_sheep/snow_behavior.ts
init_season_core();
var entityProps12 = createPropertySetters(LOG_NAMESPACE5);
var sheepSnowStates = /* @__PURE__ */ new Map();
var SNOW_CONFIG3 = {
  coveredProperty: PROPERTY_COVERED_IN_SNOW3,
  levelProperty: PROPERTY_SNOW_LEVEL3,
  shakeProperty: PROPERTY_IS_SHAKING4,
  maxLevel: MAX_SNOW_LEVEL3,
  levelDurationTicks: SNOW_LEVEL_DURATION_TICKS3,
  shakeDurationTicks: SHAKE_DURATION_TICKS3,
  shakeCheckIntervalTicks: SHAKE_CHECK_INTERVAL_TICKS3,
  shakeChance: SHAKE_CHANCE3,
  context: "Snow"
};
function updateSnowBehavior3(sheep, tick, currentSeason2) {
  const state = resolveSheepSnowState(sheep, tick);
  const isActiveSeason = currentSeason2 === "winter" /* Winter */;
  updateSeasonalCoverage(
    sheep,
    state,
    tick,
    SNOW_CONFIG3,
    isActiveSeason,
    entityProps12.setProperty,
    entityProps12.setProperty
  );
}
function cleanupSnowTracking3(visibleThisTick, tick) {
  cleanupTrackedStates(sheepSnowStates, visibleThisTick, tick, STALE_STATE_TICKS6);
}
function resolveSheepSnowState(sheep, tick) {
  return resolveTrackedState(sheepSnowStates, sheep, tick, () => {
    return initializeSeasonalCoverageState(sheep, tick, SNOW_CONFIG3, toBoolean, toInteger);
  });
}

// data/scripts/modules/mobs/seasons_sheep/index.ts
system40.runInterval(() => {
  const tick = system40.currentTick;
  const currentSeason2 = getCurrentSeason();
  const visibleThisTick = /* @__PURE__ */ new Set();
  for (const dimension of getActiveDimensions()) {
    for (const sheep of dimension.getEntities({ type: SEASONAL_SHEEP_TYPE_ID })) {
      if (!sheep?.isValid) continue;
      visibleThisTick.add(sheep.id);
      updateLeavesBehavior3(sheep, tick, currentSeason2);
      updateSnowBehavior3(sheep, tick, currentSeason2);
      updateLootBehavior(sheep, tick, currentSeason2);
      applySeasonVariant6(sheep, currentSeason2);
    }
  }
  cleanupLeavesTracking3(visibleThisTick, tick);
  cleanupSnowTracking3(visibleThisTick, tick);
  cleanupLootTracking(visibleThisTick, tick);
}, SCAN_INTERVAL_TICKS6);

// data/scripts/modules/mobs/bees/index.ts
init_dimension();
init_season_core();
import { system as system41 } from "@minecraft/server";

// data/scripts/modules/mobs/bees/constants.ts
import { TicksPerSecond as TicksPerSecond22 } from "@minecraft/server";
var BITTY_BEE_TYPE_ID = "mythicus_sn:bitty_bee";
var BEE_QUEEN_TYPE_ID = "mythicus_sn:bee_queen";
var BEE_TYPE_IDS = [BITTY_BEE_TYPE_ID, BEE_QUEEN_TYPE_ID];
var PROPERTY_SEASON_VARIANT5 = "mythicus_sn:season_variant";
var EVENT_FIND_HIVE = "mythicus_sn:find_hive_event";
var EVENT_START_SUMMER_SEARCH = "mythicus_sn:start_summer_search";
var EVENT_START_SUMMER_BEHAVIOR = "mythicus_sn:start_summer_behavior";
var EVENT_END_SUMMER_BEHAVIOR = "mythicus_sn:end_summer_behavior";
var EVENT_FOUND_NEW_HOME = "mythicus_sn:found_new_home";
var EVENT_START_FALL_BEHAVIOR = "mythicus_sn:start_fall_behavior";
var EVENT_END_FALL_BEHAVIOR = "mythicus_sn:end_fall_behavior";
var EVENT_START_WINTER_BEHAVIOR = "mythicus_sn:start_winter_behavior";
var EVENT_END_WINTER_BEHAVIOR = "mythicus_sn:end_winter_behavior";
var EVENT_SEEK_SHELTER = "mythicus_sn:seek_shelter";
var EVENT_ABORT_SHELTER = "mythicus_sn:abort_sheltering";
var SCAN_INTERVAL_TICKS7 = 5;
var STALE_STATE_TICKS7 = 45 * TicksPerSecond22;
var SWARM_FOLLOW_RADIUS = 7;
var LOG_NAMESPACE6 = "SeasonsBees";

// data/scripts/modules/mobs/bees/fall_behavior.ts
init_season_core();
var fallStates = /* @__PURE__ */ new Map();
function applyFallBehavior(bee, season) {
  if (season !== "fall" /* Fall */) return;
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_START_FALL_BEHAVIOR);
}
function updateFallBehavior(bee, tick, currentSeason2) {
  const state = resolveFallState(bee, tick);
  const shouldBeInFallMode = currentSeason2 === "fall" /* Fall */;
  if (shouldBeInFallMode && !state.isInFallMode) {
    activateFallMode(bee);
    state.isInFallMode = true;
  } else if (!shouldBeInFallMode && state.isInFallMode) {
    deactivateFallMode(bee);
    state.isInFallMode = false;
  }
}
function activateFallMode(bee) {
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_START_FALL_BEHAVIOR);
}
function deactivateFallMode(bee) {
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_END_FALL_BEHAVIOR);
}
function cleanupFallTracking(visibleThisTick, tick) {
  cleanupTrackedStates(fallStates, visibleThisTick, tick, STALE_STATE_TICKS7);
}
function resolveFallState(bee, tick) {
  return resolveTrackedState(fallStates, bee, tick, () => ({
    lastSeenTick: tick,
    isInFallMode: false
  }));
}

// data/scripts/modules/mobs/bees/spring_behavior.ts
init_season_core();
var springStates = /* @__PURE__ */ new Map();
function applySpringBehavior(bee, season) {
  if (season !== "spring" /* Spring */) return;
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_FIND_HIVE);
}
function updateSpringBehavior(bee, tick, currentSeason2) {
  const state = resolveSpringState(bee, tick);
  if (currentSeason2 !== "spring" /* Spring */) {
    state.hasTriggeredHiveSearch = false;
    return;
  }
}
function cleanupSpringTracking(visibleThisTick, tick) {
  cleanupTrackedStates(springStates, visibleThisTick, tick, STALE_STATE_TICKS7);
}
function resolveSpringState(bee, tick) {
  return resolveTrackedState(springStates, bee, tick, () => ({
    lastSeenTick: tick,
    hasTriggeredHiveSearch: false
  }));
}

// data/scripts/modules/mobs/bees/summer_behavior.ts
init_season_core();
import { world as world37 } from "@minecraft/server";
var summerStates = /* @__PURE__ */ new Map();
function applySummerBehavior(bee, season) {
  if (season !== "summer" /* Summer */) return;
  if (!bee.isValid) return;
  if (bee.typeId === BEE_QUEEN_TYPE_ID) {
    bee.triggerEvent(EVENT_START_SUMMER_SEARCH);
  } else if (bee.typeId === BITTY_BEE_TYPE_ID) {
    bee.triggerEvent(EVENT_START_SUMMER_BEHAVIOR);
  }
}
function updateSummerBehavior2(bee, tick, currentSeason2) {
  const state = resolveSummerState2(bee, tick);
  const shouldBeInSummerMode = currentSeason2 === "summer" /* Summer */;
  if (shouldBeInSummerMode && !state.isInSummerMode) {
    activateSummerMode(bee);
    state.isInSummerMode = true;
  } else if (!shouldBeInSummerMode && state.isInSummerMode) {
    deactivateSummerMode(bee);
    state.isInSummerMode = false;
  }
}
function activateSummerMode(bee) {
  if (!bee.isValid) return;
  if (bee.typeId === BEE_QUEEN_TYPE_ID) {
    bee.triggerEvent(EVENT_START_SUMMER_SEARCH);
  } else if (bee.typeId === BITTY_BEE_TYPE_ID) {
    bee.triggerEvent(EVENT_START_SUMMER_BEHAVIOR);
  }
}
function deactivateSummerMode(bee) {
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_END_SUMMER_BEHAVIOR);
}
function assignNewHomeToSwarm(queen) {
  if (!queen.isValid) return;
  const location = queen.location;
  const dimension = queen.dimension;
  const nearbyBees = dimension.getEntities({
    location,
    maxDistance: SWARM_FOLLOW_RADIUS,
    families: ["bee"]
  });
  for (const bee of nearbyBees) {
    if (!bee.isValid) continue;
    bee.triggerEvent(EVENT_END_SUMMER_BEHAVIOR);
  }
}
function cleanupSummerTracking2(visibleThisTick, tick) {
  cleanupTrackedStates(summerStates, visibleThisTick, tick, STALE_STATE_TICKS7);
}
function resolveSummerState2(bee, tick) {
  return resolveTrackedState(summerStates, bee, tick, () => ({
    lastSeenTick: tick,
    isInSummerMode: false
  }));
}
world37.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
  if (event.eventId !== EVENT_FOUND_NEW_HOME) return;
  if (event.entity.typeId !== BEE_QUEEN_TYPE_ID) return;
  if (!event.entity.isValid) return;
  assignNewHomeToSwarm(event.entity);
});

// data/scripts/modules/mobs/bees/weather_shelter_behavior.ts
init_weather_data();
init_weather_system();
import { world as world38 } from "@minecraft/server";
var shelterStates = /* @__PURE__ */ new Map();
function isWeatherRequiringShelter(weather) {
  return weather === "rain" /* Rain */ || weather === "storm" /* Storm */ || weather === "sleet" /* Sleet */ || weather === "snowing" /* Snowing */ || weather === "blizzard" /* Blizzard */;
}
function updateShelterBehavior(bee, tick) {
  if (!bee.isValid) return;
  if (!BEE_TYPE_IDS.includes(bee.typeId)) return;
  const state = resolveShelterState(bee, tick);
  const currentWeather = forecast[0]?.weather ?? "clear" /* Clear */;
  const isDaytime = world38.getTimeOfDay() < 13e3 || world38.getTimeOfDay() >= 23e3;
  const hasNectar = bee.getProperty("minecraft:has_nectar");
  const isOverworld = bee.dimension.id === "minecraft:overworld";
  const needsShelter = !hasNectar && isOverworld && (!isDaytime || isWeatherRequiringShelter(currentWeather));
  if (needsShelter && !state.isSheltering) {
    bee.triggerEvent(EVENT_SEEK_SHELTER);
    state.isSheltering = true;
    state.lastWeatherCheck = currentWeather;
  } else if (!needsShelter && state.isSheltering) {
    bee.triggerEvent(EVENT_ABORT_SHELTER);
    state.isSheltering = false;
    state.lastWeatherCheck = currentWeather;
  }
}
function cleanupShelterTracking(visibleThisTick, tick) {
  cleanupTrackedStates(shelterStates, visibleThisTick, tick, STALE_STATE_TICKS7);
}
function resolveShelterState(bee, tick) {
  return resolveTrackedState(shelterStates, bee, tick, () => ({
    lastSeenTick: tick,
    isSheltering: false,
    lastWeatherCheck: null
  }));
}

// data/scripts/modules/mobs/bees/winter_behavior.ts
init_season_core();
import { world as world39 } from "@minecraft/server";
var winterStates = /* @__PURE__ */ new Map();
function applyWinterBehavior(bee, season) {
  if (season !== "winter" /* Winter */) return;
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_START_WINTER_BEHAVIOR);
}
function updateWinterBehavior(bee, tick, currentSeason2) {
  const state = resolveWinterState(bee, tick);
  const shouldBeInWinterMode = currentSeason2 === "winter" /* Winter */;
  if (shouldBeInWinterMode && !state.isInWinterMode) {
    activateWinterMode(bee);
    state.isInWinterMode = true;
  } else if (!shouldBeInWinterMode && state.isInWinterMode) {
    deactivateWinterMode(bee);
    state.isInWinterMode = false;
  }
}
function activateWinterMode(bee) {
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_START_WINTER_BEHAVIOR);
}
function deactivateWinterMode(bee) {
  if (!bee.isValid) return;
  bee.triggerEvent(EVENT_END_WINTER_BEHAVIOR);
}
function cleanupWinterTracking(visibleThisTick, tick) {
  cleanupTrackedStates(winterStates, visibleThisTick, tick, STALE_STATE_TICKS7);
}
function resolveWinterState(bee, tick) {
  return resolveTrackedState(winterStates, bee, tick, () => ({
    lastSeenTick: tick,
    isInWinterMode: false
  }));
}
world39.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
  if (event.eventId !== "minecraft:exited_hive") return;
  if (!BEE_TYPE_IDS.includes(event.entity.typeId)) return;
  if (!event.entity.isValid) return;
  const state = winterStates.get(event.entity.id);
  if (state?.isInWinterMode) {
    event.entity.triggerEvent(EVENT_START_WINTER_BEHAVIOR);
  }
});

// data/scripts/modules/mobs/bees/season_variant.ts
init_season_core();
import { world as world40 } from "@minecraft/server";
var entityProps13 = createPropertySetters(LOG_NAMESPACE6);
function applySeasonBehavior(bee, season) {
  let variantValue;
  switch (season) {
    case "spring" /* Spring */:
      variantValue = "spring";
      applySpringBehavior(bee, season);
      break;
    case "summer" /* Summer */:
      variantValue = "summer";
      applySummerBehavior(bee, season);
      break;
    case "fall" /* Fall */:
      variantValue = "fall";
      applyFallBehavior(bee, season);
      break;
    case "winter" /* Winter */:
      variantValue = "winter";
      applyWinterBehavior(bee, season);
      break;
    default:
      variantValue = "spring";
      break;
  }
  entityProps13.setString(bee, PROPERTY_SEASON_VARIANT5, variantValue, "SeasonVariant");
}
world40.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (!entity.isValid) return;
  if (!BEE_TYPE_IDS.includes(entity.typeId)) return;
  applySeasonBehavior(entity, getCurrentSeason());
});

// data/scripts/modules/mobs/bees/index.ts
system41.runInterval(() => {
  const tick = system41.currentTick;
  const currentSeason2 = getCurrentSeason();
  const visibleThisTick = /* @__PURE__ */ new Set();
  for (const dimension of getActiveDimensions()) {
    for (const bee of dimension.getEntities({ families: ["bee"] })) {
      if (!bee.isValid) continue;
      if (!BEE_TYPE_IDS.includes(bee.typeId)) continue;
      visibleThisTick.add(bee.id);
      updateSpringBehavior(bee, tick, currentSeason2);
      updateSummerBehavior2(bee, tick, currentSeason2);
      updateFallBehavior(bee, tick, currentSeason2);
      updateWinterBehavior(bee, tick, currentSeason2);
      updateShelterBehavior(bee, tick);
    }
  }
  cleanupSpringTracking(visibleThisTick, tick);
  cleanupSummerTracking2(visibleThisTick, tick);
  cleanupFallTracking(visibleThisTick, tick);
  cleanupWinterTracking(visibleThisTick, tick);
  cleanupShelterTracking(visibleThisTick, tick);
}, SCAN_INTERVAL_TICKS7);

// data/scripts/modules/spawners/donkey_horse_spawner.ts
import { world as world41 } from "@minecraft/server";

// data/scripts/lib/random.ts
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(array) {
  return [...array].sort(() => 0.5 - Math.random());
}
function createPool(items) {
  if (items.length < 2) {
    throw new Error("Pool must have at least 2 items");
  }
  let pool = [];
  let prev;
  return () => {
    if (!pool.length) {
      pool = shuffle(items);
      if (pool[0] === prev) {
        pool.shift();
        pool.push(prev);
      }
    }
    return prev = pool.shift();
  };
}

// data/scripts/modules/spawners/donkey_horse_spawner.ts
var SPAWNER_TYPE_ID = "mythicus_sn:horse_donkey_spawner";
var HORSE_TYPE_ID = "minecraft:horse";
var DONKEY_TYPE_ID = "minecraft:donkey";
world41.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (entity.typeId === SPAWNER_TYPE_ID) {
    handleSpawnerSpawn(entity);
  }
});
function handleSpawnerSpawn(spawnerEntity) {
  if (!spawnerEntity?.isValid) return;
  const location = spawnerEntity.location;
  const dimension = spawnerEntity.dimension;
  if (!dimension.isChunkLoaded(location)) return;
  const spawnType = Math.random() < 0.75 ? HORSE_TYPE_ID : DONKEY_TYPE_ID;
  const herdSize = randomInt(2, 4);
  spawnHerd(dimension, location, spawnType, herdSize);
  if (spawnerEntity.isValid) spawnerEntity.remove();
}
function spawnHerd(dimension, centerLocation, entityType, count) {
  const maxSpread = 3;
  for (let i = 0; i < count; i++) {
    const offsetX = randomInt(-maxSpread, maxSpread);
    const offsetZ = randomInt(-maxSpread, maxSpread);
    const spawnLocation = {
      x: centerLocation.x + offsetX,
      y: centerLocation.y,
      z: centerLocation.z + offsetZ
    };
    if (!dimension.isChunkLoaded(spawnLocation)) continue;
    dimension.spawnEntity(entityType, spawnLocation);
  }
}

// data/scripts/modules/spawners/fox_wolf_spawner.ts
import { world as world42 } from "@minecraft/server";
var SPAWNER_TYPE_ID2 = "mythicus_sn:fox_wolf_spawner";
var FOX_TYPE_ID = "minecraft:fox";
var WOLF_TYPE_ID = "minecraft:wolf";
world42.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (entity.typeId === SPAWNER_TYPE_ID2) {
    handleSpawnerSpawn2(entity);
  }
});
function handleSpawnerSpawn2(spawnerEntity) {
  if (!spawnerEntity?.isValid) return;
  const location = spawnerEntity.location;
  const dimension = spawnerEntity.dimension;
  if (!dimension.isChunkLoaded(location)) return;
  const spawnType = Math.random() < 0.5 ? FOX_TYPE_ID : WOLF_TYPE_ID;
  const packSize = spawnType === FOX_TYPE_ID ? randomInt(2, 4) : 4;
  spawnPack(dimension, location, spawnType, packSize);
  if (spawnerEntity.isValid) spawnerEntity.remove();
}
function spawnPack(dimension, centerLocation, entityType, count) {
  const maxSpread = 3;
  for (let i = 0; i < count; i++) {
    const offsetX = randomInt(-maxSpread, maxSpread);
    const offsetZ = randomInt(-maxSpread, maxSpread);
    const spawnLocation = {
      x: centerLocation.x + offsetX,
      y: centerLocation.y,
      z: centerLocation.z + offsetZ
    };
    if (!dimension.isChunkLoaded(spawnLocation)) continue;
    dimension.spawnEntity(entityType, spawnLocation);
  }
}

// data/scripts/modules/aurora/aurora_runner.ts
init_lib2();
init_dimension();
init_players();
init_season_core();
init_fog_system();
import { TicksPerSecond as TicksPerSecond23, system as system42, world as world43 } from "@minecraft/server";
function queryGroundHeight2(dimension, centerX, centerZ, probeDistance = 16) {
  let highestGroundY = 1;
  const probeLocations = [
    { x: centerX, z: centerZ },
    { x: centerX - probeDistance, z: centerZ },
    { x: centerX + probeDistance, z: centerZ },
    { x: centerX, z: centerZ - probeDistance },
    { x: centerX, z: centerZ + probeDistance },
    { x: centerX - probeDistance / 2, z: centerZ - probeDistance / 2 },
    { x: centerX + probeDistance / 2, z: centerZ + probeDistance / 2 }
  ];
  for (const location of probeLocations) {
    if (!dimension.isChunkLoaded({ x: location.x, y: 0, z: location.z })) continue;
    const block = dimension.getTopmostBlock({ x: location.x, z: location.z });
    if (block) {
      const groundY = block.y + 1;
      highestGroundY = Math.max(highestGroundY, groundY);
    }
  }
  return highestGroundY;
}
var currentAurora = void 0;
var Aurora = class {
  emitters = [];
  startTime = 0;
  lifetimeInTicks;
  createdAt;
  particlesToChooseFrom = [
    "mythicus_sn:aurora_pink",
    "mythicus_sn:aurora_blue",
    "mythicus_sn:aurora_green"
  ];
  constructor(player, lifetimeInSeconds = Infinity, currentTick = system42.currentTick, numColors) {
    this.lifetimeInTicks = lifetimeInSeconds === Infinity ? Infinity : lifetimeInSeconds * TicksPerSecond23;
    this.createdAt = currentTick;
    this.startTime = currentTick;
    const randomNumber = numColors !== void 0 ? numColors : 1 + Math.floor(Math.random() * 3);
    const dimension = getDimension(MinecraftDimensionTypes.Overworld);
    const baseLocation = player.location;
    baseLocation.z -= 32;
    const groundHeight = queryGroundHeight2(dimension, baseLocation.x, baseLocation.z);
    const auroraHeight = groundHeight + 45;
    const particleLocation = { ...baseLocation, y: auroraHeight };
    let colorsToUse = [];
    if (numColors === 3) {
      colorsToUse = [...this.particlesToChooseFrom];
    } else if (numColors === 2) {
      const shuffled = [...this.particlesToChooseFrom].sort(() => Math.random() - 0.5);
      colorsToUse = shuffled.slice(0, 2);
    } else if (numColors === 1) {
      const randomIndex = Math.floor(Math.random() * this.particlesToChooseFrom.length);
      colorsToUse = [this.particlesToChooseFrom[randomIndex]];
    } else {
      const availableColors = [...this.particlesToChooseFrom];
      const numToSelect = randomNumber;
      colorsToUse = [];
      for (let i = 0; i < numToSelect; i++) {
        const randomIndex = Math.floor(Math.random() * availableColors.length);
        colorsToUse.push(availableColors[randomIndex]);
        availableColors.splice(randomIndex, 1);
      }
    }
    for (let i = 0; i < randomNumber; i++) {
      const randomOffsetX = Math.round((Math.random() - 0.5) * 32);
      const randomOffsetZ = Math.round((Math.random() - 0.5) * 32);
      const chooseParticle = colorsToUse[i];
      const newParticleLocation = {
        x: particleLocation.x + randomOffsetX,
        y: particleLocation.y,
        z: particleLocation.z + randomOffsetZ
      };
      const emitter = {
        location: newParticleLocation,
        particle: chooseParticle
      };
      this.emitters.push(emitter);
      if (dimension.isChunkLoaded(emitter.location)) {
        dimension.spawnParticle(emitter.particle, emitter.location);
      }
    }
  }
  isExpired(currentTick) {
    if (this.lifetimeInTicks === Infinity) return false;
    return currentTick - this.createdAt >= this.lifetimeInTicks;
  }
  process(currentTick = system42.currentTick) {
    if (this.isExpired(currentTick)) {
      return;
    }
    const dimension = getDimension(MinecraftDimensionTypes.Overworld);
    const age = currentTick - this.startTime;
    if (age >= 29 * TicksPerSecond23) {
      this.emitters.forEach((emitter) => {
        if (dimension.isChunkLoaded(emitter.location)) {
          dimension.spawnParticle(emitter.particle, emitter.location);
        }
      });
      this.startTime = currentTick;
    }
  }
  cleanup() {
    this.emitters = [];
  }
};
var auroraRollAttempted = false;
var AURORA_CHANCE = 0.666;
function spawnAuroraWithLifetime(player, lifetimeInSeconds, numColors) {
  const particlesEnabled = world43.getDynamicProperty("mythicus_sn:particles_enabled") ?? true;
  if (!particlesEnabled) {
    return;
  }
  if (currentAurora) {
    currentAurora.cleanup();
  }
  currentAurora = new Aurora(player, lifetimeInSeconds, system42.currentTick, numColors);
}
system42.runInterval(processAurora, 5 * TicksPerSecond23);
function processAurora() {
  const particlesEnabled = world43.getDynamicProperty("mythicus_sn:particles_enabled") ?? true;
  if (!particlesEnabled) {
    currentAurora = void 0;
    return;
  }
  if (currentAurora && currentAurora.isExpired(system42.currentTick)) {
    currentAurora.cleanup();
    currentAurora = void 0;
  }
  if (currentAurora && currentAurora.lifetimeInTicks !== Infinity) {
    currentAurora.process();
    return;
  }
  const currentSeason2 = getCurrentSeason();
  if (currentSeason2 !== "winter" /* Winter */) return;
  const timeOfDay = world43.getTimeOfDay();
  if (timeOfDay >= 14e3 && timeOfDay <= 22e3) {
    const allPlayers = getAllPlayers();
    if (allPlayers.length === 0) return;
    const seasonalPlayers = allPlayers.filter((player) => {
      const biome = player.dimension.getBiome(player.location);
      return isSeasonalBiome(biome.id);
    });
    if (seasonalPlayers.length === 0) return;
    const randomRoll = Math.floor(Math.random() * seasonalPlayers.length);
    const randomPlayer = allPlayers[randomRoll];
    if (!auroraRollAttempted) {
      const roll = Math.random();
      if (roll >= AURORA_CHANCE) {
        currentAurora = new Aurora(randomPlayer);
      }
      auroraRollAttempted = true;
    } else if (currentAurora !== void 0) {
      currentAurora.process();
    }
  } else {
    if (currentAurora && currentAurora.lifetimeInTicks === Infinity) {
      currentAurora = void 0;
      auroraRollAttempted = false;
    }
  }
}

// data/scripts/main.ts
init_rainbow_runner();

// data/scripts/modules/commands.ts
import { Player as Player31, system as system43, world as world44 } from "@minecraft/server";
init_rainbow_runner();
init_weather_data();
init_weather_system();
var COMMAND_RAINBOW_LIFETIME = 3600;
var COMMAND_AURORA_LIFETIME = 3600;
system43.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== "mythicus_sn:command") return;
  const message = event.message.trim();
  const sourceEntity = event.sourceEntity;
  if (!sourceEntity || !(sourceEntity instanceof Player31)) return;
  const player = sourceEntity;
  const args = message.split(" ");
  const command = args[0];
  switch (command) {
    case "rainbow":
      handleRainbowCommand(player);
      break;
    case "aurora":
      const numColors = args.length >= 2 ? parseInt(args[1]) : void 0;
      handleAuroraCommand(player, numColors);
      break;
    case "weather":
      if (args.length < 2) {
        player.sendMessage("\xA7cUsage: /scriptevent mythicus_sn:command weather <clear|rain|storm|sleet|foggy|flurries|snowing|blizzard>");
        return;
      }
      handleWeatherCommand(player, args[1]);
      break;
    case "shake":
      const radius = args.length >= 2 ? parseFloat(args[1]) : 10;
      handleShakeCommand(player, radius);
      break;
    case "maxsnow":
      handleMaxSnowCommand(player);
      break;
    case "maxleaf":
      handleMaxLeafCommand(player);
      break;
    default:
      player.sendMessage("\xA7cUnknown command. Available commands:");
      player.sendMessage("\xA7e  rainbow \xA77- Spawn a rainbow");
      player.sendMessage("\xA7e  aurora [1-3] \xA77- Spawn an aurora (optionally specify 1-3 colors)");
      player.sendMessage("\xA7e  weather <type> \xA77- Set weather type");
      player.sendMessage("\xA7e  shake [radius] \xA77- Force nearby animals to shake off leaves/snow");
      player.sendMessage("\xA7e  maxsnow \xA77- Set nearest animal to max snow accumulation");
      player.sendMessage("\xA7e  maxleaf \xA77- Set nearest animal to max leaf accumulation");
      break;
  }
});
function handleRainbowCommand(player) {
  spawnRainbowWithLifetime(player, COMMAND_RAINBOW_LIFETIME);
  player.sendMessage("\xA7bRainbow spawned with 1 hour lifetime!");
  player.playSound("random.click");
}
function handleAuroraCommand(player, numColors) {
  if (numColors !== void 0 && (numColors < 1 || numColors > 3)) {
    player.sendMessage("\xA7cInvalid number of colors. Must be between 1 and 3.");
    return;
  }
  spawnAuroraWithLifetime(player, COMMAND_AURORA_LIFETIME, numColors);
  const colorText = numColors !== void 0 ? ` with ${numColors} color${numColors > 1 ? "s" : ""}` : "";
  player.sendMessage(`\xA7bAurora spawned${colorText} with 1 hour lifetime!`);
  player.playSound("random.click");
}
function handleWeatherCommand(player, weatherArg) {
  let targetWeather;
  switch (weatherArg.toLowerCase()) {
    case "clear":
      targetWeather = "clear" /* Clear */;
      break;
    case "rain":
      targetWeather = "rain" /* Rain */;
      break;
    case "storm":
      targetWeather = "storm" /* Storm */;
      break;
    case "sleet":
      targetWeather = "sleet" /* Sleet */;
      break;
    case "foggy":
      targetWeather = "foggy" /* Foggy */;
      break;
    case "flurries":
      targetWeather = "flurries" /* Flurries */;
      break;
    case "snowing":
      targetWeather = "snowing" /* Snowing */;
      break;
    case "blizzard":
      targetWeather = "blizzard" /* Blizzard */;
      break;
    default:
      player.sendMessage("\xA7cInvalid weather type. Available: clear, rain, storm, sleet, foggy, flurries, snowing, blizzard");
      return;
  }
  if (forecast.length > 0) {
    forecast[0].weather = targetWeather;
    world44.setDynamicProperty(FIVE_DAY_FORESCAST_PROPERTY, JSON.stringify(forecast));
    player.sendMessage(`\xA7aWeather set to ${targetWeather}!`);
    player.playSound("random.click");
  } else {
    player.sendMessage("\xA7cFailed to set weather: forecast not initialized");
  }
}
function handleShakeCommand(player, radius) {
  if (isNaN(radius) || radius <= 0 || radius > 100) {
    player.sendMessage("\xA7cInvalid radius. Must be between 0 and 100.");
    return;
  }
  const location = player.location;
  const dimension = player.dimension;
  const entities = dimension.getEntities({
    location,
    maxDistance: radius
  });
  const seasonalMobTypes = [
    "mythicus_sn:seasons_cow",
    "mythicus_sn:seasons_sheep",
    "mythicus_sn:seasons_pig",
    "mythicus_sn:seasons_rabbit",
    "mythicus_sn:seasons_fox",
    "mythicus_sn:seasons_villager"
  ];
  let shakenCount = 0;
  for (const entity of entities) {
    if (!seasonalMobTypes.includes(entity.typeId)) {
      continue;
    }
    forceEntityShake(entity);
    shakenCount++;
  }
  if (shakenCount > 0) {
    player.sendMessage(`\xA7aForced ${shakenCount} animal${shakenCount > 1 ? "s" : ""} to shake!`);
    player.playSound("random.click");
  } else {
    player.sendMessage("\xA7cNo seasonal animals found within radius.");
  }
}
function forceEntityShake(entity) {
  if (!entity?.isValid) return;
  entity.setProperty("mythicus_sn:is_shaking", true);
  entity.setProperty("mythicus_sn:covered_in_snow", false);
  entity.setProperty("mythicus_sn:covered_in_snow_level", 0);
  entity.setProperty("mythicus_sn:covered_in_leaves", false);
  entity.setProperty("mythicus_sn:leaves_level", 0);
}
function handleMaxSnowCommand(player) {
  const location = player.location;
  const dimension = player.dimension;
  const entities = dimension.getEntities({
    location,
    maxDistance: 50
  });
  const seasonalMobTypes = [
    "mythicus_sn:seasons_cow",
    "mythicus_sn:seasons_sheep",
    "mythicus_sn:seasons_pig",
    "mythicus_sn:seasons_rabbit",
    "mythicus_sn:seasons_fox",
    "mythicus_sn:seasons_villager"
  ];
  let nearestEntity = null;
  let nearestDistance = Infinity;
  for (const entity of entities) {
    if (!seasonalMobTypes.includes(entity.typeId)) {
      continue;
    }
    const dx = entity.location.x - location.x;
    const dy = entity.location.y - location.y;
    const dz = entity.location.z - location.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestEntity = entity;
    }
  }
  if (nearestEntity) {
    if (!nearestEntity.isValid) {
      player.sendMessage("\xA7cEntity is no longer valid.");
      return;
    }
    nearestEntity.setProperty("mythicus_sn:covered_in_snow", true);
    nearestEntity.setProperty("mythicus_sn:covered_in_snow_level", 4);
    nearestEntity.setProperty("mythicus_sn:is_shaking", false);
    player.sendMessage(`\xA7aSet ${nearestEntity.typeId.split(":")[1]} to max snow level (${nearestDistance.toFixed(1)} blocks away)!`);
    player.playSound("random.click");
  } else {
    player.sendMessage("\xA7cNo seasonal animals found within 50 blocks.");
  }
}
function handleMaxLeafCommand(player) {
  const location = player.location;
  const dimension = player.dimension;
  const entities = dimension.getEntities({
    location,
    maxDistance: 50
  });
  const seasonalMobTypes = [
    "mythicus_sn:seasons_cow",
    "mythicus_sn:seasons_sheep",
    "mythicus_sn:seasons_pig",
    "mythicus_sn:seasons_rabbit",
    "mythicus_sn:seasons_fox",
    "mythicus_sn:seasons_villager"
  ];
  let nearestEntity = null;
  let nearestDistance = Infinity;
  for (const entity of entities) {
    if (!seasonalMobTypes.includes(entity.typeId)) {
      continue;
    }
    const dx = entity.location.x - location.x;
    const dy = entity.location.y - location.y;
    const dz = entity.location.z - location.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestEntity = entity;
    }
  }
  if (nearestEntity) {
    if (!nearestEntity.isValid) {
      player.sendMessage("\xA7cEntity is no longer valid.");
      return;
    }
    nearestEntity.setProperty("mythicus_sn:covered_in_leaves", true);
    nearestEntity.setProperty("mythicus_sn:leaves_level", 4);
    nearestEntity.setProperty("mythicus_sn:is_shaking", false);
    player.sendMessage(`\xA7aSet ${nearestEntity.typeId.split(":")[1]} to max leaf level (${nearestDistance.toFixed(1)} blocks away)!`);
    player.playSound("random.click");
  } else {
    player.sendMessage("\xA7cNo seasonal animals found within 50 blocks.");
  }
}

// data/scripts/modules/foliage_blocks.ts
init_particles();
import {
  EntityComponentTypes as EntityComponentTypes17,
  EquipmentSlot as EquipmentSlot10,
  GameMode as GameMode8,
  ItemStack as ItemStack11,
  system as system44,
  world as world45
} from "@minecraft/server";
var blockPlacementPairs = {
  "mythicus_sn:peony_bottom": "mythicus_sn:peony_top",
  "mythicus_sn:rose_bottom": "mythicus_sn:rose_top",
  "mythicus_sn:lilac_bottom": "mythicus_sn:lilac_top",
  "mythicus_sn:large_fern_bottom": "mythicus_sn:large_fern_top",
  "mythicus_sn:tall_grass_bottom": "mythicus_sn:tall_grass_top"
};
var blockBreakingPairs = {
  "mythicus_sn:peony_top": "mythicus_sn:peony_bottom",
  "mythicus_sn:rose_top": "mythicus_sn:rose_bottom",
  "mythicus_sn:lilac_top": "mythicus_sn:lilac_bottom",
  "mythicus_sn:large_fern_top": "mythicus_sn:large_fern_bottom",
  "mythicus_sn:tall_grass_top": "mythicus_sn:tall_grass_bottom"
};
world45.afterEvents.playerPlaceBlock.subscribe((event) => {
  const { block } = event;
  const blockToPlaceAbove = blockPlacementPairs[block.typeId];
  if (!blockToPlaceAbove) return;
  const dimension = block.dimension;
  const aboveLocation = {
    x: block.x,
    y: block.y + 1,
    z: block.z
  };
  if (!dimension.isChunkLoaded(aboveLocation)) return;
  const aboveBlock = dimension.getBlock(aboveLocation);
  if (aboveBlock && (aboveBlock.typeId === "minecraft:air" || aboveBlock.isLiquid)) {
    aboveBlock.setType(blockToPlaceAbove);
  } else {
    block.setType("minecraft:air");
  }
});
world45.afterEvents.playerBreakBlock.subscribe((event) => {
  const { block, brokenBlockPermutation, player } = event;
  const brokenBlockType = brokenBlockPermutation.type.id;
  const blockToBreakBelow = blockBreakingPairs[brokenBlockType];
  if (!blockToBreakBelow) return;
  const dimension = block.dimension;
  const belowLocation = {
    x: block.x,
    y: block.y - 1,
    z: block.z
  };
  if (!dimension.isChunkLoaded(belowLocation)) return;
  const belowBlock = dimension.getBlock(belowLocation);
  if (belowBlock && belowBlock.typeId === blockToBreakBelow) {
    const isCreativeMode = player && player.getGameMode() === GameMode8.Creative;
    if (!isCreativeMode) {
      let isUsingShears = false;
      if (player) {
        isUsingShears = isPlayerUsingShears(player);
      }
      const dropData = getDropItemForBlock(blockToBreakBelow, isUsingShears);
      if (dropData) {
        dimension.spawnItem(
          new ItemStack11(dropData.item, dropData.count),
          belowBlock.location
        );
      }
    }
    belowBlock.setType("minecraft:air");
  }
});
function isPlayerUsingShears(player) {
  if (!player.isValid) return false;
  const equipment = player.getComponent(EntityComponentTypes17.Equippable);
  if (!equipment) return false;
  const mainHand = equipment.getEquipment(EquipmentSlot10.Mainhand);
  return mainHand?.typeId === "minecraft:shears";
}
function getDropItemForBlock(blockId, usingShears) {
  switch (blockId) {
    case "mythicus_sn:peony_bottom":
      return { item: "mythicus_sn:peony_bottom", count: 1 };
    case "mythicus_sn:rose_bottom":
      return { item: "mythicus_sn:rose_bottom", count: 1 };
    case "mythicus_sn:lilac_bottom":
      return { item: "mythicus_sn:lilac_bottom", count: 1 };
    case "mythicus_sn:large_fern_bottom":
      return usingShears ? { item: "mythicus_sn:large_fern_bottom", count: 1 } : null;
    case "mythicus_sn:tall_grass_bottom":
      if (usingShears) {
        return { item: "mythicus_sn:tall_grass_bottom", count: 1 };
      }
      return Math.random() < 0.125 ? { item: "minecraft:wheat_seeds", count: 1 } : null;
    default:
      return { item: blockId, count: 1 };
  }
}
world45.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { block, itemStack, player } = event;
  if (!itemStack || !player || itemStack.typeId !== "minecraft:bone_meal") {
    return;
  }
  if (block.typeId !== "mythicus_sn:short_grass") {
    return;
  }
  system44.run(() => {
    if (!block.isValid) {
      return;
    }
    const aboveLocation = {
      x: block.x,
      y: block.y + 1,
      z: block.z
    };
    const aboveBlock = block.dimension.getBlock(aboveLocation);
    if (!aboveBlock || aboveBlock.typeId !== "minecraft:air") {
      return;
    }
    block.setType("mythicus_sn:tall_grass_bottom");
    aboveBlock.setType("mythicus_sn:tall_grass_top");
    const particleLocation = {
      x: block.x + 0.5,
      y: block.y + 0.5,
      z: block.z + 0.5
    };
    safeSpawnParticle(block.dimension, "minecraft:crop_growth_emitter", particleLocation);
    block.dimension.playSound("item.bone_meal.use", block.location, { volume: 1, pitch: 1 });
    const equipment = player.getComponent(EntityComponentTypes17.Equippable);
    if (!equipment) {
      return;
    }
    const mainHand = equipment.getEquipment(EquipmentSlot10.Mainhand);
    if (!mainHand) {
      return;
    }
    const newAmount = mainHand.amount - 1;
    if (newAmount > 0) {
      const newItemStack = new ItemStack11(mainHand.typeId, newAmount);
      equipment.setEquipment(EquipmentSlot10.Mainhand, newItemStack);
    } else {
      equipment.setEquipment(EquipmentSlot10.Mainhand, void 0);
    }
  });
});

// data/scripts/main.ts
init_temperature_manager();
init_environment_temp_manager();

// data/scripts/modules/temperature/thermometer_block.ts
init_fog_system();
init_environment_temp_manager();
init_temperature_component();
import { system as system45 } from "@minecraft/server";
var componentRegistry2;
var registered = false;
system45.beforeEvents.startup.subscribe((event) => {
  componentRegistry2 = event.blockComponentRegistry;
  registerThermometerComponent(componentRegistry2);
});
function registerThermometerComponent(registry) {
  if (!registry || registered) {
    return;
  }
  const component = {
    onPlace: (event) => {
      createThermometerDisplay(event.block, event.dimension);
    },
    onTick: (event) => {
      updateThermometerDisplay(event.block, event.dimension);
    },
    onPlayerBreak: () => {
    }
  };
  registry.registerCustomComponent("mythicus_sn:thermometer_component", component);
  registered = true;
}
function createThermometerDisplay(block, dimension) {
  if (!block?.isValid) return;
  if (!dimension.isChunkLoaded(block.location)) return;
  const biome = dimension.getBiome(block.location);
  const biomeId = biome?.id;
  const inSeasonalBiome = biomeId ? isSeasonalBiome(biomeId) : false;
  if (!inSeasonalBiome) {
    block.setPermutation(
      block.permutation.withState("mythicus_sn:temperature_level", 0)
    );
  }
}
function updateThermometerDisplay(block, dimension) {
  if (!block?.isValid) return;
  if (!dimension.isChunkLoaded(block.location)) return;
  const envManager = EnvironmentTemperatureManager.getInstance();
  const biome = dimension.getBiome(block.location);
  const biomeId = biome?.id;
  const inSeasonalBiome = biomeId ? isSeasonalBiome(biomeId) : false;
  if (!inSeasonalBiome) {
    block.setPermutation(
      block.permutation.withState("mythicus_sn:temperature_level", 0)
    );
  } else {
    const targetTemp = envManager.calculateLocationTemperature(block.location, dimension);
    const level = getLevelFromValue(targetTemp);
    block.setPermutation(
      block.permutation.withState("mythicus_sn:temperature_level", level + 1)
    );
  }
}
function getLevelFromValue(value) {
  if (value >= 90) return 6 /* Burning */;
  else if (value >= 75) return 5 /* Hot */;
  else if (value >= 60) return 4 /* Warm */;
  else if (value >= 50) return 3 /* Temperate */;
  else if (value >= 40) return 2 /* Cool */;
  else if (value >= 10) return 1 /* Cold */;
  else return 0 /* Freezing */;
}

// data/scripts/modules/season_system/seasonal_clock.ts
init_players();
init_season_constants();
init_season_core();
init_season_cycle_presets();
import { TicksPerSecond as TicksPerSecond24, system as system46, world as world46 } from "@minecraft/server";
system46.runInterval(() => {
  for (const player of getAllPlayers()) {
    seasonDataTransfer(player);
  }
}, 3 * TicksPerSecond24);
var lastController = null;
var dataIndex = 0;
var cachedSeasonIndex = -1;
var cachedDaysIntoSeason = -1;
var cachedSeasonInterval = -1;
var cachedBaseExpression = "";
function seasonDataTransfer(player) {
  const currentTick = system46.currentTick;
  const controllerIndex = Math.floor(currentTick / (20 * 120) % 30);
  const newController = `controller.animation.mythicus_sn.player.season_data_transfer_${controllerIndex}`;
  if (lastController) {
    player.playAnimation(`animation.mythicus_sn.player.season_data_transfer_clear`, {
      controller: lastController,
      stopExpression: "",
      players: [player],
      blendOutTime: 0,
      nextState: "default"
    });
  }
  const season = getCurrentSeason();
  const seasonIndex = getSeasonIndex(season);
  const seasonInterval = getActiveSeasonDuration();
  const worldDay = world46.getDay();
  const globalSeasonStartDate = world46.getDynamicProperty(SEASON_START_DAY_PROPERTY) || 0;
  const daysIntoCurrentSeason = worldDay - globalSeasonStartDate;
  if (seasonIndex !== cachedSeasonIndex || daysIntoCurrentSeason !== cachedDaysIntoSeason || seasonInterval !== cachedSeasonInterval) {
    cachedSeasonIndex = seasonIndex;
    cachedDaysIntoSeason = daysIntoCurrentSeason;
    cachedSeasonInterval = seasonInterval;
    cachedBaseExpression = `v.current_season=${seasonIndex};v.days_into_season=${daysIntoCurrentSeason};v.season_interval=${seasonInterval};`;
  }
  const stopExpression = cachedBaseExpression + `v.random1=${Math.random() * 1e3 << 0};v.random2=${Math.random() * 1e3 << 0};v.random3=${Math.random() * 1e3 << 0};`;
  const animId = `animation.mythicus_sn.player.season_data_transfer_${dataIndex}`;
  player.playAnimation(animId, {
    controller: newController,
    stopExpression,
    players: [player],
    blendOutTime: 0,
    nextState: "default"
  });
  lastController = newController;
  dataIndex = 1 - dataIndex;
}

// data/scripts/modules/season_system/first_day_notification.ts
init_players();
init_biome();
init_season_core();
import { TicksPerSecond as TicksPerSecond25, system as system47, world as world47 } from "@minecraft/server";
var SOUND_ID_STRING = "random.levelup";
var playerNotificationState = /* @__PURE__ */ new Map();
var SUNRISE_START = 23500;
var SUNRISE_END = 500;
function isSunrise(timeOfDay) {
  return timeOfDay >= SUNRISE_START || timeOfDay <= SUNRISE_END;
}
function isInSeasonalBiome2(biome) {
  if (!biome) return false;
  return biome.includes("mythicus_sn:seasonal");
}
function getSeasonLangKey(season) {
  switch (season) {
    case "spring" /* Spring */:
      return "ui.mythicus_sn.systems.non-bold_spring";
    case "summer" /* Summer */:
      return "ui.mythicus_sn.systems.non-bold_summer";
    case "fall" /* Fall */:
      return "ui.mythicus_sn.systems.non-bold_fall";
    case "winter" /* Winter */:
      return "ui.mythicus_sn.systems.non-bold_winter";
    default:
      return "ui.mythicus_sn.systems.non-bold_spring";
  }
}
function checkFirstDaySunrise() {
  const currentSeason2 = getCurrentSeason();
  const daysIntoSeason = getDaysIntoCurrentSeason();
  const timeOfDay = world47.getTimeOfDay();
  const isFirstDay = daysIntoSeason === 0;
  if (!isFirstDay) {
    playerNotificationState.clear();
    return;
  }
  if (!isSunrise(timeOfDay)) {
    return;
  }
  const players = getAllPlayers();
  for (const player of players) {
    const playerId = player.id;
    let playerState = playerNotificationState.get(playerId);
    if (!playerState) {
      playerState = {
        lastNotifiedSeason: currentSeason2,
        hasPlayedNotificationToday: false
      };
      playerNotificationState.set(playerId, playerState);
    }
    if (playerState.lastNotifiedSeason !== currentSeason2) {
      playerState.lastNotifiedSeason = currentSeason2;
      playerState.hasPlayedNotificationToday = false;
    }
    if (playerState.hasPlayedNotificationToday) {
      continue;
    }
    const biome = getCurrentBiome(player);
    if (isInSeasonalBiome2(biome)) {
      const seasonLangKey = getSeasonLangKey(currentSeason2);
      player.playSound(SOUND_ID_STRING, { volume: 1 });
      player.onScreenDisplay.setActionBar({
        rawtext: [
          { translate: "ui.mythicus_sn.systems.first_day" },
          { translate: seasonLangKey }
        ]
      });
      playerState.hasPlayedNotificationToday = true;
    }
  }
}
system47.runInterval(checkFirstDaySunrise, TicksPerSecond25 * 5);
world47.afterEvents.playerLeave.subscribe((event) => {
  playerNotificationState.delete(event.playerId);
});

// data/scripts/modules/block_water_placer.ts
init_lib2();
import { BlockPermutation as BlockPermutation5, EntityComponentTypes as EntityComponentTypes18, GameMode as GameMode9, system as system48 } from "@minecraft/server";
var blockPlaceConfigs = [
  {
    componentName: "mythicus_sn:floating",
    blockId: "mythicus_sn:lily_pad",
    statePlaced: "mythicus_sn:waterlily_placed"
  }
];
system48.beforeEvents.startup.subscribe((initEvent) => {
  const { blockComponentRegistry } = initEvent;
  blockPlaceConfigs.forEach((config) => {
    blockComponentRegistry.registerCustomComponent(config.componentName, {
      onPlace: ({ block }) => {
        const perm = BlockPermutation5.resolve(config.blockId).withState(
          config.statePlaced,
          true
        );
        block.setPermutation(perm);
      },
      beforeOnPlayerPlace: (event) => {
        const { player, block: sourceBlock } = event;
        if (!player) return;
        event.cancel = true;
        const perm = BlockPermutation5.resolve(config.blockId).withState(
          config.statePlaced,
          true
        );
        const depthLimit = 5;
        let targetBlock;
        for (let depth = 1; depth <= depthLimit; depth++) {
          const above = sourceBlock.above(depth);
          if (!above || above.typeId !== MinecraftBlockTypes.Air) continue;
          let valid = false;
          if (depth === 1) {
            valid = sourceBlock.isWaterlogged || sourceBlock.typeId === MinecraftBlockTypes.Water && sourceBlock.permutation.getState("liquid_depth") === 0;
          } else {
            if (sourceBlock.isWaterlogged || sourceBlock.typeId === MinecraftBlockTypes.Water) {
              valid = true;
              for (let i = 1; i < depth; i++) {
                const between = sourceBlock.above(i);
                if (!between || between.typeId !== MinecraftBlockTypes.Water) {
                  valid = false;
                  break;
                }
              }
            }
          }
          if (valid) {
            targetBlock = above;
            break;
          }
        }
        if (!targetBlock) return;
        const loc = targetBlock.location;
        const dim = player.dimension;
        system48.run(() => {
          dim.setBlockPermutation(loc, perm);
          if (player.getGameMode() === GameMode9.Creative) return;
          const invComp = player.getComponent(EntityComponentTypes18.Inventory);
          if (!invComp) return;
          const inv = invComp.container;
          const slot = player.selectedSlotIndex;
          const item = inv.getItem(slot);
          if (!item) return;
          const amount = item.amount;
          if (amount > 1) {
            item.amount = amount - 1;
            inv.setItem(slot, item);
          } else {
            inv.setItem(slot, void 0);
          }
        });
      }
    });
  });
});

// data/scripts/modules/snow_growth.ts
init_season_core();
import { EntityComponentTypes as EntityComponentTypes19, EquipmentSlot as EquipmentSlot11, GameMode as GameMode10, ItemStack as ItemStack12, system as system49 } from "@minecraft/server";
var SNOW_LAYER_COMPONENT_ID = "mythicus_sn:snow_layer_placer";
var HEIGHT_STATE = "mythicus_sn:height";
var HEIGHT_KEY = HEIGHT_STATE;
var MAX_HEIGHT = 7;
function getHeight(permutation) {
  const states = permutation.getAllStates();
  if (!Object.prototype.hasOwnProperty.call(states, HEIGHT_STATE)) {
    return void 0;
  }
  const value = states[HEIGHT_KEY];
  return typeof value === "number" ? value : void 0;
}
function setHeight(block, permutation, height) {
  const clampedHeight = Math.max(0, Math.min(height, MAX_HEIGHT));
  const updated = permutation.withState(HEIGHT_KEY, clampedHeight);
  block.setPermutation(updated);
}
function getMeltChance() {
  const season = getCurrentSeason();
  if (season === "winter" /* Winter */) {
    return 0;
  }
  if (season === "summer" /* Summer */ || season === "fall" /* Fall */) {
    return 1;
  }
  if (season === "spring" /* Spring */) {
    const daysIntoSpring = getDaysIntoCurrentSeason();
    if (daysIntoSpring === 0) return 0.2;
    if (daysIntoSpring === 1) return 0.3;
    if (daysIntoSpring === 2) return 0.4;
    return 0.5;
  }
  return 0;
}
system49.beforeEvents.startup.subscribe((startupEvent) => {
  startupEvent.blockComponentRegistry.registerCustomComponent(SNOW_LAYER_COMPONENT_ID, {
    onPlace(event) {
      const block = event.block;
      if (block.isAir) {
        return;
      }
      const permutation = block.permutation;
      if (!permutation) {
        return;
      }
      setHeight(block, permutation, 0);
    },
    onTick(event) {
      const { block } = event;
      if (block.isAir) {
        return;
      }
      const blockBelow = block.below();
      if (blockBelow && blockBelow.isAir) {
        block.setType("minecraft:air");
        return;
      }
      const meltChance = getMeltChance();
      if (meltChance === 0 || Math.random() > meltChance) {
        return;
      }
      const permutation = block.permutation;
      if (!permutation) {
        return;
      }
      const currentHeight = getHeight(permutation);
      if (currentHeight === void 0) {
        return;
      }
      if (currentHeight <= 0) {
        block.setType("minecraft:air");
      } else {
        const meltAmount = currentHeight > 3 ? 2 : 1;
        setHeight(block, permutation, currentHeight - meltAmount);
      }
    },
    onPlayerInteract(event) {
      const { block, player } = event;
      if (!player || block.isAir) {
        return;
      }
      const equippable = player.getComponent(EntityComponentTypes19.Equippable);
      if (!equippable) {
        return;
      }
      const heldItem = equippable.getEquipment(EquipmentSlot11.Mainhand);
      const permutation = block.permutation;
      if (!permutation) {
        return;
      }
      const currentHeight = getHeight(permutation);
      if (currentHeight === void 0) {
        return;
      }
      if (heldItem && heldItem.typeId === "mythicus_sn:snow_layer") {
        if (currentHeight >= MAX_HEIGHT) {
          return;
        }
        setHeight(block, permutation, currentHeight + 1);
        block.dimension.playSound("block.snow.place", block, { pitch: 1, volume: 1 });
        if (player.getGameMode() !== GameMode10.Creative) {
          if (heldItem.amount > 1) {
            heldItem.amount -= 1;
            equippable.setEquipment(EquipmentSlot11.Mainhand, heldItem);
          } else {
            equippable.setEquipment(EquipmentSlot11.Mainhand, void 0);
          }
        }
      } else if (heldItem && heldItem.typeId.includes("shovel")) {
        const snowballCount = Math.min(4, Math.ceil((currentHeight + 1) / 2));
        block.setType("minecraft:air");
        const corners = [
          { x: block.location.x + 0.25, y: block.location.y + 0.2, z: block.location.z + 0.25 },
          // NW
          { x: block.location.x + 0.75, y: block.location.y + 0.2, z: block.location.z + 0.25 },
          // NE
          { x: block.location.x + 0.25, y: block.location.y + 0.2, z: block.location.z + 0.75 },
          // SW
          { x: block.location.x + 0.75, y: block.location.y + 0.2, z: block.location.z + 0.75 }
          // SE
        ];
        for (let i = 0; i < snowballCount; i++) {
          block.dimension.spawnItem(
            new ItemStack12("minecraft:snowball", 1),
            corners[i]
          );
        }
        block.dimension.playSound("block.snow.break", block, { pitch: 1, volume: 1 });
      }
    }
  });
});

// data/scripts/modules/block_remover.ts
init_lib2();
import { system as system50, world as world48 } from "@minecraft/server";
var processedBlocks = /* @__PURE__ */ new Set();
var BLOCK_REPLACEMENT_MAP = {
  "mythicus_sn:ice": "minecraft:flowing_water",
  "mythicus_sn:snow_layer": "minecraft:air",
  "default": "minecraft:air"
};
function getBlockKey4(block) {
  return `${block.x},${block.y},${block.z}`;
}
function getReplacementBlockType(blockTypeId) {
  return BLOCK_REPLACEMENT_MAP[blockTypeId] || BLOCK_REPLACEMENT_MAP["default"];
}
var blockRemoverComponent = {
  onTick(event) {
    const block = event.block;
    if (block.isAir) {
      return;
    }
    const blockKey = getBlockKey4(block);
    if (processedBlocks.has(blockKey)) {
      return;
    }
    if (!block?.isValid) return;
    if (block.hasTag("mythicus_sn:remove")) {
      const replacementType = getReplacementBlockType(block.typeId);
      block.setType(replacementType);
      processedBlocks.add(blockKey);
    }
  }
};
system50.beforeEvents.startup.subscribe((event) => {
  processedBlocks.clear();
  event.blockComponentRegistry.registerCustomComponent(
    "mythicus_sn:block_remover",
    blockRemoverComponent
  );
});
world48.afterEvents.playerBreakBlock.subscribe((event) => {
  const block = event.block;
  const blockBefore = event.brokenBlockPermutation;
  const location = block.location;
  if (blockBefore.type.id != "mythicus_sn:ice") return;
  event.dimension.setBlockType(location, MinecraftBlockTypes.FlowingWater);
});

// data/scripts/modules/blocks/chicken_nest.ts
import { system as system51 } from "@minecraft/server";
var ChickenNestComponent = class {
  static componentId = "mythicus_sn:chicken_nest_logic";
  onTick(event) {
    const block = event.block;
    const currentStage = block.permutation.getState("mythicus_sn:nest_stage");
    if (currentStage < 4) {
      const nextStage = currentStage + 1;
      block.setPermutation(block.permutation.withState("mythicus_sn:nest_stage", nextStage));
    } else {
      block.dimension.spawnEntity("mythicus_sn:seasons_chicken", block.center());
      block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`);
    }
  }
};
system51.beforeEvents.startup.subscribe((event) => {
  event.blockComponentRegistry.registerCustomComponent(
    ChickenNestComponent.componentId,
    new ChickenNestComponent()
  );
});

// data/scripts/modules/blocks/bee_nest.ts
import {
  EquipmentSlot as EquipmentSlot12,
  ItemStack as ItemStack13,
  Player as Player34,
  system as system52,
  world as world49
} from "@minecraft/server";
var BeeNestComponent = class {
  static componentId = "mythicus_sn:bee_nest_component";
  onTick(event) {
    const { block } = event;
    if (block.typeId !== "mythicus_sn:bee_nest") return;
    const findSafeSpawnLocation = (baseLocation, dimension) => {
      const offsets = [
        { x: 0, y: -1, z: 0 },
        // Below
        { x: 1, y: 0, z: 0 },
        // Sides
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
        { x: 0, y: 1, z: 0 }
        // Above
      ];
      for (const offset of offsets) {
        const testPos = {
          x: baseLocation.x + offset.x + 0.5,
          y: baseLocation.y + offset.y,
          z: baseLocation.z + offset.z + 0.5
        };
        const blockAtPos = dimension.getBlock(testPos);
        if (blockAtPos && blockAtPos.isAir) {
          return testPos;
        }
      }
      return null;
    };
    let hasSpawnedQueen = false;
    const beesToSpawn = 3;
    for (let i = 0; i < beesToSpawn; i++) {
      const spawnLocation = findSafeSpawnLocation(block.location, block.dimension);
      if (!spawnLocation) continue;
      const shouldSpawnQueen = !hasSpawnedQueen && Math.random() < 0.2;
      const beeType = shouldSpawnQueen ? "mythicus_sn:bee_queen" : "mythicus_sn:bitty_bee";
      if (!block.dimension.isChunkLoaded(spawnLocation)) continue;
      block.dimension.spawnEntity(beeType, spawnLocation);
      if (shouldSpawnQueen) {
        hasSpawnedQueen = true;
      }
    }
    if (block?.isValid) {
      block.setType("minecraft:air");
    }
  }
};
var SEASON_BIOME_IDS = [
  "mythicus_sn:seasonal_apple_grove",
  "mythicus_sn:seasonal_birch_forest",
  "mythicus_sn:seasonal_cherry_grove",
  "mythicus_sn:seasonal_mixed_forest",
  "mythicus_sn:seasonal_oak_forest",
  "mythicus_sn:seasonal_plains",
  "mythicus_sn:seasonal_roofed_forest",
  "mythicus_sn:seasonal_taiga",
  "mythicus_sn:seasonal_swamp"
];
world49.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const block = event.block;
  const blockLocation = block.location;
  const player = event.player;
  if (block.typeId !== "minecraft:bee_nest" && block.typeId !== "minecraft:beehive") return;
  const biome = block.dimension.getBiome(blockLocation);
  if (!SEASON_BIOME_IDS.includes(biome.id)) return;
  if (!player) return;
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;
  const mainhand = equippable.getEquipment(EquipmentSlot12.Mainhand);
  if (!mainhand || mainhand.typeId !== "minecraft:glass_bottle") return;
  const qualityHoney = new ItemStack13("mythicus_sn:quality_honey", 1);
  const lore = getItemLore("mythicus_sn:quality_honey");
  if (lore) {
    qualityHoney.setLore(lore);
  }
  const inventory = player.getComponent("minecraft:inventory");
  if (inventory?.container) {
    inventory.container.addItem(qualityHoney);
  }
  system52.runTimeout(() => {
    const inv = player.getComponent("minecraft:inventory");
    if (inv?.container) {
      for (let i = 0; i < inv.container.size; i++) {
        const item = inv.container.getItem(i);
        if (item && item.typeId === "minecraft:honey_bottle") {
          if (item.amount > 1) {
            item.amount -= 1;
            inv.container.setItem(i, item);
          } else {
            inv.container.setItem(i, void 0);
          }
          break;
        }
      }
    }
  }, 1);
});
world49.afterEvents.playerInventoryItemChange.subscribe((event) => {
});
var MAX_ANGRY_BEES = 5;
var MAX_ATTACKS = 4;
var BEE_NEST_BLOCKS = [
  "minecraft:bee_nest",
  "minecraft:beehive"
];
var BEE_TYPE_IDS2 = [
  "mythicus_sn:bitty_bee",
  "mythicus_sn:bee_queen"
];
function makeNearbyBeesAngry(location, dimension) {
  const centerX = location.x + 0.5;
  const centerY = location.y + 0.5;
  const centerZ = location.z + 0.5;
  const nearbyBees = dimension.getEntities({
    location: { x: centerX, y: centerY, z: centerZ },
    maxDistance: 16,
    families: ["bee"]
  });
  let angryCount = 0;
  for (const bee of nearbyBees) {
    if (angryCount >= MAX_ANGRY_BEES) break;
    if (!BEE_TYPE_IDS2.includes(bee.typeId)) continue;
    if (!bee?.isValid) continue;
    bee.triggerEvent("mythicus_sn:become_angry_swarm");
    angryCount++;
  }
}
function onEntityHurt(event) {
  const { damageSource, hurtEntity } = event;
  if (!(hurtEntity instanceof Player34)) return;
  const attacker = damageSource.damagingEntity;
  if (!attacker || attacker.typeId !== "mythicus_sn:bitty_bee") return;
  const isSwarmBee = attacker.getProperty("mythicus_sn:is_swarm_bee");
  if (!isSwarmBee) return;
  const currentCount = attacker.getProperty("mythicus_sn:attack_count") || 0;
  const newCount = currentCount + 1;
  attacker.setProperty("mythicus_sn:attack_count", newCount);
  if (newCount >= MAX_ATTACKS) {
    system52.runTimeout(() => {
      if (attacker.isValid) {
        attacker.triggerEvent("mythicus_sn:perish_event");
      }
    }, 5);
  }
}
system52.beforeEvents.startup.subscribe((event) => {
  event.blockComponentRegistry.registerCustomComponent(
    BeeNestComponent.componentId,
    new BeeNestComponent()
  );
});
world49.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
  if (event.entity.typeId != "mythicus_sn:bee_queen") return;
});
world49.afterEvents.playerBreakBlock.subscribe((event) => {
  const { block, player, brokenBlockPermutation } = event;
  if (!BEE_NEST_BLOCKS.includes(brokenBlockPermutation.type.id)) return;
  const equipment = player.getComponent("minecraft:equippable");
  if (equipment) {
    const mainhand = equipment.getEquipment(EquipmentSlot12.Mainhand);
    if (mainhand) {
      const enchantable = mainhand.getComponent("minecraft:enchantable");
      if (enchantable?.hasEnchantment("silk_touch")) {
        return;
      }
    }
  }
  makeNearbyBeesAngry(block.location, block.dimension);
});
world49.afterEvents.entityHurt.subscribe(onEntityHurt);

// data/scripts/modules/sound_layers/mod.ts
init_players();
init_layer1();
import { TicksPerSecond as TicksPerSecond27, system as system54 } from "@minecraft/server";

// data/scripts/modules/sound_layers/layer2.ts
import { TicksPerSecond as TicksPerSecond26, system as system53 } from "@minecraft/server";
init_biome();
init_season_core();
var soundPools2 = {
  // [Biomes.SeasonalAppleGrove]: {
  //     [Season.Spring]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Summer]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Fall]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Winter]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  // },
  ["mythicus_sn:seasonal_birch_forest" /* SeasonalBirchForest */]: {
    ["spring" /* Spring */]: createPool([
      "season.mythicus_sn.spring.bird_chirps.l2",
      "season.mythicus_sn.spring.cricket.l2",
      "season.mythicus_sn.spring.grasshopper.l2",
      "season.mythicus_sn.spring.leaves.l2",
      "season.mythicus_sn.spring.nightingale.l2",
      "season.mythicus_sn.spring.sparrow.l2",
      "season.mythicus_sn.spring.wind_gusts.l2"
    ]),
    ["summer" /* Summer */]: createPool([
      "season.mythicus_sn.summer.cicada_clicky.l2",
      "season.mythicus_sn.summer.cicada_long.l2",
      "season.mythicus_sn.summer.cicada_short.l2",
      "season.mythicus_sn.summer.cricket_busy.l2",
      "season.mythicus_sn.summer.crickets.l2",
      "season.mythicus_sn.summer.grasshopper_clicks.l2",
      "season.mythicus_sn.summer.grasshopper_wings.l2",
      "season.mythicus_sn.summer.summer_birds1.l2",
      "season.mythicus_sn.summer.summer_birds2.l2"
    ]),
    ["fall" /* Fall */]: createPool([
      "season.mythicus_sn.fall.bird_songs.l2",
      "season.mythicus_sn.fall.coal_bird.l2",
      "season.mythicus_sn.fall.crow.l2",
      "season.mythicus_sn.fall.leaf_rustle.l2",
      "season.mythicus_sn.fall.leaf_wind.l2",
      "season.mythicus_sn.fall.squirrel.l2",
      "season.mythicus_sn.fall.woodpecker_call.l2",
      "season.mythicus_sn.fall.woodpecker_knock.l2",
      "season.mythicus_sn.fall.woodpecker_knock2.l2",
      "season.mythicus_sn.winter.wind_bluster.l2"
    ]),
    ["winter" /* Winter */]: createPool([
      "season.mythicus_sn.winter.branch_snap.l2",
      "season.mythicus_sn.winter.ice_crunches.l2",
      "season.mythicus_sn.winter.ice_crunches2.l2",
      "season.mythicus_sn.winter.ice_squeaks.l2",
      "season.mythicus_sn.winter.snow_falling.l2",
      "season.mythicus_sn.winter.wind_bluster.l2"
    ])
  },
  // [Biomes.SeasonalCherryGrove]: {
  //     [Season.Spring]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Summer]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Fall]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Winter]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  // },
  // [Biomes.SeasonalMixedForest]: {
  //     [Season.Spring]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Summer]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Fall]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Winter]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  // },
  ["mythicus_sn:seasonal_oak_forest" /* SeasonalOakForest */]: {
    ["spring" /* Spring */]: createPool([
      "season.mythicus_sn.spring.bird_chirps.l2",
      "season.mythicus_sn.spring.cricket.l2",
      "season.mythicus_sn.spring.grasshopper.l2",
      "season.mythicus_sn.spring.leaves.l2",
      "season.mythicus_sn.spring.nightingale.l2",
      "season.mythicus_sn.spring.sparrow.l2",
      "season.mythicus_sn.spring.wind_gusts.l2"
    ]),
    ["summer" /* Summer */]: createPool([
      "season.mythicus_sn.summer.cicada_clicky.l2",
      "season.mythicus_sn.summer.cicada_long.l2",
      "season.mythicus_sn.summer.cicada_short.l2",
      "season.mythicus_sn.summer.cricket_busy.l2",
      "season.mythicus_sn.summer.crickets.l2",
      "season.mythicus_sn.summer.grasshopper_clicks.l2",
      "season.mythicus_sn.summer.grasshopper_wings.l2",
      "season.mythicus_sn.summer.summer_birds1.l2",
      "season.mythicus_sn.summer.summer_birds2.l2"
    ]),
    ["fall" /* Fall */]: createPool([
      "season.mythicus_sn.fall.bird_songs.l2",
      "season.mythicus_sn.fall.coal_bird.l2",
      "season.mythicus_sn.fall.crow.l2",
      "season.mythicus_sn.fall.leaf_rustle.l2",
      "season.mythicus_sn.fall.leaf_wind.l2",
      "season.mythicus_sn.fall.squirrel.l2",
      "season.mythicus_sn.fall.woodpecker_call.l2",
      "season.mythicus_sn.fall.woodpecker_knock.l2",
      "season.mythicus_sn.fall.woodpecker_knock2.l2",
      "season.mythicus_sn.winter.wind_bluster.l2"
    ]),
    ["winter" /* Winter */]: createPool([
      "season.mythicus_sn.winter.branch_snap.l2",
      "season.mythicus_sn.winter.ice_crunches.l2",
      "season.mythicus_sn.winter.ice_crunches2.l2",
      "season.mythicus_sn.winter.ice_squeaks.l2",
      "season.mythicus_sn.winter.snow_falling.l2",
      "season.mythicus_sn.winter.wind_bluster.l2"
    ])
  },
  // [Biomes.SeasonalPlains]: {
  //     [Season.Spring]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Summer]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Fall]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Winter]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  // },
  // [Biomes.SeasonalRoofedForest]: {
  //     [Season.Spring]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Summer]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Fall]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Winter]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  // },
  // [Biomes.SeasonalSwamp]: {
  //     [Season.Spring]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Summer]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Fall]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  //     [Season.Winter]: createPool([
  //         "mythicus_sn.layer2.placeholder",
  //         "mythicus_sn.layer2.placeholder",
  //     ]),
  // },
  ["mythicus_sn:seasonal_taiga" /* SeasonalTaiga */]: {
    ["spring" /* Spring */]: createPool([
      "season.mythicus_sn.spring.bird_chirps.l2",
      "season.mythicus_sn.spring.cricket.l2",
      "season.mythicus_sn.spring.grasshopper.l2",
      "season.mythicus_sn.spring.leaves.l2",
      "season.mythicus_sn.spring.nightingale.l2",
      "season.mythicus_sn.spring.sparrow.l2",
      "season.mythicus_sn.spring.wind_gusts.l2"
    ]),
    ["summer" /* Summer */]: createPool([
      "season.mythicus_sn.summer.cicada_clicky.l2",
      "season.mythicus_sn.summer.cicada_long.l2",
      "season.mythicus_sn.summer.cicada_short.l2",
      "season.mythicus_sn.summer.cricket_busy.l2",
      "season.mythicus_sn.summer.crickets.l2",
      "season.mythicus_sn.summer.grasshopper_clicks.l2",
      "season.mythicus_sn.summer.grasshopper_wings.l2",
      "season.mythicus_sn.summer.summer_birds1.l2",
      "season.mythicus_sn.summer.summer_birds2.l2"
    ]),
    ["fall" /* Fall */]: createPool([
      "season.mythicus_sn.fall.bird_songs.l2",
      "season.mythicus_sn.fall.coal_bird.l2",
      "season.mythicus_sn.fall.crow.l2",
      "season.mythicus_sn.fall.leaf_rustle.l2",
      "season.mythicus_sn.fall.leaf_wind.l2",
      "season.mythicus_sn.fall.squirrel.l2",
      "season.mythicus_sn.fall.woodpecker_call.l2",
      "season.mythicus_sn.fall.woodpecker_knock.l2",
      "season.mythicus_sn.fall.woodpecker_knock2.l2",
      "season.mythicus_sn.winter.wind_bluster.l2"
    ]),
    ["winter" /* Winter */]: createPool([
      "season.mythicus_sn.winter.branch_snap.l2",
      "season.mythicus_sn.winter.ice_crunches.l2",
      "season.mythicus_sn.winter.ice_crunches2.l2",
      "season.mythicus_sn.winter.ice_squeaks.l2",
      "season.mythicus_sn.winter.snow_falling.l2",
      "season.mythicus_sn.winter.wind_bluster.l2"
    ])
  }
};
async function soundLayer2(player) {
  await system53.waitTicks(randomInt(1, 5) * TicksPerSecond26);
  if (!player.isValid) return;
  const season = getCurrentSeason();
  const biome = getCurrentBiome(player);
  if (!biome) return;
  const location = player.location;
  location.x += randomInt(-10, 10);
  location.y += randomInt(0, 8);
  location.z += randomInt(-10, 10);
  const sound = soundPools2[biome]?.[season]();
  if (sound) {
    player.playSound(sound, { location, volume: 1 });
  }
}

// data/scripts/modules/sound_layers/mod.ts
var isAmbientSoundsEnabled = (player) => player.getDynamicProperty("mythicus_sn:ambient_sounds_enabled") === true;
system54.runInterval(() => {
  for (const player of getAllPlayers()) {
    if (!isAmbientSoundsEnabled(player)) continue;
    soundLayer1(player);
  }
}, 3 * TicksPerSecond27);
system54.runInterval(() => {
  for (const player of getAllPlayers()) {
    if (!isAmbientSoundsEnabled(player)) continue;
    soundLayer2(player);
  }
}, 5 * TicksPerSecond27);

// data/scripts/modules/mobs/seasons_cow/milk_cooldown.ts
import { system as system55, world as world50 } from "@minecraft/server";
world50.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
  switch (event.eventId) {
    case "mythicus_sn:on_milked":
      event.entity.setDynamicProperty("mythicus_sn:milked_tick", system55.currentTick);
      break;
    case "mythicus_sn:reset_milk":
      const cooldownTick = event.entity.getDynamicProperty("mythicus_sn:milked_tick");
      if (!cooldownTick) return;
      if (system55.currentTick < cooldownTick + 48e3) return;
      event.entity.setProperty("mythicus_sn:milked", false);
      break;
  }
});

// data/scripts/modules/projectiles/egg_projectile.ts
init_particles();
import { world as world51 } from "@minecraft/server";
world51.afterEvents.projectileHitBlock.subscribe((event) => {
  if (event.projectile.typeId === "mythicus_sn:egg_projectile") {
    const location = event.location;
    safeSpawnParticle(event.dimension, "mythicus_sn:egg_break", location);
  }
});
world51.afterEvents.projectileHitEntity.subscribe((event) => {
  if (event.projectile.typeId === "mythicus_sn:egg_projectile") {
    const location = event.projectile.isValid ? event.projectile.location : event.getEntityHit().entity?.location;
    if (location) {
      safeSpawnParticle(event.dimension, "mythicus_sn:egg_break", location);
    }
  }
});

// data/scripts/modules/mobs/remove_fire.ts
init_weather_data();
init_weather_system();
import { world as world52 } from "@minecraft/server";
world52.afterEvents.entityHurt.subscribe((e) => {
  const damageCause = e.damageSource.cause;
  if (damageCause != "fireTick") return;
  const entity = e.hurtEntity;
  const biome = entity.dimension.getBiome(entity.location);
  if (!biome.id.includes("seasonal")) return;
  const currentWeather = forecast[0]?.weather;
  if (currentWeather === "rain" /* Rain */ || currentWeather === "storm" /* Storm */) {
    entity.extinguishFire();
  }
});
//# sourceMappingURL=main.js.map
