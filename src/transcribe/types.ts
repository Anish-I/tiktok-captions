export interface Word {
  text: string;
  start: number;        // seconds
  end: number;          // seconds
  confidence?: number;  // 0..1, optional
}

export interface TranscribeOptions {
  /** Path to a whisper.cpp .bin model. Overrides $WHISPER_CPP_MODEL. */
  model?: string;
  /** Force a language (e.g. 'en'). Whisper.cpp auto-detects if omitted. */
  language?: string;
  /** Number of threads whisper.cpp should use. */
  threads?: number;
  /** Path to whisper.cpp binary. Overrides $WHISPER_CPP_BIN. */
  bin?: string;
  /** Path to ffmpeg binary. Overrides $FFMPEG_BIN. */
  ffmpeg?: string;
}
