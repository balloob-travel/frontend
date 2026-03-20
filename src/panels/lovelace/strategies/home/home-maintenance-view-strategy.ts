import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { stripPrefixFromEntityName } from "../../../../common/entity/strip_prefix_from_entity_name";
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
  EntitiesCardConfig,
  HeadingCardConfig,
  MaintenanceStatusCardConfig,
  RepairsCardConfig,
  UpdatesCardConfig,
} from "../../cards/types";
import type { LovelaceRowConfig } from "../../entity-rows/types";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../helpers/screen-conditions";
import { getMaintenanceEntities } from "./helpers/home-maintenance";

export interface HomeMaintenanceViewStrategyConfig {
  type: "home-maintenance";
}

const compareMaintenanceEntities = (
  hass: HomeAssistant,
  left: string,
  right: string
): number => {
  const leftState = hass.states[left];
  const rightState = hass.states[right];

  const leftName = leftState
    ? computeMaintenanceRowName(hass, leftState)
    : left;
  const rightName = rightState
    ? computeMaintenanceRowName(hass, rightState)
    : right;

  return leftName.localeCompare(rightName, hass.locale.language);
};

const computeMaintenanceRowName = (
  hass: HomeAssistant,
  stateObj: HomeAssistant["states"][string]
): string => {
  const { area, device } = getEntityContext(
    stateObj,
    hass.entities,
    hass.devices,
    hass.areas,
    hass.floors
  );

  const name = device
    ? computeDeviceName(device) || computeStateName(stateObj)
    : computeStateName(stateObj);

  return area ? stripPrefixFromEntityName(name, area.name) || name : name;
};

const computeMaintenanceRowConfig = (
  hass: HomeAssistant,
  entityId: string
): LovelaceRowConfig => {
  const stateObj = hass.states[entityId];

  if (!stateObj) {
    return entityId;
  }

  const rowName = computeMaintenanceRowName(hass, stateObj);

  return {
    entity: entityId,
    name: rowName,
  };
};

const computeMaintenanceEntitiesCard = (
  hass: HomeAssistant,
  entities: string[]
): EntitiesCardConfig | undefined => {
  const problems = entities
    .filter((entityId) => {
      const stateObj = hass.states[entityId];
      return (
        stateObj &&
        computeDomain(entityId) === "binary_sensor" &&
        stateObj.attributes.device_class === "problem"
      );
    })
    .sort((left, right) => compareMaintenanceEntities(hass, left, right));

  const batteries = entities
    .filter((entityId) => {
      const stateObj = hass.states[entityId];
      return (
        stateObj &&
        computeDomain(entityId) === "sensor" &&
        stateObj.attributes.device_class === "battery"
      );
    })
    .sort((left, right) => compareMaintenanceEntities(hass, left, right));

  const rows: LovelaceRowConfig[] = [
    ...problems.map((entityId) => computeMaintenanceRowConfig(hass, entityId)),
    ...(problems.length && batteries.length
      ? ([{ type: "divider" }] satisfies LovelaceRowConfig[])
      : []),
    ...batteries.map((entityId) => computeMaintenanceRowConfig(hass, entityId)),
  ];

  if (!rows.length) {
    return undefined;
  }

  return {
    type: "entities",
    show_header_toggle: false,
    state_color: true,
    entities: rows,
  };
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

  const entitiesCard = computeMaintenanceEntitiesCard(hass, entities);

  if (!entitiesCard) {
    return undefined;
  }

  return {
    type: "grid",
    cards: [
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
      entitiesCard,
    ],
  };
};

const computeUnassignedMaintenanceSection = (
  hass: HomeAssistant,
  entities: string[]
): LovelaceSectionRawConfig | undefined => {
  const entitiesCard = computeMaintenanceEntitiesCard(hass, entities);

  if (!entitiesCard) {
    return undefined;
  }

  return {
    type: "grid",
    cards: [
      {
        type: "heading",
        heading: hass.localize("ui.panel.lovelace.strategy.home.devices"),
        heading_style: "title",
        icon: "mdi:devices",
      } satisfies HeadingCardConfig,
      entitiesCard,
    ],
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
      const unassignedSection = computeUnassignedMaintenanceSection(
        hass,
        unassignedEntities
      );

      if (unassignedSection) {
        sections.push(unassignedSection);
      }
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
