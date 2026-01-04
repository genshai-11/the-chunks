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
}

const ChartCard: React.FC<{
  title: string;
  score: number;
  note: string;
  children: React.ReactNode;
}> = ({ title, score, note, children }) => (
  <div className="bg-muted rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
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
    <div className="h-32 mb-2">{children}</div>
    <p className="text-xs text-muted-foreground">{note}</p>
  </div>
);

const VolumeChart: React.FC<{ segments: VolumeSegment[]; thresholds: ComprehensiveAudioAnalysis['thresholds']['volume'] }> = ({
  segments,
  thresholds,
}) => {
  const data = segments.map((seg, i) => ({
    time: `${seg.startTime.toFixed(1)}s`,
    avgDb: seg.avgDb,
    level: seg.level,
  }));

  const getBarColor = (level: string) => {
    switch (level) {
      case 'quiet':
        return 'hsl(var(--warning))';
      case 'loud':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--primary))';
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          domain={[-60, 0]}
          tick={{ fontSize: 10 }}
          stroke="hsl(var(--muted-foreground))"
          label={{ value: 'dB', angle: -90, position: 'insideLeft', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value.toFixed(1)} dB`, 'Volume']}
        />
        <ReferenceLine y={thresholds.targetMin} stroke="hsl(var(--success))" strokeDasharray="3 3" />
        <ReferenceLine y={thresholds.targetMax} stroke="hsl(var(--success))" strokeDasharray="3 3" />
        <Bar dataKey="avgDb" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.level)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const SpeechRateChart: React.FC<{
  segments: SpeechRateSegment[];
  thresholds: ComprehensiveAudioAnalysis['thresholds']['speechRate'];
}> = ({ segments, thresholds }) => {
  const data = segments.map((seg) => ({
    time: `${seg.startTime.toFixed(1)}s`,
    wpm: seg.wpm,
    level: seg.level,
  }));

  const getColor = (level: string) => {
    switch (level) {
      case 'slow':
        return 'hsl(var(--warning))';
      case 'fast':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--primary))';
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          domain={[0, 250]}
          tick={{ fontSize: 10 }}
          stroke="hsl(var(--muted-foreground))"
          label={{ value: 'WPM', angle: -90, position: 'insideLeft', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${Math.round(value)} WPM`, 'Speed']}
        />
        <ReferenceLine y={thresholds.targetMin} stroke="hsl(var(--success))" strokeDasharray="3 3" />
        <ReferenceLine y={thresholds.targetMax} stroke="hsl(var(--success))" strokeDasharray="3 3" />
        <defs>
          <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="wpm"
          stroke="hsl(var(--primary))"
          fill="url(#speedGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const PauseChart: React.FC<{
  pauses: PauseSegment[];
  thresholds: ComprehensiveAudioAnalysis['thresholds']['pauseDuration'];
  audioDuration: number;
}> = ({ pauses, thresholds, audioDuration }) => {
  // Create timeline with speech vs pause segments
  const data: { time: string; value: number; type: 'speech' | 'pause' | 'excessive' }[] = [];
  let lastEnd = 0;

  pauses.forEach((pause) => {
    // Add speech segment before pause
    if (pause.startTime > lastEnd) {
      data.push({
        time: `${lastEnd.toFixed(1)}s`,
        value: 1,
        type: 'speech',
      });
    }
    // Add pause segment
    data.push({
      time: `${pause.startTime.toFixed(1)}s`,
      value: -pause.durationMs / 1000,
      type: pause.isExcessive ? 'excessive' : 'pause',
    });
    lastEnd = pause.endTime;
  });

  // Add final speech segment
  if (lastEnd < audioDuration / 1000) {
    data.push({
      time: `${lastEnd.toFixed(1)}s`,
      value: 1,
      type: 'speech',
    });
  }

  const getBarColor = (type: string) => {
    switch (type) {
      case 'excessive':
        return 'hsl(var(--destructive))';
      case 'pause':
        return 'hsl(var(--warning))';
      default:
        return 'hsl(var(--primary))';
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          domain={[-3, 2]}
          tick={{ fontSize: 10 }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v) => (v >= 0 ? 'Speech' : `${Math.abs(v).toFixed(1)}s`)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string, props: { payload: { type: string } }) =>
            props.payload.type === 'speech'
              ? ['Active', 'Speech']
              : [`${(Math.abs(value) * 1000).toFixed(0)}ms`, 'Pause']
          }
        />
        <ReferenceLine y={-thresholds.acceptable / 1000} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const LatencyIndicator: React.FC<{
  latency: ComprehensiveAudioAnalysis['responseLatencyAnalysis'];
  thresholds: ComprehensiveAudioAnalysis['thresholds']['responseLatency'];
}> = ({ latency, thresholds }) => {
  const percentage = Math.min(100, (latency.delayMs / thresholds.poor) * 100);
  const getColor = () => {
    if (latency.delayMs <= thresholds.excellent) return 'bg-green-500';
    if (latency.delayMs <= thresholds.acceptable) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Response Time</span>
        <span className="font-mono font-bold">{latency.delayMs}ms</span>
      </div>
      <div className="h-3 bg-muted-foreground/20 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0ms</span>
        <span className="text-green-600">{thresholds.excellent}ms</span>
        <span className="text-yellow-600">{thresholds.acceptable}ms</span>
        <span className="text-red-600">{thresholds.poor}ms</span>
      </div>
    </div>
  );
};

const EndIntensityChart: React.FC<{
  analysis: ComprehensiveAudioAnalysis['endIntensityAnalysis'];
}> = ({ analysis }) => {
  const data = [
    { name: 'Prev', volume: analysis.previousSegmentDb, speed: analysis.previousSegmentWpm },
    { name: 'Final', volume: analysis.finalSegmentDb, speed: analysis.finalSegmentWpm },
    { name: 'Avg', volume: analysis.overallAvgDb, speed: analysis.overallAvgWpm },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-muted-foreground mb-2 text-center">Volume Comparison</div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.name === 'Final' && analysis.isAbnormalVolume
                      ? 'hsl(var(--destructive))'
                      : 'hsl(var(--primary))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-2 text-center">Speed Comparison</div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="speed" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.name === 'Final' && analysis.isAbnormalSpeed
                      ? 'hsl(var(--destructive))'
                      : 'hsl(var(--primary))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {(analysis.isAbnormalVolume || analysis.isAbnormalSpeed) && (
        <div className="col-span-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg p-2">
          ⚠️ {analysis.isAbnormalVolume && 'Volume '}
          {analysis.isAbnormalVolume && analysis.isAbnormalSpeed && '& '}
          {analysis.isAbnormalSpeed && 'Speed '}
          spike detected at end ({analysis.stdDevFromMean.toFixed(1)} std dev)
        </div>
      )}
    </div>
  );
};

