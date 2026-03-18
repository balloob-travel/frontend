import type { Connection } from "home-assistant-js-websocket";
import type { DeviceRegistryEntry } from "./device/device_registry";
import { createRegistryCollection } from "./ws-registry";

export const fetchDeviceRegistry = (conn: Connection) =>
  conn.sendMessagePromise<DeviceRegistryEntry[]>({
    type: "config/device_registry/list",
  });

interface CompressedDeviceRegistryEntry {
  ai: string | null;
  ce: string[];
  co: [string, string][];
  cr: number;
  cs: Record<string, (string | null)[]>;
  cu: string | null;
  db: DeviceRegistryEntry["disabled_by"];
  et: DeviceRegistryEntry["entry_type"];
  hw: string | null;
  id: string;
  ii: [string, string][];
  lb: string[];
  md: string | null;
  mf: string | null;
  mi: string | null;
  mo: number;
  nb: string | null;
  nm: string | null;
  pc: string | null;
  sn: string | null;
  sw: string | null;
  vd: string | null;
}

const decompressDeviceRegistryEntry = (
  entry: CompressedDeviceRegistryEntry
): DeviceRegistryEntry => ({
  area_id: entry.ai,
  config_entries: entry.ce,
  config_entries_subentries: entry.cs,
  configuration_url: entry.cu,
  connections: entry.co,
  created_at: entry.cr,
  disabled_by: entry.db,
  entry_type: entry.et,
  hw_version: entry.hw,
  id: entry.id,
  identifiers: entry.ii,
  labels: entry.lb,
  manufacturer: entry.mf,
  model: entry.md,
  model_id: entry.mi,
  modified_at: entry.mo,
  name: entry.nm,
  name_by_user: entry.nb,
  primary_config_entry: entry.pc,
  serial_number: entry.sn,
  sw_version: entry.sw,
  via_device_id: entry.vd,
});

const subscribeDeviceRegistryUpdates = createRegistryCollection(
  "_dr",
  { type: "config/device_registry/subscribe" },
  decompressDeviceRegistryEntry,
  (entry: DeviceRegistryEntry) => entry.id
);

export const subscribeDeviceRegistry = (
  conn: Connection,
  onChange: (devices: DeviceRegistryEntry[]) => void
) => subscribeDeviceRegistryUpdates(conn, onChange);
