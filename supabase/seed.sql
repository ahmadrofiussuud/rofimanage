-- Seed default categories (if not already present)
INSERT INTO categories (name, color, icon) VALUES
  ('Kuliah', '#6366F1', 'GraduationCap'),
  ('Kuis', '#F59E0B', 'BookOpen'),
  ('Ujian', '#EF4444', 'AlertCircle'),
  ('Lomba', '#10B981', 'Trophy'),
  ('Pribadi', '#8B5CF6', 'User')
ON CONFLICT (name) DO NOTHING;

-- Seed default dummy tasks
-- Query category IDs dynamically to associate them correctly
INSERT INTO tasks (title, category_id, deadline, priority, estimated_hours, progress, status, notes) VALUES
  (
    'Tugas Kalkulus Asesmen 3', 
    (SELECT id FROM categories WHERE name = 'Kuliah' LIMIT 1), 
    '2026-06-10', 
    'high', 
    4, 
    80, 
    'in_progress', 
    'Kirim PDF ke LMS sebelum jam 5 sore.'
  ),
  (
    'Kuis Database Normalization', 
    (SELECT id FROM categories WHERE name = 'Kuis' LIMIT 1), 
    '2026-06-11', 
    'high', 
    2, 
    20, 
    'in_progress', 
    'Materi bab 4-5. Fokus 1NF, 2NF, 3NF, BCNF.'
  ),
  (
    'Persiapan Presentasi Fisika', 
    (SELECT id FROM categories WHERE name = 'Kuliah' LIMIT 1), 
    '2026-06-12', 
    'medium', 
    3, 
    0, 
    'todo', 
    'Kelompok 4, materi relativitas khusus.'
  ),
  (
    'Ujian Tengah Semester Fisika', 
    (SELECT id FROM categories WHERE name = 'Ujian' LIMIT 1), 
    '2026-06-15', 
    'high', 
    8, 
    40, 
    'in_progress', 
    'Di Aula Utama. Sifat tutup buku.'
  ),
  (
    'Beli Logbook Lab Kimia', 
    (SELECT id FROM categories WHERE name = 'Pribadi' LIMIT 1), 
    '2026-06-18', 
    'low', 
    1, 
    0, 
    'todo', 
    'Beli di koperasi atau fotokopi depan kampus.'
  ),
  (
    'Laporan Praktikum Kimia Dasar', 
    (SELECT id FROM categories WHERE name = 'Kuliah' LIMIT 1), 
    '2026-06-08', 
    'medium', 
    2, 
    100, 
    'done', 
    'Sudah dikumpulkan.'
  );
