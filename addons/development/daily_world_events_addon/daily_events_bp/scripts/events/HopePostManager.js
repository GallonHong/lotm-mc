import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG } from "../config.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { quizForDay } from "./hopePostQuiz.js";
import { DailyNewsManager } from "./DailyNewsManager.js";
import { HopeLotteryBridge } from "../integration/HopeLotteryBridge.js";

const STATS_KEY = "daily:hope_post_stats:v1";
const QUEUE_KEY = "daily:hope_post_queue:v1";
const ISSUES_KEY = "daily:hope_post_issues:v1";
const FIRST_OPEN_KEY = "daily:hope_post_first_open:v1";
const QUIZ_KEY = "daily:hope_post_quiz:v1";
const QUIZ_REWARD = 1000;
const AD_OVERRIDE_KEY = "daily:hope_post_ad_override:v1";

const SURVIVAL_TIPS = [
 "联盟气象站未发现可靠的晴天证据。外出前请检查弹药、饮水与撤离路线，活着回来永远比多带一件战利品重要。",
 "废墟深处每扇紧闭的铁门后都可能藏着宝箱或变异感染者。先听呼吸与抓挠声，再决定是否开门。",
 "辐射尘微风天气下夜间感染者视距提高30%，请随身备好足量燃烧瓶与特种弹药。",
 "野外遭遇高阶无人机侦察时，切勿在开阔桥梁停留，及时寻找坚固掩体或使用电磁武器瘫痪。",
 "围墙仍在，灯火未熄。没有名字登上英雄榜的一天，同样是许多人努力守住的普通一天。"
];

function getDailySurvivalTip(day = dayKey()) {
 let h = 0;
 for (const char of String(day)) h = (h * 31 + char.charCodeAt(0)) >>> 0;
 return SURVIVAL_TIPS[h % SURVIVAL_TIPS.length];
}

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
function isUserBusy(value) {
 const reason = String(value?.cancelationReason || value?.cancellationReason || value?.message || value || "").toLowerCase();
 return reason.includes("userbusy") || reason.includes("user busy");
}
function show(player, form, callback, attempt = 0) {
 system.runTimeout(() => form.show(player).then(result => {
  if (!result.canceled) return callback(result);
  if (isUserBusy(result) && attempt < 8) show(player, form, callback, attempt + 1);
 }).catch(error => {
  if (isUserBusy(error) && attempt < 8) show(player, form, callback, attempt + 1);
 }), attempt === 0 ? 2 : 20);
}

