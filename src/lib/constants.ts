export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Task {
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

export const DUMMY_TASKS: Task[] = [
  {
    id: "t1",
    title: "Ujian Praktik Pemrograman Web: CRUD Next.js",
    category_id: "c3", // Ujian
    deadline: "2026-06-10",
    priority: "high",
    estimated_hours: 4,
    progress: 80,
    status: "in_progress",
    notes: "Buat aplikasi pengelolaan inventaris barang menggunakan Next.js dan localStorage.",
    created_at: "2026-06-05T08:00:00Z"
  },
  {
    id: "t2",
    title: "Tugas Normalisasi Database & ERD Bioskop",
    category_id: "c1", // Kuliah
    deadline: "2026-06-11",
    priority: "medium",
    estimated_hours: 3,
    progress: 30,
    status: "in_progress",
    notes: "Normalisasikan tabel transaksi penjualan bioskop ke bentuk 3NF dan buat ERD lengkap.",
    created_at: "2026-06-06T09:30:00Z"
  },
  {
    id: "t3",
    title: "Tugas Subnetting IP Address & Routing VLSM",
    category_id: "c1", // Kuliah
    deadline: "2026-06-12",
    priority: "medium",
    estimated_hours: 2,
    progress: 0,
    status: "todo",
    notes: "Kerjakan soal perhitungan VLSM kelas C di buku modul halaman 89.",
    created_at: "2026-06-07T14:00:00Z"
  },
  {
    id: "t4",
    title: "Laporan Integrasi Web Service (REST API)",
    category_id: "c1", // Kuliah
    deadline: "2026-06-15",
    priority: "medium",
    estimated_hours: 5,
    progress: 10,
    status: "todo",
    notes: "Buat dokumentasi integrasi REST API cuaca dengan output format JSON beserta analisis data.",
    created_at: "2026-06-08T10:00:00Z"
  },
  {
    id: "t5",
    title: "Analisis Studi Kasus Teori Perkembangan Jean Piaget",
    category_id: "c1", // Kuliah
    deadline: "2026-06-18",
    priority: "low",
    estimated_hours: 6,
    progress: 0,
    status: "todo",
    notes: "Amati perilaku belajar kognitif anak usia 7-11 tahun di lingkungan sekolah dasar sekitar.",
    created_at: "2026-06-09T11:00:00Z"
  },
  {
    id: "t6",
    title: "Resume Aliran Filsafat Idealisme & Realisme",
    category_id: "c1", // Kuliah
    deadline: "2026-06-08",
    priority: "low",
    estimated_hours: 2,
    progress: 100,
    status: "done",
    notes: "Tugas resume filsafat 2 halaman PDF. Sudah diunggah ke LMS.",
    created_at: "2026-06-04T13:00:00Z"
  }
];
