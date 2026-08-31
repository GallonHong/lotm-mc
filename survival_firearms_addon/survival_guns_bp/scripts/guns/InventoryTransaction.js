/** Small inventory transaction helper used by blueprint and weapon crafting. */
export class InventoryTransaction {
  static count(container, itemTypeId) {
    let total = 0;
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (item?.typeId === itemTypeId) total += item.amount;
    }
    return total;
  }

  static findEmptySlot(container) {
    for (let i = 0; i < container.size; i++) {
      if (!container.getItem(i)) return i;
    }
    return -1;
  }

  static commit(container, recipe, outputItem, outputSlot) {
    const snapshot = [];
    for (let i = 0; i < container.size; i++) snapshot.push(container.getItem(i));

    try {
      for (const req of recipe) {
        let remaining = req.count;
        for (let i = 0; i < container.size && remaining > 0; i++) {
          const item = container.getItem(i);
          if (item?.typeId !== req.item) continue;
          if (item.amount <= remaining) {
            remaining -= item.amount;
            container.setItem(i, undefined);
          } else {
            item.amount -= remaining;
            remaining = 0;
            container.setItem(i, item);
          }
        }
        if (remaining > 0) throw new Error(`Missing material during commit: ${req.item}`);
      }
      container.setItem(outputSlot, outputItem);
      return true;
    } catch {
      for (let i = 0; i < snapshot.length; i++) {
        try { container.setItem(i, snapshot[i]); } catch {}
      }
      return false;
    }
  }
}
