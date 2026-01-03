import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Play, Pause, RefreshCw, Volume2, Loader2, CheckCircle, AlertTriangle, Clock, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CategoryBadge } from '@/components/lesson/CategoryBadge';
import { AudioVisualizer } from './AudioVisualizer';
import { cn } from '@/lib/utils';
import { curriculum } from '@/data/curriculum';
import { getAnalysisConfig } from '@/config/analysisConfig';
import { AnalysisResult } from '@/types/curriculum';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Deepgram Aura voices
const DEEPGRAM_VOICES = [
  { id: 'aura-asteria-en', name: 'Asteria', gender: 'female', accent: 'American' },
  { id: 'aura-luna-en', name: 'Luna', gender: 'female', accent: 'American' },
  { id: 'aura-stella-en', name: 'Stella', gender: 'female', accent: 'American' },
  { id: 'aura-athena-en', name: 'Athena', gender: 'female', accent: 'British' },
  { id: 'aura-hera-en', name: 'Hera', gender: 'female', accent: 'American' },
  { id: 'aura-orion-en', name: 'Orion', gender: 'male', accent: 'American' },
  { id: 'aura-arcas-en', name: 'Arcas', gender: 'male', accent: 'American' },
  { id: 'aura-perseus-en', name: 'Perseus', gender: 'male', accent: 'American' },
  { id: 'aura-angus-en', name: 'Angus', gender: 'male', accent: 'Irish' },
  { id: 'aura-orpheus-en', name: 'Orpheus', gender: 'male', accent: 'American' },
  { id: 'aura-helios-en', name: 'Helios', gender: 'male', accent: 'British' },
  { id: 'aura-zeus-en', name: 'Zeus', gender: 'male', accent: 'American' },
] as const;

type DeepgramVoice = typeof DEEPGRAM_VOICES[number];

const getStoredVoice = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('deepgram-voice') || 'aura-asteria-en';
  }
  return 'aura-asteria-en';
};

