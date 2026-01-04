export interface LessonItem {
  English: string;
  Vietnamese: string;
}

export interface LessonData {
  lesson_name: string;
  categories: {
    [key: string]: LessonItem[];
  };
}

export interface Week {
  id: number;
  name: string;
  days: Day[];
}

export interface Day {
  id: string;
  name: string;
  lessonFile: string;
}

export type CategoryType = 
  | 'Vocab' 
  | 'Slang' 
  | 'Phrase' 
  | 'Sentence' 
  | 'Dialogue' 
  | 'Review'
  | 'Mono 1'
  | 'Mono 2'
  | 'Dia 1'
  | 'Dia 2';

export interface PracticeItem extends LessonItem {
  category: string;
  id: string;
}

// Re-export comprehensive audio analysis types
export type { 
  ComprehensiveAudioAnalysis,
  VolumeAnalysis,
  SpeechRateAnalysis,
  ResponseLatencyAnalysis,
  PauseDurationAnalysis,
  EndIntensityAnalysis,
  AudioMetricsThresholds
} from './audioAnalysis';

// Legacy AnalysisResult type - now uses ComprehensiveAudioAnalysis
import type { ComprehensiveAudioAnalysis } from './audioAnalysis';
export type AnalysisResult = ComprehensiveAudioAnalysis;

export interface UserProgress {
  lessonId: string;
  itemId: string;
  category: string;
  attempts: number;
  bestScore: number;
  lastAttempt: Date;
  mastered: boolean;
}

export interface PracticeSession {
  id: string;
  lessonId: string;
  itemId: string;
  category: string;
  score: number;
  timestamp: Date;
  weekId: number;
  analysisResult?: AnalysisResult;
}
