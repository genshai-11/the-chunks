import React, { useState, useEffect } from 'react';
import { X, Settings, RotateCcw } from 'lucide-react';
import { 
  AudioMetricsThresholds, 
  defaultAudioThresholds, 
  getAudioThresholds, 
  saveAudioThresholds 
} from '@/types/audioAnalysis';
import { 
  ScoringConfig, 
  defaultScoringConfig, 
  getScoringConfig, 
  saveScoringConfig 
} from '@/types/scoringConfig';
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
  const [scoring, setScoring] = useState<ScoringConfig>(defaultScoringConfig);
  const [masteryThreshold, setMasteryThreshold] = useState(80);
  const [activeTab, setActiveTab] = useState('thresholds');

  useEffect(() => {
    if (isOpen) {
      const config = getAnalysisConfig();
      setThresholds(config.thresholds);
      setMasteryThreshold(config.masteryThreshold);
      setScoring(getScoringConfig());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveAudioThresholds(thresholds);
    saveAnalysisConfig({ masteryThreshold, thresholds });
    saveScoringConfig(scoring);
    toast.success('Settings saved!');
    onClose();
  };

  const handleReset = () => {
    setThresholds(defaultAudioThresholds);
    setScoring(defaultScoringConfig);
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
            <h2 className="text-lg font-semibold">Analysis Settings (Admin)</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Main Tabs */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="thresholds">Ngưỡng phát hiện</TabsTrigger>
              <TabsTrigger value="scoring">Cấu hình điểm</TabsTrigger>
            </TabsList>

            {/* Thresholds Tab */}
            <TabsContent value="thresholds" className="space-y-4">
              {/* Mastery Threshold */}
              <div className="p-4 bg-muted rounded-xl">
                <Label className="text-sm font-medium">Ngưỡng thành thạo: {masteryThreshold}%</Label>
                <p className="text-xs text-muted-foreground mb-3">Điểm cần đạt để đánh dấu mục đã thành thạo</p>
                <Slider
                  value={[masteryThreshold]}
                  onValueChange={([v]) => setMasteryThreshold(v)}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <Tabs defaultValue="volume" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="volume" className="text-xs">Âm lượng</TabsTrigger>
                  <TabsTrigger value="speed" className="text-xs">Tốc độ</TabsTrigger>
                  <TabsTrigger value="latency" className="text-xs">Độ trễ</TabsTrigger>
                  <TabsTrigger value="pause" className="text-xs">Ngắt nghỉ</TabsTrigger>
                </TabsList>

                {/* Volume Settings */}
                <TabsContent value="volume" className="space-y-4">
                  <div className="p-4 bg-muted rounded-xl space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      🔊 Ngưỡng âm lượng (dB)
                    </h4>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Vùng nhỏ (dưới)</span>
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
                        <span>Vùng lớn (trên)</span>
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
                      <div className="text-xs text-muted-foreground mb-2">Xem trước vùng</div>
                      <div className="h-8 rounded-lg overflow-hidden flex">
                        <div 
                          className="bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-600"
                          style={{ width: `${((thresholds.volume.quiet.max + 60) / 60) * 100}%` }}
                        >
                          Nhỏ
                        </div>
                        <div 
                          className="bg-green-500/30 flex items-center justify-center text-[10px] text-green-600 flex-1"
                        >
                          Vừa ✓
                        </div>
                        <div 
                          className="bg-orange-500/30 flex items-center justify-center text-[10px] text-orange-600"
                          style={{ width: `${(Math.abs(thresholds.volume.loud.min) / 60) * 100}%` }}
                        >
                          Lớn
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Speed Settings */}
                <TabsContent value="speed" className="space-y-4">
                  <div className="p-4 bg-muted rounded-xl space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      🎤 Ngưỡng tốc độ nói (WPM)
                    </h4>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Vùng chậm (dưới)</span>
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
                        <span>Vùng nhanh (trên)</span>
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
                      <div className="text-xs text-muted-foreground mb-2">Xem trước vùng (0-250 WPM)</div>
                      <div className="h-8 rounded-lg overflow-hidden flex">
                        <div 
                          className="bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-600"
                          style={{ width: `${(thresholds.speechRate.slow.max / 250) * 100}%` }}
                        >
                          Chậm
                        </div>
                        <div 
                          className="bg-green-500/30 flex items-center justify-center text-[10px] text-green-600 flex-1"
                        >
                          Vừa ✓
                        </div>
                        <div 
                          className="bg-orange-500/30 flex items-center justify-center text-[10px] text-orange-600"
                          style={{ width: `${((250 - thresholds.speechRate.fast.min) / 250) * 100}%` }}
                        >
                          Nhanh
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Latency Settings */}
                <TabsContent value="latency" className="space-y-4">
                  <div className="p-4 bg-muted rounded-xl space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      ⏱️ Ngưỡng độ trễ phản hồi (ms)
                    </h4>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Xuất sắc (dưới)</span>
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
                        <span>Chấp nhận được (dưới)</span>
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
                        <span>Chậm (trên)</span>
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
                      ⏸️ Ngưỡng ngắt nghỉ
                    </h4>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Ngắt tự nhiên (dưới)</span>
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
                        <span>Chấp nhận được (dưới)</span>
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
                        <span>Quá lâu (trên)</span>
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
                        <span>Số lần ngắt tối đa/phút</span>
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
            </TabsContent>

            {/* Scoring Tab */}
            <TabsContent value="scoring" className="space-y-4">
              <p className="text-xs text-muted-foreground mb-4">
                Cấu hình cách tính điểm cho từng chỉ số. Điểm = 0 nếu vượt ngưỡng.
              </p>

              {/* Volume Scoring */}
              <div className="p-4 bg-muted rounded-xl space-y-3">
                <h4 className="text-sm font-medium">🔊 Điểm âm lượng (trọng số: {scoring.volume.weight}%)</h4>
                <p className="text-xs text-muted-foreground">Âm lượng lớn hơn = điểm cao hơn. Quá nhỏ hoặc quá lớn = 0 điểm.</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Mục tiêu (dB)</Label>
                    <Slider
                      value={[scoring.volume.targetDb]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, volume: { ...prev.volume, targetDb: v } }))}
                      min={-40}
                      max={-10}
                      step={1}
                    />
                    <span className="text-xs font-mono text-green-600">{scoring.volume.targetDb}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tối thiểu (dB)</Label>
                    <Slider
                      value={[scoring.volume.minDb]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, volume: { ...prev.volume, minDb: v } }))}
                      min={-60}
                      max={-30}
                      step={1}
                    />
                    <span className="text-xs font-mono text-red-600">{scoring.volume.minDb}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tối đa (dB)</Label>
                    <Slider
                      value={[scoring.volume.maxDb]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, volume: { ...prev.volume, maxDb: v } }))}
                      min={-20}
                      max={0}
                      step={1}
                    />
                    <span className="text-xs font-mono text-red-600">{scoring.volume.maxDb}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Trọng số (%)</Label>
                  <Slider
                    value={[scoring.volume.weight]}
                    onValueChange={([v]) => setScoring(prev => ({ ...prev, volume: { ...prev.volume, weight: v } }))}
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
              </div>

              {/* Speed Scoring */}
              <div className="p-4 bg-muted rounded-xl space-y-3">
                <h4 className="text-sm font-medium">🎤 Điểm tốc độ (trọng số: {scoring.speechRate.weight}%)</h4>
                <p className="text-xs text-muted-foreground">Nhanh hơn = điểm cao hơn. Quá chậm hoặc quá nhanh = 0 điểm.</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Mục tiêu (WPM)</Label>
                    <Slider
                      value={[scoring.speechRate.targetWpm]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, speechRate: { ...prev.speechRate, targetWpm: v } }))}
                      min={100}
                      max={180}
                      step={5}
                    />
                    <span className="text-xs font-mono text-green-600">{scoring.speechRate.targetWpm}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tối thiểu (WPM)</Label>
                    <Slider
                      value={[scoring.speechRate.minWpm]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, speechRate: { ...prev.speechRate, minWpm: v } }))}
                      min={50}
                      max={120}
                      step={5}
                    />
                    <span className="text-xs font-mono text-red-600">{scoring.speechRate.minWpm}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tối đa (WPM)</Label>
                    <Slider
                      value={[scoring.speechRate.maxWpm]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, speechRate: { ...prev.speechRate, maxWpm: v } }))}
                      min={150}
                      max={250}
                      step={5}
                    />
                    <span className="text-xs font-mono text-red-600">{scoring.speechRate.maxWpm}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Trọng số (%)</Label>
                  <Slider
                    value={[scoring.speechRate.weight]}
                    onValueChange={([v]) => setScoring(prev => ({ ...prev, speechRate: { ...prev.speechRate, weight: v } }))}
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
              </div>

              {/* Pause Scoring */}
              <div className="p-4 bg-muted rounded-xl space-y-3">
                <h4 className="text-sm font-medium">⏸️ Điểm ngắt nghỉ (trọng số: {scoring.pauseDuration.weight}%)</h4>
                <p className="text-xs text-muted-foreground">Ít ngắt nghỉ hơn = điểm cao hơn. Tổng thời gian ngắt quá dài = 0 điểm.</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tối đa mỗi lần (ms)</Label>
                    <Slider
                      value={[scoring.pauseDuration.maxAcceptableMs]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, pauseDuration: { ...prev.pauseDuration, maxAcceptableMs: v } }))}
                      min={500}
                      max={3000}
                      step={100}
                    />
                    <span className="text-xs font-mono">{scoring.pauseDuration.maxAcceptableMs}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tổng tối đa (ms)</Label>
                    <Slider
                      value={[scoring.pauseDuration.maxTotalPauseMs]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, pauseDuration: { ...prev.pauseDuration, maxTotalPauseMs: v } }))}
                      min={2000}
                      max={10000}
                      step={500}
                    />
                    <span className="text-xs font-mono">{scoring.pauseDuration.maxTotalPauseMs}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Trọng số (%)</Label>
                  <Slider
                    value={[scoring.pauseDuration.weight]}
                    onValueChange={([v]) => setScoring(prev => ({ ...prev, pauseDuration: { ...prev.pauseDuration, weight: v } }))}
                    min={0}
                    max={30}
                    step={5}
                  />
                </div>
              </div>

              {/* Latency Scoring */}
              <div className="p-4 bg-muted rounded-xl space-y-3">
                <h4 className="text-sm font-medium">⏱️ Điểm độ trễ (trọng số: {scoring.responseLatency.weight}%)</h4>
                <p className="text-xs text-muted-foreground">Phản hồi nhanh hơn = điểm cao hơn. Quá chậm = 0 điểm.</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Mục tiêu (ms)</Label>
                    <Slider
                      value={[scoring.responseLatency.targetMs]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, responseLatency: { ...prev.responseLatency, targetMs: v } }))}
                      min={200}
                      max={1000}
                      step={50}
                    />
                    <span className="text-xs font-mono text-green-600">{scoring.responseLatency.targetMs}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tối đa (ms)</Label>
                    <Slider
                      value={[scoring.responseLatency.maxMs]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, responseLatency: { ...prev.responseLatency, maxMs: v } }))}
                      min={1500}
                      max={5000}
                      step={100}
                    />
                    <span className="text-xs font-mono text-red-600">{scoring.responseLatency.maxMs}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Trọng số (%)</Label>
                  <Slider
                    value={[scoring.responseLatency.weight]}
                    onValueChange={([v]) => setScoring(prev => ({ ...prev, responseLatency: { ...prev.responseLatency, weight: v } }))}
                    min={0}
                    max={30}
                    step={5}
                  />
                </div>
              </div>

              {/* End Intensity Scoring */}
              <div className="p-4 bg-muted rounded-xl space-y-3">
                <h4 className="text-sm font-medium">📈 Điểm cường độ cuối (trọng số: {scoring.endIntensity.weight}%)</h4>
                <p className="text-xs text-muted-foreground">
                  Cả âm lượng và tốc độ tăng ở cuối = điểm tối đa. Chỉ một tăng = giảm điểm.
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Cả hai tăng</Label>
                    <Slider
                      value={[scoring.endIntensity.bothIncreasingBonus]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, endIntensity: { ...prev.endIntensity, bothIncreasingBonus: v } }))}
                      min={80}
                      max={100}
                      step={5}
                    />
                    <span className="text-xs font-mono text-green-600">{scoring.endIntensity.bothIncreasingBonus}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Chỉ một tăng</Label>
                    <Slider
                      value={[scoring.endIntensity.oneIncreasingScore]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, endIntensity: { ...prev.endIntensity, oneIncreasingScore: v } }))}
                      min={40}
                      max={80}
                      step={5}
                    />
                    <span className="text-xs font-mono text-yellow-600">{scoring.endIntensity.oneIncreasingScore}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ổn định</Label>
                    <Slider
                      value={[scoring.endIntensity.stableScore]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, endIntensity: { ...prev.endIntensity, stableScore: v } }))}
                      min={30}
                      max={70}
                      step={5}
                    />
                    <span className="text-xs font-mono">{scoring.endIntensity.stableScore}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Giảm dần</Label>
                    <Slider
                      value={[scoring.endIntensity.decreasingPenalty]}
                      onValueChange={([v]) => setScoring(prev => ({ ...prev, endIntensity: { ...prev.endIntensity, decreasingPenalty: v } }))}
                      min={0}
                      max={40}
                      step={5}
                    />
                    <span className="text-xs font-mono text-red-600">{scoring.endIntensity.decreasingPenalty}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Trọng số (%)</Label>
                  <Slider
                    value={[scoring.endIntensity.weight]}
                    onValueChange={([v]) => setScoring(prev => ({ ...prev, endIntensity: { ...prev.endIntensity, weight: v } }))}
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
              </div>

              {/* Total Weight Check */}
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <span className="text-sm font-medium">
                  Tổng trọng số: {scoring.volume.weight + scoring.speechRate.weight + scoring.pauseDuration.weight + scoring.responseLatency.weight + scoring.endIntensity.weight}%
                </span>
                {(scoring.volume.weight + scoring.speechRate.weight + scoring.pauseDuration.weight + scoring.responseLatency.weight + scoring.endIntensity.weight) !== 100 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ Nên tổng = 100%</p>
                )}
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
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
