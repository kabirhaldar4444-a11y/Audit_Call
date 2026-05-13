-- SUPABASE SCHEMA FOR CALL AUDIT SYSTEM v4.0
-- Copy and paste this into your Supabase SQL Editor

-- 1. CLEANUP (Optional - only if you want to start fresh)
-- DROP TABLE IF EXISTS public.audits;
-- DROP TABLE IF EXISTS public.calls;
-- DROP TABLE IF EXISTS public.users;

-- 2. CREATE USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE CALLS TABLE
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT UNIQUE NOT NULL,
    agent_name TEXT,
    agent_email TEXT,
    campaign TEXT,
    first_dispose TEXT,
    dispose TEXT,
    process TEXT DEFAULT 'General',
    call_date TIMESTAMP WITH TIME ZONE,
    call_time TEXT,
    phone_number TEXT,
    duration TEXT,
    remarks TEXT,
    customer_name TEXT,
    uploaded_by TEXT,
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending',
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE AUDITS TABLE
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_record_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
    auditor_id UUID REFERENCES public.users(id),
    greeting_quality INTEGER,
    communication_clarity INTEGER,
    compliance_adherence INTEGER,
    resolution_quality INTEGER,
    customer_satisfaction INTEGER,
    remarks TEXT,
    overall_score NUMERIC(3,2),
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- 6. SETUP POLICIES (Allowing 'anon' role for backend functionality)
-- IMPORTANT: These policies allow the backend (using the anon key) to function.
-- In a high-security production environment, you would use service_role instead.

-- Policies for USERS
CREATE POLICY "Enable read for all" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.users FOR UPDATE USING (true);

-- Policies for CALLS
CREATE POLICY "Enable read for all" ON public.calls FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.calls FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.calls FOR DELETE USING (true);

-- Policies for AUDITS
CREATE POLICY "Enable read for all" ON public.audits FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.audits FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.audits FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.audits FOR DELETE USING (true);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_calls_call_date ON public.calls(call_date);
CREATE INDEX IF NOT EXISTS idx_calls_agent_name ON public.calls(agent_name);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_audits_call_record_id ON public.audits(call_record_id);
