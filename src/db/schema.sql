CREATE TABLE IF NOT EXISTS dimension (code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS indicator (
  code TEXT PRIMARY KEY,
  dimension_code TEXT NOT NULL REFERENCES dimension(code),
  value_type TEXT NOT NULL CHECK (value_type IN ('bool','category','list')),
  allowed_values TEXT, -- JSON array of allowed codes; NULL for bool
  description TEXT NOT NULL,
  is_urgent_trigger INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS staff_user (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('monitor_oam','coordinacion','cesfam')));
CREATE TABLE IF NOT EXISTS person (id INTEGER PRIMARY KEY, preferred_name TEXT NOT NULL,
  age INTEGER, comuna_cut INTEGER, comuna_nombre TEXT,
  sexo_modelo TEXT NOT NULL DEFAULT 'desconocido' CHECK (sexo_modelo IN ('hombre','mujer','desconocido')),
  area TEXT NOT NULL DEFAULT 'desconocida' CHECK (area IN ('urbana','rural','desconocida')),
  escolaridad_anios INTEGER,
  discapacidad_wg TEXT NOT NULL DEFAULT 'desconocida' CHECK (discapacidad_wg IN ('si','no','desconocida')),
  vive_sola TEXT NOT NULL DEFAULT 'desconocido' CHECK (vive_sola IN ('si','no','desconocido')),
  autonomia_base TEXT, red_apoyo_base TEXT,
  tiene_tratamiento TEXT NOT NULL DEFAULT 'desconocido' CHECK (tiene_tratamiento IN ('si','no','desconocido')),
  horario_preferido TEXT, intereses TEXT, -- intereses: JSON array
  priority TEXT CHECK (priority IN ('alta','media','baja')),
  assigned_to INTEGER REFERENCES staff_user(id),
  status TEXT NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','pausada','retirada')),
  is_synthetic INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS person_identity (person_id INTEGER PRIMARY KEY REFERENCES person(id), full_name TEXT, phone TEXT, address TEXT);
-- Restricted module: declared medication (distinct from per-call reported adherence).
CREATE TABLE IF NOT EXISTS person_medication (id INTEGER PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES person(id), name TEXT NOT NULL, source TEXT, verified_at TEXT);
CREATE TABLE IF NOT EXISTS trusted_contact (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  name TEXT, relation TEXT, phone TEXT, notify_allowed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS consent_record (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  text_version TEXT NOT NULL, scope_checkin INTEGER NOT NULL, scope_sensitive INTEGER NOT NULL,
  scope_third_party INTEGER NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS conversation (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  channel TEXT NOT NULL CHECK (channel IN ('voz','whatsapp','simulado')),
  started_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completada','parcial','sin_respuesta','rechazada','fallo_tecnico')),
  speaker_confirmed INTEGER NOT NULL DEFAULT 0, transcript_purge_at TEXT,
  scenario_id TEXT,
  urgent_event_type TEXT CHECK (urgent_event_type IN ('necesita_ayuda_inmediata','caida_con_lesion','sintoma_agudo')),
  urgent_event_quote TEXT, -- contract: evento_urgente_guion (type + supporting phrase)
  CHECK (urgent_event_type IS NULL OR urgent_event_quote IS NOT NULL));
CREATE TABLE IF NOT EXISTS message (id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversation(id),
  turn INTEGER NOT NULL, role TEXT NOT NULL CHECK (role IN ('asistente','persona')),
  question_code TEXT, text TEXT NOT NULL, UNIQUE (conversation_id, turn));
CREATE TABLE IF NOT EXISTS extraction (id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversation(id),
  model TEXT NOT NULL, prompt_version TEXT NOT NULL, raw_json TEXT NOT NULL, schema_valid INTEGER NOT NULL,
  summary TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS observation (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  conversation_id INTEGER REFERENCES conversation(id), extraction_id INTEGER REFERENCES extraction(id),
  indicator_code TEXT NOT NULL REFERENCES indicator(code), value_num REAL, value_text TEXT,
  -- value encoding: bool -> value_num 0/1; category -> value_text; list -> JSON array in value_text.
  state TEXT NOT NULL CHECK (state IN ('informado','no_preguntado','no_sabe','prefiere_no_responder','no_comprendido','pendiente_confirmar')),
  evidence_quote TEXT, confidence REAL,
  source TEXT NOT NULL CHECK (source IN ('ia','regla','funcionario','reproduccion')),
  confirmed_by INTEGER REFERENCES staff_user(id), observed_at TEXT NOT NULL,
  CHECK (state = 'informado' OR (value_num IS NULL AND value_text IS NULL)));
CREATE INDEX IF NOT EXISTS idx_obs_person_ind ON observation(person_id, indicator_code, observed_at);
CREATE TABLE IF NOT EXISTS cusum_state (person_id INTEGER NOT NULL REFERENCES person(id),
  indicator_code TEXT NOT NULL REFERENCES indicator(code), n_baseline INTEGER NOT NULL, baseline_mean REAL,
  k REAL NOT NULL, h REAL NOT NULL, s_pos REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
  PRIMARY KEY (person_id, indicator_code));
CREATE TABLE IF NOT EXISTS alert (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  origin TEXT NOT NULL CHECK (origin IN ('regla_urgente','cusum','senal_aislada','combinacion','situacion_contacto')),
  rule_code TEXT NOT NULL, explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','en_revision','cerrada')),
  assigned_to INTEGER REFERENCES staff_user(id), due_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS alert_evidence (alert_id INTEGER NOT NULL REFERENCES alert(id),
  observation_id INTEGER NOT NULL REFERENCES observation(id), PRIMARY KEY (alert_id, observation_id));
CREATE TABLE IF NOT EXISTS intervention (id INTEGER PRIMARY KEY, alert_id INTEGER REFERENCES alert(id),
  person_id INTEGER NOT NULL REFERENCES person(id), user_id INTEGER NOT NULL REFERENCES staff_user(id),
  action TEXT NOT NULL CHECK (action IN ('llamada','visita','derivacion_cesfam','aviso_contacto','emergencia','sin_accion','falsa_alarma',
    'derivacion','solicitar_llamada_humana','ajustar_frecuencia','asignacion','cierre','pausa','actualizar_derivacion')),
  notes TEXT, outcome TEXT, next_followup_at TEXT, created_at TEXT NOT NULL,
  destination TEXT, transcript_reviewed INTEGER NOT NULL DEFAULT 0,
  ref_id INTEGER REFERENCES intervention(id)); -- ref_id: derivation a follow-up status update refers to
-- Automatic-call plan per person (operators adjust the frequency; calls are never placed by operators).
CREATE TABLE IF NOT EXISTS contact_plan (person_id INTEGER PRIMARY KEY REFERENCES person(id),
  frequency TEXT NOT NULL DEFAULT 'diaria' CHECK (frequency IN ('diaria','cada 2 días','semanal')), updated_at TEXT NOT NULL);
-- Pipeline output: one row per evaluation. level NULL = "sin evaluación actual".
CREATE TABLE IF NOT EXISTS assessment (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL REFERENCES person(id),
  evaluated_at TEXT NOT NULL, conversation_id INTEGER REFERENCES conversation(id),
  level INTEGER CHECK (level IS NULL OR level BETWEEN 0 AND 3),
  dimension_levels TEXT NOT NULL, -- JSON object: dimension_code -> 0..3 or null
  reasons TEXT NOT NULL,          -- JSON array of {rule_code, dimension_code, observation_ids}
  rule_version TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_assessment_person ON assessment(person_id, evaluated_at);
-- Scenario annotations (expected values), kept apart from pipeline outputs.
CREATE TABLE IF NOT EXISTS scenario_expectation (id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversation(id),
  indicator_code TEXT REFERENCES indicator(code),
  expected_value TEXT, expected_level INTEGER CHECK (expected_level IS NULL OR expected_level BETWEEN 0 AND 3),
  note TEXT, UNIQUE (conversation_id, indicator_code));
-- At most one conversation-level row (indicator_code NULL) per conversation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_expectation_level ON scenario_expectation(conversation_id) WHERE indicator_code IS NULL;
-- level semantics: NULL = "sin evaluación" (never 0 by default).
--   open level-3 alert -> 3 (urgent state persists until a human closes the alert);
--   else latest assessment level if it has one; else highest open/in-review alert level (may be NULL).
CREATE VIEW IF NOT EXISTS person_current_level AS
WITH latest AS (
  SELECT a.person_id, a.level, a.evaluated_at FROM assessment a
  WHERE a.id = (SELECT x.id FROM assessment x WHERE x.person_id = a.person_id
                ORDER BY x.evaluated_at DESC, x.id DESC LIMIT 1)),
open_alert AS (
  SELECT person_id, MAX(level) AS lvl FROM alert WHERE status != 'cerrada' GROUP BY person_id)
SELECT p.id AS person_id, p.preferred_name,
  l.level AS assessed_level, l.evaluated_at AS assessed_at, o.lvl AS open_alert_level,
  CASE WHEN o.lvl = 3 THEN 3
       WHEN l.person_id IS NOT NULL THEN COALESCE(l.level, o.lvl)
       ELSE o.lvl END AS level
FROM person p LEFT JOIN latest l ON l.person_id = p.id LEFT JOIN open_alert o ON o.person_id = p.id;
