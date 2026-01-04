// Scoring Configuration Types - Simplified emotion-based scoring
// Only uses: weight (%), threshold (min), target
// Score = 0 if below threshold, linear scale from threshold to target, 100 if at/above target

export interface EmotionScoringConfig {
  volume: {
    weight: number; // Weight %
    threshold: number; // Below this = 0 score (dB)
    target: number; // At/above this = 100% of weight (dB)
  };
  speechRate: {
    weight: number; // Weight %
    threshold: number; // Below this = 0 score (WPM)
    target: number; // At/above this = 100% of weight (WPM)
  };
  pauseDuration: {
    weight: number; // Weight %
    maxAcceptableMs: number; // Single pause exceeds this = penalty
    maxTotalMs: number; // Total pause exceeds this = 0 score
  };
  responseLatency: {
    weight: number; // Weight %
    target: number; // At/below this = 100% (ms)
    threshold: number; // Above this = 0 score (ms)
  };
  endIntensity: {
    weight: number; // Weight %
    bothIncreasingScore: number; // Both volume & speed increasing = this score
    oneIncreasingScore: number; // Only one increasing = this score
    stableScore: number; // Neither changing = this score
    decreasingScore: number; // Decreasing = this score
  };
}

export const defaultEmotionScoringConfig: EmotionScoringConfig = {
  volume: {
    weight: 20,
    threshold: -45, // Below -45 dB = 0
    target: -20, // At -20 dB or louder = 100%
  },
  speechRate: {
    weight: 25,
    threshold: 80, // Below 80 WPM = 0
    target: 150, // At 150 WPM or faster = 100%
  },
  pauseDuration: {
    weight: 15,
    maxAcceptableMs: 1500, // Single pause > 1.5s = penalty
    maxTotalMs: 5000, // Total pause > 5s = 0
  },
  responseLatency: {
    weight: 15,
    target: 500, // <= 500ms = 100%
    threshold: 3000, // > 3000ms = 0
  },
  endIntensity: {
    weight: 25,
    bothIncreasingScore: 100, // Perfect - both volume and speed increase
    oneIncreasingScore: 70, // Good - only one increases
    stableScore: 50, // Okay - stable
    decreasingScore: 20, // Poor - decreasing
  },
};

const SCORING_CONFIG_KEY = 'chunks_emotion_scoring_config';

export function getEmotionScoringConfig(): EmotionScoringConfig {
  try {
    const stored = localStorage.getItem(SCORING_CONFIG_KEY);
    if (stored) {
      return { ...defaultEmotionScoringConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load scoring config:', e);
  }
  return defaultEmotionScoringConfig;
}

export function saveEmotionScoringConfig(config: Partial<EmotionScoringConfig>): void {
  try {
    const current = getEmotionScoringConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(SCORING_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save scoring config:', e);
  }
}

// Calculate linear score between threshold and target
// For metrics where higher is better (volume, speechRate)
export function calculateLinearScore(
  value: number,
  threshold: number,
  target: number
): number {
  if (value < threshold) return 0;
  if (value >= target) return 100;
  return Math.round(((value - threshold) / (target - threshold)) * 100);
}

// For metrics where lower is better (latency)
export function calculateInverseLinearScore(
  value: number,
  target: number,
  threshold: number
): number {
  if (value <= target) return 100;
  if (value >= threshold) return 0;
  return Math.round(((threshold - value) / (threshold - target)) * 100);
}

// Calculate weighted total emotion score
export function calculateEmotionScore(
  config: EmotionScoringConfig,
  metrics: {
    volumeDb: number;
    speechRateWpm: number;
    totalPauseMs: number;
    longestPauseMs: number;
    latencyMs: number;
    volumeIncreasing: boolean;
    speedIncreasing: boolean;
  }
): {
  total: number;
  breakdown: {
    volume: { score: number; weighted: number };
    speechRate: { score: number; weighted: number };
    pause: { score: number; weighted: number };
    latency: { score: number; weighted: number };
    endIntensity: { score: number; weighted: number };
  };
} {
  // Volume score (louder = better)
  const volumeScore = calculateLinearScore(
    metrics.volumeDb,
    config.volume.threshold,
    config.volume.target
  );

  // Speech rate score (faster = better)
  const speechRateScore = calculateLinearScore(
    metrics.speechRateWpm,
    config.speechRate.threshold,
    config.speechRate.target
  );

  // Pause score (less pause = better)
  let pauseScore = 100;
  if (metrics.totalPauseMs > config.pauseDuration.maxTotalMs) {
    pauseScore = 0;
  } else if (metrics.longestPauseMs > config.pauseDuration.maxAcceptableMs) {
    // Penalty for long single pauses
    pauseScore = Math.max(0, 100 - Math.round(
      (metrics.longestPauseMs - config.pauseDuration.maxAcceptableMs) / 50
    ));
  } else {
    // Linear scale based on total pause time
    pauseScore = Math.round(
      100 - (metrics.totalPauseMs / config.pauseDuration.maxTotalMs) * 100
    );
  }

  // Latency score (faster response = better)
  const latencyScore = calculateInverseLinearScore(
    metrics.latencyMs,
    config.responseLatency.target,
    config.responseLatency.threshold
  );

  // End intensity score (both increasing = best)
  let endIntensityScore: number;
  if (metrics.volumeIncreasing && metrics.speedIncreasing) {
    endIntensityScore = config.endIntensity.bothIncreasingScore;
  } else if (metrics.volumeIncreasing || metrics.speedIncreasing) {
    endIntensityScore = config.endIntensity.oneIncreasingScore;
  } else {
    // Check if decreasing (would need more data, assume stable for now)
    endIntensityScore = config.endIntensity.stableScore;
  }

  // Calculate weighted scores
  const totalWeight = 
    config.volume.weight + 
    config.speechRate.weight + 
    config.pauseDuration.weight + 
    config.responseLatency.weight + 
    config.endIntensity.weight;

  const breakdown = {
    volume: {
      score: volumeScore,
      weighted: Math.round((volumeScore * config.volume.weight) / totalWeight),
    },
    speechRate: {
      score: speechRateScore,
      weighted: Math.round((speechRateScore * config.speechRate.weight) / totalWeight),
    },
    pause: {
      score: pauseScore,
      weighted: Math.round((pauseScore * config.pauseDuration.weight) / totalWeight),
    },
    latency: {
      score: latencyScore,
      weighted: Math.round((latencyScore * config.responseLatency.weight) / totalWeight),
    },
    endIntensity: {
      score: endIntensityScore,
      weighted: Math.round((endIntensityScore * config.endIntensity.weight) / totalWeight),
    },
  };

  const total = 
    breakdown.volume.weighted +
    breakdown.speechRate.weighted +
    breakdown.pause.weighted +
    breakdown.latency.weighted +
    breakdown.endIntensity.weighted;

  return { total, breakdown };
}
