import type { Connection } from "home-assistant-js-websocket";
import type { AreaRegistryEntry } from "./area/area_registry";
import { createRegistryCollection } from "./ws-registry";

export const fetchAreaRegistry = (conn: Connection) =>
  conn.sendMessagePromise<AreaRegistryEntry[]>({
    type: "config/area_registry/list",
  });

interface CompressedAreaRegistryEntry {
  al: string[];
  cr: number;
  fi: string | null;
  he: string | null;
  ic: string | null;
  id: string;
  lb: string[];
  mo: number;
  nm: string;
  pc: string | null;
  te: string | null;
}

const decompressAreaRegistryEntry = (
  entry: CompressedAreaRegistryEntry
): AreaRegistryEntry => ({
  aliases: entry.al,
  area_id: entry.id,
  created_at: entry.cr,
  floor_id: entry.fi,
  humidity_entity_id: entry.he,
  icon: entry.ic,
  labels: entry.lb,
  modified_at: entry.mo,
  name: entry.nm,
  picture: entry.pc,
  temperature_entity_id: entry.te,
});

const subscribeAreaRegistryUpdates = createRegistryCollection(
  "_areaRegistry",
  { type: "config/area_registry/subscribe" },
  decompressAreaRegistryEntry,
  (entry: AreaRegistryEntry) => entry.area_id
);

export const subscribeAreaRegistry = (
  conn: Connection,
  onChange: (areas: AreaRegistryEntry[]) => void
) => subscribeAreaRegistryUpdates(conn, onChange);
