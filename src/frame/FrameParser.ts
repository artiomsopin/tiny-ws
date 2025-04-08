import { FirsByteData } from "./interfaces/FirstByteData";
import { ParsedFrame } from "./interfaces/ParsedFrame";
import { SecondByteData } from "./interfaces/SecondByteData";

export class FrameParser {
  private offset = 0;
  private buffer: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  private parseWebSocketFrame(): ParsedFrame {
    const firstByteData = this.getFirstByteData();
    const secondByteData = this.getSecondByteData();

    let payloadLength = secondByteData.payloadLength;

    this.moveOffsetIfPayloadTooLong(payloadLength);

    // Если используется маскирование, считываем маску
    let maskKey = Buffer.alloc(4);
    if (secondByteData.mask) {
      maskKey = this.buffer.slice(this.offset, this.offset + 4);
      this.offset += 4;
    }

    // Считываем данные
    const payload = this.buffer.slice(this.offset, this.offset + payloadLength);

    // Применяем маску, если она присутствует
    if (secondByteData.mask) {
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
    }

    // Возвращаем разобранный фрейм
    return {
      fin: firstByteData.fin,
      rsv: firstByteData.rsv,
      opCode: firstByteData.opCode,
      payload: payload.toString(), // Преобразуем данные в строку, если это текст
    };
  }

  private getFirstByteData(): FirsByteData {
    const firstByte = this.buffer.readUInt8(this.offset);
    this.offset++;

    const isFin = (firstByte & 0x80) === 0x80;
    const rsv = firstByte & 0x70;
    const opCode = firstByte & 0x0f;

    return { fin: isFin, rsv, opCode };
  }

  private getSecondByteData(): SecondByteData {
    const secondByte = this.buffer.readUInt8();
    this.offset++;

    const mask = (secondByte & 0x80) === 0x80;
    const payloadLength = secondByte & 0x7f;

    return { mask, payloadLength };
  }

  private moveOffsetIfPayloadTooLong(payloadLength: number) {
    if (payloadLength === 126) {
      payloadLength = this.buffer.readUInt16BE(this.offset); // read 2 bytes
      this.offset += 2;
    } else if (payloadLength === 127) {
      payloadLength = this.buffer.readUInt32BE(this.offset); // read 4 bytes
      this.offset += 4;
    }
  }
}
