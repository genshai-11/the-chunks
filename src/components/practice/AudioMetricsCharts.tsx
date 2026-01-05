import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from 'recharts';
import {
  ComprehensiveAudioAnalysis,
  VolumeSegment,
  SpeechRateSegment,
  PauseSegment,
} from '@/types/audioAnalysis';
import { cn } from '@/lib/utils';

interface AudioMetricsChartsProps {
  analysis: ComprehensiveAudioAnalysis;
  emotionBreakdown?: ComprehensiveAudioAnalysis['emotionBreakdown'];
}

// Helper to get Vietnamese labels
const getVolumeLabel = (level: string) => {
  switch (level) {
    case 'quiet': return 'Nhỏ';
    case 'loud': return 'Lớn';
    default: return 'Vừa';
  }
};

const getSpeedLabel = (level: string) => {
  switch (level) {
    case 'slow': return 'Chậm';
    case 'fast': return 'Nhanh';
    default: return 'Vừa';
  }
};

const ChartCard: React.FC<{
  title: string;
  score: number;
  label?: string;
  labelColor?: string;
  children: React.ReactNode;
}> = ({ title, score, label, labelColor, children }) => (
  <div className="bg-muted rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="flex items-center gap-2">
        {label && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', labelColor)}>
            {label}
          </span>
        )}
        <span
          className={cn(
            'text-sm font-bold px-2 py-0.5 rounded-full',
            score >= 80
              ? 'bg-green-500/10 text-green-600'
              : score >= 60
              ? 'bg-yellow-500/10 text-yellow-600'
              : 'bg-red-500/10 text-red-600'
          )}
        >
          {score}
        </span>
      </div>
    </div>
    {children}
  </div>
);

