export interface Cleanable {
  cleanup?(): void;
  destroy(): void;
}
