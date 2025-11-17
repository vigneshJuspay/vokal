declare module 'node-record-lpcm16' {
  export interface RecordingOptions {
    sampleRateHertz?: number;
    threshold?: number;
    verbose?: boolean;
    recordProgram?: string;
    silence?: string;
  }

  export interface Recording {
    stream(): NodeJS.ReadableStream;
    stop(): void;
  }

  export function record(options?: RecordingOptions): Recording;
}
