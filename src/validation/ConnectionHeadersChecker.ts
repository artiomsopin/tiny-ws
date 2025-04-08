import { IncomingHttpHeaders } from "http";
import { ConnectionHeaders } from "../constants/ConnectionHeaders.enum";
import { ConnectionHeadersValues } from "../constants/ConnectionHeadersValue.enum";

export class ConnectionHeadersChecker {
  private readonly wsVersion = 13;

  constructor(private headers: IncomingHttpHeaders) {}

  public validate(): string {
    this.validateUpgradeHeader();
    this.validateConnectionHeader();
    this.validateWebSocketVersion();
    const wsKey = this.validateSecWebSocketKey();
    return wsKey;
  }

  private validateUpgradeHeader(): void {
    const upgradeHeader =
      this.headers[ConnectionHeaders.Upgrade]?.toLowerCase();
    if (upgradeHeader !== ConnectionHeadersValues.Upgrade) {
      throw new Error("Missing or invalid 'Upgrade' header");
    }
  }

  private validateConnectionHeader(): void {
    const connectionHeader =
      this.headers[ConnectionHeaders.Connection]?.toLowerCase();
    if (!connectionHeader?.includes(ConnectionHeadersValues.Connection)) {
      throw new Error("Missing or invalid 'Connection' header");
    }
  }

  private validateWebSocketVersion(): void {
    const version = this.headers[ConnectionHeaders.SecWebSocketVersion];
    if (version !== this.wsVersion.toString()) {
      throw new Error("Unsupported WebSocket version");
    }
  }

  private validateSecWebSocketKey(): string {
    const wsKey = this.headers[ConnectionHeaders.SecWebSocketKey];
    if (!wsKey || typeof wsKey !== "string" || wsKey.trim().length === 0) {
      throw new Error("Missing or invalid 'Sec-WebSocket-Key' header");
    }
    return wsKey;
  }
}
