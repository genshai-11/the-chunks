import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisConfig {
  pauseThresholdMs: number;      // silence duration to flag as "too long" (default 2710ms)
  accuracyWeight: number;        // weight for accuracy score (default 0.4)
  fluencyWeight: number;         // weight for fluency score (default 0.35)
  emotionWeight: number;         // weight for emotion score (default 0.25)
  strictness: 'lenient' | 'normal' | 'strict';  // grading strictness
}

const defaultConfig: AnalysisConfig = {
  pauseThresholdMs: 2710,
  accuracyWeight: 0.4,
  fluencyWeight: 0.35,
  emotionWeight: 0.25,
  strictness: 'normal',
};

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

    // Convert audio to base64
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const strictnessPrompt = {
      lenient: "Be encouraging and generous with scores. Focus on effort and communication.",
      normal: "Provide balanced, fair assessment of speech quality.",
      strict: "Be rigorous and precise. Only high-quality pronunciation gets high scores."
    };

    const systemPrompt = `You are an expert speech and pronunciation analyst for English language learners.

CRITICAL RULES:
1. You MUST actually listen to and transcribe what is spoken in the audio
2. If you hear SILENCE, BACKGROUND NOISE ONLY, or NO CLEAR SPEECH, you MUST:
   - Set accuracy, fluency, and emotion scores to 0-10 (very low)
   - Set transcription to "[silence]" or "[inaudible]" or what little you heard
   - Flag this in feedback
3. Do NOT assume the speaker said the target phrase - you must ACTUALLY HEAR IT
4. If the audio is too quiet, unclear, or mostly silent, give LOW SCORES

ANALYSIS CONFIGURATION:
- Pause threshold: ${config.pauseThresholdMs}ms (flag pauses longer than this)
- Strictness: ${config.strictness} - ${strictnessPrompt[config.strictness]}
- Weights: Accuracy ${config.accuracyWeight * 100}%, Fluency ${config.fluencyWeight * 100}%, Emotion ${config.emotionWeight * 100}%

TASK: Analyze the audio recording against this target phrase: "${targetText}"

First, TRANSCRIBE exactly what you hear in the audio. Then evaluate:

1. ACCURACY (pronunciation correctness) - ONLY if speech is present:
   - Phoneme accuracy for each word
   - Word stress patterns
   - Consonant/vowel clarity
   - Any mispronunciations or word omissions

2. FLUENCY (speech flow):
   - Speaking pace/rhythm
   - Hesitations and pauses (flag if pause > ${config.pauseThresholdMs}ms)
   - Smoothness of delivery
   - Start time (how long before speech begins)
   - If NO SPEECH detected, fluency should be 0-10

3. EMOTION (intonation & expressiveness):
   - Appropriate pitch variations
   - Natural stress and emphasis
   - Emotional engagement in delivery

Respond ONLY with valid JSON in this exact format:
{
  "accuracy": <0-100>,
  "fluency": <0-100>,
  "emotion": <0-100>,
  "pauseAnalysis": {
    "startDelayMs": <estimated ms before speech starts>,
    "longestPauseMs": <estimated longest pause in ms>,
    "pauseCount": <number of noticeable pauses>,
    "hasProblem": <true if any pause exceeds threshold OR no speech detected>
  },
  "feedback": [
    "<specific feedback point 1>",
    "<specific feedback point 2>",
    "<specific feedback point 3>"
  ],
  "transcription": "<EXACTLY what you heard - use [silence] if nothing>",
  "detailedBreakdown": {
    "pronunciation": "<brief note on pronunciation quality>",
    "rhythm": "<brief note on rhythm and pacing>",
    "intonation": "<brief note on emotional expression>"
  },
  "speechDetected": <true if clear speech was heard, false if silence/noise only>
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this audio recording. The learner is attempting to say: "${targetText}"`
              },
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: "wav"
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response:", JSON.stringify(aiResponse, null, 2));

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      analysis = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI analysis response");
    }

    // Check if speech was detected
    const speechDetected = analysis.speechDetected !== false && 
      !analysis.transcription?.toLowerCase().includes('[silence]') &&
      !analysis.transcription?.toLowerCase().includes('[inaudible]') &&
      analysis.transcription?.trim().length > 0;

    // If no speech detected, enforce low scores
    if (!speechDetected) {
      analysis.accuracy = Math.min(analysis.accuracy, 10);
      analysis.fluency = Math.min(analysis.fluency, 10);
      analysis.emotion = Math.min(analysis.emotion, 10);
      console.log("No speech detected - enforcing low scores");
    }

    // Calculate weighted overall score
    const overallScore = Math.round(
      analysis.accuracy * config.accuracyWeight +
      analysis.fluency * config.fluencyWeight +
      analysis.emotion * config.emotionWeight
    );

    const result = {
      ...analysis,
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
