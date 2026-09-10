CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL,
 password_hash text, google_sub text UNIQUE, email_verified_at timestamptz,
 role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),
 suspended boolean NOT NULL DEFAULT false, alert_limit integer NOT NULL DEFAULT 5,
 telegram_id text UNIQUE, quiet_start integer, quiet_end integer, timezone text NOT NULL DEFAULT 'Asia/Bangkok',
 analysis_notifications boolean NOT NULL DEFAULT true, terms_version text NOT NULL DEFAULT '2026-09-10',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (hash text PRIMARY KEY,user_id uuid REFERENCES users ON DELETE CASCADE,expires_at timestamptz NOT NULL,google_verified_at timestamptz);
CREATE TABLE IF NOT EXISTS action_tokens (hash text PRIMARY KEY,user_id uuid REFERENCES users ON DELETE CASCADE,purpose text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY,count integer NOT NULL,expires_at timestamptz NOT NULL,last_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS assets (symbol text PRIMARY KEY,name text NOT NULL,enabled boolean NOT NULL DEFAULT true,price double precision,change double precision,as_of timestamptz);
INSERT INTO assets(symbol,name) VALUES ('BTCUSDT','Bitcoin'),('ETHUSDT','Ethereum'),('SOLUSDT','Solana') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS candles (symbol text REFERENCES assets,interval text NOT NULL,open_time bigint NOT NULL,close_time bigint NOT NULL,open double precision NOT NULL,high double precision NOT NULL,low double precision NOT NULL,close double precision NOT NULL,volume double precision NOT NULL,PRIMARY KEY(symbol,interval,open_time));
CREATE TABLE IF NOT EXISTS news (id uuid PRIMARY KEY,title text NOT NULL,summary text NOT NULL,url text NOT NULL,symbols text[] NOT NULL,published_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(url));
CREATE TABLE IF NOT EXISTS feeds (id uuid PRIMARY KEY,url text UNIQUE NOT NULL,name text NOT NULL,licensed boolean NOT NULL DEFAULT false,enabled boolean NOT NULL DEFAULT false,last_error text);
CREATE TABLE IF NOT EXISTS analyses (id uuid PRIMARY KEY,symbol text REFERENCES assets,version integer NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'draft',body jsonb NOT NULL,metrics jsonb NOT NULL,as_of timestamptz NOT NULL,expires_at timestamptz NOT NULL,reviewer uuid REFERENCES users ON DELETE SET NULL,published_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS analysis_versions (id uuid PRIMARY KEY,analysis_id uuid REFERENCES analyses ON DELETE CASCADE,version integer NOT NULL,body jsonb NOT NULL,actor uuid REFERENCES users ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS watchlists (user_id uuid REFERENCES users ON DELETE CASCADE,symbol text REFERENCES assets,PRIMARY KEY(user_id,symbol));
CREATE TABLE IF NOT EXISTS alerts (id uuid PRIMARY KEY,user_id uuid REFERENCES users ON DELETE CASCADE,symbol text REFERENCES assets,direction text NOT NULL CHECK(direction IN ('above','below')),price double precision NOT NULL CHECK(price>0),active boolean NOT NULL DEFAULT true,last_price double precision,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS jobs (id uuid PRIMARY KEY,kind text NOT NULL,user_id uuid REFERENCES users ON DELETE CASCADE,payload jsonb,status text NOT NULL DEFAULT 'queued',dedupe text UNIQUE,attempts integer NOT NULL DEFAULT 0,run_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now(),last_error text);
CREATE INDEX IF NOT EXISTS jobs_ready ON jobs(status,run_at);
CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY DEFAULT 1,version integer NOT NULL DEFAULT 1,value jsonb NOT NULL);
INSERT INTO settings(id,value) VALUES (1,'{"model":"google/gemini-2.5-flash-lite","prompt":"อธิบายตลาดภาษาไทยที่อ่านง่าย แยกข้อเท็จจริงจากการตีความ ไม่รับประกันผลตอบแทน","hours":4,"daily_budget":8,"monthly_budget":240,"usd_thb":40,"ai_enabled":false}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ai_usage (id uuid PRIMARY KEY,reserved_thb numeric NOT NULL,cost_thb numeric,status text NOT NULL DEFAULT 'reserved',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit (id uuid PRIMARY KEY,actor uuid REFERENCES users ON DELETE SET NULL,action text NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS worker_state (name text PRIMARY KEY,last_run timestamptz,last_success timestamptz,error text);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS entry_crossed boolean NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sent_at timestamptz;
CREATE TABLE IF NOT EXISTS mcp_snapshots (id uuid PRIMARY KEY,actor uuid NOT NULL REFERENCES users ON DELETE CASCADE,symbol text NOT NULL REFERENCES assets,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL);
ALTER TABLE mcp_snapshots ADD COLUMN IF NOT EXISTS entry_crossed boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS mcp_oauth_requests (id uuid PRIMARY KEY,actor uuid NOT NULL REFERENCES users ON DELETE CASCADE,session_hash text NOT NULL REFERENCES sessions(hash) ON DELETE CASCADE,params jsonb NOT NULL,code_hash text UNIQUE,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (hash text PRIMARY KEY,actor uuid NOT NULL REFERENCES users ON DELETE CASCADE,session_hash text NOT NULL REFERENCES sessions(hash) ON DELETE CASCADE,client_id text NOT NULL,resource text NOT NULL,scope text NOT NULL,expires_at timestamptz NOT NULL);
