import type { Connection } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { FloorRegistryEntry } from "./floor_registry";
import type { RegistryCollectionUpdate } from "./ws-registry";
import { processRegistryCollectionUpdate } from "./ws-registry";

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

const processFloorRegistryUpdate = (
  store: Store<FloorRegistryEntry[]>,
  updates: RegistryCollectionUpdate<CompressedFloorRegistryEntry>
) =>
  store.setState(
    processRegistryCollectionUpdate(
      store.state,
      updates,
      decompressFloorRegistryEntry,
      (entry) => entry.floor_id
    ),
    true
  );

const subscribeFloorRegistryUpdates = (
  conn: Connection,
  store: Store<FloorRegistryEntry[]>
) =>
  conn.subscribeMessage<RegistryCollectionUpdate<CompressedFloorRegistryEntry>>(
    (updates) => processFloorRegistryUpdate(store, updates),
    {
      type: "config/floor_registry/subscribe",
    }
  );

export const subscribeFloorRegistry = (
  conn: Connection,
  onChange: (floors: FloorRegistryEntry[]) => void
) =>
  getCollection(
    conn,
    "_floorRegistry",
    undefined,
    subscribeFloorRegistryUpdates
  ).subscribe(onChange);
