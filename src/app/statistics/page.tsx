"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Clock, 
  BookOpen,
  ArrowUpRight,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function StatisticsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Load data
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
        throw new Error("Supabase connection offline.");
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

  useEffect(() => {
    loadData();
    
    // Register global listener
    window.addEventListener("student_os_db_update", loadData);
    return () => {
      window.removeEventListener("student_os_db_update", loadData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPA calculation
  const courseGrades = [
    { code: "PTI 101", name: "Basis Data", credits: 3, attendance: "98%", grade: "A", points: 4.0 },
    { code: "PTI 102", name: "Filsafat Pendidikan dan Sains", credits: 4, attendance: "96%", grade: "A", points: 4.0 },
    { code: "PTI 103", name: "Jaringan Komputer", credits: 3, attendance: "95%", grade: "A", points: 4.0 },
    { code: "PTI 104", name: "Komunikasi dan Teknologi Pendidikan", credits: 3, attendance: "100%", grade: "A", points: 4.0 },
    { code: "PTI 105", name: "Paradigma Berpikir Sistem dan Desain", credits: 3, attendance: "94%", grade: "A", points: 4.0 },
    { code: "PTI 106", name: "Pemrograman Web", credits: 3, attendance: "97%", grade: "A", points: 4.0 },
    { code: "PTI 107", name: "Perkembangan Peserta Didik", credits: 3, attendance: "92%", grade: "B+", points: 3.5 },
    { code: "PTI 108", name: "Teknologi Sistem Terintegrasi", credits: 2, attendance: "95%", grade: "A", points: 4.0 },
  ];

  const totalCredits = courseGrades.reduce((sum, c) => sum + c.credits, 0);
  const weightedPoints = courseGrades.reduce((sum, c) => sum + (c.points * c.credits), 0);
  const semesterGpa = (weightedPoints / totalCredits).toFixed(3); // 3.940

  const gpaMetrics = [
    { label: "IP Semester", value: semesterGpa, trend: "SKS Lulus: 24", status: "Target Met" },
    { label: "IPK Kumulatif", value: "3.65", trend: "SKS Lulus: 66", status: "On Track" },
    { label: "Kehadiran Kuliah", value: "96.1%", trend: "Rata-rata kehadiran", status: "Excellent" },
  ];

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const getStudyHoursByDay = () => {
    const hours = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    
    tasks.forEach(task => {
      if (!task.deadline) return;
      
      const date = new Date(task.deadline);
      const dayIndex = date.getDay();
      const dayNames: ("Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat")[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = dayNames[dayIndex];
      
      if (dayName) {
        hours[dayName] = (hours[dayName] || 0) + (task.estimated_hours || 0);
      }
    });

    const totalHours = Object.values(hours).reduce((a, b) => a + b, 0);
    if (totalHours === 0) {
      return { Mon: 4.2, Tue: 3.5, Wed: 5.0, Thu: 2.1, Fri: 4.0, Sat: 1.5, Sun: 0.8 };
    }
    
    return hours;
  };

  const studyHours = getStudyHoursByDay();
  const chartData = daysOfWeek.map(day => ({ day, hours: parseFloat(studyHours[day as keyof typeof studyHours].toFixed(1)) }));
  
  const totalWeeklyHours = chartData.reduce((sum, d) => sum + d.hours, 0).toFixed(1);
  const maxHours = Math.max(...chartData.map(d => d.hours), 5);

  // Milestones based on Categories
  const getCategoryMilestones = () => {
    const milestones = categories.map(cat => {
      const catTasks = tasks.filter(t => t.category_id === cat.id);
      const total = catTasks.length;
      if (total === 0) return null;
      
      const progressSum = catTasks.reduce((sum, t) => sum + t.progress, 0);
      const avgProgress = Math.round(progressSum / total);
      
      const totalHours = catTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      const doneHours = catTasks
        .filter(t => t.status === "done")
        .reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      
      return {
        name: cat.name,
        color: cat.color,
        progress: avgProgress,
        hoursCompleted: doneHours,
        totalHours: totalHours
      };
    }).filter(Boolean);

    if (milestones.length === 0) {
      return [
        { name: "Kuliah Tasks", color: "#6366F1", progress: 80, hoursCompleted: 4, totalHours: 5 },
        { name: "Kuis Preparation", color: "#F59E0B", progress: 100, hoursCompleted: 2.5, totalHours: 2.5 },
        { name: "Ujian Study Prep", color: "#EF4444", progress: 50, hoursCompleted: 1.5, totalHours: 3 }
      ];
    }

    return milestones;
  };

  const milestones = getCategoryMilestones();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Offline banner */}
      {isOfflineMode && (
        <div className="flex items-center justify-between border border-amber-200 bg-amber-50/50 rounded-lg p-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Local Demo Mode:</strong> Statistics are aggregated from your local storage tasks. Connect Supabase keys to analyze live database entries.
            </span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze your study hours, grades, and targets.
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-white gap-1.5 text-xs border-border hover:bg-secondary">
          <span>Export Report</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        /* LOADING SKELETON STATES */
        <div className="space-y-6">
          {/* GPA metrics skeleton */}
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-28 rounded-lg border border-border bg-white p-5 animate-pulse space-y-3">
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-7 bg-muted rounded w-1/3"></div>
                <div className="h-3.5 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Chart skeleton */}
            <div className="md:col-span-2 h-64 rounded-lg border border-border bg-white p-5 animate-pulse flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3.5 bg-muted rounded w-1/4"></div>
              </div>
              <div className="h-32 bg-muted/65 rounded w-full mt-4"></div>
            </div>
            {/* Milestones skeleton */}
            <div className="h-64 rounded-lg border border-border bg-white p-5 animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="space-y-2 pt-2">
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-2 bg-muted rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ACTUAL CONTENT */
        <>
          {/* GPA overview cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {gpaMetrics.map((metric, i) => (
              <div key={i} className="rounded-lg border border-border bg-white p-5 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {metric.label}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{metric.value}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {metric.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {metric.trend}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Study Time Chart Card - Takes 2 cols */}
            <div className="md:col-span-2 rounded-lg border border-border bg-white p-5 space-y-6 flex flex-col justify-between">
              <div>
                <h2 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  Allocated Task Hours by Day
                </h2>
                <p className="text-xs text-muted-foreground">Total study time scheduled: {totalWeeklyHours} hours</p>
              </div>

              {/* Clean Custom SVG Bar Chart */}
              <div className="w-full h-44 flex items-end justify-between gap-2 pt-4 border-b border-border px-2">
                {chartData.map((data, i) => {
                  const heightPercent = (data.hours / maxHours) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-foreground text-background text-[10px] font-semibold py-0.5 px-1.5 rounded -mb-1 z-10 shadow-none">
                        {data.hours}h
                      </div>
                      {/* Bar */}
                      <div 
                        className="w-full bg-indigo-100/60 border-x border-t border-indigo-200 group-hover:bg-primary transition-all duration-200 rounded-t-md"
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      />
                      {/* Day Label */}
                      <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">
                        {data.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Goals Card - Takes 1 col */}
            <div className="rounded-lg border border-border bg-white p-5 space-y-4">
              <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Milestone Progress
              </h2>
              
              <div className="space-y-3">
                {milestones.map((ms, idx) => {
                  if (!ms) return null;
                  return (
                    <div key={idx} className="p-3 rounded-lg border border-border space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-foreground">{ms.name}</span>
                        <span style={{ color: ms.color }} className="text-xs font-bold">
                          {ms.hoursCompleted} / {ms.totalHours} hrs
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${ms.progress}%`,
                            backgroundColor: ms.color
                          }} 
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                        <span>Task average completion</span>
                        <span>{ms.progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grade tracker table */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Current Course Enrolment & Semester Grades
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-card text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    <th className="px-5 py-3">Course Code</th>
                    <th className="px-5 py-3">Course Name</th>
                    <th className="px-5 py-3">Credits</th>
                    <th className="px-5 py-3">Attendance</th>
                    <th className="px-5 py-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courseGrades.map((course, i) => (
                    <tr key={i} className="hover:bg-card/40 transition-colors duration-150">
                      <td className="px-5 py-3.5 font-bold text-primary text-xs">{course.code}</td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">{course.name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{course.credits} Credits</td>
                      <td className="px-5 py-3.5 font-medium text-foreground">{course.attendance}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{course.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
