import type { SaveData, SaveSlotInfo, SaveStorage } from "@/game-core";

const SLOT_IDS = ["auto", "1"] as const;

function assertSlot(slot: string): void {
  if (!SLOT_IDS.includes(slot as (typeof SLOT_IDS)[number])) {
    throw new Error(`未対応のセーブスロットです: ${slot}`);
  }
}

export function createLocalStorageSave(scenarioId: string): SaveStorage {
  const keyFor = (slot: string) => `economic-choices:save:${scenarioId}:${slot}`;

  return {
    async list(): Promise<SaveSlotInfo[]> {
      return SLOT_IDS.flatMap((slot) => {
        const raw = localStorage.getItem(keyFor(slot));
        if (!raw) return [];
        try {
          const data = JSON.parse(raw) as Partial<SaveData>;
          if (typeof data.savedAt !== "string") return [];
          return [{ slot, savedAt: data.savedAt, label: data.label }];
        } catch {
          return [];
        }
      });
    },
    async load(slot: string): Promise<SaveData | null> {
      assertSlot(slot);
      const raw = localStorage.getItem(keyFor(slot));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SaveData;
      } catch {
        return null;
      }
    },
    async save(slot: string, data: SaveData): Promise<void> {
      assertSlot(slot);
      localStorage.setItem(keyFor(slot), JSON.stringify(data));
    },
    async remove(slot: string): Promise<void> {
      assertSlot(slot);
      localStorage.removeItem(keyFor(slot));
    },
  };
}
