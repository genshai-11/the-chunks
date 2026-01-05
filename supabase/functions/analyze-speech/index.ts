import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TYPE DEFINITIONS ============

interface AudioMetricsThresholds {
  volume: {
    quiet: { min: number; max: number };
    normal: { min: number; max: number };
    loud: { min: number; max: number };
    targetMin: number;
    targetMax: number;
  };
  speechRate: {
    slow: { min: number; max: number };
    normal: { min: number; max: number };
    fast: { min: number; max: number };
    targetMin: number;
    targetMax: number;
  };
  responseLatency: {
    excellent: number;
    acceptable: number;
    poor: number;
  };
  pauseDuration: {
    natural: number;
    acceptable: number;
    excessive: number;
    maxFrequency: number;
  };
  endIntensity: {
    volumeDeviationThreshold: number;
    speedDeviationThreshold: number;
  };
}

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: DeepgramWord[];
      }>;
    }>;
  };
  metadata?: {
    duration?: number;
  };
}

interface VolumeSegment {
  startTime: number;
  endTime: number;
  avgDb: number;
  minDb: number;
  maxDb: number;
  level: 'quiet' | 'normal' | 'loud';
}

interface SpeechRateSegment {
  startTime: number;
  endTime: number;
  wpm: number;
  syllablesPerSecond: number;
  level: 'slow' | 'normal' | 'fast';
}

interface PauseSegment {
  startTime: number;
  endTime: number;
  durationMs: number;
  isExcessive: boolean;
}

// Simplified Emotion Scoring Config - matches frontend
interface EmotionScoringConfig {
  volume: { weight: number; threshold: number; target: number };
  speechRate: { weight: number; threshold: number; target: number };
  pauseDuration: { weight: number; maxAcceptableMs: number; maxTotalMs: number };
  responseLatency: { weight: number; target: number; threshold: number };
  endIntensity: {
    weight: number;
    bothIncreasingScore: number;
    oneIncreasingScore: number;
    stableScore: number;
    decreasingScore: number;
  };
}

const defaultScoringConfig: EmotionScoringConfig = {
  volume: { weight: 20, threshold: -45, target: -20 },
  speechRate: { weight: 25, threshold: 80, target: 150 },
  pauseDuration: { weight: 15, maxAcceptableMs: 1500, maxTotalMs: 5000 },
  responseLatency: { weight: 15, target: 500, threshold: 3000 },
  endIntensity: {
    weight: 25,
    bothIncreasingScore: 100,
    oneIncreasingScore: 70,
    stableScore: 50,
    decreasingScore: 20,
  },
};

const defaultThresholds: AudioMetricsThresholds = {
  volume: {
    quiet: { min: -60, max: -40 },
    normal: { min: -40, max: -20 },
    loud: { min: -20, max: 0 },
    targetMin: -35,
    targetMax: -15,
  },
  speechRate: {
    slow: { min: 0, max: 100 },
    normal: { min: 100, max: 160 },
    fast: { min: 160, max: 300 },
    targetMin: 120,
    targetMax: 150,
  },
  responseLatency: {
    excellent: 500,
    acceptable: 1500,
    poor: 3000,
  },
  pauseDuration: {
    natural: 300,
    acceptable: 800,
    excessive: 2000,
    maxFrequency: 8,
  },
  endIntensity: {
    volumeDeviationThreshold: 1.5,
    speedDeviationThreshold: 30,
  },
};

// ============ HELPER FUNCTIONS ============

