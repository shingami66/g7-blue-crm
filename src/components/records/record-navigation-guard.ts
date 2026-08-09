export interface RecordNavigationGuard {
  acquire(): boolean;
  release(): void;
  isLocked(): boolean;
}

export function createRecordNavigationGuard(): RecordNavigationGuard {
  let locked = false;

  return {
    acquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    },
    isLocked() {
      return locked;
    },
  };
}
