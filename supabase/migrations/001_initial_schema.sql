-- 启用行级安全策略
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;

-- 创建questions表
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  category_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建perspectives表
CREATE TABLE IF NOT EXISTS perspectives (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  content TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  "order" INTEGER NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建categories表
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  question_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建relations表
CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  target_id TEXT REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建layouts表
CREATE TABLE IF NOT EXISTS layouts (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  x FLOAT,
  y FLOAT
);

-- 创建行级安全策略
-- 用户只能访问自己的数据
CREATE POLICY "Users can view own questions" ON questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questions" ON questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions" ON questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own questions" ON questions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own perspectives" ON perspectives
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM questions WHERE id = perspectives.question_id));

CREATE POLICY "Users can insert own perspectives" ON perspectives
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM questions WHERE id = perspectives.question_id));

CREATE POLICY "Users can update own perspectives" ON perspectives
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM questions WHERE id = perspectives.question_id));

CREATE POLICY "Users can delete own perspectives" ON perspectives
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM questions WHERE id = perspectives.question_id));

CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own relations" ON relations
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM questions WHERE id = relations.source_id)
    OR auth.uid() = (SELECT user_id FROM questions WHERE id = relations.target_id)
  );

CREATE POLICY "Users can insert own relations" ON relations
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM questions WHERE id = relations.source_id)
  );

CREATE POLICY "Users can update own relations" ON relations
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM questions WHERE id = relations.source_id)
  );

CREATE POLICY "Users can delete own relations" ON relations
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM questions WHERE id = relations.source_id)
  );

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_perspectives_question_id ON perspectives(question_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_relations_source_id ON relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target_id ON relations(target_id);
