"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  Menu, 
  X, 
  GraduationCap, 
  Settings, 
  Bell, 
  Plus,
  BookOpen,
  Trash2,
  Edit2,
  AlertTriangle,
  HelpCircle,
  Trophy,
  User,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
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

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Dialog Toggles
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isDeleteCatWarningOpen, setIsDeleteCatWarningOpen] = useState(false);
  
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Quick Add Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("none");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskHours, setTaskHours] = useState("0");
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [taskNotes, setTaskNotes] = useState("");

  // Category CRUD Form State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6366F1");
  const [catIcon, setCatIcon] = useState("GraduationCap");
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  const colorsList = ["#6366F1", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#F43F5E", "#06B6D4"];
  const iconsList = [
    { name: "GraduationCap", emoji: "🎓" },
    { name: "BookOpen", emoji: "📝" },
    { name: "AlertCircle", emoji: "🚨" },
    { name: "Trophy", emoji: "🏆" },
    { name: "User", emoji: "👤" }
  ];

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tasks", href: "/tasks", icon: CheckSquare },
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { label: "Statistics", href: "/statistics", icon: BarChart3 },
  ];

  // Load Database state
  async function loadData() {
    if (!isSupabaseConfigured) {
      setIsOfflineMode(true);
      loadLocalData();
      return;
    }

    try {
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
    
    // Register global listener for sync across routes
    window.addEventListener("student_os_db_update", loadData);
    return () => {
      window.removeEventListener("student_os_db_update", loadData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut listener: "N" key triggers Add Task dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsAddTaskOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync dispatcher
  const triggerDatabaseSync = () => {
    window.dispatchEvent(new Event("student_os_db_update"));
  };

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  // Create Task
  const handleQuickAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTaskData = {
      title: taskTitle.trim(),
      category_id: taskCategory === "none" ? null : taskCategory,
      deadline: taskDeadline || null,
      priority: taskPriority,
      estimated_hours: parseFloat(taskHours) || 0,
      progress: taskProgress,
      status: taskStatus,
      notes: taskNotes.trim() || null,
    };

    if (isOfflineMode) {
      const localTasks = localStorage.getItem("student_os_tasks");
      const currentLocalTasks: Task[] = localTasks ? JSON.parse(localTasks) : [];
      
      const newLocalTask: Task = {
        id: "task_" + Math.random().toString(36).substring(2, 9),
        ...newTaskData,
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem("student_os_tasks", JSON.stringify([newLocalTask, ...currentLocalTasks]));
      toast({
        title: "Tugas Ditambahkan",
        description: `"${taskTitle}" berhasil disimpan secara lokal.`,
        variant: "success"
      });
      triggerDatabaseSync();
      setIsAddTaskOpen(false);
      resetTaskForm();
    } else {
      try {
        const { error } = await supabase.from("tasks").insert([newTaskData]);
        if (error) throw error;
        
        toast({
          title: "Tugas Ditambahkan",
          description: `"${taskTitle}" berhasil disimpan di database.`,
          variant: "success"
        });
        triggerDatabaseSync();
        setIsAddTaskOpen(false);
        resetTaskForm();
      } catch (err) {
        console.error(err);
        toast({ title: "Gagal menyimpan tugas", variant: "destructive" });
      }
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskCategory("none");
    setTaskDeadline("");
    setTaskPriority("medium");
    setTaskHours("0");
    setTaskProgress(0);
    setTaskStatus("todo");
    setTaskNotes("");
  };

  // Category CRUD handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      // Edit mode
      if (isOfflineMode) {
        const updatedCats = categories.map(c => c.id === editingCategory.id ? { ...c, name: catName.trim(), color: catColor, icon: catIcon } : c);
        localStorage.setItem("student_os_categories", JSON.stringify(updatedCats));
        toast({ title: "Kategori Diperbarui", variant: "success" });
        triggerDatabaseSync();
        resetCategoryForm();
      } else {
        try {
          const { error } = await supabase
            .from("categories")
            .update({ name: catName.trim(), color: catColor, icon: catIcon })
            .eq("id", editingCategory.id);
          if (error) throw error;
          toast({ title: "Kategori Diperbarui", variant: "success" });
          triggerDatabaseSync();
          resetCategoryForm();
        } catch {
          toast({ title: "Gagal memperbarui kategori", variant: "destructive" });
        }
      }
    } else {
      // Add mode
      const newCatData = { name: catName.trim(), color: catColor, icon: catIcon };
      if (isOfflineMode) {
        const newLocalCat: Category = {
          id: "cat_" + Math.random().toString(36).substring(2, 9),
          ...newCatData
        };
        localStorage.setItem("student_os_categories", JSON.stringify([...categories, newLocalCat]));
        toast({ title: "Kategori Ditambahkan", variant: "success" });
        triggerDatabaseSync();
        resetCategoryForm();
      } else {
        try {
          const { error } = await supabase.from("categories").insert([newCatData]);
          if (error) throw error;
          toast({ title: "Kategori Ditambahkan", variant: "success" });
          triggerDatabaseSync();
          resetCategoryForm();
        } catch {
          toast({ title: "Gagal menambahkan kategori", variant: "destructive" });
        }
      }
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
  };

  const handleDeleteCategoryRequest = (cat: Category) => {
    // Check if tasks are linked
    const linkedTasks = tasks.filter(t => t.category_id === cat.id);
    if (linkedTasks.length > 0) {
      setCatToDelete(cat);
      setIsDeleteCatWarningOpen(true);
    } else {
      executeDeleteCategory(cat);
    }
  };

  const executeDeleteCategory = async (cat: Category) => {
    if (isOfflineMode) {
      const updatedCats = categories.filter(c => c.id !== cat.id);
      localStorage.setItem("student_os_categories", JSON.stringify(updatedCats));
      // Set linked tasks to uncategorized
      const updatedTasks = tasks.map(t => t.category_id === cat.id ? { ...t, category_id: null } : t);
      localStorage.setItem("student_os_tasks", JSON.stringify(updatedTasks));
      
      toast({ title: "Kategori Dihapus", variant: "success" });
      triggerDatabaseSync();
      setIsDeleteCatWarningOpen(false);
      setCatToDelete(null);
    } else {
      try {
        const { error } = await supabase.from("categories").delete().eq("id", cat.id);
        if (error) throw error;
        toast({ title: "Kategori Dihapus", variant: "success" });
        triggerDatabaseSync();
        setIsDeleteCatWarningOpen(false);
        setCatToDelete(null);
      } catch {
        toast({ title: "Gagal menghapus kategori", variant: "destructive" });
      }
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCatName("");
    setCatColor("#6366F1");
    setCatIcon("GraduationCap");
  };

  // Icon maps
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

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        {/* brand workspace */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 border border-border rounded-lg bg-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-sm text-foreground">StudentOS Space</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">Academic Term 1</span>
          </div>
        </div>

        {/* nav links */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileSidebar}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                  isActive
                    ? "bg-white text-primary border border-border font-medium shadow-none"
                    : "text-muted-foreground hover:bg-white hover:text-foreground hover:border-border border border-transparent"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {/* category settings button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            resetCategoryForm();
            setIsManageCategoriesOpen(true);
          }}
          className="w-full text-xs h-8 bg-white border border-border text-foreground hover:bg-secondary justify-start px-2 gap-2"
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Kelola Kategori</span>
        </Button>

        {/* User profile footer */}
        <div className="flex items-center justify-between border-t border-border pt-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-primary">
              MS
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-medium text-foreground">M. Rofi&apos;us</span>
              <span className="text-[9px] text-muted-foreground">Student</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 bg-secondary rounded border border-border">
            Press &quot;N&quot;
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background font-sans select-none">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={closeMobileSidebar}
        />
      )}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col lg:hidden transform transition-transform duration-200 ease-in-out",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex justify-end p-2 border-b border-border lg:hidden">
          <Button variant="ghost" size="icon-xs" onClick={toggleMobileSidebar} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-xs"
              className="lg:hidden h-8 w-8 text-muted-foreground hover:bg-secondary"
              onClick={toggleMobileSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg text-foreground tracking-tight">StudentOS</span>
              <span className="hidden md:inline-block h-3.5 w-px bg-border align-middle" />
              <span className="hidden md:inline-block text-xs text-muted-foreground font-medium">
                Your academic command center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAddTaskOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-white text-foreground border-border hover:bg-secondary h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Quick Add</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </div>
        </header>

        {/* Content View with Page Transition (key={pathname}) */}
        <main 
          key={pathname} 
          className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 animate-in fade-in duration-300"
        >
          <div className="mx-auto max-w-5xl w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border h-16 flex items-center justify-around lg:hidden pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 text-[10px] font-semibold transition-colors flex-1 h-full", 
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Global Quick Add Task Dialog Modal */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Quick Add Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickAddTaskSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Task Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Write Introduction of Physics Report"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <Select value={taskCategory} onOpenChange={loadData} onValueChange={(val) => setTaskCategory(val || "none")}>
                  <SelectTrigger className="w-full bg-white border-border text-foreground">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border">
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Deadline</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Priority</label>
                <Select value={taskPriority} onValueChange={(val) => { if (val) setTaskPriority(val); }}>
                  <SelectTrigger className="w-full bg-white border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Est. Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={taskHours}
                  onChange={(e) => setTaskHours(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <Select value={taskStatus} onValueChange={(val) => { if (val) setTaskStatus(val); }}>
                  <SelectTrigger className="w-full bg-white border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border">
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">Progress</span>
                <span className="text-muted-foreground font-semibold">{taskProgress}%</span>
              </div>
              <Slider
                value={[taskProgress]}
                onValueChange={(val) => { if (typeof val === "number") setTaskProgress(val); else if (Array.isArray(val)) setTaskProgress(val[0]); }}
                max={100}
                step={5}
                className="py-1 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Notes</label>
              <textarea
                placeholder="Description of this task..."
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none placeholder:text-muted-foreground text-foreground"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddTaskOpen(false)} className="text-xs h-8 bg-white border-border text-foreground hover:bg-secondary">
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-8 bg-primary text-white hover:bg-primary/95">
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Categories Management Dialog Modal */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Kelola Kategori Tugas</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
            {/* Left side: categories list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground">Kategori Saat Ini</h4>
              <div className="border border-border rounded-lg divide-y divide-border max-h-[200px] overflow-y-auto bg-card/10">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-white transition-colors">
                    <span 
                      className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 border rounded-full"
                      style={{ 
                        backgroundColor: `${cat.color}15`, 
                        borderColor: `${cat.color}35`, 
                        color: cat.color 
                      }}
                    >
                      {renderCategoryIcon(cat.icon)}
                      <span className="ml-1">{cat.name}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon-xs" onClick={() => handleEditCategory(cat)} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteCategoryRequest(cat)} className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Add/Edit Form */}
            <form onSubmit={handleSaveCategory} className="space-y-3 border-l md:border-l border-border pl-0 md:pl-5 pt-3 md:pt-0">
              <h4 className="text-xs font-bold text-foreground">
                {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h4>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-foreground">Nama Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Proyek Akhir"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-2.5 py-1 border border-border rounded-lg bg-white text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>

              {/* Color list circles */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-foreground">Warna Aksen</label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {colorsList.map((col) => (
                    <div 
                      key={col}
                      onClick={() => setCatColor(col)}
                      className={cn(
                        "h-5 w-5 rounded-full cursor-pointer border transition-transform hover:scale-110",
                        catColor === col ? "border-foreground ring-2 ring-indigo-500/30 scale-105" : "border-transparent"
                      )}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon select list */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-foreground">Pilih Ikon</label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {iconsList.map((item) => (
                    <div 
                      key={item.name}
                      onClick={() => setCatIcon(item.name)}
                      className={cn(
                        "h-7 w-7 rounded-md cursor-pointer border flex items-center justify-center text-xs transition-colors hover:bg-secondary",
                        catIcon === item.name ? "border-primary bg-indigo-50/20 text-primary" : "border-border bg-white text-muted-foreground"
                      )}
                    >
                      {item.emoji}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-2 justify-end">
                {editingCategory && (
                  <Button type="button" variant="ghost" size="sm" onClick={resetCategoryForm} className="text-xs h-7.5">
                    Batal
                  </Button>
                )}
                <Button type="submit" size="sm" className="text-xs h-7.5 bg-primary text-white hover:bg-primary/95">
                  {editingCategory ? "Simpan" : "Tambah"}
                </Button>
              </div>
            </form>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button onClick={() => setIsManageCategoriesOpen(false)} className="text-xs h-8 bg-white border-border text-foreground hover:bg-secondary">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Warning Confirmation Dialog Modal */}
      <Dialog open={isDeleteCatWarningOpen} onOpenChange={setIsDeleteCatWarningOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-border">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2 text-sm font-bold">
              <AlertTriangle className="h-5 w-5" /> Perhatian: Tugas Terhubung!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Menghapus kategori ini akan memutus hubungan dengan tugas yang sedang aktif.
            </DialogDescription>
          </DialogHeader>

          {catToDelete && (
            <div className="py-2.5 text-xs text-foreground space-y-2">
              <p>
                Kategori <strong className="text-primary">{catToDelete.name}</strong> saat ini terhubung dengan:
              </p>
              <div className="p-2 border border-border rounded bg-rose-50/30 text-rose-800 font-semibold text-center text-xs">
                {tasks.filter(t => t.category_id === catToDelete.id).length} Tugas Aktif
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1.5">
                Menghapus kategori ini akan mengubah status tugas terkait menjadi <strong>&quot;Uncategorized&quot;</strong>. Apakah kamu yakin ingin melanjutkan?
              </p>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsDeleteCatWarningOpen(false)} className="text-xs h-8 bg-white border-border text-foreground hover:bg-secondary">
              Batal
            </Button>
            <Button 
              onClick={() => catToDelete && executeDeleteCategory(catToDelete)} 
              className="text-xs h-8 bg-rose-600 text-white hover:bg-rose-700"
            >
              Ya, Hapus Kategori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
