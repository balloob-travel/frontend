import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  {
    entity_id: "light.bed_light",
    state: "on",
    attributes: {
      friendly_name: "Bed Light",
    },
  },
  {
    entity_id: "switch.bed_ac",
    state: "on",
    attributes: {
      friendly_name: "Ecobee",
    },
  },
  {
    entity_id: "sensor.bed_temp",
    state: "72",
    attributes: {
      friendly_name: "Bedroom Temp",
      device_class: "temperature",
      unit_of_measurement: "°F",
    },
  },
  {
    entity_id: "light.living_room_light",
    state: "off",
    attributes: {
      friendly_name: "Living Room Light",
    },
  },
  {
    entity_id: "fan.living_room",
    state: "on",
    attributes: {
      friendly_name: "Living Room Fan",
    },
  },
  {
    entity_id: "sensor.office_humidity",
    state: "73",
    attributes: {
      friendly_name: "Office Humidity",
      device_class: "humidity",
      unit_of_measurement: "%",
    },
  },
  {
    entity_id: "light.office",
    state: "on",
    attributes: {
      friendly_name: "Office Light",
    },
  },
  {
    entity_id: "fan.kitchen",
    state: "on",
    attributes: {
      friendly_name: "Kitchen Fan",
    },
  },
  {
    entity_id: "binary_sensor.kitchen_door",
    state: "on",
    attributes: {
      friendly_name: "Office Door",
      device_class: "door",
    },
  },
];

// TODO: Update image here
const CONFIGS = [
  {
    heading: "Bedroom",
    config: `
- type: area
  area: bedroom
    `,
  },
  {
    heading: "Living Room",
    config: `
- type: area
  area: living_room
    `,
  },
  {
    heading: "Office",
    config: `
- type: area
  area: office
    `,
  },
  {
    heading: "Kitchen",
    config: `
- type: area
  area: kitchen
    `,
  },
];

@customElement("demo-lovelace-area-card")
class DemoArea extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
    const areas = [
      {
        aliases: [],
        area_id: "bedroom",
        created_at: 0,
        floor_id: null,
        humidity_entity_id: null,
        icon: null,
        labels: [],
        modified_at: 0,
        name: "Bedroom",
        picture: "/images/bed.png",
        temperature_entity_id: null,
      },
      {
        aliases: [],
        area_id: "living_room",
        created_at: 0,
        floor_id: null,
        humidity_entity_id: null,
        icon: null,
        labels: [],
        modified_at: 0,
        name: "Living Room",
        picture: "/images/living_room.png",
        temperature_entity_id: null,
      },
      {
        aliases: [],
        area_id: "office",
        created_at: 0,
        floor_id: null,
        humidity_entity_id: null,
        icon: null,
        labels: [],
        modified_at: 0,
        name: "Office",
        picture: "/images/office.jpg",
        temperature_entity_id: null,
      },
      {
        aliases: [],
        area_id: "kitchen",
        created_at: 0,
        floor_id: null,
        humidity_entity_id: null,
        icon: null,
        labels: [],
        modified_at: 0,
        name: "Kitchen",
        picture: "/images/kitchen.png",
        temperature_entity_id: null,
      },
    ];
    hass.mockWS("config/area_registry/list", () => areas);
    hass.mockWS("config/area_registry/subscribe", (_msg, _hass, onChange) => {
      onChange?.({
        i: areas.map((area) => ({
          al: area.aliases,
          cr: area.created_at,
          fi: area.floor_id,
          he: area.humidity_entity_id,
          ic: area.icon,
          id: area.area_id,
          lb: area.labels,
          mo: area.modified_at,
          nm: area.name,
          pc: area.picture,
          te: area.temperature_entity_id,
        })),
      });
      return () => undefined;
    });
    hass.mockWS("config/device_registry/list", () => []);
    hass.mockWS("config/device_registry/subscribe", (_msg, _hass, onChange) => {
      onChange?.({ i: [] });
      return () => undefined;
    });
    const entityRegistry = [
      "light.bed_light",
      "switch.bed_ac",
      "sensor.bed_temp",
      "light.living_room_light",
      "fan.living_room",
      "light.office",
      "sensor.office_humidity",
      "fan.kitchen",
      "binary_sensor.kitchen_door",
    ].map((entityId) => ({
      area_id:
        entityId.indexOf("bed_") !== -1
          ? "bedroom"
          : entityId.indexOf("living_room") !== -1
            ? "living_room"
            : entityId.indexOf("office") !== -1
              ? "office"
              : "kitchen",
      categories: {},
      config_entry_id: null,
      config_subentry_id: null,
      created_at: 0,
      device_id: null,
      disabled_by: null,
      entity_category: null,
      entity_id: entityId,
      has_entity_name: false,
      hidden_by: null,
      icon: null,
      id: entityId.replaceAll(".", "-"),
      labels: [],
      modified_at: 0,
      name: null,
      options: null,
      platform: "demo",
      unique_id: entityId.replaceAll(".", "-"),
    }));
    hass.mockWS("config/entity_registry/list", () => entityRegistry);
    hass.mockWS("config/entity_registry/subscribe", (_msg, _hass, onChange) => {
      onChange?.({
        i: entityRegistry.map((entry) => ({
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
          on: null,
          op: entry.options,
          pl: entry.platform,
          ui: entry.unique_id,
        })),
      });
      return () => undefined;
    });
    mockIcons(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-area-card": DemoArea;
  }
}
