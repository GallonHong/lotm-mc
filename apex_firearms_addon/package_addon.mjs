import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

const bpDir = path.join(rootDir, "apex_firearms_bp");
const rpDir = path.join(rootDir, "apex_firearms_rp");

const bpPack = path.join(rootDir, "Apex_AK47_BP.mcpack");
const rpPack = path.join(rootDir, "Apex_AK47_RP.mcpack");
const fullAddon = path.join(rootDir, "Apex_AK47_v1.0.0.mcaddon");

function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`  ✔ Packaged ${path.basename(outPath)} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
      resolve();
    });

    archive.on("error", (err) => reject(err));
    archive.pipe(output);

    // Recursively add all files with explicit forward slashes
    function addDir(currentDir, zipPrefix) {
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        const full = path.join(currentDir, entry.name);
        const rel = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          addDir(full, rel);
        } else {
          archive.file(full, { name: rel.replace(/\\/g, "/") });
        }
      }
    }

    addDir(sourceDir, "");
    archive.finalize();
  });
}

function zipMultipleDirs(dirsWithPrefix, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`  ✔ Packaged ${path.basename(outPath)} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
      resolve();
    });

    archive.on("error", (err) => reject(err));
    archive.pipe(output);

    for (const { dir, prefix } of dirsWithPrefix) {
      function addDir(currentDir, zipPrefix) {
        for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
          const full = path.join(currentDir, entry.name);
          const rel = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            addDir(full, rel);
          } else {
            archive.file(full, { name: rel.replace(/\\/g, "/") });
          }
        }
      }
      addDir(dir, prefix);
    }

    archive.finalize();
  });
}

async function build() {
  console.log("=== Building Apex Firearms: Tactical AK-47 Packages ===");
  await zipDirectory(bpDir, bpPack);
  await zipDirectory(rpDir, rpPack);
  await zipMultipleDirs([
    { dir: bpDir, prefix: "Apex_AK47_BP" },
    { dir: rpDir, prefix: "Apex_AK47_RP" }
  ], fullAddon);
  console.log("\n✔ Packaging completed successfully with normalized forward slash paths!");
}

build().catch(console.error);
