import React from 'react';
import { ChevronDown, ChevronRight, BookOpen, Calendar, Menu, X } from 'lucide-react';
import { curriculum } from '@/data/curriculum';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

export const Sidebar: React.FC = () => {
  const { currentLessonId, setCurrentLessonId, loadLesson, sidebarOpen, setSidebarOpen } = useApp();
  const [expandedWeeks, setExpandedWeeks] = React.useState<number[]>([1]);

  const toggleWeek = (weekId: number) => {
    setExpandedWeeks(prev =>
      prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]
    );
  };

  const handleSelectDay = (dayId: string, lessonFile: string) => {
    if (!lessonFile) return;
    setCurrentLessonId(dayId);
    loadLesson(lessonFile);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
          sidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className={cn("flex items-center", !sidebarOpen && "md:justify-center")}>
            <img src={logo} alt="Chunks" className="h-10 w-auto" />
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto p-3", !sidebarOpen && "hidden md:block")}>
          {sidebarOpen ? (
            <div className="space-y-2">
              {curriculum.map(week => (
                <div key={week.id} className="animate-fade-in">
                  <button
                    onClick={() => toggleWeek(week.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sidebar-accent transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-sidebar-primary" />
                      <span className="font-medium text-sidebar-foreground">{week.name}</span>
                    </div>
                    {expandedWeeks.includes(week.id) ? (
                      <ChevronDown size={18} className="text-muted-foreground" />
                    ) : (
                      <ChevronRight size={18} className="text-muted-foreground" />
                    )}
                  </button>

                  {expandedWeeks.includes(week.id) && (
                    <div className="ml-4 mt-1 space-y-1 animate-fade-in">
                      {week.days.map(day => (
                        <button
                          key={day.id}
                          onClick={() => handleSelectDay(day.id, day.lessonFile)}
                          disabled={!day.lessonFile}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 pl-4 rounded-lg text-left text-sm transition-all",
                            currentLessonId === day.id
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                            !day.lessonFile && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <BookOpen size={16} className={currentLessonId === day.id ? "text-primary" : "text-muted-foreground"} />
                          <span className="truncate">{day.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {curriculum.map(week => (
                <button
                  key={week.id}
                  onClick={() => {
                    setExpandedWeeks([week.id]);
                    setSidebarOpen(true);
                  }}
                  className="p-3 rounded-lg hover:bg-sidebar-accent transition-colors"
                  title={week.name}
                >
                  <Calendar size={20} className="text-sidebar-primary" />
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="text-xs text-muted-foreground text-center">
              30 Lessons • ERES Curriculum
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
