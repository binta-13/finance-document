-- Migration: Change REAL/DECIMAL columns to INTEGER
-- SQLite does not support ALTER COLUMN, so we recreate the tables.

-- extractions: total REAL -> INTEGER
CREATE TABLE extractions_new (
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
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

INSERT INTO extractions_new (id, document_id, vendor, date, total, currency, raw_json, confidence_json, edited_json, is_reviewed)
  SELECT id, document_id, vendor, date, CAST(ROUND(total) AS INTEGER), currency, raw_json, confidence_json, edited_json, is_reviewed FROM extractions;

DROP TABLE extractions;
ALTER TABLE extractions_new RENAME TO extractions;

-- line_items: quantity REAL -> INTEGER, unit_price REAL -> INTEGER, amount REAL -> INTEGER
CREATE TABLE line_items_new (
  id TEXT PRIMARY KEY,
  extraction_id TEXT NOT NULL,
  description TEXT,
  quantity INTEGER,
  unit_price INTEGER,
  amount INTEGER,
  FOREIGN KEY (extraction_id) REFERENCES extractions(id) ON DELETE CASCADE
);

INSERT INTO line_items_new (id, extraction_id, description, quantity, unit_price, amount)
  SELECT id, extraction_id, description, CAST(ROUND(quantity) AS INTEGER), CAST(ROUND(unit_price) AS INTEGER), CAST(ROUND(amount) AS INTEGER) FROM line_items;

DROP TABLE line_items;
ALTER TABLE line_items_new RENAME TO line_items;
