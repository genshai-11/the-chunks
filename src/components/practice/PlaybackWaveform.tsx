import React, { useEffect, useRef, useState } from 'react';

interface PlaybackWaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  onReady?: () => void;
}

export const PlaybackWaveform: React.FC<PlaybackWaveformProps> = ({ audioUrl, isPlaying, onReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load and decode audio
  useEffect(() => {
    const loadAudio = async () => {
      try {
        audioContextRef.current = new AudioContext();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        setDuration(audioBuffer.duration);

        // Extract waveform data
        const channelData = audioBuffer.getChannelData(0);
        const samples = 100;
        const blockSize = Math.floor(channelData.length / samples);
        const peaks: number[] = [];

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j]);
          }
          peaks.push(sum / blockSize);
        }

        // Normalize
        const max = Math.max(...peaks);
        const normalized = peaks.map(p => p / max);
        setWaveformData(normalized);
        onReady?.();
      } catch (error) {
        console.error('Failed to load audio waveform:', error);
      }
    };

    loadAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioUrl, onReady]);

  // Animate playback position
  useEffect(() => {
    if (isPlaying && duration > 0) {
      startTimeRef.current = Date.now() - currentPosition * 1000;
      
      const animate = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const newPosition = Math.min(elapsed, duration);
        setCurrentPosition(newPosition);
        
        if (newPosition < duration) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, duration]);

  // Reset position when audio ends
  useEffect(() => {
    if (!isPlaying && currentPosition >= duration && duration > 0) {
      setCurrentPosition(0);
    }
  }, [isPlaying, currentPosition, duration]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barWidth = width / waveformData.length;
    const playedRatio = duration > 0 ? currentPosition / duration : 0;
    const playedBars = Math.floor(waveformData.length * playedRatio);

    ctx.clearRect(0, 0, width, height);

    waveformData.forEach((value, index) => {
      const barHeight = Math.max(4, value * (height - 8));
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      // Played portion
      if (index < playedBars) {
        ctx.fillStyle = 'hsl(var(--primary))';
      } else {
        ctx.fillStyle = 'hsl(var(--primary) / 0.3)';
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    });

    // Draw playhead
    if (duration > 0) {
      const playheadX = width * playedRatio;
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.arc(playheadX, height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [waveformData, currentPosition, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      <canvas
        ref={canvasRef}
        className="w-full h-16"
        style={{ maxWidth: '100%' }}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formatTime(currentPosition)}</span>
        <span>/</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
