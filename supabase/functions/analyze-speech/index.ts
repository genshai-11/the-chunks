import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisConfig {
  pauseThresholdMs: number;
  accuracyWeight: number;
  fluencyWeight: number;
  emotionWeight: number;
  strictness: 'lenient' | 'normal' | 'strict';
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
}

const defaultConfig: AnalysisConfig = {
  pauseThresholdMs: 2710,
  accuracyWeight: 0.4,
  fluencyWeight: 0.35,
  emotionWeight: 0.25,
  strictness: 'normal',
};

// Normalize text for comparison
function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 0);
}

// Calculate word-level accuracy using Levenshtein-based matching
function calculateAccuracy(spokenWords: string[], targetWords: string[]): { score: number; matchedWords: string[]; missedWords: string[] } {
  if (spokenWords.length === 0) {
    return { score: 0, matchedWords: [], missedWords: targetWords };
  }

  const matchedWords: string[] = [];
  const missedWords: string[] = [];
  
  // Simple word matching with fuzzy tolerance
  const spokenSet = new Set(spokenWords.map(w => w.toLowerCase()));
  
  for (const target of targetWords) {
    const targetLower = target.toLowerCase();
    let found = false;
    
    // Exact match
    if (spokenSet.has(targetLower)) {
      matchedWords.push(target);
      found = true;
    } else {
      // Fuzzy match - check if any spoken word is similar
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

// Simple similarity check (Levenshtein-inspired)
function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  
  // Check if one contains the other (handles partial matches)
  if (a.includes(b) || b.includes(a)) return true;
  
  // Simple edit distance check
  let differences = 0;
  const maxLen = Math.max(a.length, b.length);
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) differences++;
  }
  differences += maxLen - minLen;
  
  // Allow up to 20% difference
  return differences <= Math.max(1, Math.floor(maxLen * 0.2));
}

// Calculate fluency from word timestamps
function calculateFluency(
  words: DeepgramWord[], 
  audioDurationMs: number,
  pauseThresholdMs: number
): { 
  score: number; 
  startDelayMs: number; 
  longestPauseMs: number; 
  pauseCount: number;
  wordsPerMinute: number;
  hasProblem: boolean;
} {
  if (words.length === 0) {
    return {
      score: 0,
      startDelayMs: audioDurationMs,
      longestPauseMs: audioDurationMs,
      pauseCount: 0,
      wordsPerMinute: 0,
      hasProblem: true
    };
  }

  const startDelayMs = Math.round(words[0].start * 1000);
  const speechDurationSec = words[words.length - 1].end - words[0].start;
  const wordsPerMinute = speechDurationSec > 0 ? Math.round((words.length / speechDurationSec) * 60) : 0;
  
  // Analyze pauses between words
  let longestPauseMs = 0;
  let pauseCount = 0;
  const pauseThresholdSec = pauseThresholdMs / 1000;
  
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    const gapMs = Math.round(gap * 1000);
    
    if (gapMs > longestPauseMs) {
      longestPauseMs = gapMs;
    }
    
    if (gap > pauseThresholdSec) {
      pauseCount++;
    }
  }

  // Start delay penalty
  const startDelayPenalty = startDelayMs > pauseThresholdMs ? 15 : Math.min(10, startDelayMs / 200);
  
  // Pause penalty
  const pausePenalty = Math.min(20, pauseCount * 8);
  
  // Speaking rate penalty (ideal: 120-180 WPM)
  let ratePenalty = 0;
  if (wordsPerMinute < 80) {
    ratePenalty = 15; // Too slow
  } else if (wordsPerMinute < 100) {
    ratePenalty = 8;
  } else if (wordsPerMinute > 220) {
    ratePenalty = 10; // Too fast
  }

  const score = Math.max(0, Math.round(100 - startDelayPenalty - pausePenalty - ratePenalty));
  const hasProblem = startDelayMs > pauseThresholdMs || longestPauseMs > pauseThresholdMs;

  return {
    score,
    startDelayMs,
    longestPauseMs,
    pauseCount,
    wordsPerMinute,
    hasProblem
  };
}

