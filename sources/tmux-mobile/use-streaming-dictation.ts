import * as React from "react";
import { AppState, Platform } from "react-native";
import {
  AudioModule,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
  type RecordingOptions,
} from "expo-audio";
import {
  getInfoAsync,
  readAsStringAsync,
  deleteAsync,
  EncodingType,
} from "expo-file-system/legacy";
import { toByteArray } from "base64-js";
import type { TmuxMobileApi } from "./api";
import {
  createPcmResampler,
  createStreamingAsrSession,
  dictationText,
  type StreamingAsrSession,
} from "./streaming-asr-session";

const NativeWebSocket = WebSocket as unknown as {
  new (
    url: string,
    protocols: undefined,
    options: { headers: Record<string, string> },
  ): WebSocket;
};

type NativeStream = {
  start(): Promise<void>;
  stop(): void;
  release(): void;
  addListener(
    name: string,
    callback: (buffer: {
      data: ArrayBuffer;
      sampleRate: number;
      channels: number;
    }) => void,
  ): { remove(): void };
};
type Capture = {
  session?: StreamingAsrSession;
  stream?: NativeStream;
  recorder?: AudioRecorder;
  uri?: string;
  offset: number;
  cancelled: boolean;
  stopping?: boolean;
  timer?: ReturnType<typeof setInterval>;
  reading?: Promise<void>;
  cleanup?: Promise<void>;
  setup?: Promise<void>;
  format: "pcm16" | "wav" | "aac";
  pump?: () => Promise<void>;
};
export const STREAM_RECORDING_OPTIONS: RecordingOptions = {
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  ios: {
    extension: ".wav",
    outputFormat: "lpcm",
    audioQuality: 96,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    extension: ".aac",
    outputFormat: "aac_adts",
    audioEncoder: "aac",
    sampleRate: 16000,
  },
  web: {},
};

