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
    title: "Ujian Akhir Semester Kalkulus II",
    category_id: "c3", // Ujian
    deadline: "2026-06-10",
    priority: "high",
    estimated_hours: 4,
    progress: 80,
    status: "in_progress",
    notes: "Pelajari materi bab 7 sampai 10, terutama integral lipat tiga dan deret tak hingga.",
    created_at: "2026-06-05T08:00:00Z"
  },
  {
    id: "t2",
    title: "Praktikum Basis Data: Desain ERD & Normalisasi",
    category_id: "c1", // Kuliah
    deadline: "2026-06-11",
    priority: "medium",
    estimated_hours: 3,
    progress: 30,
    status: "in_progress",
    notes: "Buat rancangan database bioskop online dan normalisasikan ke bentuk 3NF.",
    created_at: "2026-06-06T09:30:00Z"
  },
  {
    id: "t3",
    title: "Tugas Mandiri Fisika: Termodinamika",
    category_id: "c1", // Kuliah
    deadline: "2026-06-12",
    priority: "medium",
    estimated_hours: 2,
    progress: 0,
    status: "todo",
    notes: "Kerjakan soal nomor 1-5 di buku paket Fisika Dasar halaman 142.",
    created_at: "2026-06-07T14:00:00Z"
  },
  {
    id: "t4",
    title: "Laporan Praktikum Fisika: Viskositas Zat Cair",
    category_id: "c1", // Kuliah
    deadline: "2026-06-15",
    priority: "medium",
    estimated_hours: 5,
    progress: 10,
    status: "todo",
    notes: "Format sesuai dengan template modul praktikum, lampirkan grafik analisis data.",
    created_at: "2026-06-08T10:00:00Z"
  },
  {
    id: "t5",
    title: "Pendaftaran & Pengumpulan Proposal Lomba Essay Nasional",
    category_id: "c4", // Lomba
    deadline: "2026-06-18",
    priority: "low",
    estimated_hours: 6,
    progress: 0,
    status: "todo",
    notes: "Tema: Inovasi teknologi ramah lingkungan berbasis kearifan lokal.",
    created_at: "2026-06-09T11:00:00Z"
  },
  {
    id: "t6",
    title: "Praktikum Kimia Dasar: Asam Basa",
    category_id: "c1", // Kuliah
    deadline: "2026-06-08",
    priority: "low",
    estimated_hours: 2,
    progress: 100,
    status: "done",
    notes: "Laporan praktikum mandiri pengenalan larutan asam basa. Sudah dikumpulkan di LMS.",
    created_at: "2026-06-04T13:00:00Z"
  }
];
