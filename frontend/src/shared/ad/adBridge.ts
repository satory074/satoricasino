export interface AdResult {
  watched: boolean;
  durationMs: number;
}

export interface AdBridge {
  init(): Promise<void>;
  show(container: HTMLElement): Promise<AdResult>;
  isAvailable(): boolean;
}
