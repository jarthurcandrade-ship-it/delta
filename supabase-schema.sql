-- ====================================
-- Trading Journal — Supabase Schema
-- Execute este SQL no Supabase SQL Editor
-- Dashboard → SQL Editor → New Query
-- ====================================

-- 1. Tabela principal de trades
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL DEFAULT 'Padrão',
  date DATE NOT NULL,
  entry_time TEXT,
  exit_time TEXT,
  asset TEXT NOT NULL,
  asset_class TEXT,
  direction TEXT CHECK (direction IN ('Long', 'Short')),
  killzone TEXT,
  setup TEXT,
  dol TEXT,
  confluences JSONB DEFAULT '[]',
  macro_events JSONB DEFAULT '[]',
  dxy_bias TEXT,
  sentiment TEXT,
  rr_planned NUMERIC(6,2) DEFAULT 0,
  rr_realized NUMERIC(6,2) DEFAULT 0,
  risk NUMERIC(10,2) DEFAULT 0,
  result TEXT CHECK (result IN ('Win', 'Loss', 'BE')),
  pnl NUMERIC(10,2) DEFAULT 0,
  mistake TEXT,
  emotions JSONB DEFAULT '[]',
  htf TEXT,
  story TEXT,
  checklist_data JSONB,
  psychology_data JSONB,
  screenshot_urls JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast account filtering
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date DESC);

-- 2. Tabela de diário psicológico
CREATE TABLE IF NOT EXISTS psychology_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  pre_market_mindset TEXT,
  post_market_review TEXT,
  mood TEXT,
  emotions JSONB DEFAULT '[]',
  error_checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psych_date ON psychology_entries(date DESC);

-- 3. Tabela de contas (sincroniza nomes de contas entre dispositivos)
CREATE TABLE IF NOT EXISTS accounts (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir conta padrão
INSERT INTO accounts (name) VALUES ('Padrão') ON CONFLICT (name) DO NOTHING;

-- 4. Tabela de estudos / papers (macroeconomia, leitura de mercado, anotações)
-- Pré-requisito: extensão pgcrypto/uuid-ossp habilitada no projeto Supabase.
-- O Supabase já habilita pgcrypto por padrão; gen_random_uuid() está disponível.
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  topic TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  is_pinned BOOLEAN DEFAULT false,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_papers_date ON papers(date DESC);
CREATE INDEX IF NOT EXISTS idx_papers_topic ON papers(topic);
CREATE INDEX IF NOT EXISTS idx_papers_pinned ON papers(is_pinned) WHERE is_pinned = true;

-- Trigger para manter updated_at em sincronia
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS papers_touch_updated_at ON papers;
CREATE TRIGGER papers_touch_updated_at
  BEFORE UPDATE ON papers
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- 5. Storage bucket para screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Policy: permitir upload público (ajuste depois com auth)
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'screenshots');

DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'screenshots');

-- 5. RLS (Row Level Security) — desabilitado por agora
-- Quando adicionar auth, habilite e crie policies por user_id
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Policies temporárias (acesso público — trocar por auth depois)
DROP POLICY IF EXISTS "Allow all access to trades" ON trades;
CREATE POLICY "Allow all access to trades" ON trades
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to psychology" ON psychology_entries;
CREATE POLICY "Allow all access to psychology" ON psychology_entries
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to accounts" ON accounts;
CREATE POLICY "Allow all access to accounts" ON accounts
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to papers" ON papers;
CREATE POLICY "Allow all access to papers" ON papers
  FOR ALL USING (true) WITH CHECK (true);
