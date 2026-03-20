import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "./ha-ripple";

@customElement("ha-tab")
export class HaTab extends LitElement {
  @property({ type: Boolean, reflect: true }) public active = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Number, attribute: "badge-count" })
  public badgeCount?: number;

  @property() public name?: string;

  protected render(): TemplateResult {
    const hasBadge = !!this.badgeCount;

    return html`
      <div
        tabindex="0"
        role="tab"
        aria-selected=${this.active}
        aria-label=${ifDefined(this.name)}
        @keydown=${this._handleKeyDown}
      >
        <slot name="icon"></slot>
        <span class="label">
          <span class="name">${this.name}</span>
          ${hasBadge
            ? html`<span class="badge" aria-hidden="true">
                ${this.badgeCount}
              </span>`
            : ""}
        </span>
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      (ev.target as HTMLElement).click();
    }
  }

  static styles = css`
    div {
      padding: 0 32px;
      display: flex;
      flex-direction: column;
      text-align: center;
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--header-height);
      cursor: pointer;
      position: relative;
      outline: none;
    }

    :host(:not([narrow])) div {
      flex-direction: row;
      gap: var(--ha-space-2);
    }

    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .label {
      display: flex;
      align-items: center;
      gap: var(--ha-space-1);
      min-width: 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--ha-space-5);
      height: var(--ha-space-5);
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--accent-color);
      color: var(--text-accent-color, var(--text-primary-color));
      font-size: var(--ha-font-size-s);
      line-height: 1;
      padding: 0 var(--ha-space-1);
      box-sizing: border-box;
      flex-shrink: 0;
    }

    :host([active]) {
      color: var(--primary-color);
    }

    :host(:not([narrow])[active]) div {
      border-bottom: 2px solid var(--primary-color);
    }

    :host([narrow]) {
      min-width: 0;
      display: flex;
      justify-content: center;
      overflow: hidden;
    }

    :host([narrow]) div {
      padding: 0 4px;
    }

    ::slotted([slot="icon"]) {
      margin-bottom: var(--ha-space-1);
    }

    :host(:not([narrow])) ::slotted([slot="icon"]) {
      margin-bottom: 0;
    }

    div:focus-visible:before {
      position: absolute;
      display: block;
      content: "";
      inset: 0;
      background-color: var(--secondary-text-color);
      opacity: 0.08;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-tab": HaTab;
  }
}
