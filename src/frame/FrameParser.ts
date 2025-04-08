import { FirstByte } from "./interfaces/FirstByte";
import { ParsedFrame } from "./interfaces/ParsedFrame";
import { SecondByte } from "./interfaces/SecondByte";

export class FrameParser {
  private offset = 0;
  private buffer: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  public parse(): ParsedFrame {
    const firstByteData = this.getFirstByteData();
    const secondByteData = this.getSecondByteData();

    let payloadLength = this.adjustPayloadLength(secondByteData.payloadLength);

    let maskKey = Buffer.alloc(4);
    if (secondByteData.mask) {
      maskKey = this.buffer.slice(this.offset, this.offset + 4);
      this.offset += 4;
    }

    const payload = this.buffer.slice(this.offset, this.offset + payloadLength);

    if (secondByteData.mask) {
      this.decodePayload(payload, maskKey);
    }

    return {
      fin: firstByteData.fin,
      rsv: firstByteData.rsv,
      opCode: firstByteData.opCode,
      payload: payload.toString(),
    };
  }

  private getFirstByteData(): FirstByte {
    const firstByte = this.buffer.readUInt8(this.offset);
    this.offset++;

    const isFin = (firstByte & 0x80) === 0x80;
    const rsv = firstByte & 0x70;
    const opCode = firstByte & 0x0f;

    return { fin: isFin, rsv, opCode };
  }

  private getSecondByteData(): SecondByte {
    const secondByte = this.buffer.readUInt8(this.offset);
    this.offset++;

    const mask = (secondByte & 0x80) === 0x80;
    const payloadLength = secondByte & 0x7f;

    return { mask, payloadLength };
  }

  private adjustPayloadLength(length: number): number {
    if (length === 126) {
      const extended = this.buffer.readUInt16BE(this.offset);
      this.offset += 2;
      return extended;
    } else if (length === 127) {
      const extended = this.buffer.readUInt32BE(this.offset);
      this.offset += 4;
      return extended;
    }
    return length;
  }

  private decodePayload(payload: Buffer, maskKey: Buffer) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4];
    }
  }
}
