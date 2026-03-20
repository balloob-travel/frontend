import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { clamp } from "../../../../common/number/clamp";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type {
  EmptyStateCardConfig,
  HeadingCardConfig,
  MaintenanceStatusCardConfig,
  RepairsCardConfig,
  TileCardConfig,
  UpdatesCardConfig,
} from "../../cards/types";
import { computeAreaTileCardConfig } from "../areas/helpers/areas-strategy-helper";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../helpers/screen-conditions";
import { getMaintenanceEntities } from "./helpers/home-maintenance";

export interface HomeMaintenanceViewStrategyConfig {
  type: "home-maintenance";
}

interface DeviceMaintenanceEntities {
  device_id: string;
  entities: string[];
}

const groupEntitiesByDevice = (
  hass: HomeAssistant,
  entities: string[]
): DeviceMaintenanceEntities[] => {
  const entitiesByDevice: Record<string, string[]> = {};
  const unassignedEntities: string[] = [];

  for (const entityId of entities) {
    const stateObj = hass.states[entityId];
    if (!stateObj) {
      continue;
    }

    const { device } = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    if (!device) {
      unassignedEntities.push(entityId);
      continue;
    }

    if (!(device.id in entitiesByDevice)) {
      entitiesByDevice[device.id] = [];
    }

    entitiesByDevice[device.id].push(entityId);
  }

  const grouped = Object.entries(entitiesByDevice).map(([deviceId, ids]) => ({
    device_id: deviceId,
    entities: ids,
  }));

  if (unassignedEntities.length) {
    grouped.push({
      device_id: "unassigned",
      entities: unassignedEntities,
    });
  }

  return grouped;
};

const processAreaMaintenance = (
  hass: HomeAssistant,
  areaId: string,
  entities: string[]
): LovelaceSectionRawConfig | undefined => {
  const area = hass.areas[areaId];
  if (!area) {
    return undefined;
  }

  const groupedEntities = groupEntitiesByDevice(hass, entities);

  if (!groupedEntities.length) {
    return undefined;
  }

  const cards: LovelaceCardConfig[] = [
    {
      type: "heading",
      heading: area.name,
      heading_style: "title",
      icon: area.icon || undefined,
      tap_action: {
        action: "navigate",
        navigation_path: `areas-${area.area_id}`,
      },
    } satisfies HeadingCardConfig,
  ];

  for (const deviceEntities of groupedEntities) {
    const device = hass.devices[deviceEntities.device_id];
    let heading = hass.localize("ui.panel.lovelace.strategy.home.others");
    if (device) {
      heading =
        computeDeviceName(device) ||
        hass.localize("ui.panel.lovelace.strategy.home.unnamed_device");
    }

    cards.push({
      type: "heading",
      heading: heading,
      heading_style: "subtitle",
      tap_action:
        device && hass.user?.is_admin
          ? {
              action: "navigate",
              navigation_path: `/config/devices/device/${device.id}`,
            }
          : undefined,
    } satisfies HeadingCardConfig);

    cards.push(
      ...deviceEntities.entities.map((entity) => ({
        ...computeMaintenanceTileCard(hass, area.name, entity),
      }))
    );
  }

  return {
    type: "grid",
    cards: cards,
  };
};

const computeMaintenanceTileCard = (
  hass: HomeAssistant,
  prefix: string,
  entity: string
): TileCardConfig => {
  const card = computeAreaTileCardConfig(
    hass,
    prefix
  )(entity) as TileCardConfig;
  const stateObj = hass.states[entity];

  if (
    stateObj &&
    computeDomain(entity) === "sensor" &&
    stateObj.attributes.device_class === "battery"
  ) {
    const { device } = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );
    const deviceName = device ? computeDeviceName(device) : undefined;

    if (!deviceName) {
      return {
        ...card,
        name: {
          type: "entity",
        },
      };
    }

    return {
      ...card,
      name: {
        type: "device",
      },
      state_content: ["state", "name"],
    };
  }

  return {
    ...card,
    name: {
      type: "entity",
    },
  };
};

const maintenanceStatusCards = (): LovelaceCardConfig[] =>
  [
    {
      type: "repairs",
      hide_empty: true,
      tap_action: {
        action: "navigate",
        navigation_path: "/config/repairs?historyBack=1",
      },
    } satisfies RepairsCardConfig,
    {
      type: "updates",
      hide_empty: true,
      tap_action: {
        action: "navigate",
        navigation_path: "/config/updates?historyBack=1",
      },
    } satisfies UpdatesCardConfig,
  ].map((card) => ({
    ...card,
    grid_options: {
      columns: 12,
    },
  }));

