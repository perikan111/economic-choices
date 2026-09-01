import type { SaveData } from "./format";

export interface SaveSlotInfo {
  slot: string;
  savedAt: string;
  label?: string;
}

export interface SaveStorage {
  list(): Promise<SaveSlotInfo[]>;
  load(slot: string): Promise<SaveData | null>;
  save(slot: string, data: SaveData): Promise<void>;
  remove(slot: string): Promise<void>;
}
