"use client";

import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Calendar as CalendarIcon, 
  BookOpen, 
  AlertCircle,
  HelpCircle,
  Trophy,
  User,
  GraduationCap,
  AlertTriangle,
  FileText,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { DUMMY_TASKS, DUMMY_ACTIVITIES, Activity } from "@/lib/constants";

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

export default function CalendarPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 10)); // Simulated June 10, 2026

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  
  // Detail Dialog states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch categories, tasks & activities
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
      const { data: actData, error: actError } = await supabase.from("activities").select("*");

      if (catError || taskError || actError || !catData || catData.length === 0) {
        throw new Error("Supabase connection offline or unconfigured.");
      }

      setCategories(catData);
      setTasks(taskData || []);
      setActivities(actData || []);
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
    let localActs = localStorage.getItem("student_os_activities");

    if (!localCats) {
      localStorage.setItem("student_os_categories", JSON.stringify(DEFAULT_CATEGORIES));
      localCats = JSON.stringify(DEFAULT_CATEGORIES);
    }
    if (!localTasks) {
      localStorage.setItem("student_os_tasks", JSON.stringify(DUMMY_TASKS));
      localTasks = JSON.stringify(DUMMY_TASKS);
    }
    if (!localActs) {
      localStorage.setItem("student_os_activities", JSON.stringify(DUMMY_ACTIVITIES));
      localActs = JSON.stringify(DUMMY_ACTIVITIES);
    }
    setCategories(JSON.parse(localCats));
    setTasks(JSON.parse(localTasks));
    setActivities(JSON.parse(localActs));
  };

  useEffect(() => {
    loadData();
    
    // Register global database update listener
    window.addEventListener("student_os_db_update", loadData);
    return () => {
      window.removeEventListener("student_os_db_update", loadData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Month Date Calculations
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const cells = [];
    
    // Previous Month padding days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        day: dayNum,
        date: new Date(prevYear, prevMonth, dayNum),
        dateString: dateStr,
        isCurrentMonth: false
      });
    }

    // Current Month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      cells.push({
        day: i,
        date: new Date(year, month, i),
        dateString: dateStr,
        isCurrentMonth: true
      });
    }

    // Next Month padding days
    const remainingCells = 42 - cells.length; // Ensure exactly 6 rows (42 cells)
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let i = 1; i <= remainingCells; i++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      cells.push({
        day: i,
        date: new Date(nextYear, nextMonth, i),
        dateString: dateStr,
        isCurrentMonth: false
      });
    }

    return cells;
  };

  // Week Date Calculations
  const getWeekData = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      cells.push({
        day: date.getDate(),
        date: date,
        dateString: dateStr,
        isCurrentMonth: date.getMonth() === currentDate.getMonth()
      });
    }
    return cells;
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Fetch tasks matching specific date string (YYYY-MM-DD)
  const getTasksForDate = (dateStr: string) => {
    return tasks.filter((t) => t.deadline === dateStr);
  };

  // Fetch activities matching specific date string (YYYY-MM-DD)
  const getActivitiesForDate = (dateStr: string) => {
    return activities.filter((a) => a.date === dateStr);
  };

  const openTaskDetail = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedActivity(null);
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const openActivityDetail = (act: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(null);
    setSelectedActivity(act);
    setIsDetailOpen(true);
  };

  // Rendering icons
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "GraduationCap": return <GraduationCap className="h-3.5 w-3.5" />;
      case "BookOpen": return <BookOpen className="h-3.5 w-3.5" />;
      case "AlertCircle": return <AlertCircle className="h-3.5 w-3.5" />;
      case "Trophy": return <Trophy className="h-3.5 w-3.5" />;
      case "User": return <User className="h-3.5 w-3.5" />;
      default: return <HelpCircle className="h-3.5 w-3.5" />;
    }
  };

  // Priority styling
  const getPriorityBadgeStyles = (priority: "low" | "medium" | "high") => {
    switch (priority) {
      case "high": return "bg-rose-50 border-rose-200 text-rose-700";
      case "medium": return "bg-amber-50 border-amber-200 text-amber-700";
      case "low": return "bg-slate-50 border-slate-200 text-slate-600";
    }
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const cells = viewMode === "month" ? getMonthData() : getWeekData();

  // Combine activities and active tasks for a unified agenda
  const getUnifiedAgenda = () => {
    const activeTasks = tasks
      .filter(t => t.status !== "done" && t.deadline)
      .map(t => ({
        id: t.id,
        type: "task" as const,
        title: t.title,
        date: t.deadline!,
        timeLabel: "Due",
        priority: t.priority,
        category_id: t.category_id,
        notes: t.notes,
        raw: t
      }));

    const upcomingActivities = activities
      .map(a => ({
        id: a.id,
        type: "activity" as const,
        title: a.title,
        date: a.date,
        timeLabel: `${a.start_time.substring(0, 5)}${a.end_time ? ` - ${a.end_time.substring(0, 5)}` : ""}`,
        priority: "low" as const,
        category_id: a.category_id,
        notes: a.notes,
        raw: a
      }));

    return [...activeTasks, ...upcomingActivities]
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        
        if (a.type !== b.type) {
          return a.type === "activity" ? -1 : 1;
        }
        
        if (a.type === "activity" && b.type === "activity") {
          return (a.raw as Activity).start_time.localeCompare((b.raw as Activity).start_time);
        }
        
        return 0;
      });
  };

  const unifiedAgenda = getUnifiedAgenda();

  const handleItemClick = (item: { type: "task" | "activity"; raw: Task | Activity }) => {
    if (item.type === "task") {
      setSelectedActivity(null);
      setSelectedTask(item.raw as Task);
    } else {
      setSelectedTask(null);
      setSelectedActivity(item.raw as Activity);
    }
    setIsDetailOpen(true);
  };

  const openGlobalAddTask = () => {
    const event = new KeyboardEvent("keydown", { key: "n" });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Offline banner */}
      {isOfflineMode && (
        <div className="flex items-center justify-between border border-amber-200 bg-amber-50/50 rounded-lg p-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Local Demo Mode:</strong> Calendar updates are loaded from your browser cache. Connect keys in `.env.local` to synchronize.
            </span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay on top of class deadlines, exams, and milestones.
          </p>
        </div>
        <Button 
          onClick={openGlobalAddTask}
          size="sm" 
          className="gap-1.5 self-start sm:self-auto text-xs bg-primary text-white hover:bg-primary/95"
        >
          <Plus className="h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1 border border-border rounded-lg bg-card p-0.5">
            <Button variant="ghost" size="icon-xs" onClick={handlePrev} className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={handleNext} className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleGoToday} className="bg-white text-xs py-1 h-7 border-border hover:bg-secondary">
            Today
          </Button>
        </div>

        {/* View toggles - hidden on mobile since mobile only shows Agenda view */}
        <div className="hidden sm:flex items-center gap-1.5 border border-border p-1 rounded-lg bg-card justify-center">
          <span 
            onClick={() => setViewMode("month")}
            className={`text-xs px-2.5 py-1 rounded-md cursor-pointer font-semibold transition-colors ${
              viewMode === "month" ? "bg-white border border-border text-foreground font-bold shadow-none" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Month
          </span>
          <span 
            onClick={() => setViewMode("week")}
            className={`text-xs px-2.5 py-1 rounded-md cursor-pointer font-semibold transition-colors ${
              viewMode === "week" ? "bg-white border border-border text-foreground font-bold shadow-none" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Week
          </span>
        </div>
      </div>

      {/* Grid view (Desktop) vs Agenda View (Mobile) */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-muted-foreground text-sm gap-2">
          <Clock className="animate-spin h-4 w-4 text-primary" /> Loading calendar...
        </div>
      ) : (
        <>
          {/* DESKTOP CALENDAR VIEW */}
          <div className="hidden md:grid grid-cols-4 gap-6">
            {/* Grid */}
            <div className="col-span-3 rounded-lg border border-border bg-white overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border bg-card text-center text-xs font-semibold text-muted-foreground py-2.5">
                {daysOfWeek.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-border border-l -ml-px border-t -mt-px">
                {cells.map((cell, idx) => {
                  const dayTasks = getTasksForDate(cell.dateString);
                  const dayOfWeekIndex = cell.date.getDay();
                  const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
                  const cellIsToday = isToday(cell.date);

                  return (
                    <div 
                      key={idx} 
                      className={`min-h-28 p-2 flex flex-col justify-between transition-colors ${
                        cell.isCurrentMonth ? (isWeekend ? "bg-[#FAFAFA]" : "bg-white") : "bg-card/20 text-muted-foreground/45"
                      } ${cell.isCurrentMonth ? "hover:bg-[#F7F7F7]/60" : ""} ${
                        cellIsToday ? "ring-2 ring-primary ring-inset z-10 bg-indigo-50/10" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center ${
                          cellIsToday 
                            ? "bg-primary text-white" 
                            : cell.isCurrentMonth 
                            ? "text-foreground" 
                            : "text-muted-foreground/35"
                        }`}>
                          {cell.day}
                        </span>
                      </div>

                      <div className="space-y-1 flex-1 flex flex-col justify-start overflow-y-auto max-h-[80px] scrollbar-thin">
                        {/* Activities */}
                        {getActivitiesForDate(cell.dateString).map((act) => {
                          const category = categories.find(c => c.id === act.category_id);
                          const badgeColor = category ? category.color : "#10B981";

                          return (
                            <div 
                              key={act.id} 
                              onClick={(e) => openActivityDetail(act, e)}
                              className="text-[10px] px-1.5 py-0.5 border rounded font-semibold cursor-pointer select-none transition-all hover:opacity-85 truncate"
                              style={{
                                backgroundColor: `${badgeColor}12`,
                                borderColor: `${badgeColor}35`,
                                color: badgeColor
                              }}
                            >
                              <span className="font-bold mr-1">
                                🕒 {act.start_time.substring(0, 5)}
                              </span>
                              {act.title}
                            </div>
                          );
                        })}

                        {/* Tasks */}
                        {dayTasks.map((task) => {
                          const category = categories.find(c => c.id === task.category_id);
                          const badgeColor = category ? category.color : "#94A3B8";

                          return (
                            <div 
                              key={task.id} 
                              onClick={(e) => openTaskDetail(task, e)}
                              className={`text-[10px] px-1.5 py-0.5 border rounded font-semibold cursor-pointer select-none transition-all hover:opacity-85 truncate ${
                                task.status === "done" ? "line-through opacity-55" : ""
                              }`}
                              style={{
                                backgroundColor: `${badgeColor}12`,
                                borderColor: `${badgeColor}35`,
                                color: badgeColor
                              }}
                            >
                              <span className="font-bold mr-1">
                                {task.status === "done" ? "✓" : (task.priority === "high" ? "!" : "")}
                              </span>
                              {task.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar info */}
            <div className="space-y-4 col-span-1">
              <div className="rounded-lg border border-border bg-white p-4 space-y-4">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" /> Active Agenda
                </h3>
                
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {unifiedAgenda.slice(0, 6).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleItemClick(item)}
                      className="p-3 rounded-lg border border-border bg-card/30 hover:bg-card/75 transition-colors cursor-pointer space-y-1 text-xs"
                    >
                      <p className="font-bold text-foreground leading-snug">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {item.type === "activity" ? "🕒" : "📅"} {item.timeLabel} ({new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                      </p>
                    </div>
                  ))}
                  {unifiedAgenda.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No active schedule items.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE AGENDA VIEW */}
          <div className="block md:hidden space-y-4">
            <div className="border border-border rounded-lg p-3 bg-card/25 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Mobile mode: Monthly grid switched to list agenda view for optimization.</span>
            </div>

            <div className="rounded-lg border border-border bg-white p-4 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
                <CalendarIcon className="h-4 w-4 text-primary" /> Agenda & Jadwal Kegiatan
              </h3>

              <div className="space-y-3">
                {unifiedAgenda.map((item) => {
                  const category = categories.find(c => c.id === item.category_id);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = item.type === "task" && item.date && new Date(item.date).getTime() < today.getTime();
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="p-3.5 rounded-lg border border-border hover:bg-card/20 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                          {category && (
                            <span 
                              className="px-1.5 py-0.5 border rounded-full text-[9px] font-bold"
                              style={{ 
                                backgroundColor: `${category.color}10`, 
                                borderColor: `${category.color}30`, 
                                color: category.color 
                              }}
                            >
                              {category.name}
                            </span>
                          )}
                          <span className={isOverdue ? "text-rose-600" : ""}>
                            {item.type === "activity" ? "🕒" : "📅"} {item.timeLabel} ({new Date(item.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })})
                          </span>
                        </div>
                      </div>

                      <span className={`px-1.5 py-0.5 border rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                        item.type === "task" && item.priority === "high"
                          ? "bg-rose-50 border-rose-100 text-rose-600"
                          : "bg-slate-50 border-slate-100 text-slate-500"
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  );
                })}

                {unifiedAgenda.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Tidak ada agenda atau kegiatan aktif saat ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-border">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const cat = categories.find(c => c.id === selectedTask.category_id);
                    return cat ? (
                      <span 
                        className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 border rounded-full"
                        style={{ 
                          backgroundColor: `${cat.color}15`, 
                          borderColor: `${cat.color}40`, 
                          color: cat.color 
                        }}
                      >
                        {renderCategoryIcon(cat.icon)}
                        <span className="ml-1">{cat.name}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-400 px-2.5 py-0.5 rounded-full">
                        Uncategorized
                      </span>
                    );
                  })()}
                  
                  <span className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 border rounded-full uppercase tracking-wider ${getPriorityBadgeStyles(selectedTask.priority)}`}>
                    {selectedTask.priority} Priority
                  </span>
                </div>
                <DialogTitle className={`text-base font-bold text-foreground ${selectedTask.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                  {selectedTask.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm text-foreground">
                {selectedTask.notes && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-card/50 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Notes
                    </p>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedTask.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" /> Deadline
                    </span>
                    <p className="text-xs font-bold text-foreground">
                      {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      }) : "No deadline"}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Estimated Workload
                    </span>
                    <p className="text-xs font-bold text-foreground">
                      {selectedTask.estimated_hours} Hours
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">Progress Completion</span>
                    <span className="font-bold text-foreground">{selectedTask.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedTask.status === "done" ? "bg-indigo-600" : "bg-primary"
                      }`}
                      style={{ width: `${selectedTask.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="font-semibold text-muted-foreground">Current Status</span>
                  <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 border rounded-full ${
                    selectedTask.status === "done"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : selectedTask.status === "in_progress"
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}>
                    {selectedTask.status === "done" ? "Completed" : (selectedTask.status === "in_progress" ? "In Progress" : "To Do")}
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  onClick={() => setIsDetailOpen(false)} 
                  className="text-xs h-8 bg-primary text-white hover:bg-primary/95"
                >
                  Close Details
                </Button>
              </DialogFooter>
            </>
          )}

          {selectedActivity && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const cat = categories.find(c => c.id === selectedActivity.category_id);
                    return cat ? (
                      <span 
                        className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 border rounded-full"
                        style={{ 
                          backgroundColor: `${cat.color}15`, 
                          borderColor: `${cat.color}40`, 
                          color: cat.color 
                        }}
                      >
                        {renderCategoryIcon(cat.icon)}
                        <span className="ml-1">{cat.name}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-400 px-2.5 py-0.5 rounded-full">
                        Uncategorized
                      </span>
                    );
                  })()}
                  
                  <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-full uppercase tracking-wider">
                    Jadwal Kegiatan
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedActivity.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm text-foreground">
                {selectedActivity.notes && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-card/50 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Notes
                    </p>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedActivity.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" /> Tanggal
                    </span>
                    <p className="text-xs font-bold text-foreground">
                      {new Date(selectedActivity.date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Jam Pelaksanaan
                    </span>
                    <p className="text-xs font-bold text-foreground">
                      {selectedActivity.start_time.substring(0, 5)} {selectedActivity.end_time ? `- ${selectedActivity.end_time.substring(0, 5)}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  onClick={() => setIsDetailOpen(false)} 
                  className="text-xs h-8 bg-primary text-white hover:bg-primary/95"
                >
                  Close Details
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
