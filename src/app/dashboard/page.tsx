"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  GraduationCap,
  Trophy,
  User,
  BookOpen,
  AlertCircle,
  HelpCircle,
  BrainCircuit,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { DUMMY_TASKS } from "@/lib/constants";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Task {
  id: string;
  title: string;
  category_id: string | null;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  estimated_hours: number;
  progress: number;
  status: "todo" | "in_progress" | "done";
  notes: string | null;
  created_at: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "c1", name: "Kuliah", color: "#6366F1", icon: "GraduationCap" },
  { id: "c2", name: "Kuis", color: "#F59E0B", icon: "BookOpen" },
  { id: "c3", name: "Ujian", color: "#EF4444", icon: "AlertCircle" },
  { id: "c4", name: "Lomba", color: "#10B981", icon: "Trophy" },
  { id: "c5", name: "Pribadi", color: "#8B5CF6", icon: "User" }
];

export default function DashboardPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // AI states
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load categories and tasks
  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured) {
        setIsOfflineMode(true);
        loadLocalData();
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: catData, error: catError } = await supabase.from("categories").select("*");
        const { data: taskData, error: taskError } = await supabase.from("tasks").select("*");

        if (catError || taskError || !catData || catData.length === 0) {
          throw new Error("Supabase offline.");
        }

        setCategories(catData);
        setTasks(taskData || []);
        setIsOfflineMode(false);
      } catch {
        setIsOfflineMode(true);
        loadLocalData();
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const loadLocalData = () => {
    let localCats = localStorage.getItem("student_os_categories");
    let localTasks = localStorage.getItem("student_os_tasks");

    if (!localCats) {
      localStorage.setItem("student_os_categories", JSON.stringify(DEFAULT_CATEGORIES));
      localCats = JSON.stringify(DEFAULT_CATEGORIES);
    }
    if (!localTasks) {
      localStorage.setItem("student_os_tasks", JSON.stringify(DUMMY_TASKS));
      localTasks = JSON.stringify(DUMMY_TASKS);
    }
    setCategories(JSON.parse(localCats));
    setTasks(JSON.parse(localTasks));
  };

  // Time-of-day greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  // Relative deadline color-code helper
  const getRelativeDeadline = (deadlineStr: string | null) => {
    if (!deadlineStr) return { text: "No deadline", colorClass: "text-slate-400 bg-slate-50 border-slate-200" };
    
    const today = new Date("2026-06-10"); // Simulated "today" June 10, 2026
    const deadlineDate = new Date(deadlineStr);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: "Overdue", colorClass: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (diffDays === 0) {
      return { text: "Due Today", colorClass: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (diffDays === 1) {
      return { text: "1 day left", colorClass: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (diffDays <= 2) {
      return { text: `${diffDays} days left`, colorClass: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (diffDays <= 5) {
      return { text: `${diffDays} days left`, colorClass: "text-amber-700 bg-amber-50 border-amber-200" };
    }
    return { text: `${diffDays} days left`, colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  // Stats Calculations
  const activeTasks = tasks.filter(t => t.status !== "done");
  const completedTasks = tasks.filter(t => t.status === "done");
  
  // Due this week: deadline between June 10, 2026 and June 17, 2026
  const dueThisWeek = activeTasks.filter(t => {
    if (!t.deadline) return false;
    const diffDays = Math.ceil((new Date(t.deadline).getTime() - new Date("2026-06-10").getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Completed today: completed tasks (in a real system we'd track completed_at, here we check deadline is today or default to recent completed)
  const completedToday = completedTasks.slice(0, 2); // Mock count or filter from tasks

  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Upcoming 5 deadlines
  const upcomingDeadlines = [...activeTasks]
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 5);

  // Get AI study recommendation
  const handleGetRecommendation = async () => {
    try {
      setAiLoading(true);
      setAiRecommendation(null);

      // Map task category names for prompt richness
      const tasksWithCategoryNames = activeTasks.map(t => {
        const cat = categories.find(c => c.id === t.category_id);
        return {
          title: t.title,
          category: cat ? cat.name : "Uncategorized",
          deadline: t.deadline,
          estimated_hours: t.estimated_hours,
          progress: t.progress,
          priority: t.priority
        };
      });

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksWithCategoryNames }),
      });

      if (!res.ok) throw new Error("Recommendation failed");

      const data = await res.json();
      setAiRecommendation(data.recommendation);
    } catch (err) {
      console.error("Failed to get recommendation:", err);
      setAiRecommendation("Gagal mendapatkan rekomendasi AI. Pastikan server route tersedia dan coba lagi.");
    } finally {
      setAiLoading(false);
    }
  };

  // Helper formatting for custom mock text markdown headings
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("###")) {
        return <h4 key={idx} className="font-bold text-sm text-foreground mt-4 mb-2">{line.replace("###", "").trim()}</h4>;
      }
      if (line.startsWith("-") || line.startsWith("*")) {
        return (
          <li key={idx} className="text-xs text-muted-foreground ml-4 list-disc mt-1">
            {line.substring(1).trim()}
          </li>
        );
      }
      if (line.startsWith("---")) {
        return <hr key={idx} className="my-3 border-border" />;
      }
      return <p key={idx} className="text-xs text-muted-foreground leading-relaxed mt-1">{line}</p>;
    });
  };

  // Categories progress horizontal bar chart
  const categoriesStats = categories.map(cat => {
    const catTasks = tasks.filter(t => t.category_id === cat.id);
    const count = catTasks.length;
    const maxCount = Math.max(...categories.map(c => tasks.filter(t => t.category_id === c.id).length), 1);
    const percentWidth = (count / maxCount) * 100;
    return { name: cat.name, color: cat.color, count, percentWidth };
  }).filter(c => c.count > 0);

  // Category Icon Renderer
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "GraduationCap": return <GraduationCap className="h-3 w-3 mr-1" />;
      case "BookOpen": return <BookOpen className="h-3 w-3 mr-1" />;
      case "AlertCircle": return <AlertCircle className="h-3 w-3 mr-1" />;
      case "Trophy": return <Trophy className="h-3 w-3 mr-1" />;
      case "User": return <User className="h-3 w-3 mr-1" />;
      default: return <HelpCircle className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Offline banner */}
      {isOfflineMode && (
        <div className="flex items-center justify-between border border-amber-200 bg-amber-50/50 rounded-lg p-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Local Demo Mode:</strong> Dashboard is using local offline cache. Add active tasks in the Tasks view to populate statistics and get AI recommendations.
            </span>
          </div>
        </div>
      )}

      {/* 1. Welcome Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {getGreeting()}, Rofi 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wednesday, 10 June 2026
        </p>
      </div>

      {/* 2. Quick Stats Row */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-lg border border-border bg-white p-4 animate-pulse flex flex-col justify-between">
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-6 bg-muted rounded w-1/3 mt-2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Active Tasks */}
          <div className="rounded-lg border border-border bg-white p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Tasks</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-foreground">{activeTasks.length}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-slate-50">Tasks</span>
            </div>
          </div>

          {/* Due This Week */}
          <div className="rounded-lg border border-border bg-white p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due This Week</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-foreground">{dueThisWeek.length}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-amber-200 text-amber-600 bg-amber-50">Urgent</span>
            </div>
          </div>

          {/* Completed Today */}
          <div className="rounded-lg border border-border bg-white p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed Today</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-foreground">{completedToday.length}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-200 text-emerald-600 bg-emerald-50">Done</span>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="rounded-lg border border-border bg-white p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completion Rate</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-indigo-200 text-indigo-600 bg-indigo-50">Total</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Grid: Upcoming & Progress (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* 3. Upcoming Deadlines */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="border-b border-border px-4 py-3 bg-card flex justify-between items-center">
              <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-primary" /> Upcoming Deadlines
              </h2>
              <Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center">
                View Tasks <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-10 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : upcomingDeadlines.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No upcoming deadlines! Add tasks to begin tracking workloads.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcomingDeadlines.map((task) => {
                  const category = categories.find((c) => c.id === task.category_id);
                  const relDeadline = getRelativeDeadline(task.deadline);
                  
                  return (
                    <div key={task.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-card/30 transition-colors">
                      <div className="flex flex-col gap-1 pr-3 max-w-[60%]">
                        <span className="font-semibold text-foreground truncate">{task.title}</span>
                        {category && (
                          <span 
                            className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 border rounded-full w-fit"
                            style={{ 
                              backgroundColor: `${category.color}10`, 
                              borderColor: `${category.color}30`, 
                              color: category.color 
                            }}
                          >
                            {renderCategoryIcon(category.icon)}
                            {category.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Relative date badge */}
                        <span className={`px-2 py-0.5 border rounded font-semibold text-[10px] ${relDeadline.colorClass}`}>
                          {relDeadline.text}
                        </span>
                        {/* Priority Badge */}
                        <span className={`px-1.5 py-0.5 border rounded-full text-[9px] uppercase tracking-wider font-semibold ${
                          task.priority === "high"
                            ? "bg-rose-50 border-rose-100 text-rose-600"
                            : task.priority === "medium"
                            ? "bg-amber-50 border-amber-100 text-amber-600"
                            : "bg-slate-50 border-slate-100 text-slate-500"
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Progress Overview Category Chart */}
          <div className="rounded-lg border border-border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" /> Category Distribution
            </h2>
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
              </div>
            ) : categoriesStats.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4">
                No task distributions available. Categories will populate once tasks are created.
              </div>
            ) : (
              <div className="space-y-3">
                {categoriesStats.map((stat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground">{stat.name}</span>
                      <span className="text-muted-foreground font-semibold">{stat.count} task{stat.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${stat.percentWidth}%`,
                          backgroundColor: stat.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Grid: AI Recommendation Hero Card (1 col) */}
        <div className="space-y-6">
          {/* 4. AI Recommendation hero section */}
          <div className="rounded-lg border border-border border-l-4 border-l-indigo-500 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-primary">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">✨ What should I work on now?</h3>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analisis tugas aktif dan dapatkan saran belajar optimal secara instan dari AI.
            </p>

            <Button 
              onClick={handleGetRecommendation}
              disabled={aiLoading || activeTasks.length === 0}
              className="w-full text-xs py-1.5 h-8.5 bg-primary text-white hover:bg-primary/95 disabled:opacity-50"
            >
              {aiLoading ? "Analyzing..." : "Get Recommendation"}
            </Button>

            {/* AI Output Content / Skeletons */}
            {aiLoading && (
              <div className="space-y-2.5 pt-2 animate-pulse">
                <div className="h-3 bg-muted rounded w-2/3"></div>
                <div className="h-3.5 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-5/6"></div>
                <div className="h-3.5 bg-muted rounded w-3/4"></div>
              </div>
            )}

            {aiRecommendation && (
              <div className="border-t border-border pt-4 mt-2 space-y-1">
                {renderFormattedText(aiRecommendation)}
              </div>
            )}

            {!aiRecommendation && !aiLoading && activeTasks.length === 0 && (
              <div className="text-[11px] text-center text-muted-foreground pt-2">
                Tambah tugas aktif untuk membuka fitur rekomendasi AI.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
