import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface PracticeHistoryRow {
  id: string;
  lesson_id: string;
  item_id: string;
  category: string;
  score: number;
  analysis_result: any;
  created_at: string;
}

interface UserProgressRow {
  id: string;
  lesson_id: string;
  item_id: string;
  category: string;
  attempts: number;
  best_score: number;
  mastered: boolean;
  last_attempt: string;
}

export const useUserData = () => {
  const { user } = useAuth();
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryRow[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setPracticeHistory([]);
      setUserProgress([]);
      setLoading(false);
      return;
    }

    try {
      const [historyRes, progressRes] = await Promise.all([
        supabase
          .from('practice_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (historyRes.data) {
        setPracticeHistory(historyRes.data);
      }
      if (progressRes.data) {
        setUserProgress(progressRes.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const recordPractice = async (data: {
    lessonId: string;
    itemId: string;
    category: string;
    score: number;
    analysisResult?: any;
  }) => {
    if (!user) return;

    try {
      // Insert practice history
      await supabase.from('practice_history').insert({
        user_id: user.id,
        lesson_id: data.lessonId,
        item_id: data.itemId,
        category: data.category,
        score: data.score,
        analysis_result: data.analysisResult
      });

      // Upsert user progress
      const existing = userProgress.find(
        p => p.lesson_id === data.lessonId && p.item_id === data.itemId && p.category === data.category
      );

      const newAttempts = (existing?.attempts || 0) + 1;
      const newBestScore = Math.max(existing?.best_score || 0, data.score);
      const newMastered = newBestScore >= 80 || (existing?.mastered || false);

      await supabase.from('user_progress').upsert({
        user_id: user.id,
        lesson_id: data.lessonId,
        item_id: data.itemId,
        category: data.category,
        attempts: newAttempts,
        best_score: newBestScore,
        mastered: newMastered,
        last_attempt: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id,item_id,category'
      });

      // Refresh data
      fetchUserData();
    } catch (error) {
      console.error('Error recording practice:', error);
    }
  };

  const getProgressForItem = (lessonId: string, itemId: string) => {
    return userProgress.find(
      p => p.lesson_id === lessonId && p.item_id === itemId
    );
  };

  return {
    practiceHistory,
    userProgress,
    loading,
    recordPractice,
    getProgressForItem,
    refetch: fetchUserData
  };
};
