-- ============================================================
-- Profile : données personnelles de l'utilisateur
-- ============================================================
CREATE TABLE IF NOT EXISTS "Profile" (
  "id"        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "fullName"  TEXT        NOT NULL DEFAULT '',
  "email"     TEXT        NOT NULL DEFAULT '',
  "phone"     TEXT,
  "location"  TEXT,
  "title"     TEXT,
  "summary"   TEXT,
  "website"   TEXT,
  "linkedin"  TEXT,
  "github"    TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON "Profile" FOR ALL
  USING (auth.uid() = "id")
  WITH CHECK (auth.uid() = "id");

-- ============================================================
-- Resume : CV générés par l'utilisateur
-- ============================================================
CREATE TABLE IF NOT EXISTS "Resume" (
  "id"             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name"           TEXT        NOT NULL DEFAULT 'Mon CV',
  "targetPosition" TEXT,
  "experienceIds"  TEXT[]      NOT NULL DEFAULT '{}',
  "customSections" JSONB       NOT NULL DEFAULT '{}',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Resume" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own resumes"
  ON "Resume" FOR ALL
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

-- Index pour les requêtes userId + tri par date
CREATE INDEX IF NOT EXISTS "Resume_userId_createdAt_idx"
  ON "Resume" ("userId", "createdAt" DESC);
