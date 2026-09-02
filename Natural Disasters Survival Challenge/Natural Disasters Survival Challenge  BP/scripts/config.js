/**
 * Natural Disasters Server Events 高级配置。
 *
 * 修改本文件后重新构建/导入 Add-on 并重启世界即可生效。
 * SAPI 管理员页面只保留手动释放和停止，避免跨 Add-on 设置状态
 * 覆盖这里的配置。数值会在 main.js 中再次限制到安全范围。
 */
export const DISASTER_CONFIG = Object.freeze({
  // 全局与自动发生
  enabled: true,
  autoEnabled: true,
  overworldEnabled: true,
  extractionEnabled: true,

  // 安全与破坏
  protectSafeZones: true,
  blockDamage: false,

  // 时间（秒/分钟）
  warningSeconds: 20,
  disasterSeconds: 45,
  cooldownSeconds: 120,
  minIntervalMinutes: 20,
  maxIntervalMinutes: 40,

  // 0～10；权重可填写 0～1000，0 表示自动事件不会选择该灾害
  difficulty: 2,
  weights: Object.freeze({
    tornado: 20,
    meteors: 20,
    lightning: 20,
  }),

  // 性能上限。数值越高，灾害表现越密集，但服务器负载也会更高。
  runtime: Object.freeze({
    maxTrackedMeteors: 18,
    maxEntitiesAffectedByTornado: 18,
    maxSurfaceCache: 280,
  }),
});
