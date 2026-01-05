// Audio Analysis Types - Comprehensive metrics for speech evaluation

export interface VolumeSegment {
  startTime: number;
  endTime: number;
  avgDb: number;
  minDb: number;
  maxDb: number;
  level: 'quiet' | 'normal' | 'loud';
}

export interface VolumeAnalysis {
  segments: VolumeSegment[];
  overallAvgDb: number;
  overallMinDb: number;
  overallMaxDb: number;
  score: number;
  note: string;
}

export interface SpeechRateSegment {
  startTime: number;
  endTime: number;
  wpm: number;
  syllablesPerSecond: number;
  level: 'slow' | 'normal' | 'fast';
}

export interface SpeechRateAnalysis {
  segments: SpeechRateSegment[];
  overallWpm: number;
  overallSyllablesPerSecond: number;
  speedVariation: number; // Standard deviation
  score: number;
  note: string;
}

export interface ResponseLatencyAnalysis {
  delayMs: number;
  isAcceptable: boolean;
  score: number;
  note: string;
}

export interface PauseSegment {
  startTime: number;
  endTime: number;
  durationMs: number;
  isExcessive: boolean;
}

export interface PauseDurationAnalysis {
  pauses: PauseSegment[];
  totalPauseTime: number;
  averagePauseDuration: number;
  pauseFrequency: number; // pauses per minute
  score: number;
  note: string;
}

export interface EndIntensityAnalysis {
  finalSegmentDb: number;
  previousSegmentDb: number;
  overallAvgDb: number;
  stdDevFromMean: number;
  finalSegmentWpm: number;
  previousSegmentWpm: number;
  overallAvgWpm: number;
  isAbnormalVolume: boolean;
  isAbnormalSpeed: boolean;
  score: number;
  note: string;
  // Flags added by backend for scoring/feedback
  volumeIncreasing?: boolean;
  speedIncreasing?: boolean;
  volumeDecreasing?: boolean;
  speedDecreasing?: boolean;
}

export interface AudioMetricsThresholds {
  volume: {
    quiet: { min: number; max: number };
    normal: { min: number; max: number };
    loud: { min: number; max: number };
    targetMin: number;
    targetMax: number;
  };
  speechRate: {
    slow: { min: number; max: number };
    normal: { min: number; max: number };
    fast: { min: number; max: number };
    targetMin: number;
    targetMax: number;
  };
  responseLatency: {
    excellent: number; // ms
    acceptable: number; // ms
    poor: number; // ms
  };
  pauseDuration: {
    natural: number; // ms - pauses under this are natural
    acceptable: number; // ms - pauses under this are okay
    excessive: number; // ms - pauses over this hurt score
    maxFrequency: number; // max pauses per minute
  };
  endIntensity: {
    volumeDeviationThreshold: number; // standard deviations
    speedDeviationThreshold: number; // percentage change
  };
}

export interface EmotionScoreBreakdown {
  volume: { raw: number; weighted: number };
  speechRate: { raw: number; weighted: number };
  pause: { raw: number; weighted: number };
  latency: { raw: number; weighted: number };
  endIntensity: {
    raw: number;
    weighted: number;
    volumeIncreasing: boolean;
    speedIncreasing: boolean;
  };
}

export interface ComprehensiveAudioAnalysis {
  // Emotion-only scoring
  overallScore: number;
  emotionBreakdown: EmotionScoreBreakdown | null;

  // Detailed metrics
  volumeAnalysis: VolumeAnalysis;
  speechRateAnalysis: SpeechRateAnalysis;
  responseLatencyAnalysis: ResponseLatencyAnalysis;
  pauseDurationAnalysis: PauseDurationAnalysis;
  endIntensityAnalysis: EndIntensityAnalysis;

  // Metadata
  transcription: string;
  speechDetected: boolean;
  audioDurationMs: number;
  wordCount: number;
  feedback: string[];

  // Config used
  thresholds: AudioMetricsThresholds;
}

// Default thresholds (can be configured)
export const defaultAudioThresholds: AudioMetricsThresholds = {
  volume: {
    quiet: { min: -60, max: -40 },
    normal: { min: -40, max: -20 },
    loud: { min: -20, max: 0 },
    targetMin: -35,
    targetMax: -15,
  },
  speechRate: {
    slow: { min: 0, max: 100 },
    normal: { min: 100, max: 160 },
    fast: { min: 160, max: 300 },
    targetMin: 120,
    targetMax: 150,
  },
  responseLatency: {
    excellent: 500,
    acceptable: 1500,
    poor: 3000,
  },
  pauseDuration: {
    natural: 300,
    acceptable: 800,
    excessive: 2000,
    maxFrequency: 8,
  },
  endIntensity: {
    volumeDeviationThreshold: 1.5,
    speedDeviationThreshold: 30,
  },
};

// Helper to load thresholds from localStorage
export function getAudioThresholds(): AudioMetricsThresholds {
  try {
    const stored = localStorage.getItem('chunks_audio_thresholds');
    if (stored) {
      return { ...defaultAudioThresholds, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load audio thresholds:', e);
  }
  return defaultAudioThresholds;
}

// Helper to save thresholds
export function saveAudioThresholds(thresholds: Partial<AudioMetricsThresholds>): void {
  try {
    const current = getAudioThresholds();
    const updated = { ...current, ...thresholds };
    localStorage.setItem('chunks_audio_thresholds', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save audio thresholds:', e);
  }
}