export const AudioMetricsCharts: React.FC<AudioMetricsChartsProps> = ({ analysis }) => {
  return (
    <div className="space-y-4">
      {/* Volume Analysis */}
      <ChartCard
        title="📊 Volume Analysis"
        score={analysis.volumeAnalysis.score}
        note={analysis.volumeAnalysis.note}
      >
        <VolumeChart segments={analysis.volumeAnalysis.segments} thresholds={analysis.thresholds.volume} />
      </ChartCard>

      {/* Speech Rate */}
      <ChartCard
        title="🎤 Speech Rate"
        score={analysis.speechRateAnalysis.score}
        note={analysis.speechRateAnalysis.note}
      >
        <SpeechRateChart segments={analysis.speechRateAnalysis.segments} thresholds={analysis.thresholds.speechRate} />
      </ChartCard>

      {/* Response Latency */}
      <ChartCard
        title="⏱️ Response Latency"
        score={analysis.responseLatencyAnalysis.score}
        note={analysis.responseLatencyAnalysis.note}
      >
        <LatencyIndicator latency={analysis.responseLatencyAnalysis} thresholds={analysis.thresholds.responseLatency} />
      </ChartCard>

      {/* Pause Duration */}
      <ChartCard
        title="⏸️ Pause Analysis"
        score={analysis.pauseDurationAnalysis.score}
        note={analysis.pauseDurationAnalysis.note}
      >
        <PauseChart
          pauses={analysis.pauseDurationAnalysis.pauses}
          thresholds={analysis.thresholds.pauseDuration}
          audioDuration={analysis.audioDurationMs}
        />
      </ChartCard>

      {/* End Intensity */}
      <ChartCard
        title="📈 End Intensity"
        score={analysis.endIntensityAnalysis.score}
        note={analysis.endIntensityAnalysis.note}
      >
        <EndIntensityChart analysis={analysis.endIntensityAnalysis} />
      </ChartCard>
    </div>
  );
};
