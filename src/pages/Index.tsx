import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { LessonView } from '@/components/lesson/LessonView';
import { PracticeModal } from '@/components/practice/PracticeModal';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { curriculum } from '@/data/curriculum';
import { Menu, LogOut, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { loadLesson, selectedItem, sidebarOpen, setSidebarOpen } = useApp();
  const { user, isAdmin, signOut } = useAuth();

  // Load first lesson on mount
  useEffect(() => {
    const firstLesson = curriculum[0]?.days[0];
    if (firstLesson?.lessonFile) {
      loadLesson(firstLesson.lessonFile);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with auth controls */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-2">
                    <Shield size={16} />
                    Admin
                  </Button>
                )}
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="gap-2">
                <User size={16} />
                Sign In
              </Button>
            )}
          </div>
        </div>
        
        <LessonView />
      </div>
      
      {selectedItem && <PracticeModal />}
    </div>
  );
};

export default Index;
