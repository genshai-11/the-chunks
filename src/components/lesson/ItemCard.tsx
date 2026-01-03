import React from 'react';
import { ChevronRight, Volume2 } from 'lucide-react';
import { PracticeItem } from '@/types/curriculum';
import { CategoryBadge } from './CategoryBadge';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: PracticeItem;
  onClick: () => void;
  style?: React.CSSProperties;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick, style }) => {
  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(item.English);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "group relative bg-card rounded-xl border border-border p-4 cursor-pointer",
        "hover:border-primary/30 hover:shadow-card transition-all duration-200",
        "animate-fade-in"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={item.category} />
          </div>
          <p className="text-foreground font-medium text-lg leading-snug">
            {item.English}
          </p>
          <p className="text-muted-foreground text-sm mt-1.5">
            {item.Vietnamese}
          </p>
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