function valid(player) {
 try { return !!player && player.isValid(); } catch { return !!player; }
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
   ["废墟哨塔巡防记", "昨夜各处哨塔完成轮换。虽然风雪呼啸，但哨兵报告沿线未发现变异首领逼近。围墙仍在，灯火未熄。"],
   ["旧世界遗迹探索", "先遣搜索队在深林废墟外围标记了两处高危建筑。据称内部仍有旧时代动力核心反应，提醒各队伍谨慎前往。"],
   ["商队补给线通告", "联盟车队已顺利完成本轮物资交接。快乐101商会将持续为各大聚居地提供平价医疗物资与基础弹药。"]
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
  const articles = queue.filter(value => value.publishDay <= today);
  if (!articles.length) articles.push(this.automaticArticle());
  issue = { dayKey: today, issueNo: Math.max(0, ...issues.map(value => Number(value.issueNo) || 0)) + 1, articles, createdAt: Date.now() };
  if (!write(ISSUES_KEY, [...issues, issue].slice(-30))) return issue;
  write(QUEUE_KEY, queue.filter(value => value.publishDay > today));
  return issue;
 }

 static getLotteryAdData(snapshot = null) {
  const custom = read(AD_OVERRIDE_KEY, null);
  if (custom && typeof custom.title === "string" && typeof custom.body === "string") {
   return { title: custom.title, subtitle: String(custom.subtitle || "商会公告"), body: custom.body };
  }
  if (!snapshot) return {
   title: "§l§6商会军备广告", subtitle: "奖池信息暂不可用 · 点击重试",
   body: "§7暂未连接军备抽奖服务，不能确认当前 UP 或开放奖池。请确认 SAPI 已启用且已更新。", unavailable: true
  };
  return {
   title: "§l§6商会特供 · 典藏军备卡池",
   subtitle: snapshot.subtitle,
   body: snapshot.body
  };
 }

 static open(player, onBack, admin = false) {
  HopeLotteryBridge.request(player, snapshot => {
   if (valid(player)) this.renderOpen(player, onBack, admin, snapshot);
  });
 }

 static openLotteryAd(player, onBack, admin = false) {
  HopeLotteryBridge.request(player, snapshot => {
   if (valid(player)) this.renderLotteryAd(player, onBack, admin, snapshot);
  });
 }

 static renderLotteryAd(player, onBack, admin, snapshot) {
  const ad = this.getLotteryAdData(snapshot);
  const form = new MessageFormData()
   .title(ad.title)
   .body(ad.body)
   .button1(snapshot ? "§6前往军备抽奖" : "§6重新连接军备服务")
   .button2("§8返回希望报");
  show(player, form, result => {
   if (result.selection === 0) {
    if (!snapshot) return this.openLotteryAd(player, onBack, admin);
    try { player.runCommand("scriptevent sapi:lottery"); }
    catch { player.sendMessage("§c[SAPI] 军备抽奖终端连接中，请稍后重试。"); }
   } else {
    this.open(player, onBack, admin);
   }
  });
 }

 static renderOpen(player, onBack, admin, snapshot) {
  const issue = this.ensureIssue();
  const actions = [];
  const survivalTip = getDailySurvivalTip(issue.dayKey);
  const quizState = this.quizState(player);
  const quizStatus = quizState.dayKey === dayKey() && quizState.answered
   ? (quizState.correct ? "今日已答对 · 1,000金币已发" : "今日已作答 · 明日再战")
   : "答对奖励 1,000 金币";

  const form = new ActionFormData()
   .title("§l§6希望报")
   .body(`§l§0第 ${issue.issueNo} 期 · ${issue.dayKey}\n§8在废土上，消息有时比子弹更早救人。\n\n§0【今日生存提示】\n§8${survivalTip}`);

  // 1. [左上] 今日新闻 (头条要闻)
  const todayNews = DailyNewsManager.listToday();
  const recentNews = todayNews.length ? todayNews : DailyNewsManager.listRecent(3);
  let headlineArticle = null;
  if (recentNews[0]) {
   const top = recentNews[0];
   headlineArticle = {
    type: "world_event",
    author: "前线广播",
    title: top.headline || "废土突发简讯",
    body: `${top.message || ""}\n\n§7发生区域：${top.locationName || "废土外围"}\n§7威胁指数：${top.danger || "普通"}`
   };
  } else {
   headlineArticle = issue.articles.find(a => a.type === "admin") || issue.articles[0] || this.automaticArticle();
  }
  form.button(`§l§0${clean(headlineArticle.title, 12)}\n§r§8${headlineArticle.author || "希望报编辑部"} · 点击阅读`, "textures/ui/apocalypse/world_event");
  actions.push(() => this.openNewsList(player, issue, onBack, admin));

  // 2. [右上] 广告（抽奖对应卡池宣传）
  const adData = this.getLotteryAdData(snapshot);
  form.button(`§l§0${clean(adData.title.replace(/§./g, ""), 12)}\n§r§8${clean(adData.subtitle, 22)}`, "textures/ui/apocalypse/lottery");
  actions.push(() => this.openLotteryAd(player, onBack, admin));

  // 3. [左下] 今日新闻（市民快讯 / 社区动态）
  const playerArticle = issue.articles.find(a => a.type === "player");
  const communityArticle = playerArticle || {
   type: "community",
   author: "避难所互助组",
   title: "巡逻守则与见闻",
   body: "各大庇护所巡逻队全天候执勤。近期野外资源刷新频繁，欢迎各营地幸存者踊跃互助、投递见闻！点击下方【我要登刊】即可将你的故事发往全服。"
  };
  form.button(`§l§0${clean(communityArticle.title, 12)}\n§r§8${communityArticle.type === "player" ? `幸存者投稿 · ${communityArticle.author}` : communityArticle.author}`, "textures/ui/icon_book_writable");
  actions.push(() => this.openCommunityList(player, issue, onBack, admin));

  // 4. [右下] 题目奖励（真假情报）
  form.button(`§l§0每日情报问答\n§r§8${quizStatus}`, "textures/ui/icon_book_writable");
  actions.push(() => this.openQuiz(player, onBack, admin));

  // 5. [左下下方] 保留投稿入口
  form.button(`§l§0【我要登刊】次日全服见报\n§r§8次日刊登 · ${CONFIG.hopePostPublicationFee || 10000} 金币`, "textures/ui/icon_book_writable");
  actions.push(() => this.openSubmission(player, onBack, admin));

  if (admin && this.isAdmin(player)) {
   form.button("§l§c【联盟管理】公告与广告定制\n§r§8管理发稿、定制广告、切换奖池", "textures/ui/gear");
   actions.push(() => this.openAdminHub(player, onBack));
  }
  form.button("§l§8返回上一页", "textures/ui/cancel");
  actions.push(() => onBack?.());
  show(player, form, result => actions[result.selection]?.());
 }

 static openArticleList(player, title, articles, onReturn, onMenu) {
  const form = new ActionFormData().title(title).body(`§7共 ${articles.length} 篇 · 点击阅读全文`);
  for (const article of articles) form.button(`${article.title}\n§r§8${article.author || "希望报编辑部"}`, "textures/ui/icon_book_writable");
  form.button("§8返回希望报");
  show(player, form, result => {
   const article = articles[result.selection];
   if (!article) return onReturn();
   const detail = new MessageFormData().title(article.title).body(`§8撰稿：${article.author}\n\n§e${article.body}`)
    .button1("§a返回列表").button2("§8返回菜单");
   show(player, detail, response => response.selection === 0
    ? this.openArticleList(player, title, articles, onReturn, onMenu) : onMenu?.());
  });
 }

 static openNewsList(player, issue, onBack, admin) {
  // Always keep every published notice/article reachable, even when live news exists.
  const news = DailyNewsManager.listToday();
  const recent = news.length ? news : DailyNewsManager.listRecent(30);
  const articles = [...issue.articles.filter(article => article.type !== "player"), ...recent.map(entry => ({
   title: entry.headline || "废土突发简讯", author: "前线广播", body: DailyNewsManager.formatEntry(entry)
  }))];
  if (!articles.length) articles.push(this.automaticArticle());
  this.openArticleList(player, "§l§6今日要闻与联盟公告", articles, () => this.open(player, onBack, admin), onBack);
 }

 static openCommunityList(player, issue, onBack, admin) {
  const articles = issue.articles.filter(article => article.type === "player");
  if (!articles.length) articles.push({ title: "欢迎幸存者投稿", author: "希望报编辑部", body: "本期暂无幸存者投稿。可从希望报的【我要登刊】入口提交明日稿件。" });
  this.openArticleList(player, "§l§6市民快讯 · 本期全部投稿", articles, () => this.open(player, onBack, admin), onBack);
 }

 static isAdmin(player) {
  try { if (player.hasTag("admin")) return true; } catch {}
  try { return typeof player.isOp === "function" && player.isOp(); } catch { return false; }
 }

 static openAdminHub(player, onBack) {
  if (!this.isAdmin(player)) return player.sendMessage("§c需要管理员权限。");
  const form = new ActionFormData().title("§l§6希望报 · 联盟管理")
   .button("发布次日联盟公告").button("编辑商会广告").button("恢复自动奖池广告")
   .button("管理 SAPI 奖池").button("返回希望报");
  show(player, form, result => {
   if (!this.isAdmin(player)) return;
   if (result.selection === 0) return this.openAdminSubmission(player, onBack);
   if (result.selection === 1) return this.openAdEditor(player, onBack);
   if (result.selection === 2) {
    player.sendMessage(write(AD_OVERRIDE_KEY, null) ? "§a已恢复自动奖池广告。" : "§c保存失败，请重试。");
    return this.openAdminHub(player, onBack);
   }
   if (result.selection === 3) return HopeLotteryBridge.request(player, snapshot => {
    if (!this.isAdmin(player)) return;
    if (!snapshot) { player.sendMessage("§c未连接 SAPI，请更新并启用配套行为包。"); return this.openAdminHub(player, onBack); }
    try { player.runCommand("scriptevent sapi:lottery admin"); } catch { player.sendMessage("§c无法打开奖池管理。"); }
   });
   this.open(player, onBack, true);
  });
 }

 static openAdEditor(player, onBack) {
  if (!this.isAdmin(player)) return;
  const previous = read(AD_OVERRIDE_KEY, {}) || {};
  const form = new ModalFormData().title("§l希望报 · 编辑商会广告")
   .textField("标题（2～24字）", "商会公告", previous.title || "")
   .textField("副标题（最多40字）", "点击阅读", previous.subtitle || "")
   .textField("正文（10～500字）", "宣传内容", previous.body || "");
  show(player, form, result => {
   if (!this.isAdmin(player)) return;
   const [title, subtitle, body] = [clean(result.formValues?.[0], 24), clean(result.formValues?.[1], 40), clean(result.formValues?.[2], 500)];
   if (title.length < 2 || body.length < 10) player.sendMessage("§c标题或正文太短，未保存。");
   else player.sendMessage(write(AD_OVERRIDE_KEY, { title, subtitle, body }) ? "§a广告已保存。" : "§c保存失败，请重试。");
   this.openAdminHub(player, onBack);
  });
 }

 static quizState(player) {
  try {
   const value = JSON.parse(player.getDynamicProperty(QUIZ_KEY) || "{}");
   return value && typeof value === "object" ? value : {};
  } catch { return {}; }
 }

 static setQuizState(player, value) {
  try { player.setDynamicProperty(QUIZ_KEY, JSON.stringify(value)); } catch {}
 }

 static openQuiz(player, onBack, admin = false) {
  const today = dayKey();
  const state = this.quizState(player);
  const quiz = quizForDay(today);
  if (state.dayKey === today && state.answered) {
   const form = new MessageFormData().title("§l编辑部真假情报")
    .body(`${state.correct ? "§a今日判断正确，1,000 金币已发放。" : "§c今日判断错误，明天再来。"}\n\n§7情报复盘：${quiz.explanation}`)
    .button1("§6返回希望报").button2("§8关闭");
   return show(player, form, result => { if (result.selection === 0) this.open(player, onBack, admin); });
  }
  const form = new ActionFormData().title("§l编辑部真假情报")
   .body(`§7每期一次正式判断。选出可信情报，答对奖励 §61000 金币§7。\n\n§f${quiz.prompt}`);
  for (let index = 0; index < quiz.options.length; index++) form.button(`§f${index + 1}. ${quiz.options[index]}`);
  form.button("§8先返回看看报纸", "textures/ui/cancel");
  show(player, form, result => {
   if (result.selection >= quiz.options.length) return this.open(player, onBack, admin);
   const correct = result.selection === quiz.answer;
   if (correct && RewardManager.reserve(player, `hope_post_quiz:${today}`)) {
    const coinResult = RewardManager.addCoins(player, QUIZ_REWARD);
    RewardManager.log(player, `hope_post_quiz:${today}`, "hope_post_quiz", "hope_post", coinResult);
    player.sendMessage("§6[希望报] 情报判断正确，获得 1,000 金币！");
    try { player.playSound("random.levelup", { volume: 0.8, pitch: 1.15 }); } catch {}
   } else if (!correct) {
    player.sendMessage("§c[希望报] 情报判断错误，本期没有奖励。");
    try { player.playSound("note.bass", { volume: 0.7, pitch: 0.8 }); } catch {}
   }
   this.setQuizState(player, { dayKey: today, answered: true, correct, answeredAt: Date.now() });
   system.run(() => this.openQuiz(player, onBack, admin));
  });
 }

 static onPlayerInitialSpawn(player, initialSpawn) {
  if (initialSpawn === false || !valid(player)) return;
  // 每次进入世界/服务器均弹出希望报
  system.runTimeout(() => {
   if (!valid(player)) return;
   this.open(player);
  }, 70);
 }

 static openArticle(player, issue, article, onBack, admin) {
  const form = new MessageFormData().title(article.title).body(`§8撰稿：${article.author}\n\n§e${article.body}`).button1("§a返回本期").button2("§8返回菜单");
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
   if (queue.length >= 100) { player.sendMessage("§c待刊队列已满，未扣费，请稍后再投。"); return this.open(player, onBack, admin); }
   if (!charge(player, fee)) { player.sendMessage(`§c登刊需要 ${fee} 金币。`); return this.open(player, onBack, admin); }
   queue.push({ type: "player", author: player.name, title, body, publishDay, submittedAt: Date.now() });
   if (!write(QUEUE_KEY, queue)) {
    try { objective()?.addScore(player.scoreboardIdentity, fee); } catch (error) { console.warn(`[HopePost] refund failed: ${error}`); }
    player.sendMessage("§c稿件保存失败，登刊费已尝试退回，请检查余额。");
    return this.open(player, onBack, admin);
   }
   player.sendMessage(`§a投稿已收录，将在 ${publishDay} 的希望报刊登；已收取 ${fee} 金币。`);
   this.open(player, onBack, admin);
  });
 }

 static openAdminSubmission(player, onBack) {
  if (!this.isAdmin(player)) return;
  const form = new ModalFormData().title("§l希望报 · 联盟公告")
   .textField("公告标题（2～24 字）", "服务器维护通知")
   .textField("公告正文（10～240 字，次日刊登）", "填写面向全服的正式信息");
  show(player, form, result => {
   const title = clean(result.formValues?.[0], 24);
   const body = clean(result.formValues?.[1], 240);
   if (title.length < 2 || body.length < 10) { player.sendMessage("§c公告内容不完整。"); return this.open(player, onBack, true); }
   if (!this.isAdmin(player)) return;
   const queue = read(QUEUE_KEY, []);
   if (queue.length >= 100) { player.sendMessage("§c待刊队列已满，未提交公告。"); return this.openAdminHub(player, onBack); }
   queue.push({ type: "admin", author: `联盟管理处 · ${player.name}`, title, body, publishDay: dayKey(1), submittedAt: Date.now() });
   player.sendMessage(write(QUEUE_KEY, queue) ? "§a服务器公告已排入明日希望报。" : "§c公告保存失败，请重试。");
   this.open(player, onBack, true);
  });
 }
}
