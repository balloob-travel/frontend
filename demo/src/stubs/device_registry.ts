import type { DeviceRegistryEntry } from "../../../src/data/device/device_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockDeviceRegistry = (
  hass: MockHomeAssistant,
  data: DeviceRegistryEntry[] = []
) => {
  hass.mockWS("config/device_registry/list", () => data);
  hass.mockWS("config/device_registry/subscribe", (_msg, _hass, onChange) => {
    onChange?.({
      i: data.map((entry) => ({
        ai: entry.area_id,
        ce: entry.config_entries,
        co: entry.connections,
        cr: entry.created_at,
        cs: entry.config_entries_subentries,
        cu: entry.configuration_url,
        db: entry.disabled_by,
        et: entry.entry_type,
        hw: entry.hw_version,
        id: entry.id,
        ii: entry.identifiers,
        lb: entry.labels,
        md: entry.model,
        mf: entry.manufacturer,
        mi: entry.model_id,
        mo: entry.modified_at,
        nb: entry.name_by_user,
        nm: entry.name,
        pc: entry.primary_config_entry,
        sn: entry.serial_number,
        sw: entry.sw_version,
        vd: entry.via_device_id,
      })),
    });
    return () => undefined;
  });
  const devices = {};
  data.forEach((device) => {
    devices[device.id] = device;
  });
  hass.updateHass({ devices });
};
