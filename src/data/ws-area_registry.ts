import type { Connection } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { AreaRegistryEntry } from "./area/area_registry";
import type { RegistryCollectionUpdate } from "./ws-registry";
import { processRegistryCollectionUpdate } from "./ws-registry";

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

const processAreaRegistryUpdate = (
  store: Store<AreaRegistryEntry[]>,
  updates: RegistryCollectionUpdate<CompressedAreaRegistryEntry>
) =>
  store.setState(
    processRegistryCollectionUpdate(
      store.state,
      updates,
      decompressAreaRegistryEntry,
      (entry) => entry.area_id
    ),
    true
  );

const subscribeAreaRegistryUpdates = (
  conn: Connection,
  store: Store<AreaRegistryEntry[]>
) =>
  conn.subscribeMessage<RegistryCollectionUpdate<CompressedAreaRegistryEntry>>(
    (updates) => processAreaRegistryUpdate(store, updates),
    {
      type: "config/area_registry/subscribe",
    }
  );

export const subscribeAreaRegistry = (
  conn: Connection,
  onChange: (areas: AreaRegistryEntry[]) => void
) =>
  getCollection(
    conn,
    "_areaRegistry",
    undefined,
    subscribeAreaRegistryUpdates
  ).subscribe(onChange);
