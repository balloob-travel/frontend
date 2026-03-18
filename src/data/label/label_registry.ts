import type { Connection } from "home-assistant-js-websocket";
import { stringCompare } from "../../common/string/compare";
import type { HomeAssistant } from "../../types";
import type { RegistryEntry } from "../registry";
import { createRegistryCollection } from "../ws-registry";

export interface LabelRegistryEntry extends RegistryEntry {
  label_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
}

export interface LabelRegistryEntryMutableParams {
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export const fetchLabelRegistry = (conn: Connection) =>
  conn
    .sendMessagePromise({
      type: "config/label_registry/list",
    })
    .then((labels) =>
      (labels as LabelRegistryEntry[]).sort((ent1, ent2) =>
        stringCompare(ent1.name, ent2.name)
      )
    );

interface CompressedLabelRegistryEntry {
  co: string | null;
  cr: number;
  de: string | null;
  ic: string | null;
  id: string;
  mo: number;
  nm: string;
}

const decompressLabelRegistryEntry = (
  entry: CompressedLabelRegistryEntry
): LabelRegistryEntry => ({
  color: entry.co,
  created_at: entry.cr,
  description: entry.de,
  icon: entry.ic,
  label_id: entry.id,
  modified_at: entry.mo,
  name: entry.nm,
});

export const subscribeLabelRegistryUpdates = createRegistryCollection(
  "_labelRegistry",
  { type: "config/label_registry/subscribe" },
  decompressLabelRegistryEntry,
  (entry: LabelRegistryEntry) => entry.label_id,
  (entry1, entry2) => stringCompare(entry1.name, entry2.name)
);

export const subscribeLabelRegistry = (
  conn: Connection,
  onChange: (labels: LabelRegistryEntry[]) => void
) => subscribeLabelRegistryUpdates(conn, onChange);

export const createLabelRegistryEntry = (
  hass: HomeAssistant,
  values: LabelRegistryEntryMutableParams
) =>
  hass.callWS<LabelRegistryEntry>({
    type: "config/label_registry/create",
    ...values,
  });

export const updateLabelRegistryEntry = (
  hass: HomeAssistant,
  labelId: string,
  updates: Partial<LabelRegistryEntryMutableParams>
) =>
  hass.callWS<LabelRegistryEntry>({
    type: "config/label_registry/update",
    label_id: labelId,
    ...updates,
  });

export const deleteLabelRegistryEntry = (
  hass: HomeAssistant,
  labelId: string
) =>
  hass.callWS({
    type: "config/label_registry/delete",
    label_id: labelId,
  });
