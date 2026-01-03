import React, { useMemo } from 'react';
import { Grid, List, Filter } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PracticeItem } from '@/types/curriculum';
import { cn } from '@/lib/utils';
import { ItemCard } from './ItemCard';
import { FlashcardView } from './FlashcardView';
import { CategoryBadge } from './CategoryBadge';

export const LessonView: React.FC = () => {
  const { currentLesson, currentLessonId, categoryFilter, setCategoryFilter, viewMode, setViewMode, setSelectedItem, userProgress } = useApp();

  const items = useMemo<PracticeItem[]>(() => {
    if (!currentLesson) return [];
    
    const allItems: PracticeItem[] = [];
    Object.entries(currentLesson.categories).forEach(([category, categoryItems]) => {
      categoryItems.forEach((item, index) => {
        allItems.push({
          ...item,
          category,
          id: `${category}-${index}`,
        });
      });
    });
    return allItems;
  }, [currentLesson]);

  const categories = useMemo(() => {
    if (!currentLesson) return [];
    return Object.keys(currentLesson.categories);
  }, [currentLesson]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter(item => item.category === categoryFilter);
  }, [items, categoryFilter]);

  if (!currentLesson) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent flex items-center justify-center">
            <Filter size={32} className="text-primary" />
          </div>
          <h2 className="font-display text-3xl text-foreground mb-2">Select a Lesson</h2>
          <p className="text-muted-foreground">Choose a day from the sidebar to start practicing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="animate-fade-in">
              <h1 className="font-display text-3xl md:text-4xl text-foreground">
                {currentLesson.lesson_name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {items.length} items • {userProgress.filter(p => p.lessonId === currentLessonId && p.mastered).length} mastered
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List size={20} />
                </button>
                <button
                  onClick={() => setViewMode('flashcard')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'flashcard' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                categoryFilter === 'all'
                  ? "bg-primary text-primary-foreground shadow-primary"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              All ({items.length})
            </button>
            {categories.map(category => {
              const count = items.filter(i => i.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    categoryFilter === category
                      ? "bg-primary text-primary-foreground shadow-primary"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6">
        {viewMode === 'list' ? (
          <div className="grid gap-3 max-w-4xl mx-auto">
            {filteredItems.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
                style={{ animationDelay: `${index * 0.03}s` }}
                progress={userProgress.find(p => p.lessonId === currentLessonId && p.itemId === item.id)}
              />
            ))}
          </div>
        ) : (
          <FlashcardView items={filteredItems} />
        )}
      </main>
    </div>
  );
};
