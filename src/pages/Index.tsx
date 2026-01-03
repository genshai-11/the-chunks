import React, { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { LessonView } from '@/components/lesson/LessonView';
import { PracticeModal } from '@/components/practice/PracticeModal';
import { useApp } from '@/context/AppContext';
import { curriculum } from '@/data/curriculum';
import { Menu } from 'lucide-react';

const Index: React.FC = () => {
  const { loadLesson, selectedItem, sidebarOpen, setSidebarOpen } = useApp();

  // Load first lesson on mount
  useEffect(() => {
    const firstLesson = curriculum[0]?.days[0];
    if (firstLesson?.lessonFile) {
      loadLesson(firstLesson.lessonFile);
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
        
        <LessonView />
      </div>
      
      {selectedItem && <PracticeModal />}
    </div>
  );
};

export default Index;