export const PracticeModal: React.FC = () => {
  const { selectedItem, setSelectedItem, currentLessonId, recordPracticeSession, userProgress } = useApp();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analyzerData, setAnalyzerData] = useState<Uint8Array | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(getStoredVoice);

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem('deepgram-voice', voiceId);
  };

  const currentVoice = DEEPGRAM_VOICES.find(v => v.id === selectedVoice) || DEEPGRAM_VOICES[0];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analyzer
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);

      // Start visualizing
      const updateVisualizer = () => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          setAnalyzerData(dataArray);
        }
        animationRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      // Set up MediaRecorder with WAV-compatible format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setAnalyzerData(null);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
    setAnalysisResult(null);
  };

  const getWeekId = () => {
    for (const week of curriculum) {
      if (week.days.some(d => d.id === currentLessonId)) {
        return week.id;
      }
    }
    return 1;
  };

  const analyzeWithAI = async () => {
    if (!selectedItem || !audioBlob) return;
    
    setIsAnalyzing(true);
    
    try {
      const config = getAnalysisConfig();
      
      // Create form data with audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('targetText', selectedItem.English);
      formData.append('config', JSON.stringify(config));

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-speech`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          toast.error('Rate limit reached. Please try again in a moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('Usage limit reached. Please add credits.');
          return;
        }
        throw new Error(error.error || 'Analysis failed');
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      
      // Record the practice session
      recordPracticeSession({
        lessonId: currentLessonId,
        itemId: selectedItem.id,
        category: selectedItem.category,
        score: result.overallScore,
        weekId: getWeekId(),
        analysisResult: result,
      });

      if (result.overallScore >= config.masteryThreshold) {
        toast.success('Great job! Item mastered!');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze speech. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const existingProgress = selectedItem 
    ? userProgress.find(p => p.lessonId === currentLessonId && p.itemId === selectedItem.id)
    : null;

  const speakTarget = async () => {
    if (!selectedItem || isSpeaking) return;
    
    setIsSpeaking(true);
    try {
      // Use Deepgram TTS with selected voice
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepgram-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: selectedItem.English,
            model: selectedVoice
          }),
        }
      );

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        toast.error('Failed to play audio');
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(selectedItem.English);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => setSelectedItem(null)}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg animate-scale-in overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CategoryBadge category={selectedItem.category} size="md" />
            {existingProgress?.mastered && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                <CheckCircle size={12} />
                Mastered
              </span>
            )}
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Target phrase */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={speakTarget}
                disabled={isSpeaking}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-l-full bg-muted hover:bg-accent transition-colors",
                  isSpeaking && "opacity-70"
                )}
              >
                {isSpeaking ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Volume2 size={18} />
                )}
                <span className="text-sm font-medium">{isSpeaking ? 'Playing...' : 'Listen'}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-r-full bg-muted hover:bg-accent transition-colors border-l border-border"
                    disabled={isSpeaking}
                  >
                    <span className="text-xs text-muted-foreground">{currentVoice.name}</span>
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Female Voices</DropdownMenuLabel>
                  {DEEPGRAM_VOICES.filter(v => v.gender === 'female').map(voice => (
                    <DropdownMenuItem
                      key={voice.id}
                      onClick={() => handleVoiceChange(voice.id)}
                      className={cn(selectedVoice === voice.id && "bg-accent")}
                    >
                      <span className="font-medium">{voice.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{voice.accent}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Male Voices</DropdownMenuLabel>
                  {DEEPGRAM_VOICES.filter(v => v.gender === 'male').map(voice => (
                    <DropdownMenuItem
                      key={voice.id}
                      onClick={() => handleVoiceChange(voice.id)}
                      className={cn(selectedVoice === voice.id && "bg-accent")}
                    >
                      <span className="font-medium">{voice.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{voice.accent}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-2xl font-medium text-foreground leading-relaxed">
              {selectedItem.English}
            </p>
            <p className="text-muted-foreground mt-2">
              {selectedItem.Vietnamese}
            </p>
          </div>

          {/* Audio Visualizer */}
          <div className="h-24 bg-muted rounded-xl mb-6 overflow-hidden flex items-center justify-center">
            {isRecording && analyzerData ? (
              <AudioVisualizer data={analyzerData} />
            ) : audioUrl ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Recording ready</span>
                <span className="text-lg font-mono text-foreground">{formatTime(recordingTime)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary/30 rounded-full"
                    style={{ height: '20px' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Timer */}
          {isRecording && (
            <div className="text-center mb-4">
              <span className="text-3xl font-mono text-primary">{formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!audioUrl ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "relative p-6 rounded-full transition-all",
                  isRecording
                    ? "bg-destructive text-destructive-foreground recording-pulse"
                    : "bg-primary text-primary-foreground shadow-primary hover:opacity-90"
                )}
              >
                {isRecording ? <Square size={28} /> : <Mic size={28} />}
              </button>
            ) : (
              <>
                <button
                  onClick={resetRecording}
                  className="p-4 rounded-full bg-muted text-foreground hover:bg-accent transition-colors"
                >
                  <RefreshCw size={24} />
                </button>
                <button
                  onClick={playRecording}
                  className="p-6 rounded-full bg-primary text-primary-foreground shadow-primary hover:opacity-90 transition-all"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </button>
                <button
                  onClick={startRecording}
                  className="p-4 rounded-full bg-muted text-foreground hover:bg-accent transition-colors"
                >
                  <Mic size={24} />
                </button>
              </>
            )}
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="mt-6 animate-fade-in space-y-4">
              {/* Overall Score */}
              <div className="text-center">
                <div className={cn(
                  "inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold mb-2",
                  analysisResult.overallScore >= 80 ? "bg-green-500/10 text-green-600" : 
                  analysisResult.overallScore >= 60 ? "bg-yellow-500/10 text-yellow-600" : 
                  "bg-red-500/10 text-red-600"
                )}>
                  {analysisResult.overallScore}
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysisResult.overallScore >= 80 ? "Great job! Item mastered!" : 
                   analysisResult.overallScore >= 60 ? "Good effort! Keep practicing." : 
                   "Keep trying! You'll get there."}
                </p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-primary">{analysisResult.accuracy}</div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-primary">{analysisResult.fluency}</div>
                  <div className="text-xs text-muted-foreground">Fluency</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-primary">{analysisResult.emotion}</div>
                  <div className="text-xs text-muted-foreground">Emotion</div>
                </div>
              </div>

              {/* Pause Analysis */}
              {analysisResult.pauseAnalysis && (
                <div className={cn(
                  "rounded-lg p-3",
                  analysisResult.pauseAnalysis.hasProblem 
                    ? "bg-amber-500/10 border border-amber-500/20" 
                    : "bg-muted"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {analysisResult.pauseAnalysis.hasProblem ? (
                      <AlertTriangle size={14} className="text-amber-600" />
                    ) : (
                      <Clock size={14} className="text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">Timing Analysis</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Start delay: </span>
                      <span className="font-medium">{analysisResult.pauseAnalysis.startDelayMs}ms</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Longest pause: </span>
                      <span className={cn(
                        "font-medium",
                        analysisResult.pauseAnalysis.hasProblem && "text-amber-600"
                      )}>{analysisResult.pauseAnalysis.longestPauseMs}ms</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pauses: </span>
                      <span className="font-medium">{analysisResult.pauseAnalysis.pauseCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transcription */}
              {analysisResult.transcription && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">What we heard:</div>
                  <div className="text-sm italic">"{analysisResult.transcription}"</div>
                </div>
              )}

              {/* Feedback */}
              {analysisResult.feedback && analysisResult.feedback.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Feedback:</div>
                  <ul className="space-y-1">
                    {analysisResult.feedback.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Previous stats */}
              {existingProgress && (
                <p className="text-xs text-muted-foreground text-center">
                  Best: {existingProgress.bestScore} • Attempts: {existingProgress.attempts}
                </p>
              )}
            </div>
          )}

          {/* Analyze button */}
          {audioUrl && !analysisResult && (
            <div className="mt-6 text-center">
              <button
                onClick={analyzeWithAI}
                disabled={isAnalyzing}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium shadow-primary hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing with AI...
                  </span>
                ) : (
                  "Analyze Speech"
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                AI will evaluate accuracy, fluency & emotion
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
