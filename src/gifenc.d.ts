declare module 'gifenc' {
  interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: { palette?: number[][]; delay?: number }): void
    finish(): void
    bytes(): Uint8Array
  }
  export function GIFEncoder(): Encoder
  export function quantize(data: Uint8Array | Uint8ClampedArray, maxColors: number): number[][]
  export function applyPalette(data: Uint8Array | Uint8ClampedArray, palette: number[][]): Uint8Array
}
