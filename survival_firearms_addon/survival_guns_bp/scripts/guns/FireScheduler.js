/**
 * 射频调度器 (FireScheduler)
 * 核心要求：基于 20 TPS 累加器算法，严格支持非整数 RPM 射击速率 (最高 1200 RPM)
 * 动画控制器逐 tick 报告真实使用状态；本类只负责限速，不保存扳机状态。
 */
export class FireScheduler {
  // 保存每个玩家的开火调度状态
  static #playerSchedulers = new Map();

  static #getOrCreateState(playerId) {
    let state = this.#playerSchedulers.get(playerId);
    if (!state) {
      state = {
        accumulator: 0.0,
        lastShotTick: -999,
        lastMolangRequestTick: -999,
        blockedUntilRelease: false
      };
      this.#playerSchedulers.set(playerId, state);
    }
    return state;
  }

  /**
   * 兼容模式的单次右键脉冲。每次物品开始使用最多结算一发，
   * 不依赖部分 Bedrock 平台不会发送的 itemStopUse 事件。
   */
  static requestPulseShot(playerId, gunDef, currentTick) {
    const state = this.#getOrCreateState(playerId);
    const rpm = Math.max(1, Math.min(1200, Number(gunDef.rpm) || 1));
    const minimumTicks = Math.max(1, Math.ceil((60 * 20) / rpm));
    if (currentTick - state.lastShotTick < minimumTicks) return 0;
    state.lastShotTick = currentTick;
    return 1;
  }

  /**
   * Molang 自动枪逐 tick 请求的服务端小数累加器。动画控制器只报告
   * “本 tick 仍按住使用键”，真正允许的发数仍由这里依据 RPM 决定。
   */
  static requestMolangShots(playerId, gunDef, currentTick) {
    const state = this.#getOrCreateState(playerId);
    if (state.lastMolangRequestTick === currentTick) return 0;
    const elapsed = currentTick - state.lastMolangRequestTick;
    state.lastMolangRequestTick = currentTick;

    // 空仓或手动换弹后必须先松开使用键。若客户端错误地一直报告
    // 正在使用，连续请求不会解除该锁，因而不可能形成无限开火循环。
    if (state.blockedUntilRelease) {
      if (elapsed <= 2) return 0;
      state.blockedUntilRelease = false;
      state.accumulator = 0.0;
    }

    if (gunDef.fireMode !== "auto") {
      return this.requestPulseShot(playerId, gunDef, currentTick);
    }

    const rpm = Math.max(1, Math.min(1200, Number(gunDef.rpm) || 1));

    // 请求间隔超过 2 tick 表示玩家已经松开后重新按下，首发立即响应。
    if (elapsed > 2) {
      state.accumulator = 1.0;
    } else {
      state.accumulator += Math.max(1, elapsed) * rpm / (60 * 20);
    }
    const shots = Math.floor(state.accumulator);
    state.accumulator -= shots;
    if (shots > 0) state.lastShotTick = currentTick;
    return shots;
  }

  static blockUntilRelease(playerId) {
    const state = this.#getOrCreateState(playerId);
    state.blockedUntilRelease = true;
    state.accumulator = 0.0;
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
