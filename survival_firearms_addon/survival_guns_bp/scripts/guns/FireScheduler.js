/**
 * 射频调度器 (FireScheduler)
 * 每次 itemUse 脉冲最多放行一发，并依据 RPM 施加服务端最小间隔。
 */
export class FireScheduler {
  // 保存每个玩家的开火调度状态
  static #playerSchedulers = new Map();

  static #getOrCreateState(playerId) {
    let state = this.#playerSchedulers.get(playerId);
    if (!state) {
      state = {
        accumulator: 0.0,
        lastHeldRequestTick: -999,
        lastShotTick: -999
      };
      this.#playerSchedulers.set(playerId, state);
    }
    return state;
  }

  /**
   * 兼容模式的单次右键脉冲。每次物品开始使用最多结算一发，
   * 不依赖不同 Bedrock 平台表现不一致的松开事件。
   */
  static requestPulseShot(playerId, gunDef, currentTick) {
    const state = this.#getOrCreateState(playerId);
    const rpm = Math.max(1, Math.min(1200, Number(gunDef.rpm) || 1));
    const minimumTicks = Math.max(1, Math.ceil((60 * 20) / rpm));
    if (currentTick - state.lastShotTick < minimumTicks) return 0;
    state.lastShotTick = currentTick;
    return 1;
  }

  static requestHeldShots(playerId, gunDef, currentTick) {
    const state = this.#getOrCreateState(playerId);
    if (state.lastHeldRequestTick === currentTick) return 0;
    const elapsed = currentTick - state.lastHeldRequestTick;
    state.lastHeldRequestTick = currentTick;
    const rpm = Math.max(1, Math.min(1200, Number(gunDef.rpm) || 1));

    if (elapsed > 2) state.accumulator = 1.0;
    else state.accumulator += Math.max(1, elapsed) * rpm / 1200;

    const shots = Math.floor(state.accumulator);
    state.accumulator -= shots;
    if (shots > 0) state.lastShotTick = currentTick;
    return shots;
  }

  static reset(playerId) {
    this.#playerSchedulers.delete(playerId);
  }

  static simulateFireTicks(rpm, fireMode, totalTicks = 200) {
    rpm = Math.max(1, Math.min(1200, Number(rpm) || 1));
    let accumulator = 0.0;
    let shotsFired = 0;
    let pumpReady = 0;

    const delta = rpm / (60 * 20);
    const pumpDelay = Math.round((60 * 20) / rpm);

    for (let tick = 0; tick < totalTicks; tick++) {
      if (fireMode === "pump") {
        if (tick >= pumpReady) {
          shotsFired++;
          pumpReady = tick + pumpDelay;
        }
      } else {
        accumulator += delta;
        while (accumulator >= 1.0) {
          shotsFired++;
          accumulator -= 1.0;
        }
      }
    }
    return shotsFired;
  }
}
