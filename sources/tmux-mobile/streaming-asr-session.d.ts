export function dictationText(base: string, text: string): string;
export function createPcmResampler(
  sampleRate: number,
  channels?: number,
): (samples: Float32Array) => ArrayBuffer;
export interface StreamingAsrSession {
  start(): Promise<void>;
  audio(bytes: ArrayBuffer): void;
  finish(): void;
  cancel(error?: string): void;
}
export function createStreamingAsrSession(options: {
  url: string;
  format?: "pcm16" | "wav" | "aac";
  createSocket?: (url: string) => WebSocket;
  onTranscript?: (text: string, final: boolean) => void;
  onEnd?: (error?: string) => void;
}): StreamingAsrSession;
