import { mdiContentCopy, mdiQrcode } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { copyToClipboard } from "../../common/util/copy-clipboard";
import { withViewTransition } from "../../common/util/view-transition";
import "../../components/ha-alert";
import "../../components/ha-textfield";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-svg-icon";
import "../../components/ha-dialog";
import type { HomeAssistant } from "../../types";
import type { LongLivedAccessTokenDialogParams } from "./show-long-lived-access-token-dialog";
import { showToast } from "../../util/toast";

const QR_LOGO_URL = "/static/icons/favicon-192x192.png";
type LongLivedAccessTokenQRCodeVersion = "v2" | "token_only";

interface LongLivedAccessTokenQRCodeV2 {
  version: 2;
  type: "long_lived_access_token";
  url: string;
  token: string;
}

@customElement("ha-long-lived-access-token-dialog")
export class HaLongLivedAccessTokenDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _qrCode?: string;

  @state()
  private _qrCodeVersion: LongLivedAccessTokenQRCodeVersion = "v2";

  @state() private _open = false;

  @state() private _renderDialog = false;

  @state() private _name = "";

  @state() private _token?: string;

  private _createdCallback!: () => void;

  private _existingNames = new Set<string>();

  @state() private _loading = false;

  @state() private _errorMessage?: string;

  public showDialog(params: LongLivedAccessTokenDialogParams): void {
    this._createdCallback = params.createdCallback;
    this._existingNames = new Set(
      params.existingNames.map((name) => this._normalizeName(name))
    );
    this._renderDialog = true;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._renderDialog = false;
    this._name = "";
    this._token = undefined;
    this._existingNames = new Set();
    this._errorMessage = undefined;
    this._loading = false;
    this._qrCode = undefined;
    this._qrCodeVersion = "v2";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._renderDialog) {
      return nothing;
    }

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._token
          ? this.hass.localize(
              "ui.panel.profile.long_lived_access_tokens.created_title",
              { name: this._name }
            )
          : this.hass.localize(
              "ui.panel.profile.long_lived_access_tokens.create"
            )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <div class="content">
          ${this._errorMessage
            ? html`<ha-alert alert-type="error"
                >${this._errorMessage}</ha-alert
              >`
            : nothing}
          ${this._token
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.profile.long_lived_access_tokens.prompt_copy_token"
                  )}
                </p>
                <div class="token-row">
                  <ha-textfield
                    autofocus
                    .value=${this._token}
                    type="text"
                    readOnly
                  ></ha-textfield>
                  <ha-button appearance="plain" @click=${this._copyToken}>
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiContentCopy}
                    ></ha-svg-icon>
                    ${this.hass.localize("ui.common.copy")}
                  </ha-button>
                </div>
                <div id="qr">${this._renderQRCode()}</div>
              `
            : html`
                <ha-textfield
                  autofocus
                  .value=${this._name}
                  .label=${this.hass.localize(
                    "ui.panel.profile.long_lived_access_tokens.name"
                  )}
                  .invalid=${this._hasDuplicateName()}
                  .errorMessage=${this.hass.localize(
                    "ui.panel.profile.long_lived_access_tokens.name_exists"
                  )}
                  required
                  @input=${this._nameChanged}
                ></ha-textfield>
              `}
        </div>
        <ha-dialog-footer slot="footer">
          ${this._token
            ? nothing
            : html`<ha-button
                slot="secondaryAction"
                appearance="plain"
                @click=${this.closeDialog}
              >
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>`}
          ${!this._token
            ? html`<ha-button
                slot="primaryAction"
                .disabled=${this._isCreateDisabled()}
                @click=${this._createToken}
              >
                ${this.hass.localize(
                  "ui.panel.profile.long_lived_access_tokens.create"
                )}
              </ha-button>`
            : html`<ha-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </ha-button>`}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: Event) {
    this._name = (ev.currentTarget as HTMLInputElement).value;
    this._errorMessage = undefined;
  }

  private _isCreateDisabled() {
    return this._loading || !this._name.trim() || this._hasDuplicateName();
  }

  private async _createToken(): Promise<void> {
    if (this._isCreateDisabled()) {
      return;
    }

    const name = this._name.trim();

    this._loading = true;
    this._errorMessage = undefined;

    try {
      this._token = await this.hass.callWS<string>({
        type: "auth/long_lived_access_token",
        lifespan: 3650,
        client_name: name,
      });
      this._name = name;
      this._createdCallback();
    } catch (err: unknown) {
      this._errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  private async _copyToken(): Promise<void> {
    if (!this._token) {
      return;
    }

    await copyToClipboard(this._token);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private _hasDuplicateName(): boolean {
    return this._existingNames.has(this._normalizeName(this._name));
  }

  private _renderQRCode() {
    if (this._qrCode) {
      return html`
        <img
          alt=${this.hass.localize(
            "ui.panel.profile.long_lived_access_tokens.qr_code_image",
            { name: this._name }
          )}
          src=${this._qrCode}
        ></img>
        <button
          type="button"
          class="qr-version-link"
          @click=${this._toggleQRCodeVersion}
        >
          ${this.hass.localize(
            this._qrCodeVersion === "v2"
              ? "ui.panel.profile.long_lived_access_tokens.show_token_only_qr_code"
              : "ui.panel.profile.long_lived_access_tokens.show_v2_qr_code"
          )}
        </button>
      `;
    }

    return html`
      <ha-button appearance="plain" @click=${this._generateQR}>
        <ha-svg-icon slot="start" .path=${mdiQrcode}></ha-svg-icon>
        ${this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.generate_qr_code"
        )}
      </ha-button>
    `;
  }

  private _qrCodeData(
    version: LongLivedAccessTokenQRCodeVersion
  ): string | undefined {
    if (!this._token) {
      return undefined;
    }

    if (version === "token_only") {
      return this._token;
    }

    const payload: LongLivedAccessTokenQRCodeV2 = {
      version: 2,
      type: "long_lived_access_token",
      url: document.location.origin,
      token: this._token,
    };

    return JSON.stringify(payload);
  }

  private async _toggleQRCodeVersion() {
    await this._generateQR(this._qrCodeVersion === "v2" ? "token_only" : "v2");
  }

  private async _generateQR(version: LongLivedAccessTokenQRCodeVersion = "v2") {
    const qrCodeData = this._qrCodeData(version);

    if (!qrCodeData) {
      return;
    }

    const qrcode = await import("qrcode");
    const canvas = await qrcode.toCanvas(qrCodeData, {
      width: 512,
      errorCorrectionLevel: "Q",
    });
    const context = canvas.getContext("2d");

    const imageObj = new Image();
    imageObj.src = QR_LOGO_URL;
    await new Promise((resolve) => {
      imageObj.onload = resolve;
    });
    context?.drawImage(
      imageObj,
      canvas.width / 3,
      canvas.height / 3,
      canvas.width / 3,
      canvas.height / 3
    );

    await withViewTransition(() => {
      this._qrCodeVersion = version;
      this._qrCode = canvas.toDataURL();
    });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        #qr {
          text-align: center;
          display: grid;
          gap: var(--ha-space-2);
          justify-items: center;
        }
        #qr img {
          max-width: 90%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .qr-version-link {
          border: 0;
          background: none;
          padding: 0;
          color: var(--primary-color);
          cursor: pointer;
          font: inherit;
          text-decoration: underline;
        }
        .content {
          display: grid;
          gap: var(--ha-space-4);
        }
        .token-row {
          display: flex;
          gap: var(--ha-space-2);
          align-items: center;
        }
        .token-row ha-textfield {
          flex: 1;
        }
        p {
          margin: 0;
        }
        ha-textfield {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-long-lived-access-token-dialog": HaLongLivedAccessTokenDialog;
  }
}
