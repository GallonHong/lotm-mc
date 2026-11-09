/** Logical Jump input works for keyboard, controller and touch, unlike isJumping. */
export function readJumpPressed(player) {
 try {
  const value = player.inputInfo?.getButtonState?.("Jump");
  if (value === "Pressed") return true;
  if (value === "Released") return false;
 } catch {}
 return null; // Never infer a release from unavailable/unknown input.
}

export function createJumpHold() {
 return { armed: false, ticks: 0, triggered: false };
}

/** Require an observed release, then 60 uninterrupted samples. Fire once. */
export function updateJumpHold(state, pressed, allowed = true) {
 if (state.triggered) return false;
 if (!allowed || pressed === null) {
  state.armed = false;
  state.ticks = 0;
  return false;
 }
 if (!pressed) {
  state.armed = true;
  state.ticks = 0;
  return false;
 }
 if (!state.armed) return false;
 state.ticks += 1;
 if (state.ticks < 60) return false;
 state.triggered = true;
 return true;
}
