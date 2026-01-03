import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LessonData, PracticeItem, UserProgress, PracticeSession, AnalysisResult } from '@/types/curriculum';
import { getAnalysisConfig } from '@/config/analysisConfig';

interface AppContextType {
  currentLesson: LessonData | null;
  currentLessonId: string;
  setCurrentLessonId: (id: string) => void;
  loadLesson: (filename: string) => Promise<void>;
  selectedItem: PracticeItem | null;
  setSelectedItem: (item: PracticeItem | null) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  viewMode: 'list' | 'flashcard';
  setViewMode: (mode: 'list' | 'flashcard') => void;
  userProgress: UserProgress[];
  updateProgress: (progress: UserProgress) => void;
  practiceSessions: PracticeSession[];
  recordPracticeSession: (session: Omit<PracticeSession, 'id' | 'timestamp'>) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLesson, setCurrentLesson] = useState<LessonData | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string>('d1');
  const [selectedItem, setSelectedItem] = useState<PracticeItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'flashcard'>('list');
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadLesson = async (filename: string) => {
    if (!filename) return;
    
    try {
      const lessonModules: Record<string, () => Promise<LessonData>> = {
        'D1_L0_Food_tour.json': () => import('@/data/lessons/D1_L0_Food_tour.json').then(m => m.default as LessonData),
        'D2_L1_Wandering_souls.json': () => import('@/data/lessons/D2_L1_Wandering_souls.json').then(m => m.default as LessonData),
        'D3_L2_Tell_me_about_your_se.json': () => import('@/data/lessons/D3_L2_Tell_me_about_your_se.json').then(m => m.default as LessonData),
        'D4_Freetalk_1.json': () => import('@/data/lessons/D4_Freetalk_1.json').then(m => m.default as LessonData),
        'D5_L3_Rendezvous.json': () => import('@/data/lessons/D5_L3_Rendezvous.json').then(m => m.default as LessonData),
        'D6_L4_Excel.json': () => import('@/data/lessons/D6_L4_Excel.json').then(m => m.default as LessonData),
        'D7_Freetalk_2.json': () => import('@/data/lessons/D7_Freetalk_2.json').then(m => m.default as LessonData),
        'D8_L5_Ecommerce.json': () => import('@/data/lessons/D8_L5_Ecommerce.json').then(m => m.default as LessonData),
        'D9_L6_Smarketing.json': () => import('@/data/lessons/D9_L6_Smarketing.json').then(m => m.default as LessonData),
        'D10_Freetalk_3.json': () => import('@/data/lessons/D10_Freetalk_3.json').then(m => m.default as LessonData),
        'D11_L7_Chart.json': () => import('@/data/lessons/D11_L7_Chart.json').then(m => m.default as LessonData),
        'D12_L8_Viettel.json': () => import('@/data/lessons/D12_L8_Viettel.json').then(m => m.default as LessonData),
        'D13_Freetalk_4.json': () => import('@/data/lessons/D13_Freetalk_4.json').then(m => m.default as LessonData),
        'D14_L9_Electronic_Mail.json': () => import('@/data/lessons/D14_L9_Electronic_Mail.json').then(m => m.default as LessonData),
        'D15_L10_Food_Porn.json': () => import('@/data/lessons/D15_L10_Food_Porn.json').then(m => m.default as LessonData),
      };

      const loader = lessonModules[filename];
      if (loader) {
        const data = await loader();
        setCurrentLesson(data);
      }
    } catch (error) {
      console.error('Failed to load lesson:', error);
    }
  };

  const updateProgress = (progress: UserProgress) => {
    setUserProgress(prev => {
      const existing = prev.findIndex(
        p => p.lessonId === progress.lessonId && p.itemId === progress.itemId
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = progress;
        return updated;
      }
      return [...prev, progress];
    });
  };

  const recordPracticeSession = (session: Omit<PracticeSession, 'id' | 'timestamp'>) => {
    const newSession: PracticeSession = {
      ...session,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    setPracticeSessions(prev => [...prev, newSession]);

    // Also update user progress with configurable mastery threshold
    const config = getAnalysisConfig();
    const existingProgress = userProgress.find(
      p => p.lessonId === session.lessonId && p.itemId === session.itemId
    );

    const updatedProgress: UserProgress = {
      lessonId: session.lessonId,
      itemId: session.itemId,
      category: session.category,
      attempts: (existingProgress?.attempts || 0) + 1,
      bestScore: Math.max(existingProgress?.bestScore || 0, session.score),
      lastAttempt: new Date(),
      mastered: session.score >= config.masteryThreshold || (existingProgress?.mastered || false),
    };

    updateProgress(updatedProgress);
  };

  // Load saved data from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('chunks_progress');
    const savedSessions = localStorage.getItem('chunks_sessions');
    
    if (savedProgress) {
      try {
        setUserProgress(JSON.parse(savedProgress));
      } catch (e) {
        console.error('Failed to parse saved progress');
      }
    }
    
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions);
        setPracticeSessions(sessions.map((s: PracticeSession) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        })));
      } catch (e) {
        console.error('Failed to parse saved sessions');
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (userProgress.length > 0) {
      localStorage.setItem('chunks_progress', JSON.stringify(userProgress));
    }
  }, [userProgress]);

  useEffect(() => {
    if (practiceSessions.length > 0) {
      localStorage.setItem('chunks_sessions', JSON.stringify(practiceSessions));
    }
  }, [practiceSessions]);

  return (
    <AppContext.Provider
      value={{
        currentLesson,
        currentLessonId,
        setCurrentLessonId,
        loadLesson,
        selectedItem,
        setSelectedItem,
        categoryFilter,
        setCategoryFilter,
        viewMode,
        setViewMode,
        userProgress,
        updateProgress,
        practiceSessions,
        recordPracticeSession,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
