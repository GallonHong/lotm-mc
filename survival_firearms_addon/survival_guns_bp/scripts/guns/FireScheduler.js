/**
 * 射频调度器 (FireScheduler)
 * 核心要求：基于 20 TPS 累加器算法，严格支持非整数 RPM 射击速率 (最高 1200 RPM)
 * 严格支持长按持续开火，松开立即停止
 */
export class FireScheduler {
  // 保存每个玩家的开火调度状态
  static #playerSchedulers = new Map();

  static #getOrCreateState(playerId) {
    let state = this.#playerSchedulers.get(playerId);
    if (!state) {
      state = {
        accumulator: 0.0,
        isTriggerPressed: false,
        semiFired: false,
        lastShotTick: -999,
        pumpReadyTick: 0
      };
      this.#playerSchedulers.set(playerId, state);
    }
    return state;
  }

  static isPressed(playerId) {
    const state = this.#playerSchedulers.get(playerId);
    return state ? state.isTriggerPressed : false;
  }

  /**
   * 玩家按下扳机 (开始长按)
   */
  static pressTrigger(playerId) {
    const state = this.#getOrCreateState(playerId);
    state.isTriggerPressed = true;
  }

  /**
   * 玩家松开扳机 (结束长按)
   */
  static releaseTrigger(playerId) {
    const state = this.#playerSchedulers.get(playerId);
    if (state) {
      state.isTriggerPressed = false;
      state.semiFired = false;
      state.accumulator = 0.0;
    }
  }

  /**
   * 每 tick 调度计算本 tick 允许发射的弹药数量
   */
  static updateAndGetShots(playerId, gunDef, currentTick) {
    const state = this.#getOrCreateState(playerId);
    if (!state.isTriggerPressed) {
      return 0;
    }

    const { rpm, fireMode } = gunDef;

    // 1. 半自动模式 (Semi-Auto): 每次按压只触发 1 次，松开前不再激发
    if (fireMode === "semi") {
      if (state.semiFired) {
        return 0;
      }
      const minIntervalTicks = Math.floor((60 * 20) / rpm);
      if (currentTick - state.lastShotTick < minIntervalTicks) {
        return 0;
      }
      state.semiFired = true;
      state.lastShotTick = currentTick;
      return 1;
    }

    // 2. 泵动模式 (Pump-Action): 强制单发并施加动作后摇延迟
    if (fireMode === "pump") {
      if (currentTick < state.pumpReadyTick) {
        return 0;
      }
      const pumpDelayTicks = Math.round((60 * 20) / rpm);
      state.pumpReadyTick = currentTick + pumpDelayTicks;
      state.lastShotTick = currentTick;
      return 1;
    }

    // 3. 全自动模式 (Full-Auto): 20 TPS 累加器算法
    const delta = rpm / (60 * 20);
    state.accumulator += delta;

    let shots = 0;
    while (state.accumulator >= 1.0) {
      shots++;
      state.accumulator -= 1.0;
    }

    if (shots > 0) {
      state.lastShotTick = currentTick;
    }

    return shots;
  }

  static reset(playerId) {
    this.#playerSchedulers.delete(playerId);
  }

  static simulateFireTicks(rpm, fireMode, totalTicks = 200) {
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
