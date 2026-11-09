import { world, system } from "@minecraft/server";

export const SEASONS = {
 SPRING: "spring",
 SUMMER: "summer",
 FALL: "fall",
 WINTER: "winter"
};

const SEASON_CONFIG = {
 [SEASONS.SPRING]: {
  name: "春季",
  title: "萌生回暖",
  color: "§a",
  icon: "",
  baseTemp: 52,  // 约 22℃ 适宜
  tempSwing: 10,  // 日夜温差范围
  weatherChance: 0.2
 },
 [SEASONS.SUMMER]: {
  name: "盛夏",
  title: "酷暑炎阳",
  color: "§6",
  icon: "",
  baseTemp: 72,  // 约 38℃ 炎热暴晒
  tempSwing: 18,  // 正午高温强烈
  weatherChance: 0.15
 },
 [SEASONS.FALL]: {
  name: "金秋",
  title: "萧瑟转寒",
  color: "§e",
  icon: "",
  baseTemp: 42,  // 约 16℃ 微凉
  tempSwing: 14,  // 早晚温差大
  weatherChance: 0.3
 },
 [SEASONS.WINTER]: {
  name: "凛冬",
  title: "极寒飞雪",
  color: "§b",
  icon: "",
  baseTemp: 18,  // 约 -15℃ 极寒冰冻
  tempSwing: 15,  // 深夜更加严寒
  weatherChance: 0.45
 }
};

const DAYS_PER_SEASON = 7;
const SEASON_ORDER = [SEASONS.SPRING, SEASONS.SUMMER, SEASONS.FALL, SEASONS.WINTER];

export class SeasonManager {
 static lastNotifiedSeason = null;

 /**
  * 获取当前季节基础数据
  */
 static getSeasonInfo() {
  let currentDay = 0;
  try {
   currentDay = Math.floor(world.getDay());
  } catch {
   currentDay = 0;
  }

  const seasonIndex = Math.floor(currentDay / DAYS_PER_SEASON) % 4;
  const seasonId = SEASON_ORDER[seasonIndex];
  const dayInSeason = (currentDay % DAYS_PER_SEASON) + 1;
  const conf = SEASON_CONFIG[seasonId];

  const formatted = `${conf.color}${conf.icon} ${conf.name} · 第${dayInSeason}天`;

  return {
   id: seasonId,
   name: conf.name,
   title: conf.title,
   color: conf.color,
   icon: conf.icon,
   baseTemp: conf.baseTemp,
   tempSwing: conf.tempSwing,
   currentDay,
   dayInSeason,
   totalDays: DAYS_PER_SEASON,
   formatted
  };
 }

 /**
  * 初始化时令系统并开启全局广播监听
  */
 static init() {
  console.warn("[SeasonManager] Apocalypse Season System initializing...");
  
  // 初始同步一次全局属性
  this.syncGlobalSeasonProperty();

  // 每隔 100 Ticks 检查时令与全局属性广播
  system.runInterval(() => {
   this.syncGlobalSeasonProperty();
   this.checkSeasonTransition();
  }, 100);
 }

 /**
  * 将当前季节格式化字符串写入全局动态属性，方便 SAPI Server 终端或其它包读取
  */
 static syncGlobalSeasonProperty() {
  try {
   const info = this.getSeasonInfo();
   world.setDynamicProperty("apoc:season_display", info.formatted);
   world.setDynamicProperty("apoc:season_id", info.id);
  } catch {}
 }

 /**
  * 换季时全服广播友好通告（全彩零灰色字）
  */
 static checkSeasonTransition() {
  const info = this.getSeasonInfo();
  if (this.lastNotifiedSeason === null) {
   this.lastNotifiedSeason = info.id;
   return;
  }

  if (this.lastNotifiedSeason !== info.id) {
   this.lastNotifiedSeason = info.id;
   
   // 全服广播
   for (const player of world.getAllPlayers()) {
    try {
     player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
     player.sendMessage(`§l${info.color}【末日时令更迭】§r`);
     player.sendMessage(`§f废土时节已正式轮转入：${info.color}${info.icon}【${info.name} · ${info.title}】！`);
     player.sendMessage(`§e外界环境温度与自然气象已发生显著转变，请幸存者注意防寒消暑。`);
     player.sendMessage(`§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
     player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.4");
    } catch {}
   }
  }
 }
}
