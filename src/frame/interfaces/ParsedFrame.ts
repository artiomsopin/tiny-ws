export interface ParsedFrame {
  fin: boolean;
  rsv: number;
  opCode: number;
  payload: string;
}
