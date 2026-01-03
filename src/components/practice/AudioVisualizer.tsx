import React, { useMemo } from 'react';

interface AudioVisualizerProps {
  data: Uint8Array;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ data }) => {
  const bars = useMemo(() => {
    // Sample 16 bars from the frequency data
    const numBars = 16;
    const step = Math.floor(data.length / numBars);
    const sampledData = [];
    
    for (let i = 0; i < numBars; i++) {
      const value = data[i * step] || 0;
      sampledData.push(value);
    }
    
    return sampledData;
  }, [data]);

  return (
    <div className="flex items-center justify-center gap-1 h-full px-4">
      {bars.map((value, index) => {
        const height = Math.max(8, (value / 255) * 80);
        return (
          <div
            key={index}
            className="w-2 bg-primary rounded-full transition-all duration-75"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};