@customElement("home-maintenance-view-strategy")
export class HomeMaintenanceViewStrategy extends ReactiveElement {
  static async generate(
    _config: HomeMaintenanceViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas);
    const floors = Object.values(hass.floors);
    const home = getAreasFloorHierarchy(floors, areas);
    const areaOrder = [
      ...home.floors.flatMap((floor) => floor.areas),
      ...home.areas,
    ];

    const allMaintenanceEntities = getMaintenanceEntities(hass);

    const sections = areaOrder
      .map((areaId) => {
        const areaFilter = generateEntityFilter(hass, {
          area: areaId,
        });
        const areaEntities = allMaintenanceEntities.filter(areaFilter);
        return processAreaMaintenance(hass, areaId, areaEntities);
      })
      .filter(Boolean) as LovelaceSectionRawConfig[];

    const unassignedFilter = generateEntityFilter(hass, {
      area: null,
    });
    const unassignedEntities = allMaintenanceEntities.filter(unassignedFilter);

    if (unassignedEntities.length) {
      const groupedEntities = groupEntitiesByDevice(hass, unassignedEntities);

      sections.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: hass.localize("ui.panel.lovelace.strategy.home.devices"),
            heading_style: "title",
            icon: "mdi:devices",
          } satisfies HeadingCardConfig,
          ...groupedEntities.flatMap((deviceEntities) => {
            const device = hass.devices[deviceEntities.device_id];
            const heading = device
              ? computeDeviceName(device) ||
                hass.localize("ui.panel.lovelace.strategy.home.unnamed_device")
              : hass.localize("ui.panel.lovelace.strategy.home.others");

            return [
              {
                type: "heading",
                heading: heading,
                heading_style: "subtitle",
                tap_action:
                  device && hass.user?.is_admin
                    ? {
                        action: "navigate",
                        navigation_path: `/config/devices/device/${device.id}`,
                      }
                    : undefined,
              } satisfies HeadingCardConfig,
              ...deviceEntities.entities.map((entity) => ({
                ...computeMaintenanceTileCard(
                  hass,
                  hass.localize("ui.panel.lovelace.strategy.home.devices"),
                  entity
                ),
              })),
            ];
          }),
        ],
      });
    }

    if (!sections.length) {
      return {
        type: "panel",
        cards: [
          {
            type: "empty-state",
            icon: "mdi:wrench-check",
            icon_color: "primary",
            content_only: true,
            title: hass.localize(
              "ui.panel.lovelace.strategy.home-maintenance.all_good_title"
            ),
            content: hass.localize(
              "ui.panel.lovelace.strategy.home-maintenance.all_good_content"
            ),
          } as EmptyStateCardConfig,
        ],
      };
    }

    const statusHeadingCard: LovelaceCardConfig = {
      type: "heading",
      heading: hass.localize(
        "ui.panel.lovelace.strategy.home-maintenance.status"
      ),
      heading_style: "title",
    };

    const sidebarStatusSection: LovelaceSectionConfig = {
      type: "grid",
      cards: [
        {
          type: "maintenance-status",
          hide_empty: true,
          grid_options: { rows: "auto" },
        } satisfies MaintenanceStatusCardConfig,
      ],
    };

    const mobileStatusSection: LovelaceSectionConfig = {
      type: "grid",
      visibility: [SMALL_SCREEN_CONDITION],
      column_span: clamp(sections.length, 2, 3),
      cards: [
        statusHeadingCard,
        ...maintenanceStatusCards().map((card) => ({
          ...card,
          grid_options: { columns: 6 },
        })),
      ],
    };

    sections.unshift(mobileStatusSection);

    const maxColumns = clamp(sections.length, 2, 3);

    if (sections.length === 1) {
      sections[0].column_span = 2;
    }

    return {
      type: "sections",
      max_columns: maxColumns,
      sections: sections,
      sidebar: {
        sections: [sidebarStatusSection],
        content_label: hass.localize(
          "ui.panel.lovelace.strategy.home.summary_list.maintenance"
        ),
        sidebar_label: hass.localize(
          "ui.panel.lovelace.strategy.home-maintenance.status"
        ),
        visibility: [LARGE_SCREEN_CONDITION],
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-maintenance-view-strategy": HomeMaintenanceViewStrategy;
  }
}
