// Scoring Configuration Types - Configurable scoring rules for audio analysis

export interface MetricScoringConfig {
  // Weight for this metric in overall score (0-100)
  weight: number;
  // Whether higher values = higher score (true) or lower values = higher score (false)
  higherIsBetter: boolean;
  // Zero score threshold - values beyond this get 0
  zeroThreshold?: number;
  // Perfect score threshold - values beyond this get max score  
  perfectThreshold?: number;
}

export interface ScoringConfig {
  volume: {
    // Score based on how loud (closer to target = better, too quiet = 0)
    targetDb: number;
    minDb: number; // Below this = 0 score
    maxDb: number; // Above this = 0 score (too loud)
    weight: number;
  };
  speechRate: {
    // Faster = higher score, but too fast = 0
    targetWpm: number;
    minWpm: number; // Below this = 0 score (too slow)
    maxWpm: number; // Above this = 0 score (too fast)
    weight: number;
  };
  pauseDuration: {
    // Fewer pauses and shorter = better
    maxAcceptableMs: number; // Above this per pause = penalty
    maxTotalPauseMs: number; // Total pause time above this = 0
    weight: number;
  };
  responseLatency: {
    // Faster response = higher score
    targetMs: number; // This or faster = perfect
    maxMs: number; // Above this = 0
    weight: number;
  };
  endIntensity: {
    // Both increasing at end = perfect score
    bothIncreasingBonus: number; // Bonus when both volume and speed increase
    oneIncreasingScore: number; // Score when only one increases
    stableScore: number; // Score when stable
    decreasingPenalty: number; // Penalty when decreasing
    weight: number;
  };
}

export const defaultScoringConfig: ScoringConfig = {
  volume: {
    targetDb: -25, // Target volume
    minDb: -45, // Too quiet = 0
    maxDb: -10, // Too loud = 0
    weight: 20,
  },
  speechRate: {
    targetWpm: 150, // Target speed
    minWpm: 80, // Too slow = 0
    maxWpm: 200, // Too fast = 0
    weight: 25,
  },
  pauseDuration: {
    maxAcceptableMs: 1500, // Max acceptable pause
    maxTotalPauseMs: 5000, // Total pause above this = 0
    weight: 15,
  },
  responseLatency: {
    targetMs: 500, // Perfect response time
    maxMs: 3000, // Too slow = 0
    weight: 15,
  },
  endIntensity: {
    bothIncreasingBonus: 100, // Perfect when both increase
    oneIncreasingScore: 70, // Good when one increases
    stableScore: 50, // Okay when stable
    decreasingPenalty: 20, // Low when decreasing
    weight: 25,
  },
};

const SCORING_CONFIG_KEY = 'chunks_scoring_config';

export function getScoringConfig(): ScoringConfig {
  try {
    const stored = localStorage.getItem(SCORING_CONFIG_KEY);
    if (stored) {
      return { ...defaultScoringConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load scoring config:', e);
  }
  return defaultScoringConfig;
}

export function saveScoringConfig(config: Partial<ScoringConfig>): void {
  try {
    const current = getScoringConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(SCORING_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save scoring config:', e);
  }
}

// Calculate score based on config
export function calculateMetricScore(
  value: number,
  target: number,
  min: number,
  max: number,
  higherIsBetter: boolean = true
): number {
  // Out of bounds = 0
  if (value < min || value > max) return 0;
  
  if (higherIsBetter) {
    // Higher is better: scale from min to target
    if (value >= target) return 100;
    return Math.round(((value - min) / (target - min)) * 100);
  } else {
    // Lower is better: scale from max to target
    if (value <= target) return 100;
    return Math.round(((max - value) / (max - target)) * 100);
  }
}