function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  if (a.includes(b) || b.includes(a)) return true;
  
  let differences = 0;
  const maxLen = Math.max(a.length, b.length);
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) differences++;
  }
  differences += maxLen - minLen;
  
  return differences <= Math.max(1, Math.floor(maxLen * 0.2));
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function calculateAccuracy(spokenWords: string[], targetWords: string[]): { 
  score: number; 
  matchedWords: string[]; 
  missedWords: string[] 
} {
  if (spokenWords.length === 0) {
    return { score: 0, matchedWords: [], missedWords: targetWords };
  }

  const matchedWords: string[] = [];
  const missedWords: string[] = [];
  const spokenSet = new Set(spokenWords.map(w => w.toLowerCase()));
  
  for (const target of targetWords) {
    const targetLower = target.toLowerCase();
    let found = false;
    
    if (spokenSet.has(targetLower)) {
      matchedWords.push(target);
      found = true;
    } else {
      for (const spoken of spokenWords) {
        if (isSimilar(spoken.toLowerCase(), targetLower)) {
          matchedWords.push(target);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      missedWords.push(target);
    }
  }

  const score = Math.round((matchedWords.length / targetWords.length) * 100);
  return { score, matchedWords, missedWords };
}

// ============ AUDIO METRICS CALCULATIONS ============

function calculateVolumeAnalysis(
  words: DeepgramWord[], 
  audioDurationSec: number,
  thresholds: AudioMetricsThresholds['volume']
): {
  segments: VolumeSegment[];
  overallAvgDb: number;
  overallMinDb: number;
  overallMaxDb: number;
  score: number;
  note: string;
} {
  if (words.length === 0) {
    return {
      segments: [],
      overallAvgDb: -60,
      overallMinDb: -60,
      overallMaxDb: -60,
      score: 0,
      note: "No audio detected for volume analysis"
    };
  }

  // Create segments (1 second each or based on word groups)
  const segmentDuration = 1.0; // seconds
  const segments: VolumeSegment[] = [];
  
  let currentSegmentStart = 0;
  let segmentConfidences: number[] = [];
  
  for (const word of words) {
    const segmentIndex = Math.floor(word.start / segmentDuration);
    const expectedStart = segmentIndex * segmentDuration;
    
    if (word.start >= currentSegmentStart + segmentDuration && segmentConfidences.length > 0) {
      // Convert confidence (0-1) to approximate dB (-60 to 0)
      // Higher confidence correlates with clearer, louder audio
      const avgConfidence = segmentConfidences.reduce((a, b) => a + b, 0) / segmentConfidences.length;
      const avgDb = -60 + (avgConfidence * 60);
      const minDb = Math.min(...segmentConfidences) * -60 + (-60 + 60);
      const maxDb = Math.max(...segmentConfidences) * -60 + (-60 + 60);
      
      let level: 'quiet' | 'normal' | 'loud';
      if (avgDb < thresholds.quiet.max) level = 'quiet';
      else if (avgDb > thresholds.loud.min) level = 'loud';
      else level = 'normal';
      
      segments.push({
        startTime: currentSegmentStart,
        endTime: currentSegmentStart + segmentDuration,
        avgDb,
        minDb,
        maxDb,
        level
      });
      
      currentSegmentStart = expectedStart;
      segmentConfidences = [];
    }
    
    segmentConfidences.push(word.confidence);
  }
  
  // Add final segment
  if (segmentConfidences.length > 0) {
    const avgConfidence = segmentConfidences.reduce((a, b) => a + b, 0) / segmentConfidences.length;
    const avgDb = -60 + (avgConfidence * 60);
    
    let level: 'quiet' | 'normal' | 'loud';
    if (avgDb < thresholds.quiet.max) level = 'quiet';
    else if (avgDb > thresholds.loud.min) level = 'loud';
    else level = 'normal';
    
    segments.push({
      startTime: currentSegmentStart,
      endTime: Math.max(currentSegmentStart + segmentDuration, audioDurationSec),
      avgDb,
      minDb: avgDb - 5,
      maxDb: avgDb + 5,
      level
    });
  }
  
  // Calculate overall stats
  const allDbValues = segments.map(s => s.avgDb);
  const overallAvgDb = allDbValues.reduce((a, b) => a + b, 0) / allDbValues.length;
  const overallMinDb = Math.min(...allDbValues);
  const overallMaxDb = Math.max(...allDbValues);
  
  // Calculate score based on target range
  let score = 100;
  const quietCount = segments.filter(s => s.level === 'quiet').length;
  const loudCount = segments.filter(s => s.level === 'loud').length;
  
  score -= quietCount * 15; // Penalty for quiet segments
  score -= loudCount * 10; // Penalty for too loud
  
  // Check if average is in target range
  if (overallAvgDb < thresholds.targetMin) {
    score -= 20;
  } else if (overallAvgDb > thresholds.targetMax) {
    score -= 15;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let note: string;
  if (score >= 80) note = "Good volume consistency throughout";
  else if (quietCount > loudCount) note = "Speak louder and more clearly";
  else if (loudCount > 0) note = "Try to moderate your volume";
  else note = "Volume varied too much, aim for consistency";
  
  return { segments, overallAvgDb, overallMinDb, overallMaxDb, score, note };
}

function calculateSpeechRateAnalysis(
  words: DeepgramWord[],
  audioDurationSec: number,
  thresholds: AudioMetricsThresholds['speechRate']
): {
  segments: SpeechRateSegment[];
  overallWpm: number;
  overallSyllablesPerSecond: number;
  speedVariation: number;
  score: number;
  note: string;
} {
  if (words.length === 0) {
    return {
      segments: [],
      overallWpm: 0,
      overallSyllablesPerSecond: 0,
      speedVariation: 0,
      score: 0,
      note: "No speech detected for rate analysis"
    };
  }

  // Create time-based segments
  const segmentDuration = 2.0; // seconds per segment for rate analysis
  const segments: SpeechRateSegment[] = [];
  
  let currentSegmentWords: DeepgramWord[] = [];
  let currentSegmentStart = 0;
  
  for (const word of words) {
    if (word.start >= currentSegmentStart + segmentDuration && currentSegmentWords.length > 0) {
      // Calculate segment metrics
      const segDuration = currentSegmentWords[currentSegmentWords.length - 1].end - currentSegmentWords[0].start;
      const wpm = segDuration > 0 ? (currentSegmentWords.length / segDuration) * 60 : 0;
      const syllables = currentSegmentWords.reduce((sum, w) => sum + countSyllables(w.word), 0);
      const syllablesPerSecond = segDuration > 0 ? syllables / segDuration : 0;
      
      let level: 'slow' | 'normal' | 'fast';
      if (wpm < thresholds.slow.max) level = 'slow';
      else if (wpm > thresholds.fast.min) level = 'fast';
      else level = 'normal';
      
      segments.push({
        startTime: currentSegmentStart,
        endTime: currentSegmentStart + segmentDuration,
        wpm,
        syllablesPerSecond,
        level
      });
      
      currentSegmentStart = Math.floor(word.start / segmentDuration) * segmentDuration;
      currentSegmentWords = [];
    }
    
    currentSegmentWords.push(word);
  }
  
  // Add final segment
  if (currentSegmentWords.length > 0) {
    const segDuration = currentSegmentWords[currentSegmentWords.length - 1].end - currentSegmentWords[0].start;
    const wpm = segDuration > 0 ? (currentSegmentWords.length / segDuration) * 60 : 0;
    const syllables = currentSegmentWords.reduce((sum, w) => sum + countSyllables(w.word), 0);
    const syllablesPerSecond = segDuration > 0 ? syllables / segDuration : 0;
    
    let level: 'slow' | 'normal' | 'fast';
    if (wpm < thresholds.slow.max) level = 'slow';
    else if (wpm > thresholds.fast.min) level = 'fast';
    else level = 'normal';
    
    segments.push({
      startTime: currentSegmentStart,
      endTime: audioDurationSec,
      wpm,
      syllablesPerSecond,
      level
    });
  }
  
  // Overall metrics
  const speechDuration = words[words.length - 1].end - words[0].start;
  const overallWpm = speechDuration > 0 ? (words.length / speechDuration) * 60 : 0;
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w.word), 0);
  const overallSyllablesPerSecond = speechDuration > 0 ? totalSyllables / speechDuration : 0;
  
  // Calculate variation (standard deviation)
  const wpms = segments.map(s => s.wpm);
  const avgWpm = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  const speedVariation = Math.sqrt(
    wpms.reduce((acc, wpm) => acc + Math.pow(wpm - avgWpm, 2), 0) / wpms.length
  );
  
  // Score calculation
  let score = 100;
  
  // Penalize for being outside target range
  if (overallWpm < thresholds.targetMin) {
    score -= Math.min(30, (thresholds.targetMin - overallWpm) * 0.5);
  } else if (overallWpm > thresholds.targetMax) {
    score -= Math.min(25, (overallWpm - thresholds.targetMax) * 0.3);
  }
  
  // Penalize for too much variation
  if (speedVariation > 40) {
    score -= 15;
  } else if (speedVariation > 25) {
    score -= 8;
  }
  
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  let note: string;
  if (score >= 80) note = `Good pace at ${Math.round(overallWpm)} WPM`;
  else if (overallWpm < thresholds.targetMin) note = `Speaking too slowly (${Math.round(overallWpm)} WPM). Try to speed up.`;
  else if (overallWpm > thresholds.targetMax) note = `Speaking too fast (${Math.round(overallWpm)} WPM). Slow down.`;
  else note = `Inconsistent pace. Aim for steady ${thresholds.targetMin}-${thresholds.targetMax} WPM.`;
  
  return { segments, overallWpm, overallSyllablesPerSecond, speedVariation, score, note };
}

function calculateResponseLatency(
  words: DeepgramWord[],
  thresholds: AudioMetricsThresholds['responseLatency']
): {
  delayMs: number;
  isAcceptable: boolean;
  score: number;
  note: string;
} {
  if (words.length === 0) {
    return {
      delayMs: 999999,
      isAcceptable: false,
      score: 0,
      note: "No speech detected"
    };
  }
  
  const delayMs = Math.round(words[0].start * 1000);
  const isAcceptable = delayMs <= thresholds.acceptable;
  
  let score: number;
  let note: string;
  
  if (delayMs <= thresholds.excellent) {
    score = 100;
    note = "Excellent response time!";
  } else if (delayMs <= thresholds.acceptable) {
    score = Math.round(80 - ((delayMs - thresholds.excellent) / (thresholds.acceptable - thresholds.excellent)) * 30);
    note = "Good response time";
  } else if (delayMs <= thresholds.poor) {
    score = Math.round(50 - ((delayMs - thresholds.acceptable) / (thresholds.poor - thresholds.acceptable)) * 40);
    note = `Started speaking after ${(delayMs/1000).toFixed(1)}s - try to respond faster`;
  } else {
    score = Math.max(0, 10 - ((delayMs - thresholds.poor) / 1000) * 2);
    note = `Very slow response (${(delayMs/1000).toFixed(1)}s). Practice starting immediately.`;
  }
  
  return { delayMs, isAcceptable, score: Math.max(0, Math.round(score)), note };
}

function calculatePauseDurationAnalysis(
  words: DeepgramWord[],
  audioDurationSec: number,
  thresholds: AudioMetricsThresholds['pauseDuration']
): {
  pauses: PauseSegment[];
  totalPauseTime: number;
  averagePauseDuration: number;
  pauseFrequency: number;
  score: number;
  note: string;
} {
  if (words.length === 0) {
    return {
      pauses: [],
      totalPauseTime: audioDurationSec * 1000,
      averagePauseDuration: 0,
      pauseFrequency: 0,
      score: 0,
      note: "No speech detected"
    };
  }
  
  const pauses: PauseSegment[] = [];
  
  // Detect pauses between words
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    const gapMs = gap * 1000;
    
    if (gapMs > thresholds.natural) {
      pauses.push({
        startTime: words[i - 1].end,
        endTime: words[i].start,
        durationMs: Math.round(gapMs),
        isExcessive: gapMs > thresholds.excessive
      });
    }
  }
  
  const totalPauseTime = pauses.reduce((sum, p) => sum + p.durationMs, 0);
  const averagePauseDuration = pauses.length > 0 ? totalPauseTime / pauses.length : 0;
  const speechDurationMin = (words[words.length - 1].end - words[0].start) / 60;
  const pauseFrequency = speechDurationMin > 0 ? pauses.length / speechDurationMin : 0;
  
  // Score calculation
  let score = 100;
  
  const excessiveCount = pauses.filter(p => p.isExcessive).length;
  score -= excessiveCount * 15;
  
  const acceptableButLong = pauses.filter(p => p.durationMs > thresholds.acceptable && !p.isExcessive).length;
  score -= acceptableButLong * 8;
  
  if (pauseFrequency > thresholds.maxFrequency) {
    score -= (pauseFrequency - thresholds.maxFrequency) * 5;
  }
  
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  let note: string;
  if (score >= 80) note = "Natural rhythm with appropriate pauses";
  else if (excessiveCount > 0) note = `${excessiveCount} excessive pause(s). Try to speak more continuously.`;
  else if (pauseFrequency > thresholds.maxFrequency) note = "Too many pauses. Practice flowing speech.";
  else note = "Work on maintaining speech momentum";
  
  return { pauses, totalPauseTime, averagePauseDuration, pauseFrequency, score, note };
}

