-- Create custom types for task priority and status
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  deadline DATE,
  priority task_priority DEFAULT 'medium' NOT NULL,
  estimated_hours NUMERIC DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100) NOT NULL,
  status task_status DEFAULT 'todo' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on both tables (optional but recommended for production Supabase; for base setup we can create open policies or leave them open)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create open policy for reading/modifying (development bypass)
CREATE POLICY "Allow all access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Seed categories with default values
INSERT INTO categories (name, color, icon) VALUES
  ('Kuliah', '#6366F1', 'GraduationCap'),
  ('Kuis', '#F59E0B', 'BookOpen'),
  ('Ujian', '#EF4444', 'AlertCircle'),
  ('Lomba', '#10B981', 'Trophy'),
  ('Pribadi', '#8B5CF6', 'User');
