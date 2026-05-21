CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  filename TEXT,
  file_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE extractions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  vendor TEXT,
  date TEXT,
  total INTEGER,
  currency TEXT,
  raw_json TEXT,
  confidence_json TEXT,
  edited_json TEXT,
  is_reviewed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE line_items (
  id TEXT PRIMARY KEY,
  extraction_id TEXT NOT NULL,
  description TEXT,
  quantity INTEGER,
  unit_price INTEGER,
  amount INTEGER,
  FOREIGN KEY (extraction_id) REFERENCES extractions(id) ON DELETE CASCADE
);