// Calculate expressiveness from confidence variation (proxy for clear speech)
function calculateExpressiveness(words: DeepgramWord[], strictness: string): { score: number; note: string } {
  if (words.length === 0) {
    return { score: 0, note: "No speech detected" };
  }

  // Use confidence as a proxy for clarity and expressiveness
  // Higher and more consistent confidence = clearer speech
  const confidences = words.map(w => w.confidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  
  // Variance in word duration (expressiveness indicator)
  const durations = words.map(w => w.end - w.start);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const durationVariance = durations.reduce((acc, d) => acc + Math.pow(d - avgDuration, 2), 0) / durations.length;
  
  // Some variance is good (expressive), too little is monotone
  const varianceScore = Math.min(1, Math.sqrt(durationVariance) / 0.15);
  
  // Combine confidence and variance
  let baseScore = avgConfidence * 80 + varianceScore * 20;
  
  // Apply strictness modifier
  const strictnessModifier = {
    lenient: 1.1,
    normal: 1.0,
    strict: 0.9
  };
  
  baseScore *= strictnessModifier[strictness as keyof typeof strictnessModifier] || 1;
  
  const score = Math.min(100, Math.max(0, Math.round(baseScore)));
  
  let note: string;
  if (score >= 80) {
    note = "Clear and expressive speech with good variation";
  } else if (score >= 60) {
    note = "Adequate expression, could use more emphasis on key words";
  } else if (score >= 40) {
    note = "Speech sounds somewhat flat, try varying your pitch and emphasis";
  } else {
    note = "Very monotone or unclear speech, practice adding expression";
  }

  return { score, note };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const targetText = formData.get('targetText') as string;
    const configJson = formData.get('config') as string;
    
    if (!audioFile || !targetText) {
      throw new Error('Audio file and target text are required');
    }

    const config: AnalysisConfig = configJson 
      ? { ...defaultConfig, ...JSON.parse(configJson) }
      : defaultConfig;

    console.log('Analyzing speech for target:', targetText);
    console.log('Config:', config);
    console.log('Audio file size:', audioFile.size, 'bytes');

    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    // Get audio buffer
    const audioBuffer = await audioFile.arrayBuffer();
    const audioDurationMs = Math.round((audioFile.size / 48000) * 1000); // Rough estimate

    // Call Deepgram for transcription with word timestamps
    console.log('Calling Deepgram API...');
    const deepgramResponse = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&diarize=false&smart_format=true',
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
    console.log('Deepgram response:', JSON.stringify(deepgramResult, null, 2));

    const alternative = deepgramResult.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alternative?.transcript || '';
    const words = alternative?.words || [];
    const overallConfidence = alternative?.confidence || 0;

    console.log('Transcript:', transcript);
    console.log('Words count:', words.length);
    console.log('Confidence:', overallConfidence);

    // Check for silence/no speech
    const speechDetected = words.length > 0 && transcript.trim().length > 0;

    if (!speechDetected) {
      console.log('No speech detected in audio');
      return new Response(JSON.stringify({
        accuracy: 0,
        fluency: 0,
        emotion: 0,
        pauseAnalysis: {
          startDelayMs: audioDurationMs,
          longestPauseMs: audioDurationMs,
          pauseCount: 0,
          hasProblem: true
        },
        feedback: [
          "No speech was detected in your recording.",
          "Please speak clearly into the microphone and try again.",
          "Make sure your microphone is working properly."
        ],
        transcription: "[silence]",
        detailedBreakdown: {
          pronunciation: "No speech to analyze",
          rhythm: "No speech to analyze",
          intonation: "No speech to analyze"
        },
        speechDetected: false,
        overallScore: 0,
        config: {
          pauseThresholdMs: config.pauseThresholdMs,
          accuracyWeight: config.accuracyWeight,
          fluencyWeight: config.fluencyWeight,
          emotionWeight: config.emotionWeight,
          strictness: config.strictness,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate scores
    const spokenWords = normalizeText(transcript);
    const targetWords = normalizeText(targetText);

    const accuracyResult = calculateAccuracy(spokenWords, targetWords);
    const fluencyResult = calculateFluency(words, audioDurationMs, config.pauseThresholdMs);
    const expressionResult = calculateExpressiveness(words, config.strictness);

    // Apply strictness modifier to accuracy
    const strictnessModifier = {
      lenient: 1.15,
      normal: 1.0,
      strict: 0.85
    };
    const modifier = strictnessModifier[config.strictness] || 1;
    const adjustedAccuracy = Math.min(100, Math.round(accuracyResult.score * modifier));

    // Generate feedback
    const feedback: string[] = [];
    
    if (accuracyResult.missedWords.length > 0) {
      feedback.push(`Missed words: "${accuracyResult.missedWords.slice(0, 3).join('", "')}". Practice these pronunciations.`);
    }
    
    if (fluencyResult.startDelayMs > config.pauseThresholdMs) {
      feedback.push(`You paused ${Math.round(fluencyResult.startDelayMs / 1000 * 10) / 10}s before starting. Try to begin speaking promptly.`);
    }
    
    if (fluencyResult.pauseCount > 0) {
      feedback.push(`${fluencyResult.pauseCount} long pause(s) detected. Aim for smoother, continuous speech.`);
    }
    
    if (fluencyResult.wordsPerMinute < 100) {
      feedback.push(`Speaking rate: ${fluencyResult.wordsPerMinute} WPM - a bit slow. Try speaking more naturally.`);
    } else if (fluencyResult.wordsPerMinute > 200) {
      feedback.push(`Speaking rate: ${fluencyResult.wordsPerMinute} WPM - quite fast. Slow down for clarity.`);
    }
    
    if (expressionResult.score < 60) {
      feedback.push(expressionResult.note);
    }
    
    if (feedback.length === 0) {
      feedback.push("Great job! Your pronunciation and fluency are excellent.");
    }

    // Calculate overall score
    const overallScore = Math.round(
      adjustedAccuracy * config.accuracyWeight +
      fluencyResult.score * config.fluencyWeight +
      expressionResult.score * config.emotionWeight
    );

    const result = {
      accuracy: adjustedAccuracy,
      fluency: fluencyResult.score,
      emotion: expressionResult.score,
      pauseAnalysis: {
        startDelayMs: fluencyResult.startDelayMs,
        longestPauseMs: fluencyResult.longestPauseMs,
        pauseCount: fluencyResult.pauseCount,
        hasProblem: fluencyResult.hasProblem
      },
      feedback,
      transcription: transcript,
      detailedBreakdown: {
        pronunciation: accuracyResult.score >= 80 
          ? "Excellent pronunciation accuracy" 
          : `Matched ${accuracyResult.matchedWords.length}/${targetWords.length} words`,
        rhythm: `${fluencyResult.wordsPerMinute} WPM, ${fluencyResult.pauseCount} significant pauses`,
        intonation: expressionResult.note
      },
      speechDetected: true,
      overallScore,
      config: {
        pauseThresholdMs: config.pauseThresholdMs,
        accuracyWeight: config.accuracyWeight,
        fluencyWeight: config.fluencyWeight,
        emotionWeight: config.emotionWeight,
        strictness: config.strictness,
      }
    };

    console.log("Analysis result:", result);

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
