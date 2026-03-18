import type { AreaRegistryEntry } from "../../../src/data/area/area_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockAreaRegistry = (
  hass: MockHomeAssistant,
  data: AreaRegistryEntry[] = []
) => {
  hass.mockWS("config/area_registry/list", () => data);
  hass.mockWS("config/area_registry/subscribe", (_msg, _hass, onChange) => {
    onChange?.({
      i: data.map((entry) => ({
        al: entry.aliases,
        cr: entry.created_at,
        fi: entry.floor_id,
        he: entry.humidity_entity_id,
        ic: entry.icon,
        id: entry.area_id,
        lb: entry.labels,
        mo: entry.modified_at,
        nm: entry.name,
        pc: entry.picture,
        te: entry.temperature_entity_id,
      })),
    });
    return () => undefined;
  });
  const areas = {};
  data.forEach((area) => {
    areas[area.area_id] = area;
  });
  hass.updateHass({ areas });
};
