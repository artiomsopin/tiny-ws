export class FrameEncoder {
  public encode(data: string): Buffer {
    const payload = Buffer.from(data);
    this.checkPayloadLength(payload.length);
    return this.makeFrame(payload.length, payload);
  }

  private checkPayloadLength(length: number): void {
    if (length >= 126) {
      throw new Error("Message too long");
    }
  }

  private makeFrame(length: number, payload: Buffer): Buffer {
    const frame: number[] = [];
    frame.push(0x81); // FIN + text frame
    frame.push(length);
    return Buffer.concat([Buffer.from(frame), payload]);
  }
}