function calculateEndIntensityAnalysis(
  words: DeepgramWord[],
  volumeSegments: VolumeSegment[],
  speechRateSegments: SpeechRateSegment[],
  thresholds: AudioMetricsThresholds['endIntensity']
): {
  finalSegmentDb: number;
  previousSegmentDb: number;
  overallAvgDb: number;
  stdDevFromMean: number;
  finalSegmentWpm: number;
  previousSegmentWpm: number;
  overallAvgWpm: number;
  isAbnormalVolume: boolean;
  isAbnormalSpeed: boolean;
  score: number;
  note: string;
} {
  if (volumeSegments.length < 2 || speechRateSegments.length < 2) {
    return {
      finalSegmentDb: 0,
      previousSegmentDb: 0,
      overallAvgDb: 0,
      stdDevFromMean: 0,
      finalSegmentWpm: 0,
      previousSegmentWpm: 0,
      overallAvgWpm: 0,
      isAbnormalVolume: false,
      isAbnormalSpeed: false,
      score: 100,
      note: "Not enough segments for end analysis"
    };
  }
  
  // Volume analysis
  const finalVolSeg = volumeSegments[volumeSegments.length - 1];
  const prevVolSeg = volumeSegments[volumeSegments.length - 2];
  const avgDb = volumeSegments.reduce((sum, s) => sum + s.avgDb, 0) / volumeSegments.length;
  const dbStdDev = Math.sqrt(
    volumeSegments.reduce((acc, s) => acc + Math.pow(s.avgDb - avgDb, 2), 0) / volumeSegments.length
  );
  const volStdDevFromMean = dbStdDev > 0 ? (finalVolSeg.avgDb - avgDb) / dbStdDev : 0;
  
  // Speed analysis  
  const finalSpeedSeg = speechRateSegments[speechRateSegments.length - 1];
  const prevSpeedSeg = speechRateSegments[speechRateSegments.length - 2];
  const avgWpm = speechRateSegments.reduce((sum, s) => sum + s.wpm, 0) / speechRateSegments.length;
  const speedChangePercent = prevSpeedSeg.wpm > 0 
    ? ((finalSpeedSeg.wpm - prevSpeedSeg.wpm) / prevSpeedSeg.wpm) * 100 
    : 0;
  
  const isAbnormalVolume = Math.abs(volStdDevFromMean) > thresholds.volumeDeviationThreshold;
  const isAbnormalSpeed = Math.abs(speedChangePercent) > thresholds.speedDeviationThreshold;
  
  let score = 100;
  if (isAbnormalVolume) score -= 25;
  if (isAbnormalSpeed) score -= 20;
  
  let note: string;
  if (!isAbnormalVolume && !isAbnormalSpeed) {
    note = "Consistent ending - good control";
  } else if (isAbnormalVolume && finalVolSeg.avgDb > avgDb) {
    note = "Ending was louder than average - maintain consistency";
  } else if (isAbnormalVolume) {
    note = "Ending trailed off - keep energy consistent";
  } else if (isAbnormalSpeed && finalSpeedSeg.wpm > avgWpm) {
    note = "Rushed at the end - maintain steady pace";
  } else {
    note = "Slowed down at end - keep momentum";
  }
  
  return {
    finalSegmentDb: finalVolSeg.avgDb,
    previousSegmentDb: prevVolSeg.avgDb,
    overallAvgDb: avgDb,
    stdDevFromMean: volStdDevFromMean,
    finalSegmentWpm: finalSpeedSeg.wpm,
    previousSegmentWpm: prevSpeedSeg.wpm,
    overallAvgWpm: avgWpm,
    isAbnormalVolume,
    isAbnormalSpeed,
    score: Math.max(0, Math.round(score)),
    note
  };
}

