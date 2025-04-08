import { createServer } from "http";
import * as crypto from "crypto";
import Stream from "stream";
import { ConnectionHeadersChecker } from "../validation/ConnectionHeadersChecker";
import { WebSocketOptions } from "./interfaces/WebSocketOptions";
import { ConnectionHeaders } from "../constants/ConnectionHeaders.enum";
import { ConnectionHeadersValues } from "../constants/ConnectionHeadersValue.enum";
import { OpCodes } from "../constants/OpCodes";
import { ParsedFrame } from "../frame/interfaces/ParsedFrame";

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
          // Парсим WebSocket фрейм
          const frame = this.parseWebSocketFrame(buffer);
          console.log("Parsed frame:", frame);

          // В зависимости от типа фрейма (например, текстовый)

          if (frame.opCode === OpCodes.TEXT) {
            // Текстовый фрейм (TEXT)
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

      socket.write(this.encodeWebSocketFrame("Hi there!"));
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

  private encodeWebSocketFrame(data: any) {
    const payload = Buffer.from(data);
    const frame: number[] = [];

    frame.push(0x81); // FIN + text frame

    if (payload.length < 126) {
      frame.push(payload.length);
    } else {
      throw new Error("Message too long");
    }

    return Buffer.concat([Buffer.from(frame), payload]);
  }

  private parseWebSocketFrame(buffer: Buffer): ParsedFrame {
    let offset = 0;

    // Первый байт: Финализатор, RSV, и OpCode
    const firstByte = buffer.readUInt8(offset);
    offset++;

    const fin = (firstByte & 0x80) === 0x80; // Проверяем бит FIN (1)
    const rsv = firstByte & 0x70; // Проверяем биты RSV1, RSV2, RSV3
    const opCode = firstByte & 0x0f; // Тип фрейма (например, текстовый, бинарный)

    // Второй байт: Маскирование и длина
    const secondByte = buffer.readUInt8(offset);
    offset++;

    const mask = (secondByte & 0x80) === 0x80; // Проверяем бит Mask (1)
    let length = secondByte & 0x7f; // Длина данных

    // Если длина больше 125, читаем дополнительные байты для длины
    if (length === 126) {
      length = buffer.readUInt16BE(offset); // Читаем 2 байта для длины
      offset += 2;
    } else if (length === 127) {
      length = buffer.readUInt32BE(offset); // Читаем 4 байта для длины
      offset += 4;
    }

    // Если используется маскирование, считываем маску
    let maskKey = Buffer.alloc(4);
    if (mask) {
      maskKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    // Считываем данные
    const payload = buffer.slice(offset, offset + length);

    // Применяем маску, если она присутствует
    if (mask) {
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
    }

    // Возвращаем разобранный фрейм
    return {
      fin,
      rsv,
      opCode,
      payload: payload.toString(), // Преобразуем данные в строку, если это текст
    };
  }
}