// Volume Chart with correct orientation (higher = louder)
const VolumeChart: React.FC<{ 
  segments: VolumeSegment[]; 
  thresholds: ComprehensiveAudioAnalysis['thresholds']['volume'];
  overallLevel: string;
}> = ({ segments, thresholds, overallLevel }) => {
  // Convert dB to positive scale for intuitive visualization (0 = silent, 60 = loudest)
  const data = segments.map((seg) => ({
    time: `${seg.startTime.toFixed(1)}s`,
    volume: seg.avgDb + 60, // Convert -60~0 to 0~60
    level: seg.level,
    originalDb: seg.avgDb,
  }));

  const quietThreshold = thresholds.quiet.max + 60;
  const loudThreshold = thresholds.loud.min + 60;

  const getBarColor = (level: string) => {
    switch (level) {
      case 'quiet': return '#3b82f6';
      case 'loud': return '#f97316';
      default: return '#22c55e';
    }
  };

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Nhỏ</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Vừa ✓</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span> Lớn</span>
      </div>
      
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="quietZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="normalZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="loudZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <ReferenceArea y1={0} y2={quietThreshold} fill="url(#quietZoneBg)" />
            <ReferenceArea y1={quietThreshold} y2={loudThreshold} fill="url(#normalZoneBg)" />
            <ReferenceArea y1={loudThreshold} y2={60} fill="url(#loudZoneBg)" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              domain={[0, 60]}
              tick={{ fontSize: 9 }}
              stroke="hsl(var(--muted-foreground))"
              ticks={[0, quietThreshold, loudThreshold, 60]}
              tickFormatter={(v) => {
                if (v === 0) return '🔇';
                if (v === 60) return '🔊';
                return '';
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string, props: { payload: { level: string; originalDb: number } }) => [
                `${props.payload.originalDb.toFixed(1)} dB (${getVolumeLabel(props.payload.level)})`,
                'Âm lượng'
              ]}
            />
            <ReferenceLine y={quietThreshold} stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" />
            <ReferenceLine y={loudThreshold} stroke="#f97316" strokeWidth={1} strokeDasharray="3 3" />
            <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.level)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Speech Rate Chart with zones
const SpeechRateChart: React.FC<{
  segments: SpeechRateSegment[];
  thresholds: ComprehensiveAudioAnalysis['thresholds']['speechRate'];
  overallLevel: string;
  overallWpm: number;
}> = ({ segments, thresholds, overallLevel, overallWpm }) => {
  const data = segments.map((seg) => ({
    time: `${seg.startTime.toFixed(1)}s`,
    wpm: seg.wpm,
    level: seg.level,
  }));

  const getLineColor = () => {
    switch (overallLevel) {
      case 'slow': return '#3b82f6';
      case 'fast': return '#f97316';
      default: return '#22c55e';
    }
  };

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Chậm</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Vừa ✓</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span> Nhanh</span>
      </div>
      
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="slowZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="normalSpeedZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="fastZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getLineColor()} stopOpacity={0.5} />
                <stop offset="95%" stopColor={getLineColor()} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <ReferenceArea y1={0} y2={thresholds.slow.max} fill="url(#slowZoneBg)" />
            <ReferenceArea y1={thresholds.slow.max} y2={thresholds.fast.min} fill="url(#normalSpeedZoneBg)" />
            <ReferenceArea y1={thresholds.fast.min} y2={250} fill="url(#fastZoneBg)" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              domain={[0, 250]}
              tick={{ fontSize: 9 }}
              stroke="hsl(var(--muted-foreground))"
              ticks={[0, thresholds.slow.max, thresholds.fast.min, 250]}
              tickFormatter={(v) => {
                if (v === 0) return '🐢';
                if (v === 250) return '🐇';
                return '';
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string, props: { payload: { level: string } }) => [
                `${Math.round(value)} WPM (${getSpeedLabel(props.payload.level)})`,
                'Tốc độ'
              ]}
            />
            <ReferenceLine y={thresholds.slow.max} stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" />
            <ReferenceLine y={thresholds.fast.min} stroke="#f97316" strokeWidth={1} strokeDasharray="3 3" />
            {/* Current position indicator */}
            <ReferenceLine y={overallWpm} stroke={getLineColor()} strokeWidth={2} label={{ value: `${Math.round(overallWpm)}`, position: 'right', fontSize: 10, fill: getLineColor() }} />
            <Area
              type="monotone"
              dataKey="wpm"
              stroke={getLineColor()}
              fill="url(#speedFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Pause Analysis as Statistics View
const PauseStats: React.FC<{
  pauseAnalysis: ComprehensiveAudioAnalysis['pauseDurationAnalysis'];
  thresholds: ComprehensiveAudioAnalysis['thresholds']['pauseDuration'];
}> = ({ pauseAnalysis, thresholds }) => {
  const hasPauses = pauseAnalysis.pauses.length > 0;
  const excessivePauses = pauseAnalysis.pauses.filter(p => p.isExcessive).length;
  const longestPause = hasPauses ? Math.max(...pauseAnalysis.pauses.map(p => p.durationMs)) : 0;
  
  const getPauseStatus = () => {
    if (!hasPauses) return { label: 'Không ngắt', color: 'bg-green-500/10 text-green-600', icon: '✓' };
    if (excessivePauses > 0) return { label: 'Ngắt quá lâu', color: 'bg-red-500/10 text-red-600', icon: '⚠️' };
    if (pauseAnalysis.averagePauseDuration > thresholds.acceptable) return { label: 'Ngắt hơi lâu', color: 'bg-yellow-500/10 text-yellow-600', icon: '⏸️' };
    return { label: 'Ngắt tự nhiên', color: 'bg-green-500/10 text-green-600', icon: '✓' };
  };
  
  const status = getPauseStatus();

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex justify-center">
        <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', status.color)}>
          {status.icon} {status.label}
        </span>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-background rounded-lg p-2">
          <div className="text-lg font-bold">{pauseAnalysis.pauses.length}</div>
          <div className="text-[10px] text-muted-foreground">Số lần ngắt</div>
        </div>
        <div className="bg-background rounded-lg p-2">
          <div className="text-lg font-bold">{hasPauses ? Math.round(pauseAnalysis.averagePauseDuration) : 0}</div>
          <div className="text-[10px] text-muted-foreground">TB (ms)</div>
        </div>
        <div className="bg-background rounded-lg p-2">
          <div className="text-lg font-bold">{Math.round(longestPause)}</div>
          <div className="text-[10px] text-muted-foreground">Dài nhất (ms)</div>
        </div>
      </div>

      {/* Threshold Reference */}
      <div className="text-xs text-muted-foreground text-center">
        Tự nhiên: &lt;{thresholds.natural}ms • Chấp nhận: &lt;{thresholds.acceptable}ms • Quá lâu: &gt;{thresholds.excessive}ms
      </div>

      {/* Pause List if any excessive */}
      {excessivePauses > 0 && (
        <div className="text-xs text-red-600 bg-red-500/10 rounded-lg p-2">
          ⚠️ {excessivePauses} lần ngắt quá {thresholds.excessive}ms
        </div>
      )}
    </div>
  );
};

// Response Latency
const LatencyIndicator: React.FC<{
  latency: ComprehensiveAudioAnalysis['responseLatencyAnalysis'];
  thresholds: ComprehensiveAudioAnalysis['thresholds']['responseLatency'];
}> = ({ latency, thresholds }) => {
  const percentage = Math.min(100, (latency.delayMs / thresholds.poor) * 100);
  
  const getStatus = () => {
    if (latency.delayMs <= thresholds.excellent) return { label: 'Nhanh', color: 'bg-green-500', textColor: 'text-green-600' };
    if (latency.delayMs <= thresholds.acceptable) return { label: 'Bình thường', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    return { label: 'Chậm', color: 'bg-red-500', textColor: 'text-red-600' };
  };

  const status = getStatus();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Thời gian phản hồi</span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">{latency.delayMs}ms</span>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', status.color + '/10', status.textColor)}>
            {status.label}
          </span>
        </div>
      </div>
      <div className="h-3 bg-muted-foreground/20 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', status.color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0ms</span>
        <span className="text-green-600">Nhanh (&lt;{thresholds.excellent})</span>
        <span className="text-yellow-600">OK (&lt;{thresholds.acceptable})</span>
        <span className="text-red-600">Chậm</span>
      </div>
    </div>
  );
};

// End Intensity Analysis with Labels
const EndIntensityStats: React.FC<{
  analysis: ComprehensiveAudioAnalysis['endIntensityAnalysis'];
}> = ({ analysis }) => {
  // Calculate changes
  const volumeChange = analysis.finalSegmentDb - analysis.previousSegmentDb;
  const speedChange = analysis.finalSegmentWpm - analysis.previousSegmentWpm;
  const volumeVsAvg = analysis.finalSegmentDb - analysis.overallAvgDb;
  const speedVsAvg = analysis.finalSegmentWpm - analysis.overallAvgWpm;

  const getVolumeStatus = () => {
    if (analysis.isAbnormalVolume) {
      return volumeChange > 0 
        ? { label: 'Lớn hơn ở cuối', icon: '🔊↑', color: 'text-orange-600 bg-orange-500/10' }
        : { label: 'Nhỏ hơn ở cuối', icon: '🔇↓', color: 'text-blue-600 bg-blue-500/10' };
    }
    return { label: 'Ổn định', icon: '✓', color: 'text-green-600 bg-green-500/10' };
  };

  const getSpeedStatus = () => {
    if (analysis.isAbnormalSpeed) {
      return speedChange > 0 
        ? { label: 'Nhanh hơn ở cuối', icon: '🐇↑', color: 'text-orange-600 bg-orange-500/10' }
        : { label: 'Chậm hơn ở cuối', icon: '🐢↓', color: 'text-blue-600 bg-blue-500/10' };
    }
    return { label: 'Ổn định', icon: '✓', color: 'text-green-600 bg-green-500/10' };
  };

  const volumeStatus = getVolumeStatus();
  const speedStatus = getSpeedStatus();

  // Combined status
  const getCombinedStatus = () => {
    if (analysis.isAbnormalVolume && analysis.isAbnormalSpeed) {
      const bothIncreasing = volumeChange > 0 && speedChange > 0;
      const bothDecreasing = volumeChange < 0 && speedChange < 0;
      if (bothIncreasing) return { label: 'Cả âm lượng và tốc độ tăng ở cuối!', color: 'text-red-600 bg-red-500/10', icon: '⚠️' };
      if (bothDecreasing) return { label: 'Cả âm lượng và tốc độ giảm ở cuối', color: 'text-yellow-600 bg-yellow-500/10', icon: '📉' };
      return { label: 'Biến động cuối bài', color: 'text-yellow-600 bg-yellow-500/10', icon: '⚡' };
    }
    if (analysis.isAbnormalVolume || analysis.isAbnormalSpeed) {
      return { label: 'Có biến động nhẹ', color: 'text-yellow-600 bg-yellow-500/10', icon: '📊' };
    }
    return { label: 'Kết thúc ổn định', color: 'text-green-600 bg-green-500/10', icon: '✓' };
  };

  const combinedStatus = getCombinedStatus();

  return (
    <div className="space-y-3">
      {/* Combined Status */}
      <div className="flex justify-center">
        <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', combinedStatus.color)}>
          {combinedStatus.icon} {combinedStatus.label}
        </span>
      </div>

      {/* Individual metrics */}
      <div className="grid grid-cols-2 gap-3">
        {/* Volume */}
        <div className="bg-background rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Âm lượng</div>
          <span className={cn('px-2 py-1 rounded text-xs font-medium', volumeStatus.color)}>
            {volumeStatus.icon} {volumeStatus.label}
          </span>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Cuối: {analysis.finalSegmentDb.toFixed(0)}dB vs TB: {analysis.overallAvgDb.toFixed(0)}dB
          </div>
        </div>

        {/* Speed */}
        <div className="bg-background rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Tốc độ</div>
          <span className={cn('px-2 py-1 rounded text-xs font-medium', speedStatus.color)}>
            {speedStatus.icon} {speedStatus.label}
          </span>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Cuối: {Math.round(analysis.finalSegmentWpm)}WPM vs TB: {Math.round(analysis.overallAvgWpm)}WPM
          </div>
        </div>
      </div>
    </div>
  );
};

export const AudioMetricsCharts: React.FC<AudioMetricsChartsProps> = ({ analysis }) => {
  // Use emotionBreakdown scores (from scoring config) instead of old analysis scores
  const emotionBreakdown = analysis.emotionBreakdown;

  // Determine overall levels for labels
  const volumeLevel = analysis.volumeAnalysis.overallAvgDb < analysis.thresholds.volume.quiet.max 
    ? 'quiet' 
    : analysis.volumeAnalysis.overallAvgDb > analysis.thresholds.volume.loud.min 
      ? 'loud' 
      : 'normal';

  const speedLevel = analysis.speechRateAnalysis.overallWpm < analysis.thresholds.speechRate.slow.max 
    ? 'slow' 
    : analysis.speechRateAnalysis.overallWpm > analysis.thresholds.speechRate.fast.min 
      ? 'fast' 
      : 'normal';

  const getVolumeLabelColor = () => {
    switch (volumeLevel) {
      case 'quiet': return 'bg-blue-500/10 text-blue-600';
      case 'loud': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-green-500/10 text-green-600';
    }
  };

  const getSpeedLabelColor = () => {
    switch (speedLevel) {
      case 'slow': return 'bg-blue-500/10 text-blue-600';
      case 'fast': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-green-500/10 text-green-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Volume Analysis */}
      <ChartCard
        title="📊 Phân tích âm lượng"
        score={emotionBreakdown?.volume.raw ?? analysis.volumeAnalysis.score}
        label={getVolumeLabel(volumeLevel)}
        labelColor={getVolumeLabelColor()}
      >
        <VolumeChart 
          segments={analysis.volumeAnalysis.segments} 
          thresholds={analysis.thresholds.volume}
          overallLevel={volumeLevel}
        />
      </ChartCard>

      {/* Speech Rate */}
      <ChartCard
        title="🎤 Tốc độ nói"
        score={emotionBreakdown?.speechRate.raw ?? analysis.speechRateAnalysis.score}
        label={`${getSpeedLabel(speedLevel)} (${Math.round(analysis.speechRateAnalysis.overallWpm)} WPM)`}
        labelColor={getSpeedLabelColor()}
      >
        <SpeechRateChart 
          segments={analysis.speechRateAnalysis.segments} 
          thresholds={analysis.thresholds.speechRate}
          overallLevel={speedLevel}
          overallWpm={analysis.speechRateAnalysis.overallWpm}
        />
      </ChartCard>

      {/* Response Latency */}
      <ChartCard
        title="⏱️ Độ trễ phản hồi"
        score={emotionBreakdown?.latency.raw ?? analysis.responseLatencyAnalysis.score}
      >
        <LatencyIndicator latency={analysis.responseLatencyAnalysis} thresholds={analysis.thresholds.responseLatency} />
      </ChartCard>

      {/* Pause Duration - Statistics View */}
      <ChartCard
        title="⏸️ Phân tích ngắt nghỉ"
        score={emotionBreakdown?.pause.raw ?? analysis.pauseDurationAnalysis.score}
      >
        <PauseStats 
          pauseAnalysis={analysis.pauseDurationAnalysis}
          thresholds={analysis.thresholds.pauseDuration}
        />
      </ChartCard>

      {/* End Intensity - Statistics View with Labels */}
      <ChartCard
        title="📈 Cường độ cuối bài"
        score={emotionBreakdown?.endIntensity.raw ?? analysis.endIntensityAnalysis.score}
      >
        <EndIntensityStats analysis={analysis.endIntensityAnalysis} />
      </ChartCard>
    </div>
  );
};
