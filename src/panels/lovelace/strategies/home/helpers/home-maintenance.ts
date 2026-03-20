import type { HassEntity } from "home-assistant-js-websocket";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../../common/entity/entity_filter";
import type { EntityFilter } from "../../../../../common/entity/entity_filter";
import type { HomeAssistant } from "../../../../../types";

export const HOME_MAINTENANCE_FILTERS: EntityFilter[] = [
  {
    domain: "sensor",
    device_class: "battery",
  },
  {
    domain: "binary_sensor",
    device_class: "problem",
  },
];

export interface HomeMaintenanceCounts {
  lowBatteries: number;
  problems: number;
}

export const getMaintenanceEntities = (
  hass: HomeAssistant,
  entities: string[] = Object.keys(hass.states)
): string[] => {
  const filters = HOME_MAINTENANCE_FILTERS.map((filter) =>
    generateEntityFilter(hass, filter)
  );

  return findEntities(entities, filters);
};

export const isLowBatteryEntity = (
  stateObj: HassEntity | undefined
): boolean => {
  if (
    !stateObj ||
    stateObj.attributes.device_class !== "battery" ||
    !stateObj.entity_id.startsWith("sensor.")
  ) {
    return false;
  }

  const value = Number(stateObj.state);
  return !isNaN(value) && value < 30;
};

export const isActiveProblemEntity = (
  stateObj: HassEntity | undefined
): boolean =>
  Boolean(
    stateObj &&
    stateObj.attributes.device_class === "problem" &&
    stateObj.entity_id.startsWith("binary_sensor.") &&
    stateObj.state === "on"
  );

export const countActiveMaintenanceIssues = (
  hass: HomeAssistant,
  entities: string[] = Object.keys(hass.states)
): HomeMaintenanceCounts =>
  getMaintenanceEntities(hass, entities).reduce<HomeMaintenanceCounts>(
    (counts, entityId) => {
      const stateObj = hass.states[entityId];

      if (isLowBatteryEntity(stateObj)) {
        counts.lowBatteries += 1;
      } else if (isActiveProblemEntity(stateObj)) {
        counts.problems += 1;
      }

      return counts;
    },
    {
      lowBatteries: 0,
      problems: 0,
    }
  );
