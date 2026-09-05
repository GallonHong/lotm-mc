import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { NEWS_PRESETS, newsPreset, presetsForTemplate } from "./templates/newsPresets.js";

function parseArchive(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function dayKey(timestamp = Date.now()) {
  const shifted = new Date(timestamp + Number(CONFIG.timezoneOffsetHours || 0) * 3600000);
  return shifted.toISOString().slice(0, 10);
}

function clean(value, fallback = "未知地点", maxLength = 40) {
  const text = String(value || fallback).replace(/[\n\r§]/g, " ").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, maxLength);
}

function coordinateText(location) {
  return `${Math.floor(Number(location.x))}, ${Math.floor(Number(location.y))}, ${Math.floor(Number(location.z))}`;
}

function render(text, values) {
  return String(text || "").replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ""));
}

function timeText(timestamp) {
  const shifted = new Date(Number(timestamp) + Number(CONFIG.timezoneOffsetHours || 0) * 3600000);
  return shifted.toISOString().slice(11, 16);
}

export class DailyNewsManager {
  static getArchive() {
    try { return parseArchive(world.getDynamicProperty(CONFIG.newsArchiveKey)).filter(entry => entry?.id && entry?.publishedAt); }
    catch { return []; }
  }

  static saveArchive(entries) {
    try {
      world.setDynamicProperty(CONFIG.newsArchiveKey, JSON.stringify(entries.slice(-Number(CONFIG.newsArchiveLimit || 60))));
      return true;
    } catch (error) {
      console.warn(`[DailyEvents][News] 新闻保存失败: ${error}`);
      return false;
    }
  }

  static listToday() {
    const today = dayKey();
    return this.getArchive().filter(entry => entry.dayKey === today).sort((a, b) => Number(b.publishedAt) - Number(a.publishedAt));
  }

  static listRecent(limit = 30) {
    const archive = this.getArchive();
    const resolved = new Set(archive.filter(entry => entry.phase !== "active").map(entry => entry.instanceId));
    return archive.filter(entry => entry.phase !== "active" || !resolved.has(entry.instanceId))
      .sort((a, b) => Number(b.publishedAt) - Number(a.publishedAt)).slice(0, limit);
  }

  static choosePreset(templateId, requestedId = null) {
    const requested = newsPreset(requestedId);
    if (requested?.eventTemplateId === templateId) return requested;
    const candidates = presetsForTemplate(templateId);
    return candidates[Math.floor(Math.random() * candidates.length)] || null;
  }

  static publishEventStart(instance, template) {
    const preset = this.choosePreset(instance.templateId, instance.newsPresetId);
    if (!preset) return null;
    instance.newsPresetId = preset.id;
    const locationName = clean(instance.locationName || instance.zoneName || "未知地点");
    const coords = coordinateText(instance.center);
    const values = { location: locationName, coords, event: template?.name || instance.templateId };
    const message = render(preset.lead, values);
    const entry = this.record({
      instanceId: instance.instanceId,
      presetId: preset.id,
      templateId: instance.templateId,
      phase: "active",
      category: preset.category,
      headline: preset.headline,
      message,
      danger: preset.danger,
      dimension: instance.dimension,
      locationName,
      location: { ...instance.center }
    });
    this.broadcast(entry, true);
    return entry;
  }

  static publishEventResult(instance, template, success, reason = "") {
    const preset = this.choosePreset(instance.templateId, instance.newsPresetId);
    if (!preset) return null;
    const locationName = clean(instance.locationName || instance.zoneName || "未知地点");
    const coords = coordinateText(instance.center);
    const values = { location: locationName, coords, event: template?.name || instance.templateId, reason: clean(reason, "未知原因") };
    const entry = this.record({
      instanceId: instance.instanceId,
      presetId: preset.id,
      templateId: instance.templateId,
      phase: success ? "success" : "failed",
      category: "事件战报",
      headline: success ? `${preset.headline}·行动完成` : `${preset.headline}·行动失败`,
      message: render(success ? preset.success : preset.failure, values),
      danger: preset.danger,
      dimension: instance.dimension,
      locationName,
      location: { ...instance.center },
      reason: clean(reason, "", 80)
    });
    this.broadcast(entry, false);
    return entry;
  }

  static record(value) {
    const publishedAt = Date.now();
    const entry = {
      id: `news_${publishedAt.toString(36)}_${Math.floor(Math.random() * 9999).toString(36)}`,
      dayKey: dayKey(publishedAt),
      publishedAt,
      ...value
    };
    const archive = this.getArchive();
    archive.push(entry);
    this.saveArchive(archive);
    return entry;
  }

  static broadcast(entry, urgent) {
    const coords = coordinateText(entry.location);
    const color = entry.phase === "success" ? "§a" : entry.phase === "failed" ? "§c" : Number(entry.danger) >= 5 ? "§4" : "§6";
    const label = entry.phase === "active" ? entry.category : "事件战报";
    for (const player of world.getAllPlayers()) {
      try {
        player.sendMessage(`${color}§l【${label}】§r ${color}${entry.headline}\n§f${entry.message}\n§7地点：§e${entry.locationName} §8(${coords})`);
        if (urgent || Number(entry.danger) >= 5) {
          player.onScreenDisplay.setTitle(`${color}${entry.headline}`, {
            subtitle: `§f${entry.locationName} §e(${coords})`, fadeInDuration: 5, stayDuration: 55, fadeOutDuration: 12
          });
          try { player.runCommand("playsound random.anvil_land @s ~ ~ ~ 0.7 0.8"); } catch {}
        }
      } catch {}
    }
  }

  static notifyDailySummary(player) {
    const today = dayKey();
    try {
      if (player.getDynamicProperty(CONFIG.playerNewsSeenKey) === today) return false;
      player.setDynamicProperty(CONFIG.playerNewsSeenKey, today);
    } catch {}
    const entries = this.listToday();
    const active = entries.filter(entry => entry.phase === "active" && !entries.some(result => result.instanceId === entry.instanceId && result.phase !== "active")).length;
    try { player.sendMessage(`§4[每日突发事件] §f今日已发布 §e${entries.length}§f 条通报，当前仍有 §c${active}§f 起事件。可在每日委托菜单查看坐标。`); } catch {}
    return true;
  }

  static presetList() { return Object.values(NEWS_PRESETS); }

  static formatEntry(entry) {
    const state = entry.phase === "active" ? "§c进行中" : entry.phase === "success" ? "§a已解决" : "§8已失败";
    return `${state} §6${entry.headline}\n§7${timeText(entry.publishedAt)} | ${entry.locationName} | ${coordinateText(entry.location)}\n§f${entry.message}`;
  }
}

export { NEWS_PRESETS };
