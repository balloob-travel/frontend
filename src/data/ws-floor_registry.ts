import type { Connection } from "home-assistant-js-websocket";
import type { FloorRegistryEntry } from "./floor_registry";
import { createRegistryCollection } from "./ws-registry";

export const fetchFloorRegistry = (conn: Connection) =>
  conn.sendMessagePromise<FloorRegistryEntry[]>({
    type: "config/floor_registry/list",
  });

interface CompressedFloorRegistryEntry {
  al: string[];
  cr: number;
  ic: string | null;
  id: string;
  lv: number | null;
  mo: number;
  nm: string;
}

const decompressFloorRegistryEntry = (
  entry: CompressedFloorRegistryEntry
): FloorRegistryEntry => ({
  aliases: entry.al,
  created_at: entry.cr,
  floor_id: entry.id,
  icon: entry.ic,
  level: entry.lv,
  modified_at: entry.mo,
  name: entry.nm,
});

const subscribeFloorRegistryUpdates = createRegistryCollection(
  "_floorRegistry",
  { type: "config/floor_registry/subscribe" },
  decompressFloorRegistryEntry,
  (entry: FloorRegistryEntry) => entry.floor_id
);

export const subscribeFloorRegistry = (
  conn: Connection,
  onChange: (floors: FloorRegistryEntry[]) => void
) => subscribeFloorRegistryUpdates(conn, onChange);
