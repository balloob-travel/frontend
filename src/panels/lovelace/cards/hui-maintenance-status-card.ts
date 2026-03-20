import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { STRINGS_SEPARATOR_DOT } from "../../../common/const";
import { relativeTime } from "../../../common/datetime/relative_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { getDeviceContext } from "../../../common/entity/context/get_device_context";
import { capitalizeFirstLetter } from "../../../common/string/capitalize-first-letter";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-progress-ring";
import "../../../components/ha-spinner";
import type { ConfigEntry } from "../../../data/config_entries";
import { subscribeAndProcessConfigEntries } from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import { subscribeDeviceRegistry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity/entity_registry";
import { domainToName } from "../../../data/integration";
import type { StatisticsValidationResult } from "../../../data/recorder";
import {
  STATISTIC_TYPES,
  updateStatisticsIssues,
} from "../../../data/recorder";
import type { RepairsIssue } from "../../../data/repairs";
import {
  fetchRepairsIssueData,
  severitySort,
  subscribeRepairsIssueRegistry,
} from "../../../data/repairs";
import {
  computeUpdateStateDisplay,
  filterUpdateEntitiesParameterized,
  type UpdateEntity,
} from "../../../data/update";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { fixStatisticsIssue } from "../../config/developer-tools/statistics/fix-statistics";
import { showVacuumSegmentMappingDialog } from "../../config/entities/dialogs/show-dialog-vacuum-segment-mapping";
import { showRepairsFlowDialog } from "../../config/repairs/show-dialog-repair-flow";
import { showRepairsIssueDialog } from "../../config/repairs/show-repair-issue-dialog";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { MaintenanceStatusCardConfig } from "./types";

const MAX_STATUS_ITEMS = 2;

interface IntegrationInfo {
  domain: string;
  name: string;
}

@customElement("hui-maintenance-status-card")
export class HuiMaintenanceStatusCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public connectedWhileHidden = true;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MaintenanceStatusCardConfig;

  @state() private _configEntries: ConfigEntry[] = [];

  @state() private _devices: DeviceRegistryEntry[] = [];

  @state() private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @state() private _repairsIssues: { issues: RepairsIssue[]; total: number } = {
    issues: [],
    total: 0,
  };

  public setConfig(config: MaintenanceStatusCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    const updates = this._getUpdates(this.hass?.states, this.hass?.entities);
    const itemCount =
      this._repairsIssues.issues.length + updates.updates.length;
    return Math.max(3, Math.min(8, itemCount * 2 + 1));
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      min_columns: 12,
      rows: 6,
      min_rows: 3,
    };
  }

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeRepairsIssueRegistry(this.hass!.connection!, (repairs) => {
        const issues = repairs.issues
          .filter((issue) => !issue.ignored)
          .sort((a, b) => severitySort[a.severity] - severitySort[b.severity]);

        this._repairsIssues = {
          issues: issues.slice(
            0,
            issues.length === MAX_STATUS_ITEMS + 1
              ? issues.length
              : MAX_STATUS_ITEMS
          ),
          total: issues.length,
        };

        const domains = new Set<string>();

        for (const issue of issues) {
          domains.add(issue.domain);
          if (issue.issue_domain) {
            domains.add(issue.issue_domain);
          }
        }

        this.hass!.loadBackendTranslation("issues", [...domains]);
        this.hass!.loadBackendTranslation("title", [...domains]);
      }),
      subscribeDeviceRegistry(this.hass!.connection, (devices) => {
        this._devices = devices;
      }),
      subscribeEntityRegistry(this.hass!.connection, (entities) => {
        this._entityRegistryEntries = entities.filter(
          (entity) =>
            entity.device_id !== null || entity.config_entry_id !== null
        );
      }),
      subscribeAndProcessConfigEntries(this.hass!, (entries) => {
        this._configEntries = entries;
        this.hass!.loadBackendTranslation(
          "title",
          entries.map((entry) => entry.domain)
        );
      }),
    ];
  }

  private _getUpdates = memoizeOne(
    (
      entities: HomeAssistant["states"] | undefined,
      entityRegistry: HomeAssistant["entities"] | undefined
    ): { updates: UpdateEntity[]; total: number } => {
      if (!entities || !entityRegistry) {
        return { updates: [], total: 0 };
      }

      const updates = filterUpdateEntitiesParameterized(
        entities,
        false,
        false
      ).filter((entity) => !entityRegistry[entity.entity_id]?.hidden);

      return {
        updates: updates.slice(
          0,
          updates.length === MAX_STATUS_ITEMS + 1
            ? updates.length
            : MAX_STATUS_ITEMS
        ),
        total: updates.length,
      };
    }
  );

  private _configEntriesLookup = memoizeOne((configEntries: ConfigEntry[]) =>
    Object.fromEntries(configEntries.map((entry) => [entry.entry_id, entry]))
  );

  private _deviceLookup = memoizeOne((devices: DeviceRegistryEntry[]) =>
    Object.fromEntries(devices.map((device) => [device.id, device]))
  );

  private _entityRegistryLookup = memoizeOne((entries: EntityRegistryEntry[]) =>
    Object.fromEntries(entries.map((entry) => [entry.entity_id, entry]))
  );

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this._config || !this.hass) {
      return;
    }

    if (changedProps.has("hass")) {
      this.hass.loadFragmentTranslation("config");
    }

    const updates = this._getUpdates(this.hass.states, this.hass.entities);
    const shouldBeHidden = Boolean(
      !this.hass.user?.is_admin ||
      (this._config.hide_empty &&
        this._repairsIssues.issues.length === 0 &&
        updates.updates.length === 0)
    );

    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass || this.hidden) {
      return nothing;
    }

    const { issues: repairsIssues, total: totalRepairIssues } =
      this._repairsIssues;
    const { updates: installableUpdates, total: totalUpdates } =
      this._getUpdates(this.hass.states, this.hass.entities);

    if (!repairsIssues.length && !installableUpdates.length) {
      return nothing;
    }

    return html`
      <ha-card outlined>
        ${repairsIssues.length
          ? this._renderRepairsSection(repairsIssues, totalRepairIssues)
          : nothing}
        ${repairsIssues.length && installableUpdates.length
          ? html`<hr />`
          : nothing}
        ${installableUpdates.length
          ? this._renderUpdatesSection(installableUpdates, totalUpdates)
          : nothing}
      </ha-card>
    `;
  }

  private _renderRepairsSection(
    repairsIssues: RepairsIssue[],
    totalRepairIssues: number
  ) {
    return html`
      <div class="section">
        <div class="title" role="heading" aria-level="2">
          ${this.hass!.localize("ui.panel.config.repairs.title", {
            count: totalRepairIssues,
          })}
        </div>
        <ha-md-list>
          ${repairsIssues.map(
            (issue) => html`
              <ha-md-list-item
                .hasMeta=${true}
                .issue=${issue}
                class=${issue.ignored ? "ignored" : ""}
                @click=${this._openRepairIssue}
                type="button"
              >
                <span slot="headline">${this._computeIssueTitle(issue)}</span>
                <div slot="supporting-text" class="supporting-text">
                  ${this._renderIssueSupportingText(
                    issue,
                    this._getRepairIntegrationInfo(issue)
                  )}
                </div>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-list-item>
            `
          )}
        </ha-md-list>
        ${totalRepairIssues > repairsIssues.length
          ? html`
              <ha-assist-chip
                href="/config/repairs"
                .label=${this.hass!.localize(
                  "ui.panel.config.repairs.more_repairs",
                  {
                    count: totalRepairIssues - repairsIssues.length,
                  }
                )}
              ></ha-assist-chip>
            `
          : nothing}
      </div>
    `;
  }

  private _renderUpdatesSection(updates: UpdateEntity[], totalUpdates: number) {
    return html`
      <div class="section">
        <div class="title" role="heading" aria-level="2">
          ${this.hass!.localize("ui.panel.config.updates.title", {
            count: totalUpdates,
          })}
        </div>
        <ha-md-list>
          ${updates.map((entity) => {
            const entityEntry = this._entityRegistryLookup(
              this._entityRegistryEntries
            )[entity.entity_id];
            const deviceEntry =
              entityEntry?.device_id !== null &&
              entityEntry?.device_id !== undefined
                ? this._deviceLookup(this._devices)[entityEntry.device_id]
                : undefined;
            const areaName =
              deviceEntry && deviceEntry.entry_type !== "service"
                ? getDeviceContext(deviceEntry, this.hass!).area?.name ||
                  this.hass!.localize("ui.panel.config.updates.no_area")
                : undefined;
            const integration = this._getUpdateIntegrationInfo(
              entityEntry,
              deviceEntry
            );

            return html`
              <ha-md-list-item
                class=${entity.attributes.skipped_version ? "skipped" : ""}
                .entity_id=${entity.entity_id}
                .hasMeta=${true}
                type="button"
                @click=${this._openUpdateMoreInfo}
              >
                <span slot="headline"
                  >${deviceEntry
                    ? computeDeviceNameDisplay(deviceEntry, this.hass!)
                    : entity.attributes.friendly_name}</span
                >
                <div slot="supporting-text" class="supporting-text">
                  ${this._renderUpdateSupportingText(
                    entity,
                    areaName,
                    integration
                  )}
                </div>
                <div slot="end">${this._renderUpdateProgress(entity)}</div>
              </ha-md-list-item>
            `;
          })}
        </ha-md-list>
        ${totalUpdates > updates.length
          ? html`
              <ha-assist-chip
                href="/config/updates"
                .label=${this.hass!.localize(
                  "ui.panel.config.updates.more_updates",
                  {
                    count: totalUpdates - updates.length,
                  }
                )}
              ></ha-assist-chip>
            `
          : nothing}
      </div>
    `;
  }

  private _renderIssueSupportingText(
    issue: RepairsIssue,
    integration: IntegrationInfo
  ) {
    const domainName = domainToName(this.hass!.localize, issue.domain);
    const createdBy =
      issue.created && domainName
        ? this.hass!.localize("ui.panel.config.repairs.created_at_by", {
            date: capitalizeFirstLetter(
              relativeTime(new Date(issue.created), this.hass!.locale)
            ),
            integration: domainName,
          })
        : "";

    return html`
      ${this._renderIntegrationIcon(integration)}
      ${createdBy
        ? html`<span .title=${createdBy}>${createdBy}</span>`
        : nothing}
      ${issue.ignored
        ? html`${createdBy ? " · " : nothing}${this.hass!.localize(
            "ui.panel.config.repairs.dialog.ignored_in_version_short",
            { version: issue.dismissed_version }
          )}`
        : nothing}
    `;
  }

  private _renderUpdateSupportingText(
    entity: UpdateEntity,
    areaName?: string,
    integration?: IntegrationInfo
  ) {
    const versionLabel = [
      entity.attributes.title,
      entity.attributes.latest_version,
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      ${integration ? this._renderIntegrationIcon(integration) : nothing}
      ${areaName ? html`${areaName}${STRINGS_SEPARATOR_DOT}` : nothing}
      ${versionLabel || computeUpdateStateDisplay(entity, this.hass!)}
      ${entity.attributes.skipped_version
        ? ` (${this.hass!.localize("ui.panel.config.updates.skipped")})`
        : nothing}
    `;
  }

  private _renderIntegrationIcon(integration: IntegrationInfo) {
    return html`
      <img
        class="inline-icon"
        alt=""
        loading="lazy"
        src=${brandsUrl(
          {
            domain: integration.domain,
            type: "icon",
            darkOptimized: this.hass!.themes?.darkMode,
          },
          this.hass!.auth.data.hassUrl
        )}
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
      />
    `;
  }

  private _getRepairIntegrationInfo(issue: RepairsIssue): IntegrationInfo {
    const domain = issue.issue_domain || issue.domain;

    return {
      domain,
      name: domainToName(this.hass!.localize, domain),
    };
  }

  private _getUpdateIntegrationInfo(
    entityEntry?: EntityRegistryEntry,
    deviceEntry?: DeviceRegistryEntry
  ): IntegrationInfo | undefined {
    const configEntries = this._configEntriesLookup(this._configEntries);
    const configEntryId =
      entityEntry?.config_entry_id ||
      deviceEntry?.primary_config_entry ||
      deviceEntry?.config_entries[0];

    const configEntry = configEntryId
      ? configEntries[configEntryId]
      : undefined;

    if (!configEntry) {
      return undefined;
    }

    return {
      domain: configEntry.domain,
      name: domainToName(this.hass!.localize, configEntry.domain),
    };
  }

  private _computeIssueTitle(issue: RepairsIssue) {
    return (
      this.hass!.localize(
        `component.${issue.domain}.issues.${
          issue.translation_key || issue.issue_id
        }.title`,
        issue.translation_placeholders || {}
      ) || `${issue.domain}: ${issue.translation_key || issue.issue_id}`
    );
  }

  private _renderUpdateProgress(entity: UpdateEntity) {
    if (entity.attributes.update_percentage != null) {
      return html`<ha-progress-ring
        size="small"
        .value=${entity.attributes.update_percentage}
        .label=${this.hass!.localize(
          "ui.panel.config.updates.update_in_progress"
        )}
      ></ha-progress-ring>`;
    }

    if (entity.attributes.in_progress) {
      return html`<ha-spinner
        size="small"
        .ariaLabel=${this.hass!.localize(
          "ui.panel.config.updates.update_in_progress"
        )}
      ></ha-spinner>`;
    }

    return html`<ha-icon-next></ha-icon-next>`;
  }

  private async _openRepairIssue(ev: Event): Promise<void> {
    const issue = (ev.currentTarget as any).issue as RepairsIssue;

    if (issue.is_fixable) {
      showRepairsFlowDialog(this, issue);
      return;
    }

    if (
      issue.domain === "homeassistant" &&
      issue.translation_key === "config_entry_reauth"
    ) {
      const data = await fetchRepairsIssueData(
        this.hass!.connection,
        issue.domain,
        issue.issue_id
      );
      if ("flow_id" in data.issue_data) {
        showConfigFlowDialog(this, {
          continueFlowId: data.issue_data.flow_id as string,
        });
      }
      return;
    }

    if (
      issue.domain === "vacuum" &&
      issue.translation_key === "segments_changed"
    ) {
      const data = await fetchRepairsIssueData(
        this.hass!.connection,
        issue.domain,
        issue.issue_id
      );
      if (
        "entity_id" in data.issue_data &&
        typeof data.issue_data.entity_id === "string"
      ) {
        showVacuumSegmentMappingDialog(this, {
          entityId: data.issue_data.entity_id,
        });
      }
      return;
    }

    if (
      issue.domain === "sensor" &&
      issue.translation_key &&
      STATISTIC_TYPES.includes(
        issue.translation_key as (typeof STATISTIC_TYPES)[number]
      )
    ) {
      this.hass!.loadFragmentTranslation("developer-tools");
      const data = await fetchRepairsIssueData(
        this.hass!.connection,
        issue.domain,
        issue.issue_id
      );
      if ("issue_type" in data.issue_data) {
        await fixStatisticsIssue(this, {
          type: data.issue_data
            .issue_type as StatisticsValidationResult["type"],
          data: data.issue_data as any,
        });
        updateStatisticsIssues(this.hass!);
      }
      return;
    }

    showRepairsIssueDialog(this, { issue });
  }

  private _openUpdateMoreInfo(ev: Event): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).entity_id,
    });
  }

  static styles: CSSResultGroup = css`
    ha-card {
      overflow: hidden;
    }

    .section {
      padding-bottom: var(--ha-space-4);
    }

    .title {
      font-size: var(--ha-font-size-l);
      padding: var(--ha-space-4);
      padding-bottom: 0;
    }

    hr {
      border: 0;
      border-top: 1px solid var(--divider-color);
      margin: 0;
    }

    ha-md-list-item {
      --ha-md-list-item-gap: 12px;
      font-size: var(--ha-font-size-m);
    }

    ha-icon-next {
      color: var(--secondary-text-color);
      height: 24px;
      width: 24px;
    }

    .supporting-text {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .inline-icon {
      width: 14px;
      height: 14px;
      flex: none;
    }

    .skipped {
      background: var(--secondary-background-color);
    }

    .ignored {
      opacity: var(--light-secondary-opacity);
    }

    ha-assist-chip {
      margin-inline: var(--ha-space-4);
      margin-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-maintenance-status-card": HuiMaintenanceStatusCard;
  }
}
