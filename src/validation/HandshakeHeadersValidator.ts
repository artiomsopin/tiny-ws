import { IncomingHttpHeaders } from "http";
import { HandshakeHeaders } from "../constants/HandshakeHeaders.enum";
import { HandshakeHeadersValues } from "../constants/HandshakeHeadersValue.enum";

export class HandshakeHeadersValidator {
  private wsVersion;

  constructor(private headers: IncomingHttpHeaders, wsVersion = 13) {
    this.wsVersion = wsVersion;
  }

  public validate(): boolean {
    this.validateUpgradeHeader();
    this.validateConnectionHeader();
    this.validateWebSocketVersion();
    this.validateSecWebSocketKey();
    return true;
  }

  private validateUpgradeHeader(): void {
    const upgradeHeader = this.headers[HandshakeHeaders.Upgrade]?.toLowerCase();
    if (upgradeHeader !== HandshakeHeadersValues.Upgrade) {
      throw new Error("Missing or invalid 'Upgrade' header");
    }
  }

  private validateConnectionHeader(): void {
    const connectionHeader =
      this.headers[HandshakeHeaders.Connection]?.toLowerCase();
    if (!connectionHeader?.includes(HandshakeHeadersValues.Connection)) {
      throw new Error("Missing or invalid 'Connection' header");
    }
  }

  private validateWebSocketVersion(): void {
    const version = this.headers[HandshakeHeaders.SecWebSocketVersion];
    if (version !== this.wsVersion.toString()) {
      throw new Error("Unsupported WebSocket version");
    }
  }

  private validateSecWebSocketKey(): void {
    const wsKey = this.headers[HandshakeHeaders.SecWebSocketKey];
    if (!wsKey || typeof wsKey !== "string" || wsKey.trim().length === 0) {
      throw new Error("Missing or invalid 'Sec-WebSocket-Key' header");
    }
  }
}
