CREATE TABLE IF NOT EXISTS dimension (code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS indicator (
  code TEXT PRIMARY KEY,
  dimension_code TEXT NOT NULL REFERENCES dimension(code),
  value_type TEXT NOT NULL CHECK (value_type IN ('score_0_2','bool','text')),
  description TEXT NOT NULL,
  is_urgent_trigger INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS staff_user (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('monitor_oam','coordinacion','cesfam')));
CREATE TABLE IF NOT EXISTS person (id INTEGER PRIMARY KEY, preferred_name TEXT NOT NULL,
  birth_year INTEGER, comuna_cut INTEGER, lives_alone INTEGER,
  priority TEXT CHECK (priority IN ('alta','media','baja')),
  assigned_to INTEGER REFERENCES staff_user(id),
  status TEXT NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','pausada','retirada')),
  is_synthetic INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS person_identity (person_id INTEGER PRIMARY KEY REFERENCES person(id), full_name TEXT, phone TEXT, address TEXT);
CREATE TABLE IF NOT EXISTS trusted_contact (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  name TEXT, relation TEXT, phone TEXT, notify_allowed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS consent_record (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  text_version TEXT NOT NULL, scope_checkin INTEGER NOT NULL, scope_sensitive INTEGER NOT NULL,
  scope_third_party INTEGER NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS conversation (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  channel TEXT NOT NULL CHECK (channel IN ('voz','whatsapp','simulado')),
  started_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completada','parcial','sin_respuesta','rechazada','fallida')),
  speaker_confirmed INTEGER NOT NULL DEFAULT 0, transcript_purge_at TEXT);
CREATE TABLE IF NOT EXISTS message (id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversation(id),
  turn INTEGER NOT NULL, role TEXT NOT NULL CHECK (role IN ('asistente','persona')),
  question_code TEXT, text TEXT NOT NULL, UNIQUE (conversation_id, turn));
CREATE TABLE IF NOT EXISTS extraction (id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversation(id),
  model TEXT NOT NULL, prompt_version TEXT NOT NULL, raw_json TEXT NOT NULL, schema_valid INTEGER NOT NULL,
  summary TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS observation (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  conversation_id INTEGER REFERENCES conversation(id), extraction_id INTEGER REFERENCES extraction(id),
  indicator_code TEXT NOT NULL REFERENCES indicator(code), value_num REAL, value_text TEXT,
  state TEXT NOT NULL CHECK (state IN ('informado','desconocido','no_aplica','prefiere_no_responder','pendiente_confirmar')),
  evidence_quote TEXT, confidence REAL,
  source TEXT NOT NULL CHECK (source IN ('ia','regla','funcionario')),
  confirmed_by INTEGER REFERENCES staff_user(id), observed_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_obs_person_ind ON observation(person_id, indicator_code, observed_at);
CREATE TABLE IF NOT EXISTS cusum_state (person_id INTEGER NOT NULL REFERENCES person(id),
  indicator_code TEXT NOT NULL REFERENCES indicator(code), n_baseline INTEGER NOT NULL, baseline_mean REAL,
  k REAL NOT NULL, h REAL NOT NULL, s_pos REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
  PRIMARY KEY (person_id, indicator_code));
CREATE TABLE IF NOT EXISTS alert (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  origin TEXT NOT NULL CHECK (origin IN ('regla_urgente','cusum','senal_aislada','combinacion','no_respuesta')),
  rule_code TEXT NOT NULL, explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','en_revision','cerrada')),
  assigned_to INTEGER REFERENCES staff_user(id), due_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS alert_evidence (alert_id INTEGER NOT NULL REFERENCES alert(id),
  observation_id INTEGER NOT NULL REFERENCES observation(id), PRIMARY KEY (alert_id, observation_id));
CREATE TABLE IF NOT EXISTS intervention (id INTEGER PRIMARY KEY, alert_id INTEGER REFERENCES alert(id),
  person_id INTEGER NOT NULL REFERENCES person(id), user_id INTEGER NOT NULL REFERENCES staff_user(id),
  action TEXT NOT NULL CHECK (action IN ('llamada','visita','derivacion_cesfam','aviso_contacto','emergencia','sin_accion','falsa_alarma')),
  notes TEXT, outcome TEXT, next_followup_at TEXT, created_at TEXT NOT NULL);
CREATE VIEW IF NOT EXISTS person_current_level AS
SELECT p.id AS person_id, p.preferred_name, COALESCE(MAX(a.level), 0) AS level
FROM person p LEFT JOIN alert a ON a.person_id = p.id AND a.status != 'cerrada'
GROUP BY p.id;
