import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Upload, 
  Settings, 
  BookOpen, 
  Loader2, 
  Plus,
  Trash2,
  Save,
  Shield
} from 'lucide-react';
import { AnalysisSettingsModal } from '@/components/practice/AnalysisSettingsModal';

interface LessonRow {
  id: string;
  lesson_file: string;
  lesson_name: string;
  categories: unknown;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Import form state
  const [importFile, setImportFile] = useState('');
  const [importName, setImportName] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin) {
      toast.error('Access denied: Admin only');
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchLessons();
    }
  }, [isAdmin]);

  const fetchLessons = async () => {
    setLoadingLessons(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('lesson_file');
    
    if (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Failed to load lessons');
    } else {
      setLessons(data || []);
    }
    setLoadingLessons(false);
  };

  const getCategoryNames = (categories: unknown): string[] => {
    if (typeof categories === 'object' && categories !== null) {
      return Object.keys(categories as Record<string, unknown>);
    }
    return [];
  };

  const handleImport = async () => {
    if (!importFile || !importName || !importJson) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const categories = JSON.parse(importJson);
      setImporting(true);

      const { error } = await supabase
        .from('lessons')
        .upsert({
          lesson_file: importFile,
          lesson_name: importName,
          categories,
          created_by: user?.id
        }, { onConflict: 'lesson_file' });

      if (error) throw error;

      toast.success('Lesson imported successfully!');
      setImportFile('');
      setImportName('');
      setImportJson('');
      fetchLessons();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import lesson');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string, lessonFile: string) => {
    if (!confirm(`Delete lesson "${lessonFile}"?`)) return;

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete lesson');
    } else {
      toast.success('Lesson deleted');
      fetchLessons();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="text-primary" size={24} />
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
          </div>
          <Button onClick={() => setSettingsOpen(true)} variant="outline" className="gap-2">
            <Settings size={16} />
            Score Settings
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="lessons" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen size={16} />
              Manage Lessons
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload size={16} />
              Import Lesson
            </TabsTrigger>
          </TabsList>

          {/* Lessons List */}
          <TabsContent value="lessons">
            <div className="bg-card rounded-xl border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">Lessons in Database</h2>
                <p className="text-sm text-muted-foreground">
                  {lessons.length} lessons stored
                </p>
              </div>
              
              {loadingLessons ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : lessons.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No lessons imported yet. Use the Import tab to add lessons.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{lesson.lesson_name}</p>
                        <p className="text-sm text-muted-foreground">{lesson.lesson_file}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Categories: {getCategoryNames(lesson.categories).join(', ')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(lesson.id, lesson.lesson_file)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Import Form */}
          <TabsContent value="import">
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              <div>
                <h2 className="font-semibold mb-1">Import New Lesson</h2>
                <p className="text-sm text-muted-foreground">
                  Add a new lesson or update an existing one by file name
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lesson-file">Lesson File Name</Label>
                  <Input
                    id="lesson-file"
                    placeholder="D1_L0_Food_tour.json"
                    value={importFile}
                    onChange={(e) => setImportFile(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match the JSON file name in your lessons folder
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lesson-name">Lesson Display Name</Label>
                  <Input
                    id="lesson-name"
                    placeholder="D1 - L0 - Food tour"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson-json">Categories JSON</Label>
                <Textarea
                  id="lesson-json"
                  placeholder='{"Vocab": [{"English": "hello", "Vietnamese": "xin chào"}], ...}'
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the "categories" object from your lesson JSON file
                </p>
              </div>

              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {importing ? 'Importing...' : 'Import Lesson'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <AnalysisSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default Admin;
