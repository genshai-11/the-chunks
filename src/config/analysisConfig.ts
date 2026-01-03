// Speech Analysis Configuration
// These values can be adjusted to tune the AI grading behavior

export interface AnalysisConfig {
  // Pause threshold in milliseconds - pauses longer than this are flagged
  pauseThresholdMs: number;
  
  // Weights for scoring (must sum to 1.0)
  accuracyWeight: number;   // How much pronunciation correctness matters
  fluencyWeight: number;    // How much smooth delivery matters
  emotionWeight: number;    // How much expressiveness matters
  
  // Grading strictness
  strictness: 'lenient' | 'normal' | 'strict';
  
  // Mastery threshold - score needed to mark item as "mastered"
  masteryThreshold: number;
}

// Default configuration
export const defaultAnalysisConfig: AnalysisConfig = {
  pauseThresholdMs: 2710,     // 2.71 seconds default pause threshold
  accuracyWeight: 0.4,        // 40% weight on pronunciation
  fluencyWeight: 0.35,        // 35% weight on fluency
  emotionWeight: 0.25,        // 25% weight on emotion/intonation
  strictness: 'normal',
  masteryThreshold: 80,
};

// Helper to load config from localStorage or use defaults
export function getAnalysisConfig(): AnalysisConfig {
  try {
    const stored = localStorage.getItem('chunks_analysis_config');
    if (stored) {
      return { ...defaultAnalysisConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load analysis config:', e);
  }
  return defaultAnalysisConfig;
}

// Helper to save config to localStorage
export function saveAnalysisConfig(config: Partial<AnalysisConfig>): void {
  try {
    const current = getAnalysisConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('chunks_analysis_config', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save analysis config:', e);
  }
}

// Validate weights sum to 1.0
export function validateWeights(config: AnalysisConfig): boolean {
  const sum = config.accuracyWeight + config.fluencyWeight + config.emotionWeight;
  return Math.abs(sum - 1.0) < 0.01;
}
