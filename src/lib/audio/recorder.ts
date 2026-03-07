type AudioRecorderCallbacks = {
  onDataAvailable?: (blob: Blob) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: Error) => void;
};

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private chunks: Blob[] = [];
  private callbacks: AudioRecorderCallbacks = {};

  static isSupported(): boolean {
    return !!(
      typeof window !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined"
    );
  }

  static getSupportedMimeType(): string {
    if (typeof MediaRecorder === "undefined") return "";

    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/aac",
      "audio/ogg;codecs=opus",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }

    return "";
  }

  setCallbacks(callbacks: AudioRecorderCallbacks): void {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    const mimeType = AudioRecorder.getSupportedMimeType();
    if (!mimeType) {
      throw new Error("No supported audio MIME type found");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Microphone access denied");
      this.callbacks.onError?.(error);
      throw error;
    }

    this.chunks = [];

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    } catch {
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        this.callbacks.onDataAvailable?.(event.data);
      }
    };

    this.mediaRecorder.onerror = () => {
      const error = new Error("MediaRecorder error");
      this.callbacks.onError?.(error);
    };

    this.mediaRecorder.start(5000);
    this.startAudioLevelMonitoring();
  }

  pause(): void {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.pause();
      this.stopAudioLevelMonitoring();
    }
  }

  resume(): void {
    if (this.mediaRecorder?.state === "paused") {
      this.mediaRecorder.resume();
      this.startAudioLevelMonitoring();
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType =
          this.mediaRecorder?.mimeType ||
          AudioRecorder.getSupportedMimeType() ||
          "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
      };

      if (
        this.mediaRecorder.state === "recording" ||
        this.mediaRecorder.state === "paused"
      ) {
        this.mediaRecorder.stop();
      } else {
        const mimeType =
          this.mediaRecorder.mimeType ||
          AudioRecorder.getSupportedMimeType() ||
          "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
      }
    });
  }

  get state(): RecordingState {
    if (!this.mediaRecorder) return "inactive";
    switch (this.mediaRecorder.state) {
      case "recording":
        return "recording";
      case "paused":
        return "paused";
      default:
        return "inactive";
    }
  }

  private startAudioLevelMonitoring(): void {
    if (!this.stream) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    source.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalized = Math.min(average / 128, 1);

      this.callbacks.onAudioLevel?.(normalized);
      this.animationFrameId = requestAnimationFrame(updateLevel);
    };

    this.animationFrameId = requestAnimationFrame(updateLevel);
  }

  private stopAudioLevelMonitoring(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private cleanup(): void {
    this.stopAudioLevelMonitoring();

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.chunks = [];
  }
}

type RecordingState = "inactive" | "recording" | "paused";
