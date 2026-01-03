import React from 'react';
import { ChevronRight, Volume2, CheckCircle, Circle, TrendingUp } from 'lucide-react';
import { PracticeItem, UserProgress } from '@/types/curriculum';
import { CategoryBadge } from './CategoryBadge';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: PracticeItem;
  onClick: () => void;
  style?: React.CSSProperties;
  progress?: UserProgress;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick, style, progress }) => {
  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(item.English);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  const getStatusIndicator = () => {
    if (!progress) {
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Not practiced">
          <Circle size={14} />
          <span className="text-xs">New</span>
        </div>
      );
    }
    
    if (progress.mastered) {
      return (
        <div className="flex items-center gap-1.5 text-green-600" title={`Mastered • Best: ${progress.bestScore}`}>
          <CheckCircle size={14} />
          <span className="text-xs font-medium">{progress.bestScore}</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5 text-amber-600" title={`In progress • Best: ${progress.bestScore}`}>
        <TrendingUp size={14} />
        <span className="text-xs font-medium">{progress.bestScore}</span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "group relative bg-card rounded-xl border border-border p-4 cursor-pointer",
        "hover:border-primary/30 hover:shadow-card transition-all duration-200",
        "animate-fade-in",
        progress?.mastered && "border-green-500/20 bg-green-500/5"
      )}
    >
      {/* Mastery indicator bar */}
      {progress && (
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all",
              progress.mastered ? "bg-green-500" : "bg-amber-500"
            )}
            style={{ width: `${progress.bestScore}%` }}
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={item.category} />
            {getStatusIndicator()}
          </div>
          <p className="text-foreground font-medium text-lg leading-snug">
            {item.English}
          </p>
          <p className="text-muted-foreground text-sm mt-1.5">
            {item.Vietnamese}
          </p>
          {progress && progress.attempts > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={speak}
            className="p-2.5 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
          >
            <Volume2 size={18} />
          </button>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};
