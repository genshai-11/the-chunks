import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Play, Pause, RefreshCw, Volume2, Loader2, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CategoryBadge } from '@/components/lesson/CategoryBadge';
import { AudioVisualizer } from './AudioVisualizer';
import { cn } from '@/lib/utils';
import { curriculum } from '@/data/curriculum';

export const PracticeModal: React.FC = () => {
  const { selectedItem, setSelectedItem, currentLessonId, recordPracticeSession, userProgress } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analyzerData, setAnalyzerData] = useState<Uint8Array | null>(null);
  const [practiceScore, setPracticeScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
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
    setPracticeScore(null);
  };

  const getWeekId = () => {
    for (const week of curriculum) {
      if (week.days.some(d => d.id === currentLessonId)) {
        return week.id;
      }
    }
    return 1;
  };

  const simulateAnalysis = () => {
    if (!selectedItem || !audioBlob) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI analysis with random score (will be replaced with real AI)
    setTimeout(() => {
      const score = Math.floor(Math.random() * 30) + 70; // 70-100 range
      setPracticeScore(score);
      setIsAnalyzing(false);
      
      // Record the practice session
      recordPracticeSession({
        lessonId: currentLessonId,
        itemId: selectedItem.id,
        category: selectedItem.category,
        score,
        weekId: getWeekId(),
      });
    }, 1500);
  };

  const existingProgress = selectedItem 
    ? userProgress.find(p => p.lessonId === currentLessonId && p.itemId === selectedItem.id)
    : null;

  const speakTarget = () => {
    if (!selectedItem) return;
    const utterance = new SpeechSynthesisUtterance(selectedItem.English);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
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
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg animate-scale-in overflow-hidden">
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
            <button
              onClick={speakTarget}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-accent transition-colors mb-4"
            >
              <Volume2 size={18} />
              <span className="text-sm font-medium">Listen</span>
            </button>
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

          {/* Score display */}
          {practiceScore !== null && (
            <div className="mt-6 text-center animate-fade-in">
              <div className={cn(
                "inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold mb-2",
                practiceScore >= 80 ? "bg-green-500/10 text-green-600" : 
                practiceScore >= 60 ? "bg-yellow-500/10 text-yellow-600" : 
                "bg-red-500/10 text-red-600"
              )}>
                {practiceScore}
              </div>
              <p className="text-sm text-muted-foreground">
                {practiceScore >= 80 ? "Great job! Item mastered!" : 
                 practiceScore >= 60 ? "Good effort! Keep practicing." : 
                 "Keep trying! You'll get there."}
              </p>
              {existingProgress && (
                <p className="text-xs text-muted-foreground mt-1">
                  Best: {existingProgress.bestScore} • Attempts: {existingProgress.attempts}
                </p>
              )}
            </div>
          )}

          {/* Analyze button */}
          {audioUrl && practiceScore === null && (
            <div className="mt-6 text-center">
              <button
                onClick={simulateAnalysis}
                disabled={isAnalyzing}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium shadow-primary hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  "Analyze Speech"
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                Records your practice session
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
