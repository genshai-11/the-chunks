import React, { useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useApp } from '@/context/AppContext';
import { curriculum } from '@/data/curriculum';
import { Menu, TrendingUp, Target, Award, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'recharts';

const Dashboard: React.FC = () => {
  const { userProgress, practiceSessions, sidebarOpen, setSidebarOpen } = useApp();

  // Calculate stats from real data
  const stats = useMemo(() => {
    const masteredItems = userProgress.filter(p => p.mastered).length;
    const totalPracticed = userProgress.length;
    const totalAttempts = userProgress.reduce((acc, p) => acc + p.attempts, 0);
    const averageScore = totalPracticed > 0
      ? Math.round(userProgress.reduce((acc, p) => acc + p.bestScore, 0) / totalPracticed)
      : 0;
    const masteryPercentage = totalPracticed > 0 
      ? Math.round((masteredItems / totalPracticed) * 100) 
      : 0;

    return { masteredItems, totalPracticed, totalAttempts, averageScore, masteryPercentage };
  }, [userProgress]);

  // Calculate category performance from real progress
  const categoryData = useMemo(() => {
    const categoryMap: Record<string, { totalScore: number; count: number }> = {};
    
    userProgress.forEach(p => {
      const cat = p.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { totalScore: 0, count: 0 };
      }
      categoryMap[cat].totalScore += p.bestScore;
      categoryMap[cat].count += 1;
    });

    const categories = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      score: Math.round(data.totalScore / data.count),
      items: data.count,
    }));

    // If no data, show placeholder categories
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

  // Calculate weekly progress from sessions
  const weeklyProgress = useMemo(() => {
    const weekMap: Record<number, { totalScore: number; count: number }> = {};
    
    practiceSessions.forEach(s => {
      if (!weekMap[s.weekId]) {
        weekMap[s.weekId] = { totalScore: 0, count: 0 };
      }
      weekMap[s.weekId].totalScore += s.score;
      weekMap[s.weekId].count += 1;
    });

    return curriculum.map(week => ({
      week: week.name,
      score: weekMap[week.id] 
        ? Math.round(weekMap[week.id].totalScore / weekMap[week.id].count) 
        : 0,
      items: weekMap[week.id]?.count || 0,
    }));
  }, [practiceSessions]);

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

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">
                Progress Dashboard
              </h1>
              <p className="text-muted-foreground">
                {hasData 
                  ? "Track your learning journey and performance metrics"
                  : "Start practicing to see your progress here!"
                }
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            {/* Weekly Progress */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyProgress}>
                      <XAxis
                        dataKey="week"
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
                        formatter={(value: number, name: string) => [
                          value || 'No data',
                          name === 'score' ? 'Avg Score' : name
                        ]}
                      />
                      <Bar
                        dataKey="score"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        name="Avg Score"
                      />
                    </BarChart>
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
            {practiceSessions.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Recent Practice Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {practiceSessions.slice(-10).reverse().map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            {session.category}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(session.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`font-bold ${
                          session.score >= 80 ? 'text-green-600' : 
                          session.score >= 60 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {session.score}
                        </span>
                      </div>
                    ))}
                  </div>
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
