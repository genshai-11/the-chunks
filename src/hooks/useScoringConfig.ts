import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmotionScoringConfig, defaultEmotionScoringConfig } from '@/types/scoringConfig';

export const useScoringConfig = () => {
  const [config, setConfig] = useState<EmotionScoringConfig>(defaultEmotionScoringConfig);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('scoring_config')
        .select('config')
        .eq('config_key', 'default')
        .maybeSingle();

      if (error) {
        console.error('Error fetching scoring config:', error);
        return;
      }

      if (data?.config) {
        // Merge with defaults to ensure all fields exist
        const dbConfig = data.config as Partial<EmotionScoringConfig>;
        setConfig({
          ...defaultEmotionScoringConfig,
          ...dbConfig,
          volume: { ...defaultEmotionScoringConfig.volume, ...dbConfig.volume },
          speechRate: { ...defaultEmotionScoringConfig.speechRate, ...dbConfig.speechRate },
          pauseDuration: { ...defaultEmotionScoringConfig.pauseDuration, ...dbConfig.pauseDuration },
          responseLatency: { ...defaultEmotionScoringConfig.responseLatency, ...dbConfig.responseLatency },
          endIntensity: { ...defaultEmotionScoringConfig.endIntensity, ...dbConfig.endIntensity },
        });
      }
    } catch (error) {
      console.error('Error fetching scoring config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async (newConfig: EmotionScoringConfig, userId?: string) => {
    try {
      // Check if config exists first
      const { data: existing } = await supabase
        .from('scoring_config')
        .select('id')
        .eq('config_key', 'default')
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from('scoring_config')
          .update({
            config: JSON.parse(JSON.stringify(newConfig)),
            updated_by: userId || null
          })
          .eq('config_key', 'default');
        error = result.error;
      } else {
        // Insert new - use raw SQL approach via RPC or just insert with explicit casting
        const result = await supabase
          .from('scoring_config')
          .insert([{
            config_key: 'default',
            config: JSON.parse(JSON.stringify(newConfig)),
            updated_by: userId || null
          }]);
        error = result.error;
      }

      if (error) throw error;

      setConfig(newConfig);
      return { success: true };
    } catch (error) {
      console.error('Error saving scoring config:', error);
      return { success: false, error };
    }
  };

  return {
    config,
    loading,
    saveConfig,
    refetch: fetchConfig
  };
};
