import type { FloorRegistryEntry } from "../../../src/data/floor_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockFloorRegistry = (
  hass: MockHomeAssistant,
  data: FloorRegistryEntry[] = []
) => {
  hass.mockWS("config/floor_registry/list", () => data);
  hass.mockWS("config/floor_registry/subscribe", (_msg, _hass, onChange) => {
    onChange?.({
      i: data.map((entry) => ({
        al: entry.aliases,
        cr: entry.created_at,
        ic: entry.icon,
        id: entry.floor_id,
        lv: entry.level,
        mo: entry.modified_at,
        nm: entry.name,
      })),
    });
    return () => undefined;
  });
};
