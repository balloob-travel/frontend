import type { Connection } from "home-assistant-js-websocket";
import { stringCompare } from "../common/string/compare";
import type { HomeAssistant } from "../types";
import type { RegistryEntry } from "./registry";
import { createRegistryCollection } from "./ws-registry";

export interface CategoryRegistryEntry extends RegistryEntry {
  category_id: string;
  name: string;
  icon: string | null;
}

export interface CategoryRegistryEntryMutableParams {
  name: string;
  icon?: string | null;
}

export const fetchCategoryRegistry = (conn: Connection, scope: string) =>
  conn
    .sendMessagePromise<CategoryRegistryEntry[]>({
      type: "config/category_registry/list",
      scope,
    })
    .then((categories) =>
      categories.sort((ent1, ent2) => stringCompare(ent1.name, ent2.name))
    );

interface CompressedCategoryRegistryEntry {
  cr: number;
  ic: string | null;
  id: string;
  mo: number;
  nm: string;
}

const decompressCategoryRegistryEntry = (
  entry: CompressedCategoryRegistryEntry
): CategoryRegistryEntry => ({
  category_id: entry.id,
  created_at: entry.cr,
  icon: entry.ic,
  modified_at: entry.mo,
  name: entry.nm,
});

export const subscribeCategoryRegistry = (
  conn: Connection,
  scope: string,
  onChange: (floors: CategoryRegistryEntry[]) => void
) =>
  createRegistryCollection(
    `_categoryRegistry_${scope}`,
    {
      type: "config/category_registry/subscribe",
      scope,
    },
    decompressCategoryRegistryEntry,
    (entry: CategoryRegistryEntry) => entry.category_id,
    (entry1, entry2) => stringCompare(entry1.name, entry2.name)
  )(conn, onChange);

export const createCategoryRegistryEntry = (
  hass: HomeAssistant,
  scope: string,
  values: CategoryRegistryEntryMutableParams
) =>
  hass.callWS<CategoryRegistryEntry>({
    type: "config/category_registry/create",
    scope,
    ...values,
  });

export const updateCategoryRegistryEntry = (
  hass: HomeAssistant,
  scope: string,
  category_id: string,
  updates: Partial<CategoryRegistryEntryMutableParams>
) =>
  hass.callWS<CategoryRegistryEntry>({
    type: "config/category_registry/update",
    scope,
    category_id,
    ...updates,
  });

export const deleteCategoryRegistryEntry = (
  hass: HomeAssistant,
  scope: string,
  category_id: string
) =>
  hass.callWS({
    type: "config/category_registry/delete",
    scope,
    category_id,
  });
