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
  Activity as ActivityIcon
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
import { DUMMY_ACTIVITIES, Activity } from "@/lib/constants";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "c1", name: "Kuliah", color: "#6366F1", icon: "GraduationCap" },
  { id: "c2", name: "Kuis", color: "#F59E0B", icon: "BookOpen" },
  { id: "c3", name: "Ujian", color: "#EF4444", icon: "AlertCircle" },
  { id: "c4", name: "Lomba", color: "#10B981", icon: "Trophy" },
  { id: "c5", name: "Pribadi", color: "#8B5CF6", icon: "User" }
];

export default function ActivitiesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  // Filters & Sorting states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "time">("date");

  // Add/Edit Dialog Form States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("none");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Load categories and activities
  async function loadData() {
    const shouldShowLoading = !isInitialLoaded && activities.length === 0 && categories.length === 0;

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
      const { data: actData, error: actError } = await supabase.from("activities").select("*");

      if (catError || actError || !catData || catData.length === 0) {
        throw new Error("Supabase offline.");
      }

      setCategories(catData);
      setActivities(actData || []);
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
    let localActs = localStorage.getItem("student_os_activities");

    if (!localCats) {
      localStorage.setItem("student_os_categories", JSON.stringify(DEFAULT_CATEGORIES));
      localCats = JSON.stringify(DEFAULT_CATEGORIES);
    }
    if (!localActs) {
      localStorage.setItem("student_os_activities", JSON.stringify(DUMMY_ACTIVITIES));
      localActs = JSON.stringify(DUMMY_ACTIVITIES);
    }

    setCategories(JSON.parse(localCats));
    setActivities(JSON.parse(localActs));
  };

  useEffect(() => {
    loadData();
    
    // Register global listener to sync state with other route edits
    window.addEventListener("student_os_db_update", loadData);
    return () => {
      window.removeEventListener("student_os_db_update", loadData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerDatabaseSync = () => {
    window.dispatchEvent(new Event("student_os_db_update"));
  };

  // Open Add Dialog
  const handleOpenAddDialog = () => {
    setEditingActivity(null);
    setFormTitle("");
    setFormCategory("none");
    
    // Default to today's date dynamically (YYYY-MM-DD)
    const localToday = new Date();
    const offset = localToday.getTimezoneOffset();
    const adjustedDate = new Date(localToday.getTime() - (offset * 60 * 1000));
    const todayStr = adjustedDate.toISOString().split("T")[0];
    setFormDate(todayStr);
    setFormStartTime("08:00");
    setFormEndTime("09:00");
    setFormNotes("");
    setIsAddDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEditDialog = (act: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingActivity(act);
    setFormTitle(act.title);
    setFormCategory(act.category_id || "none");
    setFormDate(act.date);
    setFormStartTime(act.start_time.substring(0, 5));
    setFormEndTime(act.end_time ? act.end_time.substring(0, 5) : "");
    setFormNotes(act.notes || "");
    setIsAddDialogOpen(true);
  };

  // Delete activity
  const handleDeleteActivity = async (act: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOfflineMode) {
      const updated = activities.filter(a => a.id !== act.id);
      localStorage.setItem("student_os_activities", JSON.stringify(updated));
      
      toast({
        title: "Kegiatan Dihapus",
        description: `"${act.title}" berhasil dihapus.`,
        variant: "success"
      });
      triggerDatabaseSync();
    } else {
      try {
        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", act.id);
          
        if (error) throw error;
        
        toast({
          title: "Kegiatan Dihapus",
          description: `"${act.title}" berhasil dihapus.`,
          variant: "success"
        });
        triggerDatabaseSync();
      } catch (err) {
        console.error("Failed to delete activity from Supabase:", err);
        toast({ title: "Gagal menghapus kegiatan", variant: "destructive" });
      }
    }
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || !formStartTime) return;

    const activityData = {
      title: formTitle.trim(),
      category_id: formCategory === "none" ? null : formCategory,
      date: formDate,
      start_time: formStartTime,
      end_time: formEndTime || null,
      notes: formNotes.trim() || null,
    };

    try {
      if (editingActivity) {
        // UPDATE MODE
        if (isOfflineMode) {
          const updated = activities.map(a => 
            a.id === editingActivity.id 
              ? { ...a, ...activityData } 
              : a
          );
          localStorage.setItem("student_os_activities", JSON.stringify(updated));
          
          toast({
            title: "Kegiatan Diperbarui",
            description: `"${formTitle.trim()}" berhasil diperbarui.`,
            variant: "success",
          });
          setIsAddDialogOpen(false);
          triggerDatabaseSync();
        } else {
          const { error } = await supabase
            .from("activities")
            .update(activityData)
            .eq("id", editingActivity.id);
          if (error) throw error;

          toast({
            title: "Kegiatan Diperbarui",
            description: `"${formTitle.trim()}" berhasil diperbarui.`,
            variant: "success",
          });
          setIsAddDialogOpen(false);
          triggerDatabaseSync();
        }
      } else {
        // CREATE MODE
        const newAct = {
          id: Math.random().toString(36).substr(2, 9),
          ...activityData,
          created_at: new Date().toISOString()
        };

        if (isOfflineMode) {
          const updated = [newAct, ...activities];
          localStorage.setItem("student_os_activities", JSON.stringify(updated));
          
          toast({
            title: "Kegiatan Ditambahkan",
            description: `"${formTitle.trim()}" berhasil dijadwalkan.`,
            variant: "success",
          });
          setIsAddDialogOpen(false);
          triggerDatabaseSync();
        } else {
          // Supabase insert (omit temporary client-side ID so db generates UUID)
          const { error } = await supabase
            .from("activities")
            .insert([activityData]);
          if (error) throw error;

          toast({
            title: "Kegiatan Ditambahkan",
            description: `"${formTitle.trim()}" berhasil dijadwalkan.`,
            variant: "success",
          });
          setIsAddDialogOpen(false);
          triggerDatabaseSync();
        }
      }
    } catch (err) {
      console.error("Failed to save activity:", err);
      toast({
        title: "Gagal Menyimpan Kegiatan",
        description: "Terjadi kesalahan saat menghubungi database.",
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

  // Filter & Sort Logic
  const filteredActivities = activities
    .filter((act) => {
      const matchesSearch = act.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "all" || act.category_id === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        // Sort by start_time
        return a.start_time.localeCompare(b.start_time);
      }
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Offline/Demo banner */}
      {isOfflineMode && (
        <div className="flex items-center justify-between border border-amber-200 bg-amber-50/50 rounded-lg p-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Local Demo Mode:</strong> Kegiatan updates will trigger toast alerts and sync locally. Add &apos;activities&apos; table in Supabase to persist entries.
            </span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Activities</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule lectures, study sessions, and events with specific times.
          </p>
        </div>
        <Button 
          onClick={handleOpenAddDialog}
          size="sm" 
          className="gap-1.5 self-start sm:self-auto text-xs bg-primary text-white hover:bg-primary/95"
        >
          <Plus className="h-4 w-4" /> Add Activity
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search activities..."
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
        </div>

        {/* Sorting selection */}
        <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto justify-between md:justify-end border-t md:border-t-0 border-border pt-3 md:pt-0">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
          </span>
          <div className="flex items-center gap-1 border border-border p-0.5 rounded-lg bg-card text-xs">
            <span 
              onClick={() => setSortBy("date")}
              className={`px-2 py-1 rounded-md cursor-pointer font-semibold transition-colors ${
                sortBy === "date" ? "bg-white border border-border text-foreground font-bold shadow-none" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Date
            </span>
            <span 
              onClick={() => setSortBy("time")}
              className={`px-2 py-1 rounded-md cursor-pointer font-semibold transition-colors ${
                sortBy === "time" ? "bg-white border border-border text-foreground font-bold shadow-none" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Time
            </span>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-muted-foreground text-sm gap-2">
          <Clock className="animate-spin h-4 w-4 text-primary" /> Loading activities...
        </div>
      ) : filteredActivities.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center border border-border rounded-lg bg-white space-y-4">
          <div className="h-14 w-14 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-center text-primary">
            <ActivityIcon className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-sm">No activities scheduled</h3>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              {searchQuery || filterCategory !== "all" 
                ? "No activities match your active filters. Try clearing them!" 
                : "Your schedule is clean. Plan your lectures or study hours now."}
            </p>
          </div>
          {(searchQuery || filterCategory !== "all") ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSearchQuery("");
                setFilterCategory("all");
              }}
              className="text-xs bg-white text-foreground border-border hover:bg-secondary h-8"
            >
              Clear Filters
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={handleOpenAddDialog}
              className="text-xs bg-primary text-white hover:bg-primary/95 h-8"
            >
              Schedule First Activity
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
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[35%]">Activity Name</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[15%]">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[18%]">
                    <div className="text-center w-full">Scheduled Date</div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[18%]">
                    <div className="text-center w-full">Time Block</div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground px-4 py-2 w-[14%]">
                    <div className="text-center w-full">Actions</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {filteredActivities.map((act) => {
                  const categoryObj = categories.find((c) => c.id === act.category_id);
                  return (
                    <TableRow 
                      key={act.id} 
                      onClick={(e) => handleOpenEditDialog(act, e)}
                      className="group border-b border-border hover:bg-card/30 transition-colors duration-150 text-sm align-middle cursor-pointer"
                    >
                      {/* Name & Notes */}
                      <TableCell className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {act.title}
                          </span>
                          {act.notes && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {act.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
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

                      {/* Scheduled Date */}
                      <TableCell className="px-4 py-3.5 text-center align-middle">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                          {new Date(act.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>

                      {/* Time Block */}
                      <TableCell className="px-4 py-3.5 text-center align-middle">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {act.start_time.substring(0, 5)} {act.end_time ? `- ${act.end_time.substring(0, 5)}` : ""}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-4 py-3.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => handleOpenEditDialog(act, e)}
                            className="text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50/50 transition-all rounded-md h-7 w-7"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => handleDeleteActivity(act, e)}
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
            {filteredActivities.map((act) => {
              const categoryObj = categories.find((c) => c.id === act.category_id);
              return (
                <div 
                  key={act.id} 
                  onClick={(e) => handleOpenEditDialog(act, e)}
                  className="rounded-lg border border-border bg-white p-4 space-y-3 hover:bg-card/20 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {act.title}
                      </p>
                      {act.notes && (
                        <p className="text-xs text-muted-foreground leading-normal">{act.notes}</p>
                      )}
                    </div>
                  </div>

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

                    {/* Date */}
                    <span className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 border border-border bg-card/40 text-muted-foreground rounded-full gap-1">
                      <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                      {new Date(act.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    {/* Time */}
                    <span className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 border border-border bg-card/40 text-muted-foreground rounded-full gap-1">
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      {act.start_time.substring(0, 5)} {act.end_time ? `- ${act.end_time.substring(0, 5)}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-border/60 gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => handleOpenEditDialog(act, e)}
                      className="text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 h-7 w-7"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => handleDeleteActivity(act, e)}
                      className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50 h-7 w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingActivity ? "Edit Kegiatan" : "Tambah Kegiatan"}
            </DialogTitle>
            <DialogDescription>
              {editingActivity 
                ? "Ubah detail jadwal kegiatan Anda di bawah ini." 
                : "Jadwalkan kegiatan kuliah, kuis, kumpul, atau lainnya dengan waktu spesifik."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="act-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Kegiatan</label>
              <input
                id="act-title"
                type="text"
                required
                placeholder="Misal: Kuliah Pemrograman Web"
                className="w-full rounded-md border border-input bg-white text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            {/* Category & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kategori</label>
                <Select value={formCategory} onValueChange={(val) => setFormCategory(val || "none")}>
                  <SelectTrigger className="w-full bg-white border-border text-foreground text-sm">
                    <SelectValue placeholder="Pilih Kategori">
                      {formCategory === "none"
                        ? "Tanpa Kategori"
                        : (categories.find((c) => c.id === formCategory)?.name || formCategory)}
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
                <label htmlFor="act-date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tanggal</label>
                <input
                  id="act-date"
                  type="date"
                  required
                  className="w-full rounded-md border border-input bg-white text-foreground px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
            </div>

            {/* Time Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="act-start-time" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jam Mulai</label>
                <input
                  id="act-start-time"
                  type="time"
                  required
                  className="w-full rounded-md border border-input bg-white text-foreground px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="act-end-time" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jam Selesai (Opsional)</label>
                <input
                  id="act-end-time"
                  type="time"
                  className="w-full rounded-md border border-input bg-white text-foreground px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="act-notes" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
              <textarea
                id="act-notes"
                placeholder="Tambahkan detail penting, link ruang zoom, ruang kelas, atau catatan..."
                className="w-full rounded-md border border-input bg-white text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[70px] resize-none"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/95">
                {editingActivity ? "Simpan Perubahan" : "Jadwalkan Kegiatan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
