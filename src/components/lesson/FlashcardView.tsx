import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, Mic } from 'lucide-react';
import { PracticeItem } from '@/types/curriculum';
import { CategoryBadge } from './CategoryBadge';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface FlashcardViewProps {
  items: PracticeItem[];
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({ items }) => {
  const { setSelectedItem } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentItem = items[currentIndex];

  const goNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const speak = () => {
    if (!currentItem) return;
    const utterance = new SpeechSynthesisUtterance(currentItem.English);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No items to display</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">
          Card {currentIndex + 1} of {items.length}
        </span>
        <div className="flex-1 mx-4 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>
        <CategoryBadge category={currentItem.category} />
      </div>

      {/* Flashcard */}
      <div
        className={cn("flip-card h-80 md:h-96 cursor-pointer", isFlipped && "flipped")}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flip-card-inner relative w-full h-full">
          {/* Front */}
          <div className="flip-card-front absolute inset-0 bg-card rounded-2xl border border-border shadow-card flex flex-col items-center justify-center p-8">
            <p className="text-2xl md:text-3xl font-medium text-foreground text-center leading-relaxed">
              {currentItem.English}
            </p>
            <p className="text-muted-foreground text-sm mt-6">Tap to flip</p>
          </div>

          {/* Back */}
          <div className="flip-card-back absolute inset-0 bg-primary rounded-2xl shadow-primary flex flex-col items-center justify-center p-8">
            <p className="text-2xl md:text-3xl font-medium text-primary-foreground text-center leading-relaxed">
              {currentItem.Vietnamese}
            </p>
            <p className="text-primary-foreground/70 text-sm mt-6">Tap to flip back</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={cn(
            "p-3 rounded-full bg-muted text-foreground transition-all",
            currentIndex === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-accent"
          )}
        >
          <ChevronLeft size={24} />
        </button>

        <button
          onClick={speak}
          className="p-3 rounded-full bg-muted text-foreground hover:bg-accent transition-all"
        >
          <Volume2 size={24} />
        </button>

        <button
          onClick={() => setIsFlipped(false)}
          className="p-3 rounded-full bg-muted text-foreground hover:bg-accent transition-all"
        >
          <RotateCcw size={24} />
        </button>

        <button
          onClick={() => setSelectedItem(currentItem)}
          className="p-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 shadow-primary transition-all"
        >
          <Mic size={24} />
        </button>

        <button
          onClick={goNext}
          disabled={currentIndex === items.length - 1}
          className={cn(
            "p-3 rounded-full bg-muted text-foreground transition-all",
            currentIndex === items.length - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-accent"
          )}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
