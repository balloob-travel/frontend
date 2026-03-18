import type { LabelRegistryEntry } from "../../../src/data/label/label_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockLabelRegistry = (
  hass: MockHomeAssistant,
  data: LabelRegistryEntry[] = []
) => {
  hass.mockWS("config/label_registry/list", () => data);
  hass.mockWS("config/label_registry/subscribe", (_msg, _hass, onChange) => {
    onChange?.({
      i: data.map((entry) => ({
        co: entry.color,
        cr: entry.created_at,
        de: entry.description,
        ic: entry.icon,
        id: entry.label_id,
        mo: entry.modified_at,
        nm: entry.name,
      })),
    });
    return () => undefined;
  });
};
