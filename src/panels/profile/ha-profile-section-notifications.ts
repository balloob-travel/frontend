import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-button";
import type {
  PersistentNotification,
  PersitentNotificationEntity,
} from "../../data/persistent_notification";
import { subscribeNotifications } from "../../data/persistent_notification";
import "../../dialogs/notifications/notification-item";
import "../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import { profileSections } from "./ha-panel-profile";

type NotificationItem = PersitentNotificationEntity | PersistentNotification;

@customElement("ha-profile-section-notifications")
class HaProfileSectionNotifications extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public tabs: PageNavigation[] =
    profileSections;

  @property({ attribute: false }) public route!: Route;

  @state() private _notifications: PersistentNotification[] = [];

  private _unsubNotifications?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    if (this.hass) {
      this._subscribeNotifications();
    }
  }

  public firstUpdated() {
    if (!this._unsubNotifications && this.hass) {
      this._subscribeNotifications();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubNotifications?.();
    this._unsubNotifications = undefined;
  }

  protected render(): TemplateResult {
    const notifications = this._getNotifications();

    return html`
      <hass-tabs-subpage
        main-page
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${this.tabs}
        .route=${this.route}
      >
        <div slot="title">${this.hass.localize("panel.profile")}</div>
        <div class="content">
          ${notifications.length
            ? html`
                <div class="notifications">
                  ${notifications.map(
                    (notification) => html`
                      <div class="notification">
                        <notification-item
                          .hass=${this.hass}
                          .notification=${notification}
                        ></notification-item>
                      </div>
                    `
                  )}
                </div>
                ${this._notifications.length > 1
                  ? html`
                      <div class="actions">
                        <ha-button
                          appearance="filled"
                          @click=${this._dismissAll}
                        >
                          ${this.hass.localize(
                            "ui.notification_drawer.dismiss_all"
                          )}
                        </ha-button>
                      </div>
                    `
                  : ""}
              `
            : html`
                <div class="empty">
                  ${this.hass.localize("ui.notification_drawer.empty")}
                </div>
              `}
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _subscribeNotifications() {
    this._unsubNotifications?.();
    this._unsubNotifications = subscribeNotifications(
      this.hass.connection,
      (notifications) => {
        this._notifications = notifications;
      }
    );
  }

  private _getNotifications(): NotificationItem[] {
    const configuratorEntities = Object.keys(this.hass.states)
      .filter((entityId) => computeDomain(entityId) === "configurator")
      .map(
        (entityId) => this.hass.states[entityId] as PersitentNotificationEntity
      );

    const notifications: NotificationItem[] = [
      ...this._notifications,
      ...configuratorEntities,
    ];

    notifications.sort((notification1, notification2) => {
      const createdAt1 = new Date(notification1.created_at || 0);
      const createdAt2 = new Date(notification2.created_at || 0);

      if (createdAt1 < createdAt2) {
        return 1;
      }
      if (createdAt1 > createdAt2) {
        return -1;
      }
      return 0;
    });

    return notifications;
  }

  private _dismissAll() {
    this.hass.callService("persistent_notification", "dismiss_all");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          display: block;
          max-width: 720px;
          margin: 0 auto;
          padding-bottom: var(--safe-area-inset-bottom);
        }

        .notifications {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          margin: 24px 0;
        }

        .actions {
          display: flex;
          justify-content: center;
          margin: 24px 0;
        }

        .empty {
          margin: 24px 0;
          text-align: center;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-profile-section-notifications": HaProfileSectionNotifications;
  }
}