export function useStreamingDictation({
  api,
  scopeKey,
  value,
  onChangeText,
  onStatus,
}: {
  api: TmuxMobileApi | null;
  scopeKey: string;
  value: string;
  onChangeText: (text: string) => void;
  onStatus: (status: string) => void;
}) {
  const [mode, setMode] = React.useState<
    "idle" | "connecting" | "recording" | "finishing"
  >("idle");
  const current = React.useRef<Capture | null>(null),
    pendingCleanup = React.useRef<Promise<void>>(Promise.resolve());
  const latest = React.useRef({ api, scopeKey, value, onChangeText, onStatus });
  latest.current = { api, scopeKey, value, onChangeText, onStatus };
  const cleanup = React.useCallback((state: Capture, drain = false) => {
    if (state.cleanup) return state.cleanup;
    clearInterval(state.timer);
    state.cleanup = (async () => {
      // A cancelled permission/start request may still be completing.
      await state.setup;
      clearInterval(state.timer);
      try {
        state.stream?.stop();
      } catch {}
      try {
        state.stream?.release();
      } catch {}
      if (state.recorder) {
        try {
          await state.recorder.stop();
        } catch {}
        try {
          await state.reading;
          if (drain && !state.cancelled) await state.pump?.();
        } catch {
          state.session?.cancel(
            "Could not finish microphone audio. Your current text was kept.",
          );
        }
        try {
          state.recorder.release();
        } catch {}
      }
      if (state.uri)
        await deleteAsync(state.uri, { idempotent: true }).catch(() => {});
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    })();
    pendingCleanup.current = state.cleanup;
    return state.cleanup;
  }, []);
  const cancel = React.useCallback(() => {
    const state = current.current;
    if (!state) return;
    current.current = null;
    state.cancelled = true;
    state.session?.cancel();
    void cleanup(state);
  }, [cleanup]);
  React.useEffect(() => {
    setMode("idle");
    return cancel;
  }, [scopeKey, cancel]);
  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active" && current.current) {
        cancel();
        setMode("idle");
        latest.current.onStatus(
          "Live dictation stopped. Your current text was kept.",
        );
      }
    });
    return () => subscription.remove();
  }, [cancel]);
  const toggle = React.useCallback(async () => {
    const active = current.current;
    if (active) {
      if (active.stopping || mode !== "recording") return;
      active.stopping = true;
      setMode("finishing");
      latest.current.onStatus("Finishing live dictation…");
      try {
        await cleanup(active, true);
        if (!active.cancelled) active.session?.finish();
      } catch {
        active.session?.cancel(
          "Could not finish live dictation. Your current text was kept.",
        );
      }
      return;
    }
    const config = latest.current;
    if (!config.api || !config.scopeKey) return;
    const connection = config.api;
    const Stream = (
      AudioModule as unknown as {
        AudioStream?: new (options: {
          sampleRate: number;
          channels: number;
          encoding: string;
        }) => NativeStream;
      }
    ).AudioStream;
    const state: Capture = {
      offset: 0,
      cancelled: false,
      format: Stream ? "pcm16" : Platform.OS === "ios" ? "wav" : "aac",
    };
    current.current = state;
    setMode("connecting");
    config.onStatus("Connecting live dictation…");
    const valid = () =>
      current.current === state &&
      !state.cancelled &&
      latest.current.scopeKey === config.scopeKey;
    state.setup = (async () => {
      try {
        await pendingCleanup.current;
        if (!valid()) return;
        const permission = await requestRecordingPermissionsAsync();
        if (!valid()) return;
        if (!permission.granted)
          throw new Error("Microphone permission denied.");
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        if (!valid()) return;
        const url = connection.url("/api/asr/stream");
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        state.session = createStreamingAsrSession({
          url: url.toString(),
          format: state.format,
          createSocket: (url) =>
            new NativeWebSocket(url, undefined, {
              headers: { Authorization: `Bearer ${connection.token}` },
            }),
          onTranscript: (text) => {
            if (valid())
              latest.current.onChangeText(dictationText(config.value, text));
          },
          onEnd: (error) => {
            if (!valid()) return;
            void cleanup(state).then(() => {
              if (!valid()) return;
              current.current = null;
              setMode("idle");
              latest.current.onStatus(error || "Voice added");
            });
          },
        });
        await state.session.start();
        if (!valid()) return;
        if (Stream) {
          state.stream = new Stream({
            sampleRate: 16000,
            channels: 1,
            encoding: "float32",
          });
          let resample: ReturnType<typeof createPcmResampler> | undefined,
            rate = 0,
            channels = 0;
          state.stream.addListener("audioStreamBuffer", (buffer) => {
            if (!valid() || state.stopping) return;
            try {
              if (!resample) {
                rate = buffer.sampleRate;
                channels = buffer.channels;
                resample = createPcmResampler(rate, channels);
              }
              if (rate !== buffer.sampleRate || channels !== buffer.channels)
                throw new Error(
                  "Microphone format changed. Start live dictation again.",
                );
              state.session!.audio(resample(new Float32Array(buffer.data)));
            } catch (error) {
              state.session?.cancel(
                error instanceof Error
                  ? error.message
                  : "Microphone stream failed.",
              );
            }
          });
          await state.stream.start();
          if (!valid()) return;
        } else {
          // Runtime 6 already has this recorder. AAC ADTS/WAV can be read while
          // recording; never wait for an MP4 footer or restart recording in segments.
          state.recorder = new AudioModule.AudioRecorder({
            ...STREAM_RECORDING_OPTIONS,
            ...(Platform.OS === "ios"
              ? STREAM_RECORDING_OPTIONS.ios
              : STREAM_RECORDING_OPTIONS.android),
          });
          await state.recorder.prepareToRecordAsync(STREAM_RECORDING_OPTIONS);
          if (!valid()) return;
          state.recorder.record();
          state.uri = state.recorder.uri || undefined;
          if (!state.uri)
            throw new Error("Microphone recording is unavailable.");
          state.pump = async () => {
            if (state.reading) return state.reading;
            state.reading = (async () => {
              if (!state.uri || !valid()) return;
              const info = await getInfoAsync(state.uri);
              if (!info.exists) return;
              while (valid() && state.offset < info.size) {
                const encoded = await readAsStringAsync(state.uri, {
                  encoding: EncodingType.Base64,
                  position: state.offset,
                  length: Math.min(32768, info.size - state.offset),
                });
                if (!valid()) return;
                const bytes = toByteArray(encoded);
                if (!bytes.length) break;
                state.offset += bytes.length;
                state.session!.audio(
                  bytes.buffer.slice(
                    bytes.byteOffset,
                    bytes.byteOffset + bytes.byteLength,
                  ) as ArrayBuffer,
                );
              }
            })();
            try {
              await state.reading;
            } finally {
              state.reading = undefined;
            }
          };
          state.timer = setInterval(() => {
            void state.pump!().catch(() => {
              state.session?.cancel(
                "Could not read microphone audio. Your current text was kept.",
              );
            });
          }, 150);
        }
        setMode("recording");
        latest.current.onStatus("Listening · Free ASR");
      } catch (error) {
        if (valid()) {
          cancel();
          setMode("idle");
          latest.current.onStatus(
            error instanceof Error ? error.message : "Live dictation failed.",
          );
        }
      }
    })();
    await state.setup;
    if (!valid()) void cleanup(state);
  }, [cancel, cleanup, mode]);
  return {
    active: mode !== "idle",
    busy: mode === "connecting" || mode === "finishing",
    toggle,
  };
}
