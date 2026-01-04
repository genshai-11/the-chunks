// Speech Analysis Configuration
// Re-exports from audioAnalysis for backward compatibility

import { 
  AudioMetricsThresholds, 
  defaultAudioThresholds, 
  getAudioThresholds, 
  saveAudioThresholds 
} from '@/types/audioAnalysis';

export type { AudioMetricsThresholds };

// Legacy config interface (for backward compatibility)
export interface AnalysisConfig {
  masteryThreshold: number;
  thresholds: AudioMetricsThresholds;
}

// Default configuration
export const defaultAnalysisConfig: AnalysisConfig = {
  masteryThreshold: 80,
  thresholds: defaultAudioThresholds,
};

// Helper to load config from localStorage or use defaults
export function getAnalysisConfig(): AnalysisConfig {
  try {
    const stored = localStorage.getItem('chunks_analysis_config');
    const thresholds = getAudioThresholds();
    if (stored) {
      const parsed = JSON.parse(stored);
      return { 
        masteryThreshold: parsed.masteryThreshold ?? 80,
        thresholds 
      };
    }
    return { masteryThreshold: 80, thresholds };
  } catch (e) {
    console.error('Failed to load analysis config:', e);
    return defaultAnalysisConfig;
  }
}

// Helper to save config to localStorage
export function saveAnalysisConfig(config: Partial<AnalysisConfig>): void {
  try {
    const current = getAnalysisConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('chunks_analysis_config', JSON.stringify({
      masteryThreshold: updated.masteryThreshold
    }));
    if (config.thresholds) {
      saveAudioThresholds(config.thresholds);
    }
  } catch (e) {
    console.error('Failed to save analysis config:', e);
  }
}
