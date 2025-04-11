import { createServer, IncomingHttpHeaders, IncomingMessage } from "http";
import * as crypto from "crypto";
import Stream from "stream";
import { HandshakeHeadersValidator as HandshakeHeadersValidator } from "../validation/HandshakeHeadersValidator";
import { WebSocketOptions } from "./interfaces/WebSocketOptions";
import { HandshakeHeaders } from "../constants/HandshakeHeaders.enum";
import { HandshakeHeadersValues } from "../constants/HandshakeHeadersValue.enum";
import { OpCodes } from "../constants/OpCodes";
import { FrameParser } from "../frame/FrameParser";
import { FrameEncoder } from "../frame/FrameEncoder";
import { ParsedFrame } from "../frame/interfaces/ParsedFrame";

export class WebSocketServer {
  private httpServer = createServer();
  private frameEncoder = new FrameEncoder();

  constructor(options: WebSocketOptions) {
    this.connectionHandler();
    this.httpServer.listen(options.port, () => {
      console.log(`WebSocket server is running on port ${options.port}`);
    });
  }

  public close(): void {
    this.httpServer.close((err) => {
      throw new Error(`Error closing server: ${err}`);
    });
  }

  private connectionHandler(): void {
    this.httpServer.on("upgrade", (req, socket, head) => {
      if (!this.validateClient(req, socket)) {
        return;
      }
      this.connectClient(socket, req.headers);
      this.subscribeOnEvents(socket);
      socket.write(this.frameEncoder.encode("Hi there!"));
    });
  }

  private validateClient(req: IncomingMessage, socket: Stream.Duplex): boolean {
    try {
      const headersValidator = new HandshakeHeadersValidator(req.headers);
      return headersValidator.validate();
    } catch (e) {
      socket.end("HTTP/1.1 400 Bad Request");
      console.error("Invalid headers: ", e);
      return false;
    }
  }

  private connectClient(socket: Stream.Duplex, headers: IncomingHttpHeaders) {
    const clientSecWsKey = headers[HandshakeHeaders.SecWebSocketKey];
    if (!clientSecWsKey) {
      socket.end("HTTP/1.1 400 Bad Request");
      console.error("Missing Sec-WebSocket-Key header");
      return;
    }

    const secWsAcceptHeaderValue = this.generateAcceptValue(clientSecWsKey);
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        `${HandshakeHeaders.Upgrade}: ${HandshakeHeadersValues.Upgrade}\r\n` +
        `${HandshakeHeaders.Connection}: ${HandshakeHeadersValues.Connection}\r\n` +
        `${HandshakeHeaders.SecWebSocketAccept}: ${secWsAcceptHeaderValue}\r\n\r\n`
    );
  }

  private generateAcceptValue(secKey: string) {
    const rfcAcceptKey = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    return crypto
      .createHash("sha1")
      .update(secKey + rfcAcceptKey)
      .digest("base64");
  }

  private subscribeOnEvents(socket: Stream.Duplex) {
    this.onData(socket);
    this.onError(socket);
  }

  private onData(socket: Stream.Duplex): void {
    socket.on("data", (buffer) => {
      console.log("Raw data: ", buffer);
      this.parseFrame(buffer);
    });
  }

  private onError(socket: Stream.Duplex): void {
    socket.on("error", (err) => {
      console.error("Socket error: ", err);
    });
  }

  private parseFrame(buffer: Buffer): void {
    try {
      const parser = new FrameParser(buffer);
      const frame = parser.parse();
      this.HandleOpCodeAndLog(frame);
    } catch (err) {
      console.error("Error parsing frame:", err);
    }
  }

  private HandleOpCodeAndLog(frame: ParsedFrame): void {
    if (frame.opCode === OpCodes.TEXT) {
      console.log("Received message: ", frame.payload);
    } else if (frame.opCode === OpCodes.BINARY) {
      console.log("Received binary data");
    } else {
      console.log("Other frame type:", frame.opCode);
    }
  }
}
