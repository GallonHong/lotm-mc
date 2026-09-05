import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG } from "../config.js";

const STATS_KEY = "daily:hope_post_stats:v1";
const QUEUE_KEY = "daily:hope_post_queue:v1";
const ISSUES_KEY = "daily:hope_post_issues:v1";

function read(key, fallback) {
  try { return JSON.parse(world.getDynamicProperty(key) || JSON.stringify(fallback)); } catch { return fallback; }
}
function write(key, value) {
  try { world.setDynamicProperty(key, JSON.stringify(value)); return true; }
  catch (error) { console.warn(`[HopePost] save ${key} failed: ${error}`); return false; }
}
function dayKey(offsetDays = 0) {
  return new Date(Date.now() + Number(CONFIG.timezoneOffsetHours || 8) * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
}
function clean(value, limit) {
  return [...String(value || "").replace(/§./g, "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()].slice(0, limit).join("");
}
function objective() {
  try { return world.scoreboard.getObjective("money") || world.scoreboard.addObjective("money", "金币"); } catch { return null; }
}
function balance(player) {
  try { return Math.max(0, objective()?.getScore(player.scoreboardIdentity) || 0); } catch { return 0; }
}
function charge(player, amount) {
  const score = objective();
  const identity = player?.scoreboardIdentity;
  if (!score || !identity || balance(player) < amount) return false;
  try { score.addScore(identity, -amount); return true; } catch { return false; }
}
function show(player, form, callback) {
  system.runTimeout(() => form.show(player).then(result => { if (!result.canceled) callback(result); }).catch(() => {}), 2);
}

export class HopePostManager {
  static record(player, field, amount = 1) {
    if (!player?.name || !field) return;
    const all = read(STATS_KEY, {});
    const today = dayKey();
    all[today] ||= {};
    all[today][player.name] ||= { collected: 0, kills: 0, bosses: 0, crates: 0, events: 0, dungeons: 0 };
    all[today][player.name][field] = Math.max(0, Number(all[today][player.name][field] || 0) + Math.max(0, Number(amount) || 0));
    const keep = Object.keys(all).sort().slice(-3);
    write(STATS_KEY, Object.fromEntries(keep.map(key => [key, all[key]])));
  }

  static recordCollection(player, typeId) {
    if (/(?:_log|_ore|leaves|wheat|carrot|potato|beetroot|melon|pumpkin|sugar_cane|bamboo)$/.test(String(typeId))) this.record(player, "collected", 1);
  }

  static automaticArticle() {
    const stats = read(STATS_KEY, {})[dayKey(-1)] || {};
    const candidates = [];
    for (const [name, value] of Object.entries(stats)) {
      candidates.push({ score: Number(value.collected || 0), title: "荒野勤务纪要", body: `昨日，${name} 在废土各处带回了 ${value.collected || 0} 份可用资源。每一块木料、每一捧矿石，都让聚居地的灯火多亮了一会儿。` });
      candidates.push({ score: Number(value.kills || 0) * 2, title: "防线上的无名枪声", body: `${name} 昨日清除了 ${value.kills || 0} 个威胁目标。巡逻队说，天亮时那条路终于安静了下来。` });
      candidates.push({ score: Number(value.bosses || 0) * 50, title: "高危目标已经倒下", body: `${name} 昨日参与击败 ${value.bosses || 0} 个高危目标。联盟提醒幸存者：胜利值得庆祝，但围墙外从不会真正平静。` });
      candidates.push({ score: Number(value.dungeons || 0) * 30, title: "远征队平安归来", body: `${name} 昨日完成了 ${value.dungeons || 0} 次危险区域行动，并带回了新的生存线索。愿下一支队伍也能看见归途的灯。` });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0]?.score > 0) return { type: "auto", author: "希望报编辑部", title: candidates[0].title, body: candidates[0].body };
    const fallback = [
      ["今日生存提示", "联盟气象站未发现可靠的晴天证据。外出前请检查弹药、饮水与撤离路线，活着回来永远比多带一件战利品重要。"],
      ["围墙仍在，灯火未熄", "昨夜各处哨塔完成轮换。没有名字登上英雄榜的一天，同样是许多人努力守住的普通一天。"],
      ["旧世界拾遗", "搜索队再次提醒：废墟里的每一扇门都可能通向补给，也可能通向感染者。先听，再开门。"]
    ];
    const selected = fallback[Math.floor(Math.random() * fallback.length)];
    return { type: "auto", author: "希望报编辑部", title: selected[0], body: selected[1] };
  }

  static ensureIssue() {
    const today = dayKey();
    const issues = read(ISSUES_KEY, []);
    let issue = issues.find(value => value.dayKey === today);
    if (issue) return issue;
    const queue = read(QUEUE_KEY, []);
    const articles = queue.filter(value => value.publishDay === today).slice(0, 8);
    if (!articles.length) articles.push(this.automaticArticle());
    issue = { dayKey: today, issueNo: Math.max(1, issues.length + 1), articles, createdAt: Date.now() };
    write(ISSUES_KEY, [...issues, issue].slice(-30));
    write(QUEUE_KEY, queue.filter(value => value.publishDay !== today).slice(-100));
    return issue;
  }

  static open(player, onBack, admin = false) {
    const issue = this.ensureIssue();
    const actions = [];
    const form = new ActionFormData().title(`§l§6希望报 · 第 ${issue.issueNo} 期`).body(`§0${issue.dayKey}\n§8在废土上，消息有时比子弹更早救人。`);
    for (const article of issue.articles) {
      form.button(`§0${article.title}\n§r§8${article.type === "admin" ? "联盟公告" : article.type === "player" ? `幸存者投稿 · ${article.author}` : article.author}`, "textures/ui/infobulb");
      actions.push(() => this.openArticle(player, issue, article, onBack, admin));
    }
    form.button(`§l§e我要登刊\n§r§8次日刊登 · ${CONFIG.hopePostPublicationFee || 10000} 金币`, "textures/ui/icon_book_writable");
    actions.push(() => this.openSubmission(player, onBack, admin));
    if (admin) {
      form.button("§l§c发布服务器信息\n§r§8免费排入次日希望报", "textures/ui/gear");
      actions.push(() => this.openAdminSubmission(player, onBack));
    }
    form.button("§l§8返回", "textures/ui/undo");
    actions.push(() => onBack?.());
    show(player, form, result => actions[result.selection]?.());
  }

  static openArticle(player, issue, article, onBack, admin) {
    const form = new MessageFormData().title(article.title).body(`§8撰稿：${article.author}\n\n§0${article.body}`).button1("§a返回本期").button2("§8返回菜单");
    show(player, form, result => result.selection === 0 ? this.open(player, onBack, admin) : onBack?.());
  }

  static openSubmission(player, onBack, admin) {
    const fee = Number(CONFIG.hopePostPublicationFee || 10000);
    const form = new ModalFormData().title("§l希望报 · 幸存者投稿")
      .textField(`标题（2～24 字）\n登刊费：${fee} 金币`, "例如：寻找昨日救命恩人")
      .textField("正文（10～240 字，次日刊登）", "写下你想让全服幸存者看到的内容");
    show(player, form, result => {
      const title = clean(result.formValues?.[0], 24);
      const body = clean(result.formValues?.[1], 240);
      if (title.length < 2 || body.length < 10) { player.sendMessage("§c标题或正文太短，投稿未提交。"); return this.open(player, onBack, admin); }
      const queue = read(QUEUE_KEY, []);
      const publishDay = dayKey(1);
      if (queue.some(value => value.type === "player" && value.author === player.name && value.publishDay === publishDay)) {
        player.sendMessage("§c你已经有一篇稿件等待明日刊登。");
        return this.open(player, onBack, admin);
      }
      if (!charge(player, fee)) { player.sendMessage(`§c登刊需要 ${fee} 金币。`); return this.open(player, onBack, admin); }
      queue.push({ type: "player", author: player.name, title, body, publishDay, submittedAt: Date.now() });
      write(QUEUE_KEY, queue.slice(-100));
      player.sendMessage(`§a投稿已收录，将在 ${publishDay} 的希望报刊登；已收取 ${fee} 金币。`);
      this.open(player, onBack, admin);
    });
  }

  static openAdminSubmission(player, onBack) {
    const form = new ModalFormData().title("§l希望报 · 联盟公告")
      .textField("公告标题（2～24 字）", "服务器维护通知")
      .textField("公告正文（10～240 字，次日刊登）", "填写面向全服的正式信息");
    show(player, form, result => {
      const title = clean(result.formValues?.[0], 24);
      const body = clean(result.formValues?.[1], 240);
      if (title.length < 2 || body.length < 10) { player.sendMessage("§c公告内容不完整。"); return this.open(player, onBack, true); }
      const queue = read(QUEUE_KEY, []);
      queue.push({ type: "admin", author: `联盟管理处 · ${player.name}`, title, body, publishDay: dayKey(1), submittedAt: Date.now() });
      write(QUEUE_KEY, queue.slice(-100));
      player.sendMessage("§a服务器公告已排入明日希望报。");
      this.open(player, onBack, true);
    });
  }
}
