-- SUPABASE SCHEMA FOR CALL AUDIT SYSTEM v4.0
-- Copy and paste this into your Supabase SQL Editor

-- 1. CLEANUP (Optional)
-- DROP TABLE IF EXISTS public.audits;
-- DROP TABLE IF EXISTS public.calls;

-- 2. CREATE USERS TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE CALLS TABLE
-- We use permissive constraints to ensure data upload succeeds even if some fields are missing
CREATE TABLE IF NOT EXISTS public.calls (
    id BIGSERIAL PRIMARY KEY,
    call_id TEXT NOT NULL,
    agent_name TEXT,
    agent_email TEXT,
    campaign TEXT,
    first_dispose TEXT,
    dispose TEXT,
    customer_name TEXT,
    process TEXT DEFAULT 'General',
    call_date TEXT, -- Changed to TEXT to handle various date formats during upload
    call_time TEXT,
    phone_number TEXT,
    duration TEXT,
    remarks TEXT,
    audio_url TEXT,
    audio_filename TEXT,
    uploaded_by TEXT,
    status TEXT DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE AUDITS TABLE
CREATE TABLE IF NOT EXISTS public.audits (
    id BIGSERIAL PRIMARY KEY,
    call_record_id BIGINT REFERENCES public.calls(id) ON DELETE CASCADE,
    auditor_id UUID REFERENCES public.users(id),
    scores JSONB, -- Flexible score storage
    remarks TEXT,
    overall_score NUMERIC(5,2),
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES (Full Access for Backend)
CREATE POLICY "Full access for all" ON public.users FOR ALL USING (true);
CREATE POLICY "Full access for all" ON public.calls FOR ALL USING (true);
CREATE POLICY "Full access for all" ON public.audits FOR ALL USING (true);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON public.calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent_name ON public.calls(agent_name);
CREATE INDEX IF NOT EXISTS idx_calls_is_active ON public.calls(is_active);
