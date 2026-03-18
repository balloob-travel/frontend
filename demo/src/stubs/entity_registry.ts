import type {
  EntityRegistryDisplayEntryResponse,
  EntityRegistryEntry,
} from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const entityCategoryToIndex = {
  config: 0,
  diagnostic: 1,
} as const;

const entityCategories: EntityRegistryDisplayEntryResponse["entity_categories"] =
  {
    0: "config",
    1: "diagnostic",
  };

const toDisplayEntity = (
  entry: EntityRegistryEntry
): EntityRegistryDisplayEntryResponse["entities"][number] => {
  const sensorOptions = entry.options?.sensor;
  const displayPrecision =
    sensorOptions?.display_precision ??
    sensorOptions?.suggested_display_precision;

  return {
    ai: entry.area_id ?? undefined,
    di: entry.device_id ?? undefined,
    dp: displayPrecision ?? undefined,
    ec:
      entry.entity_category !== null
        ? entityCategoryToIndex[entry.entity_category]
        : undefined,
    ei: entry.entity_id,
    en: entry.name ?? entry.original_name,
    hb: entry.hidden_by !== null || undefined,
    hn: entry.has_entity_name || undefined,
    ic: entry.icon ?? undefined,
    lb: entry.labels,
    pl: entry.platform,
    tk: entry.translation_key,
  };
};

export const mockEntityRegistry = (
  hass: MockHomeAssistant,
  data: EntityRegistryEntry[] = []
) => {
  hass.mockWS("config/entity_registry/list", () => data);
  hass.mockWS("config/entity_registry/subscribe", (_msg, _hass, onChange) => {
    onChange?.({
      i: data.map((entry) => ({
        ai: entry.area_id,
        ce: entry.config_entry_id,
        cg: entry.categories,
        cr: entry.created_at,
        cs: entry.config_subentry_id,
        db: entry.disabled_by,
        di: entry.device_id,
        ec: entry.entity_category,
        ei: entry.entity_id,
        hb: entry.hidden_by,
        hn: entry.has_entity_name,
        ic: entry.icon,
        id: entry.id,
        lb: entry.labels,
        mo: entry.modified_at,
        nm: entry.name,
        on: entry.original_name ?? null,
        op: entry.options,
        pl: entry.platform,
        tk: entry.translation_key,
        ui: entry.unique_id,
      })),
    });
    return () => undefined;
  });
  hass.mockWS("config/entity_registry/list_for_display", () => ({
    entities: data
      .filter((entry) => entry.disabled_by === null)
      .map(toDisplayEntity),
    entity_categories: entityCategories,
  }));
  hass.mockWS(
    "config/entity_registry/subscribe_for_display",
    (_msg, _hass, onChange) => {
      onChange?.({
        ec: entityCategories,
        i: data
          .filter((entry) => entry.disabled_by === null)
          .map((entry) => toDisplayEntity(entry)),
      });
      return () => undefined;
    }
  );
};
