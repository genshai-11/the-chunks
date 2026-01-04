import React, { useState, useEffect } from 'react';
import { X, Settings, RotateCcw } from 'lucide-react';
import { 
  AudioMetricsThresholds, 
  defaultAudioThresholds, 
  getAudioThresholds, 
  saveAudioThresholds 
} from '@/types/audioAnalysis';
import { getAnalysisConfig, saveAnalysisConfig } from '@/config/analysisConfig';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalysisSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisSettingsModal: React.FC<AnalysisSettingsModalProps> = ({ isOpen, onClose }) => {
  const [thresholds, setThresholds] = useState<AudioMetricsThresholds>(defaultAudioThresholds);
  const [masteryThreshold, setMasteryThreshold] = useState(80);

  useEffect(() => {
    if (isOpen) {
      const config = getAnalysisConfig();
      setThresholds(config.thresholds);
      setMasteryThreshold(config.masteryThreshold);
    }
  }, [isOpen]);

  const handleSave = () => {
    saveAudioThresholds(thresholds);
    saveAnalysisConfig({ masteryThreshold, thresholds });
    toast.success('Settings saved!');
    onClose();
  };

  const handleReset = () => {
    setThresholds(defaultAudioThresholds);
    setMasteryThreshold(80);
    toast.info('Reset to defaults (save to apply)');
  };

  const updateVolume = (key: keyof AudioMetricsThresholds['volume'], value: number) => {
    setThresholds(prev => ({
      ...prev,
      volume: { ...prev.volume, [key]: value }
    }));
  };

  const updateSpeechRate = (key: keyof AudioMetricsThresholds['speechRate'], value: number) => {
    setThresholds(prev => ({
      ...prev,
      speechRate: { ...prev.speechRate, [key]: value }
    }));
  };

  const updateLatency = (key: keyof AudioMetricsThresholds['responseLatency'], value: number) => {
    setThresholds(prev => ({
      ...prev,
      responseLatency: { ...prev.responseLatency, [key]: value }
    }));
  };

  const updatePause = (key: keyof AudioMetricsThresholds['pauseDuration'], value: number) => {
    setThresholds(prev => ({
      ...prev,
      pauseDuration: { ...prev.pauseDuration, [key]: value }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Analysis Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Mastery Threshold */}
          <div className="mb-6 p-4 bg-muted rounded-xl">
            <Label className="text-sm font-medium">Mastery Threshold: {masteryThreshold}%</Label>
            <p className="text-xs text-muted-foreground mb-3">Score needed to mark an item as mastered</p>
            <Slider
              value={[masteryThreshold]}
              onValueChange={([v]) => setMasteryThreshold(v)}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <Tabs defaultValue="volume" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="volume" className="text-xs">Volume</TabsTrigger>
              <TabsTrigger value="speed" className="text-xs">Speed</TabsTrigger>
              <TabsTrigger value="latency" className="text-xs">Latency</TabsTrigger>
              <TabsTrigger value="pause" className="text-xs">Pause</TabsTrigger>
            </TabsList>

            {/* Volume Settings */}
            <TabsContent value="volume" className="space-y-4">
              <div className="p-4 bg-muted rounded-xl space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  🔊 Volume Thresholds (dB)
                </h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Quiet Zone (below)</span>
                    <span className="font-mono text-blue-600">{thresholds.volume.quiet.max} dB</span>
                  </div>
                  <Slider
                    value={[thresholds.volume.quiet.max]}
                    onValueChange={([v]) => {
                      setThresholds(prev => ({
                        ...prev,
                        volume: { 
                          ...prev.volume, 
                          quiet: { ...prev.volume.quiet, max: v },
                          normal: { ...prev.volume.normal, min: v }
                        }
                      }));
                    }}
                    min={-60}
                    max={-20}
                    step={1}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Loud Zone (above)</span>
                    <span className="font-mono text-orange-600">{thresholds.volume.loud.min} dB</span>
                  </div>
                  <Slider
                    value={[thresholds.volume.loud.min]}
                    onValueChange={([v]) => {
                      setThresholds(prev => ({
                        ...prev,
                        volume: { 
                          ...prev.volume, 
                          loud: { ...prev.volume.loud, min: v },
                          normal: { ...prev.volume.normal, max: v }
                        }
                      }));
                    }}
                    min={-40}
                    max={0}
                    step={1}
                  />
                </div>

                {/* Visual Zone Preview */}
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-2">Zone Preview</div>
                  <div className="h-8 rounded-lg overflow-hidden flex">
                    <div 
                      className="bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-600"
                      style={{ width: `${((thresholds.volume.quiet.max + 60) / 60) * 100}%` }}
                    >
                      Quiet
                    </div>
                    <div 
                      className="bg-green-500/30 flex items-center justify-center text-[10px] text-green-600 flex-1"
                    >
                      Normal ✓
                    </div>
                    <div 
                      className="bg-orange-500/30 flex items-center justify-center text-[10px] text-orange-600"
                      style={{ width: `${(Math.abs(thresholds.volume.loud.min) / 60) * 100}%` }}
                    >
                      Loud
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Speed Settings */}
            <TabsContent value="speed" className="space-y-4">
              <div className="p-4 bg-muted rounded-xl space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  🎤 Speech Rate Thresholds (WPM)
                </h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Slow Zone (below)</span>
                    <span className="font-mono text-blue-600">{thresholds.speechRate.slow.max} WPM</span>
                  </div>
                  <Slider
                    value={[thresholds.speechRate.slow.max]}
                    onValueChange={([v]) => {
                      setThresholds(prev => ({
                        ...prev,
                        speechRate: { 
                          ...prev.speechRate, 
                          slow: { ...prev.speechRate.slow, max: v },
                          normal: { ...prev.speechRate.normal, min: v }
                        }
                      }));
                    }}
                    min={60}
                    max={140}
                    step={5}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Fast Zone (above)</span>
                    <span className="font-mono text-orange-600">{thresholds.speechRate.fast.min} WPM</span>
                  </div>
                  <Slider
                    value={[thresholds.speechRate.fast.min]}
                    onValueChange={([v]) => {
                      setThresholds(prev => ({
                        ...prev,
                        speechRate: { 
                          ...prev.speechRate, 
                          fast: { ...prev.speechRate.fast, min: v },
                          normal: { ...prev.speechRate.normal, max: v }
                        }
                      }));
                    }}
                    min={120}
                    max={220}
                    step={5}
                  />
                </div>

                {/* Visual Zone Preview */}
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-2">Zone Preview (0-250 WPM)</div>
                  <div className="h-8 rounded-lg overflow-hidden flex">
                    <div 
                      className="bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-600"
                      style={{ width: `${(thresholds.speechRate.slow.max / 250) * 100}%` }}
                    >
                      Slow
                    </div>
                    <div 
                      className="bg-green-500/30 flex items-center justify-center text-[10px] text-green-600 flex-1"
                    >
                      Normal ✓
                    </div>
                    <div 
                      className="bg-orange-500/30 flex items-center justify-center text-[10px] text-orange-600"
                      style={{ width: `${((250 - thresholds.speechRate.fast.min) / 250) * 100}%` }}
                    >
                      Fast
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Latency Settings */}
            <TabsContent value="latency" className="space-y-4">
              <div className="p-4 bg-muted rounded-xl space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  ⏱️ Response Latency Thresholds (ms)
                </h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Excellent (under)</span>
                    <span className="font-mono text-green-600">{thresholds.responseLatency.excellent} ms</span>
                  </div>
                  <Slider
                    value={[thresholds.responseLatency.excellent]}
                    onValueChange={([v]) => updateLatency('excellent', v)}
                    min={200}
                    max={1000}
                    step={50}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Acceptable (under)</span>
                    <span className="font-mono text-yellow-600">{thresholds.responseLatency.acceptable} ms</span>
                  </div>
                  <Slider
                    value={[thresholds.responseLatency.acceptable]}
                    onValueChange={([v]) => updateLatency('acceptable', v)}
                    min={500}
                    max={3000}
                    step={100}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Poor (over)</span>
                    <span className="font-mono text-red-600">{thresholds.responseLatency.poor} ms</span>
                  </div>
                  <Slider
                    value={[thresholds.responseLatency.poor]}
                    onValueChange={([v]) => updateLatency('poor', v)}
                    min={1000}
                    max={5000}
                    step={100}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Pause Settings */}
            <TabsContent value="pause" className="space-y-4">
              <div className="p-4 bg-muted rounded-xl space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  ⏸️ Pause Duration Thresholds
                </h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Natural Pause (under)</span>
                    <span className="font-mono text-green-600">{thresholds.pauseDuration.natural} ms</span>
                  </div>
                  <Slider
                    value={[thresholds.pauseDuration.natural]}
                    onValueChange={([v]) => updatePause('natural', v)}
                    min={100}
                    max={600}
                    step={50}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Acceptable Pause (under)</span>
                    <span className="font-mono text-yellow-600">{thresholds.pauseDuration.acceptable} ms</span>
                  </div>
                  <Slider
                    value={[thresholds.pauseDuration.acceptable]}
                    onValueChange={([v]) => updatePause('acceptable', v)}
                    min={300}
                    max={1500}
                    step={50}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Excessive Pause (over)</span>
                    <span className="font-mono text-red-600">{thresholds.pauseDuration.excessive} ms</span>
                  </div>
                  <Slider
                    value={[thresholds.pauseDuration.excessive]}
                    onValueChange={([v]) => updatePause('excessive', v)}
                    min={1000}
                    max={5000}
                    step={100}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Max Pauses/Minute</span>
                    <span className="font-mono">{thresholds.pauseDuration.maxFrequency}</span>
                  </div>
                  <Slider
                    value={[thresholds.pauseDuration.maxFrequency]}
                    onValueChange={([v]) => updatePause('maxFrequency', v)}
                    min={2}
                    max={20}
                    step={1}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
