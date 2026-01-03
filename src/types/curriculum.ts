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

export interface AnalysisResult {
  accuracy: number;
  fluency: number;
  emotion: number;
  overallScore: number;
  feedback: string[];
}

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
}
