import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { curriculum } from '@/data/curriculum';
import { 
  Menu, TrendingUp, Target, Award, BookOpen, Clock, 
  LogOut, User, ArrowLeft, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const { user, signOut } = useAuth();
  const { practiceHistory, userProgress, loading } = useUserData();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Calculate stats from database data
  const stats = useMemo(() => {
    const masteredItems = userProgress.filter(p => p.mastered).length;
    const totalPracticed = userProgress.length;
    const totalAttempts = userProgress.reduce((acc, p) => acc + p.attempts, 0);
    const averageScore = totalPracticed > 0
      ? Math.round(userProgress.reduce((acc, p) => acc + p.best_score, 0) / totalPracticed)
      : 0;
    const masteryPercentage = totalPracticed > 0 
      ? Math.round((masteredItems / totalPracticed) * 100) 
      : 0;
    const totalSessions = practiceHistory.length;

    return { masteredItems, totalPracticed, totalAttempts, averageScore, masteryPercentage, totalSessions };
  }, [userProgress, practiceHistory]);

  // Calculate category performance from database
  const categoryData = useMemo(() => {
    const categoryMap: Record<string, { totalScore: number; count: number }> = {};
    
    userProgress.forEach(p => {
      const cat = p.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { totalScore: 0, count: 0 };
      }
      categoryMap[cat].totalScore += p.best_score;
      categoryMap[cat].count += 1;
    });

    const categories = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      score: Math.round(data.totalScore / data.count),
      items: data.count,
    }));

    if (categories.length === 0) {
      return [
        { name: 'Vocab', score: 0, items: 0 },
        { name: 'Slang', score: 0, items: 0 },
        { name: 'Phrase', score: 0, items: 0 },
        { name: 'Sentence', score: 0, items: 0 },
      ];
    }

    return categories.sort((a, b) => b.score - a.score);
  }, [userProgress]);

  // Calculate daily progress from sessions (last 7 days)
  const dailyProgress = useMemo(() => {
    const days: { date: string; sessions: number; avgScore: number }[] = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = practiceHistory.filter(s => 
        s.created_at.split('T')[0] === dateStr
      );
      
      days.push({
        date: date.toLocaleDateString('en', { weekday: 'short' }),
        sessions: daySessions.length,
        avgScore: daySessions.length > 0 
          ? Math.round(daySessions.reduce((acc, s) => acc + s.score, 0) / daySessions.length)
          : 0
      });
    }
    
    return days;
  }, [practiceHistory]);

  const masteryData = [
    { name: 'Mastery', value: stats.masteryPercentage, fill: 'hsl(var(--primary))' },
  ];

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--accent))',
  ];

  const hasData = userProgress.length > 0;

  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with auth */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu size={24} />
            </button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hidden md:flex">
              <ArrowLeft size={20} />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {user ? (
              <>
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

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">
                Progress Dashboard
              </h1>
              <p className="text-muted-foreground">
                {hasData 
                  ? `Welcome back! You've practiced ${stats.totalPracticed} items.`
                  : user 
                    ? "Start practicing to see your progress here!"
                    : "Sign in to track your learning journey"
                }
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.masteryPercentage}%</p>
                      <p className="text-xs text-muted-foreground">Mastery</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-2/10">
                      <TrendingUp className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.averageScore}</p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-3/10">
                      <Award className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.masteredItems}</p>
                      <p className="text-xs text-muted-foreground">Mastered</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-4/10">
                      <BookOpen className="h-5 w-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.totalAttempts}</p>
                      <p className="text-xs text-muted-foreground">Attempts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-5/10">
                      <Clock className="h-5 w-5 text-chart-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Mastery Radial Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Overall Mastery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="90%"
                        barSize={20}
                        data={masteryData}
                        startAngle={90}
                        endAngle={90 - (360 * stats.masteryPercentage) / 100}
                      >
                        <RadialBar
                          background={{ fill: 'hsl(var(--muted))' }}
                          dataKey="value"
                          cornerRadius={10}
                        />
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-foreground"
                        >
                          <tspan x="50%" dy="-0.5em" className="text-4xl font-bold">
                            {stats.masteryPercentage}%
                          </tspan>
                          <tspan x="50%" dy="1.5em" className="text-sm fill-muted-foreground">
                            {hasData ? 'Complete' : 'Start practicing!'}
                          </tspan>
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Performance */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Performance by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {hasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} layout="vertical">
                          <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={70}
                            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>Practice items to see category performance</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Activity Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Last 7 Days Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyProgress}>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgScore"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                        name="Avg Score"
                      />
                      <Bar
                        dataKey="sessions"
                        fill="hsl(var(--muted))"
                        name="Sessions"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            {hasData && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {categoryData.map((cat, i) => (
                      <div
                        key={cat.name}
                        className="p-4 rounded-xl border border-border bg-muted/30 text-center"
                      >
                        <div
                          className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2"
                          style={{ backgroundColor: COLORS[i % COLORS.length] + '20' }}
                        >
                          <span className="text-lg font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                            {cat.score}
                          </span>
                        </div>
                        <p className="font-medium text-foreground text-sm">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.items} items</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Sessions */}
            {practiceHistory.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Recent Practice Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {practiceHistory.slice(0, 10).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            {session.category}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className={`font-bold ${
                          session.score >= 80 ? 'text-green-600' : 
                          session.score >= 60 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {Math.round(session.score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state for non-logged in users */}
            {!user && (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sign in to track your progress</h3>
                  <p className="text-muted-foreground mb-4">
                    Create an account to save your practice history and see detailed analytics
                  </p>
                  <Button onClick={() => navigate('/auth')}>
                    Sign In or Create Account
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
