import { customElement, property, state } from "lit/decorators";

import { mdiAccount, mdiBell, mdiLock } from "@mdi/js";
import type { PropertyValues } from "lit";
import memoizeOne from "memoize-one";
import type { RouterOptions } from "../../layouts/hass-router-page";
import { HassRouterPage } from "../../layouts/hass-router-page";
import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { subscribeNotifications } from "../../data/persistent_notification";
import type { HomeAssistant } from "../../types";

export const profileSections: PageNavigation[] = [
  {
    path: "/profile/general",
    translationKey: "ui.panel.profile.tabs.general",
    iconPath: mdiAccount,
  },
  {
    path: "/profile/security",
    translationKey: "ui.panel.profile.tabs.security",
    iconPath: mdiLock,
  },
  {
    path: "/profile/notifications",
    translationKey: "ui.panel.profile.tabs.notifications",
    iconPath: mdiBell,
  },
];

@customElement("ha-panel-profile")
class HaPanelProfile extends SubscribeMixin(HassRouterPage) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _notificationCount = 0;

  private _computeProfileSections = memoizeOne(
    (notificationCount: number): PageNavigation[] =>
      profileSections.map((section) =>
        section.path === "/profile/notifications"
          ? {
              ...section,
              badgeCount: notificationCount || undefined,
            }
          : section
      )
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "general",
    routes: {
      general: {
        tag: "ha-profile-section-general",
        load: () => import("./ha-profile-section-general"),
      },
      security: {
        tag: "ha-profile-section-security",
        load: () => import("./ha-profile-section-security"),
      },
      notifications: {
        tag: "ha-profile-section-notifications",
        load: () => import("./ha-profile-section-notifications"),
      },
    },
  };

  public hassSubscribe() {
    return [
      subscribeNotifications(this.hass.connection, (notifications) => {
        this._notificationCount = notifications.length;
      }),
    ];
  }

  protected updatePageEl(el) {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.narrow = this.narrow;
    el.tabs = this._computeProfileSections(this._notificationCount);
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.style.setProperty(
      "--app-header-background-color",
      "var(--sidebar-background-color)"
    );
    this.style.setProperty(
      "--app-header-text-color",
      "var(--sidebar-text-color)"
    );
    this.style.setProperty(
      "--app-header-border-bottom",
      "1px solid var(--divider-color)"
    );
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-profile": HaPanelProfile;
  }
}
