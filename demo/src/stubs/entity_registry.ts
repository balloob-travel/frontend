import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

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
        tk: entry.translation_key ?? null,
        ui: entry.unique_id,
      })),
    });
    return () => undefined;
  });
};
