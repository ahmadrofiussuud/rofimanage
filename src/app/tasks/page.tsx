"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Clock, 
  Calendar as CalendarIcon, 
  BookOpen, 
  ArrowUpDown, 
  Trash2, 
  Edit2,
  AlertTriangle,
  GraduationCap,
  Trophy,
  User,
  AlertCircle,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { DUMMY_TASKS } from "@/lib/constants";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

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

export default function TasksPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  // Filters & Sorting states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"deadline" | "priority">("deadline");

  // Edit Task Form States
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("none");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editHours, setEditHours] = useState("0");
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [editNotes, setEditNotes] = useState("");

  // Load categories and tasks
  async function loadData() {
    const shouldShowLoading = !isInitialLoaded && tasks.length === 0 && categories.length === 0;

    if (!isSupabaseConfigured || isOfflineMode) {
      setIsOfflineMode(true);
      loadLocalData();
      setLoading(false);
      setIsInitialLoaded(true);
      return;
    }

    try {
      if (shouldShowLoading) setLoading(true);
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
      setIsInitialLoaded(true);
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
    
    // Register global listener to sync state with Layout Quick Add modal
    window.addEventListener("student_os_db_update", loadData);
    return () => {
      window.removeEventListener("student_os_db_update", loadData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerDatabaseSync = () => {
    window.dispatchEvent(new Event("student_os_db_update"));
  };

  // Inline status toggle cycle: todo -> in_progress -> done -> todo
  const handleStatusToggle = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const statusCycle: Record<string, "todo" | "in_progress" | "done"> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    
    const nextStatus = statusCycle[task.status] || "todo";
    const nextProgress = nextStatus === "done" ? 100 : (task.status === "done" && nextStatus === "todo" ? 0 : task.progress);

    // Optimistically update the UI tasks state immediately:
    setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, status: nextStatus, progress: nextProgress } : t));

    if (isOfflineMode) {
      const updated = tasks.map(t => t.id === task.id ? { ...t, status: nextStatus, progress: nextProgress } : t);
      localStorage.setItem("student_os_tasks", JSON.stringify(updated));
      
      toast({
        title: "Status Diperbarui",
        description: `"${task.title}" sekarang ${getStatusLabel(nextStatus)}.`,
        variant: "success"
      });
      triggerDatabaseSync();
    } else {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ status: nextStatus, progress: nextProgress })
          .eq("id", task.id);
          
        if (error) throw error;
        
        toast({
          title: "Status Diperbarui",
          description: `"${task.title}" sekarang ${getStatusLabel(nextStatus)}.`,
          variant: "success"
        });
        triggerDatabaseSync();
      } catch (err) {
        console.error("Failed to update status in Supabase:", err);
        // Rollback state if failed
        setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, status: task.status, progress: task.progress } : t));
        toast({ title: "Gagal memperbarui status", variant: "destructive" });
      }
    }
  };

  // Delete task
  const handleDeleteTask = async (task: Task) => {
    if (isOfflineMode) {
      const updated = tasks.filter(t => t.id !== task.id);
      localStorage.setItem("student_os_tasks", JSON.stringify(updated));
      
      toast({
        title: "Tugas Dihapus",
        description: `"${task.title}" berhasil dihapus.`,
        variant: "success"
      });
      triggerDatabaseSync();
    } else {
      try {
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", task.id);
          
        if (error) throw error;
        
        toast({
          title: "Tugas Dihapus",
          description: `"${task.title}" berhasil dihapus.`,
          variant: "success"
        });
        triggerDatabaseSync();
      } catch (err) {
        console.error("Failed to delete task from Supabase:", err);
        toast({ title: "Gagal menghapus tugas", variant: "destructive" });
      }
    }
  };

  // Edit task handlers
  const handleStartEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category_id || "none");
    setEditDeadline(task.deadline || "");
    setEditPriority(task.priority);
    setEditHours(task.estimated_hours.toString());
    setEditProgress(task.progress);
    setEditStatus(task.status);
    setEditNotes(task.notes || "");
  };

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    const updatedTaskData = {
      title: editTitle.trim(),
      category_id: editCategory === "none" ? null : editCategory,
      deadline: editDeadline ? editDeadline : null,
      priority: editPriority,
      estimated_hours: parseFloat(editHours) || 0,
      progress: editProgress,
      status: editStatus,
      notes: editNotes.trim() || null,
    };

    try {
      if (isOfflineMode) {
        // Local mode update
        const localTasks = localStorage.getItem("student_os_tasks");
        if (localTasks) {
          const currentLocalTasks: Task[] = JSON.parse(localTasks);
          const updated = currentLocalTasks.map((t) =>
            t.id === editingTask.id
              ? { ...t, ...updatedTaskData }
              : t
          );
          localStorage.setItem("student_os_tasks", JSON.stringify(updated));
        }
        
        toast({
          title: "Tugas Diperbarui",
          description: `Tugas "${editTitle.trim()}" telah berhasil diperbarui.`,
          variant: "success",
        });
        setEditingTask(null);
        triggerDatabaseSync();
      } else {
        const { error } = await supabase
          .from("tasks")
          .update(updatedTaskData)
          .eq("id", editingTask.id);
        if (error) throw error;

        toast({
          title: "Tugas Diperbarui",
          description: `Tugas "${editTitle.trim()}" telah berhasil diperbarui.`,
          variant: "success",
        });
        setEditingTask(null);
        triggerDatabaseSync();
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      toast({
        title: "Gagal Memperbarui Tugas",
        description: "Terjadi kesalahan saat menyimpan perubahan.",
        variant: "destructive",
      });
    }
  };

  // Render Icons
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

  // Priority badge styling helper
  const getPriorityBadgeStyles = (priority: "low" | "medium" | "high") => {
    switch (priority) {
      case "high": return "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-50";
      case "medium": return "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-50";
      case "low": return "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-50";
    }
  };

  // Status text formatter
  const getStatusLabel = (status: "todo" | "in_progress" | "done") => {
    switch (status) {
      case "todo": return "To Do";
      case "in_progress": return "In Progress";
      case "done": return "Done";
    }
  };

  // Status color badge
  const getStatusBadgeStyles = (status: "todo" | "in_progress" | "done") => {
    switch (status) {
      case "done": return "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-50";
      case "in_progress": return "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-50";
      case "todo": return "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-50";
    }
  };

  // Filter & Sort Logic
  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "all" || task.category_id === filterCategory;
      const matchesStatus = filterStatus === "all" || task.status === filterStatus;
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === "deadline") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      } else {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
    });

  // Global Dialog Trigger Dispatcher
  const openGlobalAddTask = () => {
    // Open Quick Add Dialog by dispatching or toggling
    // We can simulate an 'n' keypress to trigger LayoutShell keyboard shortcut
    const event = new KeyboardEvent("keydown", { key: "n" });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Offline/Demo banner */}
      {isOfflineMode && (
        <div className="flex items-center justify-between border border-amber-200 bg-amber-50/50 rounded-lg p-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Local Demo Mode:</strong> Tasks updates will trigger toast alerts and sync locally. Connect Supabase keys in `.env.local` to persist entries.
            </span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track assignment deadlines, exam preparations, and priority milestones.
          </p>
        </div>
        <Button 
          onClick={openGlobalAddTask}
          size="sm" 
          className="gap-1.5 self-start sm:self-auto text-xs bg-primary text-white hover:bg-primary/95"
        >
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground text-foreground"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val || "all")}>
            <SelectTrigger className="bg-white border-border text-foreground text-xs py-1.5 h-8 w-[145px]">
              <SelectValue placeholder="Category">
                {filterCategory === "all" 
                  ? "All Categories" 
                  : (categories.find(c => c.id === filterCategory)?.name || filterCategory)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border border-border">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "all")}>
            <SelectTrigger className="bg-white border-border text-foreground text-xs py-1.5 h-8 w-[120px]">
              <SelectValue placeholder="Status">
                {filterStatus === "all" 
                  ? "All Statuses" 
                  : getStatusLabel(filterStatus as "todo" | "in_progress" | "done")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border border-border">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={filterPriority} onValueChange={(val) => setFilterPriority(val || "all")}>
            <SelectTrigger className="bg-white border-border text-foreground text-xs py-1.5 h-8 w-[120px]">
              <SelectValue placeholder="Priority">
                {filterPriority === "all" 
                  ? "All Priorities" 
                  : filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border border-border">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sorting selection */}
        <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto justify-between md:justify-end border-t md:border-t-0 border-border pt-3 md:pt-0">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
          </span>
          <div className="flex items-center gap-1 border border-border p-0.5 rounded-lg bg-card text-xs">
            <span 
              onClick={() => setSortBy("deadline")}
              className={`px-2 py-1 rounded-md cursor-pointer font-semibold transition-colors ${
                sortBy === "deadline" ? "bg-white border border-border text-foreground font-bold shadow-none" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Deadline
            </span>
            <span 
              onClick={() => setSortBy("priority")}
              className={`px-2 py-1 rounded-md cursor-pointer font-semibold transition-colors ${
                sortBy === "priority" ? "bg-white border border-border text-foreground font-bold shadow-none" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Priority
            </span>
          </div>
        </div>
      </div>

      {/* Main Content View (Table vs Cards list based on screen size) */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-muted-foreground text-sm gap-2">
          <Clock className="animate-spin h-4 w-4 text-primary" /> Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center border border-border rounded-lg bg-white space-y-4">
          <div className="h-14 w-14 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-center text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-sm">No tasks yet</h3>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              {searchQuery || filterCategory !== "all" || filterStatus !== "all" || filterPriority !== "all" 
                ? "No tasks match your active filters. Try clearing them!" 
                : "Your workspace is empty. Create your first task to get started."}
            </p>
          </div>
          {(searchQuery || filterCategory !== "all" || filterStatus !== "all" || filterPriority !== "all") ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSearchQuery("");
                setFilterCategory("all");
                setFilterStatus("all");
                setFilterPriority("all");
              }}
              className="text-xs bg-white text-foreground border-border hover:bg-secondary h-8"
            >
              Clear Filters
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={openGlobalAddTask}
              className="text-xs bg-primary text-white hover:bg-primary/95 h-8"
            >
              Add Your First Task
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block rounded-lg border border-border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-card">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[35%]">Task Name</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[15%]">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[15%]">Deadline</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[12%]">Priority</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[15%]">
                    <div className="text-center w-full">Progress</div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[8%]">
                    <div className="text-center w-full">Actions</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {filteredTasks.map((task) => {
                  const categoryObj = categories.find((c) => c.id === task.category_id);
                  return (
                    <TableRow 
                      key={task.id} 
                      onClick={() => handleStartEditTask(task)}
                      className="group border-b border-border hover:bg-card/30 transition-colors duration-150 text-sm align-middle cursor-pointer"
                    >
                      {/* Task Name / Title */}
                      <TableCell className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col">
                          <span className={`font-semibold text-foreground ${
                            task.status === "done" ? "line-through text-muted-foreground font-medium" : ""
                          }`}>
                            {task.title}
                          </span>
                          {task.notes && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {task.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Category Badge */}
                      <TableCell className="px-4 py-3.5 align-middle">
                        {categoryObj ? (
                          <span 
                            className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 border rounded-full"
                            style={{ 
                              backgroundColor: `${categoryObj.color}15`, 
                              borderColor: `${categoryObj.color}40`, 
                              color: categoryObj.color 
                            }}
                          >
                            {renderCategoryIcon(categoryObj.icon)}
                            {categoryObj.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                            Uncategorized
                          </span>
                        )}
                      </TableCell>

                      {/* Deadline Date */}
                      <TableCell className="px-4 py-3.5 text-muted-foreground font-semibold text-xs align-middle">
                        {task.deadline ? (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                            {new Date(task.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Priority */}
                      <TableCell className="px-4 py-3.5 align-middle">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 border rounded-full uppercase tracking-wider ${getPriorityBadgeStyles(task.priority)}`}>
                          {task.priority}
                        </span>
                      </TableCell>

                      {/* Progress Bar & Status click badge */}
                      <TableCell className="px-4 py-3.5 align-middle text-center">
                        <div className="inline-flex items-center justify-center gap-4 text-center">
                          <div className="flex flex-col items-center min-w-[70px] space-y-1">
                            <div className="h-1.5 w-full max-w-[80px] bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  task.status === "done" ? "bg-indigo-600" : "bg-primary"
                                }`} 
                                style={{ width: `${task.progress}%` }} 
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground">{task.progress}%</span>
                          </div>
                          
                          <span 
                            onClick={(e) => { e.stopPropagation(); handleStatusToggle(task, e); }}
                            className={`cursor-pointer inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 border rounded-full select-none ${getStatusBadgeStyles(task.status)}`}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions edit & delete */}
                      <TableCell className="px-4 py-3.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => { e.stopPropagation(); handleStartEditTask(task); }}
                            className="text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50/50 transition-all rounded-md h-7 w-7"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}
                            className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50/50 transition-all rounded-md h-7 w-7"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE CARD LIST VIEW */}
          <div className="block md:hidden space-y-3">
            {filteredTasks.map((task) => {
              const categoryObj = categories.find((c) => c.id === task.category_id);
              return (
                <div 
                  key={task.id} 
                  onClick={() => handleStartEditTask(task)}
                  className="rounded-lg border border-border bg-white p-4 space-y-3.5 hover:bg-card/20 transition-colors cursor-pointer"
                >
                  {/* Top: Name, and Notes */}
                  <div className="flex items-start gap-2.5">
                    <div className="space-y-1">
                      <p className={`text-sm font-semibold text-foreground leading-snug ${
                        task.status === "done" ? "line-through text-muted-foreground font-medium" : ""
                      }`}>
                        {task.title}
                      </p>
                      {task.notes && (
                        <p className="text-xs text-muted-foreground leading-normal">{task.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {/* Category */}
                    {categoryObj ? (
                      <span 
                        className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 border rounded-full"
                        style={{ 
                          backgroundColor: `${categoryObj.color}15`, 
                          borderColor: `${categoryObj.color}35`, 
                          color: categoryObj.color 
                        }}
                      >
                        {renderCategoryIcon(categoryObj.icon)}
                        {categoryObj.name}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                        Uncategorized
                      </span>
                    )}

                    {/* Priority */}
                    <span className={`inline-flex items-center text-[9px] font-semibold px-2 py-0.5 border rounded-full uppercase tracking-wider ${getPriorityBadgeStyles(task.priority)}`}>
                      {task.priority}
                    </span>

                    {/* Deadline */}
                    {task.deadline && (
                      <span className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 border border-border bg-card/40 text-muted-foreground rounded-full gap-1">
                        <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                        {new Date(task.deadline).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}

                    {/* Est Hours */}
                    {task.estimated_hours > 0 && (
                      <span className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 border border-border bg-card/40 text-muted-foreground rounded-full gap-1">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        {task.estimated_hours}h
                      </span>
                    )}
                  </div>

                  {/* Bottom: Progress Bar & Toggle Button & Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-4">
                    {/* Progress */}
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.status === "done" ? "bg-indigo-600" : "bg-primary"
                          }`} 
                          style={{ width: `${task.progress}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground shrink-0">{task.progress}%</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Clickable Status */}
                      <span 
                        onClick={(e) => { e.stopPropagation(); handleStatusToggle(task, e); }}
                        className={`cursor-pointer inline-flex items-center text-[9px] font-bold px-2 py-0.5 border rounded-full select-none ${getStatusBadgeStyles(task.status)}`}
                      >
                        {getStatusLabel(task.status)}
                      </span>

                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => { e.stopPropagation(); handleStartEditTask(task); }}
                        className="text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 h-7 w-7"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}
                        className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50 h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={editingTask !== null} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Tugas</DialogTitle>
            <DialogDescription>
              Ubah detail tugas Anda di bawah ini. Tekan simpan jika sudah selesai.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTaskSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="edit-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Judul Tugas</label>
              <input
                id="edit-title"
                type="text"
                placeholder="Misal: Ujian Kalkulus II"
                className="w-full rounded-md border border-input bg-white text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kategori</label>
                <Select value={editCategory} onValueChange={(val) => setEditCategory(val || "none")}>
                  <SelectTrigger className="w-full bg-white border-border text-foreground text-sm">
                    <SelectValue placeholder="Pilih Kategori">
                      {editCategory === "none"
                        ? "Tanpa Kategori"
                        : (categories.find(c => c.id === editCategory)?.name || editCategory)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border">
                    <SelectItem value="none">Tanpa Kategori</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-deadline" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenggat Waktu (Deadline)</label>
                <input
                  id="edit-deadline"
                  type="date"
                  className="w-full rounded-md border border-input bg-white text-foreground px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioritas</label>
                <Select value={editPriority} onValueChange={(val) => { if (val) setEditPriority(val as "low" | "medium" | "high"); }}>
                  <SelectTrigger className="w-full bg-white border-border text-foreground text-sm">
                    <SelectValue placeholder="Prioritas">
                      {editPriority === "high" ? "Tinggi (High)" : editPriority === "medium" ? "Sedang (Medium)" : "Rendah (Low)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border">
                    <SelectItem value="low">Rendah (Low)</SelectItem>
                    <SelectItem value="medium">Sedang (Medium)</SelectItem>
                    <SelectItem value="high">Tinggi (High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-hours" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimasi Waktu (Jam)</label>
                <input
                  id="edit-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  className="w-full rounded-md border border-input bg-white text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={editStatus} onValueChange={(val) => { if (val) setEditStatus(val as "todo" | "in_progress" | "done"); }}>
                  <SelectTrigger className="w-full bg-white border-border text-foreground text-sm">
                    <SelectValue placeholder="Status">
                      {editStatus === "done" ? "Selesai" : editStatus === "in_progress" ? "Sedang Dikerjakan" : "Belum Dimulai"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border">
                    <SelectItem value="todo">Belum Dimulai</SelectItem>
                    <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
                    <SelectItem value="done">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress ({editProgress}%)</label>
                </div>
                <div className="pt-2">
                  <Slider
                    defaultValue={[editProgress]}
                    value={[editProgress]}
                    onValueChange={(val) => {
                      if (Array.isArray(val)) {
                        setEditProgress(val[0]);
                      } else if (typeof val === "number") {
                        setEditProgress(val);
                      }
                    }}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-notes" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
              <textarea
                id="edit-notes"
                placeholder="Tambahkan detail, link materi, atau catatan penting lainnya..."
                className="w-full rounded-md border border-input bg-white text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[70px] resize-none"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
