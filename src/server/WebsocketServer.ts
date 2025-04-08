import { createServer } from "http";
import * as crypto from "crypto";
import Stream from "stream";
import { ConnectionHeadersChecker } from "../validation/ConnectionHeadersChecker";
import { WebSocketOptions } from "./interfaces/WebSocketOptions";
import { ConnectionHeaders } from "../constants/ConnectionHeaders.enum";
import { ConnectionHeadersValues } from "../constants/ConnectionHeadersValue.enum";
import { OpCodes } from "../constants/OpCodes";
import { FrameParser } from "../frame/FrameParser";
import { FrameEncoder } from "../frame/FrameEncoder";

export class WebSocketServer {
  private httpServer = createServer();

  constructor(options: WebSocketOptions) {
    this.connectionHandler();

    this.httpServer.listen(options.port, () => {
      console.log(`WebSocket server is running on port ${options.port}`);
    });
  }

  public close() {
    this.httpServer.close((err) => {
      throw new Error(`Error closing server: ${err}`);
    });
  }

  private connectionHandler() {
    this.httpServer.on("upgrade", (req, socket, head) => {
      let userSecWsKey: string;

      try {
        const headersChecker = new ConnectionHeadersChecker(req.headers);
        userSecWsKey = headersChecker.validate();
      } catch (e) {
        socket.end("HTTP/1.1 400 Bad Request");
        return;
      }

      const secWsAcceptHeader = this.generateAcceptValue(userSecWsKey);
      this.connectClient(socket, secWsAcceptHeader);

      socket.on("data", (buffer) => {
        console.log("Raw data: ", buffer);
        try {
          const parser = new FrameParser(buffer);
          const frame = parser.parse();
          console.log("Parsed frame:", frame);

          if (frame.opCode === OpCodes.TEXT) {
            console.log("Received message: ", frame.payload);
          } else if (frame.opCode === OpCodes.BINARY) {
            console.log("Received binary data");
          } else {
            console.log("Other frame type:", frame.opCode);
          }
        } catch (err) {
          console.error("Error parsing frame:", err);
        }
      });
      socket.on("error", (err) => {
        console.error("Socket error: ", err);
      });

      const encoder = new FrameEncoder();
      socket.write(encoder.encode("Hi there!"));
    });
  }

  private connectClient(socket: Stream.Duplex, secWebSocketAccept: string) {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        `${ConnectionHeaders.Upgrade}: ${ConnectionHeadersValues.Upgrade}\r\n` +
        `${ConnectionHeaders.Connection}: ${ConnectionHeadersValues.Connection}\r\n` +
        `${ConnectionHeaders.SecWebSocketAccept}: ${secWebSocketAccept}\r\n\r\n`
    );
  }

  private generateAcceptValue(secKey: string) {
    const rfcAcceptKey = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    return crypto
      .createHash("sha1")
      .update(secKey + rfcAcceptKey)
      .digest("base64");
  }
}
