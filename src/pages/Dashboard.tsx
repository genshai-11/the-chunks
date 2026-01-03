import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useApp } from '@/context/AppContext';
import { curriculum } from '@/data/curriculum';
import { Menu, TrendingUp, Target, Award, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts';

const Dashboard: React.FC = () => {
  const { userProgress, sidebarOpen, setSidebarOpen } = useApp();

  // Calculate total items across all lessons
  const totalLessons = curriculum.reduce((acc, week) => acc + week.days.filter(d => d.lessonFile).length, 0);
  const masteredItems = userProgress.filter(p => p.mastered).length;
  const totalAttempts = userProgress.reduce((acc, p) => acc + p.attempts, 0);
  const averageScore = userProgress.length > 0
    ? Math.round(userProgress.reduce((acc, p) => acc + p.bestScore, 0) / userProgress.length)
    : 0;

  // Calculate mastery percentage (estimate based on practiced items)
  const masteryPercentage = userProgress.length > 0 ? Math.round((masteredItems / userProgress.length) * 100) : 0;

  // Data for radial mastery chart
  const masteryData = [
    { name: 'Mastery', value: masteryPercentage, fill: 'hsl(var(--primary))' },
  ];

  // Mock category performance data based on progress
  const categoryData = [
    { name: 'Vocab', score: 85, items: 24 },
    { name: 'Slang', score: 72, items: 18 },
    { name: 'Phrase', score: 68, items: 15 },
    { name: 'Sentence', score: 78, items: 32 },
    { name: 'Dialogue', score: 65, items: 12 },
    { name: 'Review', score: 82, items: 8 },
  ];

  // Progress over time (mock data for demo)
  const weeklyProgress = [
    { week: 'Week 1', score: 65, items: 12 },
    { week: 'Week 2', score: 72, items: 18 },
    { week: 'Week 3', score: 78, items: 24 },
    { week: 'Week 4', score: 75, items: 20 },
    { week: 'Week 5', score: 82, items: 28 },
  ];

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--accent))',
  ];

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
                Track your learning journey and performance metrics
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
                      <p className="text-2xl font-bold text-foreground">{masteryPercentage}%</p>
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
                      <p className="text-2xl font-bold text-foreground">{averageScore}</p>
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
                      <p className="text-2xl font-bold text-foreground">{masteredItems}</p>
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
                      <p className="text-2xl font-bold text-foreground">{totalAttempts}</p>
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
                        endAngle={90 - (360 * masteryPercentage) / 100}
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
                            {masteryPercentage}%
                          </tspan>
                          <tspan x="50%" dy="1.5em" className="text-sm fill-muted-foreground">
                            Complete
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
                        style={{ backgroundColor: COLORS[i] + '20' }}
                      >
                        <span className="text-lg font-bold" style={{ color: COLORS[i] }}>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