function calculateExpressionScore(words: DeepgramWord[]): { score: number; note: string } {
  if (words.length === 0) return { score: 0, note: "No speech detected" };
  
  const confidences = words.map(w => w.confidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  
  const durations = words.map(w => w.end - w.start);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const durationVariance = durations.reduce((acc, d) => acc + Math.pow(d - avgDuration, 2), 0) / durations.length;
  const varianceScore = Math.min(1, Math.sqrt(durationVariance) / 0.15);
  
  const score = Math.min(100, Math.max(0, Math.round(avgConfidence * 80 + varianceScore * 20)));
  
  let note: string;
  if (score >= 80) note = "Clear and expressive speech";
  else if (score >= 60) note = "Good clarity, add more emphasis";
  else note = "Practice varying pitch and emphasis";
  
  return { score, note };
}

// Linear score: below threshold = 0, at/above target = 100
function calculateLinearScore(value: number, threshold: number, target: number): number {
  if (value < threshold) return 0;
  if (value >= target) return 100;
  return Math.round(((value - threshold) / (target - threshold)) * 100);
}

// Inverse linear score: at/below target = 100, above threshold = 0
function calculateInverseLinearScore(value: number, target: number, threshold: number): number {
  if (value <= target) return 100;
  if (value >= threshold) return 0;
  return Math.round(((threshold - value) / (threshold - target)) * 100);
}

// Calculate weighted emotion score
function calculateWeightedEmotionScore(
  scoringConfig: EmotionScoringConfig,
  volumeDb: number,
  speechRateWpm: number,
  totalPauseMs: number,
  longestPauseMs: number,
  latencyMs: number,
  volumeIncreasing: boolean,
  speedIncreasing: boolean,
  volumeDecreasing: boolean,
  speedDecreasing: boolean
): {
  total: number;
  breakdown: {
    volume: { raw: number; weighted: number };
    speechRate: { raw: number; weighted: number };
    pause: { raw: number; weighted: number };
    latency: { raw: number; weighted: number };
    endIntensity: { raw: number; weighted: number; volumeIncreasing: boolean; speedIncreasing: boolean };
  };
} {
  const config = scoringConfig;
  
  // Volume score (louder = better)
  const volumeScore = calculateLinearScore(volumeDb, config.volume.threshold, config.volume.target);
  
  // Speech rate score (faster = better)
  const speechRateScore = calculateLinearScore(speechRateWpm, config.speechRate.threshold, config.speechRate.target);
  
  // Pause score (less pause = better)
  let pauseScore = 100;
  if (totalPauseMs > config.pauseDuration.maxTotalMs) {
    pauseScore = 0;
  } else if (longestPauseMs > config.pauseDuration.maxAcceptableMs) {
    pauseScore = Math.max(0, 100 - Math.round((longestPauseMs - config.pauseDuration.maxAcceptableMs) / 50));
  } else {
    pauseScore = Math.round(100 - (totalPauseMs / config.pauseDuration.maxTotalMs) * 100);
  }
  
  // Latency score (faster response = better)
  const latencyScore = calculateInverseLinearScore(latencyMs, config.responseLatency.target, config.responseLatency.threshold);
  
  // End intensity score (both increasing = best)
  let endIntensityScore: number;
  if (volumeIncreasing && speedIncreasing) {
    endIntensityScore = config.endIntensity.bothIncreasingScore;
  } else if (volumeIncreasing || speedIncreasing) {
    endIntensityScore = config.endIntensity.oneIncreasingScore;
  } else if (volumeDecreasing || speedDecreasing) {
    endIntensityScore = config.endIntensity.decreasingScore;
  } else {
    endIntensityScore = config.endIntensity.stableScore;
  }
  
  // Calculate weighted scores
  const totalWeight = config.volume.weight + config.speechRate.weight + config.pauseDuration.weight + config.responseLatency.weight + config.endIntensity.weight;
  
  const breakdown = {
    volume: {
      raw: volumeScore,
      weighted: Math.round((volumeScore * config.volume.weight) / totalWeight),
    },
    speechRate: {
      raw: speechRateScore,
      weighted: Math.round((speechRateScore * config.speechRate.weight) / totalWeight),
    },
    pause: {
      raw: pauseScore,
      weighted: Math.round((pauseScore * config.pauseDuration.weight) / totalWeight),
    },
    latency: {
      raw: latencyScore,
      weighted: Math.round((latencyScore * config.responseLatency.weight) / totalWeight),
    },
    endIntensity: {
      raw: endIntensityScore,
      weighted: Math.round((endIntensityScore * config.endIntensity.weight) / totalWeight),
      volumeIncreasing,
      speedIncreasing,
    },
  };
  
  const total = breakdown.volume.weighted + breakdown.speechRate.weighted + breakdown.pause.weighted + breakdown.latency.weighted + breakdown.endIntensity.weighted;
  
  return { total, breakdown };
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const targetText = formData.get('targetText') as string;
    const thresholdsJson = formData.get('thresholds') as string;
    const scoringConfigJson = formData.get('scoringConfig') as string;
    
    if (!audioFile || !targetText) {
      throw new Error('Audio file and target text are required');
    }

    const thresholds: AudioMetricsThresholds = thresholdsJson 
      ? { ...defaultThresholds, ...JSON.parse(thresholdsJson) }
      : defaultThresholds;
    
    const scoringConfig: EmotionScoringConfig = scoringConfigJson
      ? { ...defaultScoringConfig, ...JSON.parse(scoringConfigJson) }
      : defaultScoringConfig;

    console.log('Analyzing speech for target:', targetText);
    console.log('Audio file size:', audioFile.size, 'bytes');
    console.log('Scoring config:', JSON.stringify(scoringConfig));

    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    const audioBuffer = await audioFile.arrayBuffer();

    // Call Deepgram with utterances for better pause detection
    console.log('Calling Deepgram API...');
    const deepgramResponse = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&diarize=false&smart_format=true&utterances=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': audioFile.type || 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('Deepgram API error:', deepgramResponse.status, errorText);
      throw new Error(`Deepgram API error: ${deepgramResponse.status}`);
    }

    const deepgramResult: DeepgramResponse = await deepgramResponse.json();
    console.log('Deepgram response received');

    const alternative = deepgramResult.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alternative?.transcript || '';
    const words = alternative?.words || [];
    const audioDurationSec = deepgramResult.metadata?.duration || 
      (words.length > 0 ? words[words.length - 1].end + 0.5 : 5);
    const audioDurationMs = Math.round(audioDurationSec * 1000);

    console.log('Transcript:', transcript);
    console.log('Words count:', words.length);
    console.log('Duration:', audioDurationSec, 'seconds');

    // Check for silence
    const speechDetected = words.length > 0 && transcript.trim().length > 0;

    if (!speechDetected) {
      console.log('No speech detected');
      return new Response(JSON.stringify({
        overallScore: 0,
        emotionBreakdown: null,
        volumeAnalysis: { segments: [], overallAvgDb: -60, overallMinDb: -60, overallMaxDb: -60, score: 0, note: "No audio detected" },
        speechRateAnalysis: { segments: [], overallWpm: 0, overallSyllablesPerSecond: 0, speedVariation: 0, score: 0, note: "No speech detected" },
        responseLatencyAnalysis: { delayMs: audioDurationMs, isAcceptable: false, score: 0, note: "No speech detected" },
        pauseDurationAnalysis: { pauses: [], totalPauseTime: audioDurationMs, averagePauseDuration: 0, pauseFrequency: 0, score: 0, note: "No speech detected" },
        endIntensityAnalysis: { 
          finalSegmentDb: 0, previousSegmentDb: 0, overallAvgDb: 0, stdDevFromMean: 0,
          finalSegmentWpm: 0, previousSegmentWpm: 0, overallAvgWpm: 0,
          isAbnormalVolume: false, isAbnormalSpeed: false, score: 0, note: "No speech detected",
          volumeIncreasing: false, speedIncreasing: false
        },
        transcription: "[silence]",
        speechDetected: false,
        audioDurationMs,
        wordCount: 0,
        feedback: ["No speech detected. Please speak louder and clearer."],
        thresholds,
        scoringConfig
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate all metrics
    const spokenWords = normalizeText(transcript);
    const targetWords = normalizeText(targetText);
    const accuracyResult = calculateAccuracy(spokenWords, targetWords);
    
    const volumeAnalysis = calculateVolumeAnalysis(words, audioDurationSec, thresholds.volume);
    const speechRateAnalysis = calculateSpeechRateAnalysis(words, audioDurationSec, thresholds.speechRate);
    const responseLatencyAnalysis = calculateResponseLatency(words, thresholds.responseLatency);
    const pauseDurationAnalysis = calculatePauseDurationAnalysis(words, audioDurationSec, thresholds.pauseDuration);
    const endIntensityAnalysis = calculateEndIntensityAnalysis(
      words, volumeAnalysis.segments, speechRateAnalysis.segments, thresholds.endIntensity
    );
    const expressionResult = calculateExpressionScore(words);

    // Determine if volume/speed are increasing or decreasing at end
    const volumeIncreasing = endIntensityAnalysis.finalSegmentDb > endIntensityAnalysis.previousSegmentDb;
    const speedIncreasing = endIntensityAnalysis.finalSegmentWpm > endIntensityAnalysis.previousSegmentWpm;
    const volumeDecreasing = endIntensityAnalysis.finalSegmentDb < endIntensityAnalysis.previousSegmentDb - 3;
    const speedDecreasing = endIntensityAnalysis.finalSegmentWpm < endIntensityAnalysis.previousSegmentWpm - 10;

    // Calculate EMOTION score using weighted config (this is the main score now)
    const longestPauseMs = pauseDurationAnalysis.pauses.length > 0 
      ? Math.max(...pauseDurationAnalysis.pauses.map(p => p.durationMs))
      : 0;
    
    const emotionScoreResult = calculateWeightedEmotionScore(
      scoringConfig,
      volumeAnalysis.overallAvgDb,
      speechRateAnalysis.overallWpm,
      pauseDurationAnalysis.totalPauseTime,
      longestPauseMs,
      responseLatencyAnalysis.delayMs,
      volumeIncreasing,
      speedIncreasing,
      volumeDecreasing,
      speedDecreasing
    );

    // The overall score is now ONLY the emotion score (weighted)
    const overallScore = emotionScoreResult.total;

    // Generate feedback based on emotion breakdown
    const feedback: string[] = [];
    const breakdown = emotionScoreResult.breakdown;
    
    if (breakdown.volume.raw < 60) {
      feedback.push(`Low volume (${Math.round(volumeAnalysis.overallAvgDb)} dB). Speak louder.`);
    }
    
    if (breakdown.speechRate.raw < 60) {
      feedback.push(`Slow speed (${Math.round(speechRateAnalysis.overallWpm)} WPM). Speak faster.`);
    }
    
    if (breakdown.pause.raw < 60) {
      feedback.push(`Too many pauses. Speak more fluently.`);
    }
    
    if (breakdown.latency.raw < 60) {
      feedback.push(`Slow response (${responseLatencyAnalysis.delayMs}ms). Start speaking faster.`);
    }
    
    // End intensity feedback with tags
    if (breakdown.endIntensity.volumeIncreasing && breakdown.endIntensity.speedIncreasing) {
      feedback.push(`✨ Excellent! Volume AND speed increasing at the end.`);
    } else if (breakdown.endIntensity.volumeIncreasing) {
      feedback.push(`Volume increasing at end, but speed is not.`);
    } else if (breakdown.endIntensity.speedIncreasing) {
      feedback.push(`Speed increasing at end, but volume is not.`);
    } else if (volumeDecreasing || speedDecreasing) {
      feedback.push(`Intensity decreasing at end. Maintain your energy!`);
    }
    
    if (feedback.length === 0) {
      feedback.push("Excellent! Great emotional expression.");
    }

    // Add end intensity flags to analysis
    const enhancedEndIntensityAnalysis = {
      ...endIntensityAnalysis,
      volumeIncreasing,
      speedIncreasing,
      volumeDecreasing,
      speedDecreasing,
    };

    const result = {
      overallScore,
      emotionBreakdown: emotionScoreResult.breakdown,
      volumeAnalysis,
      speechRateAnalysis,
      responseLatencyAnalysis,
      pauseDurationAnalysis,
      endIntensityAnalysis: enhancedEndIntensityAnalysis,
      transcription: transcript,
      speechDetected: true,
      audioDurationMs,
      wordCount: words.length,
      feedback,
      thresholds,
      scoringConfig
    };

    console.log("Analysis complete. Emotion score:", overallScore);
    console.log("Breakdown:", JSON.stringify(emotionScoreResult.breakdown));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Speech analysis error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
