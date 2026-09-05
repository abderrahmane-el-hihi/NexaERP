-- ============================================================================
-- Defence in depth: tenant isolation and ledger integrity enforced by the DATABASE,
-- not only by application code.
--
-- 1. A non-superuser application role. RLS is bypassed by superusers and by table
--    owners unless FORCE is set, so the app must not connect as either.
-- 2. Row level security on every table that carries a tenantId.
-- 3. Check constraints and a deferred trigger for double-entry integrity.
-- 4. Immutability of posted journal entries.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Application role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexaerp_app') THEN
    CREATE ROLE nexaerp_app LOGIN PASSWORD 'nexaerp_app';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO nexaerp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexaerp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexaerp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexaerp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nexaerp_app;

-- ---------------------------------------------------------------------------
-- 2. Row level security on every tenant-scoped table
--
-- The application must issue `SET LOCAL app.tenant_id = '<uuid>'` at the start of
-- every transaction. When it is unset, current_setting(...) returns NULL and the
-- policy matches no rows: a query that forgets its WHERE clause returns nothing
-- instead of leaking another company's data.
--
-- `app.bypass_rls = 'on'` is reserved for platform jobs (billing runs, the
-- clearance poller) that legitimately work across tenants.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenantId'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t.table_name);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (
          "tenantId" = current_setting('app.tenant_id', true)
          OR current_setting('app.bypass_rls', true) = 'on'
        )
        WITH CHECK (
          "tenantId" = current_setting('app.tenant_id', true)
          OR current_setting('app.bypass_rls', true) = 'on'
        )
    $f$, t.table_name);
  END LOOP;
END
$$;

-- The Tenant row itself: a user may only see the tenant they are acting as.
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self ON "Tenant";
CREATE POLICY tenant_self ON "Tenant"
  USING (
    "id" = current_setting('app.tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    "id" = current_setting('app.tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- ---------------------------------------------------------------------------
-- 3. Double-entry integrity
-- ---------------------------------------------------------------------------

-- A ledger line is either a debit or a credit, never both, never negative.
ALTER TABLE "JournalEntryLine"
  ADD CONSTRAINT jel_non_negative CHECK ("debit" >= 0 AND "credit" >= 0),
  ADD CONSTRAINT jel_one_side_only CHECK ("debit" = 0 OR "credit" = 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT payment_amount_positive CHECK ("amount" > 0);

ALTER TABLE "PaymentAllocation"
  ADD CONSTRAINT allocation_amount_positive CHECK ("amount" > 0),
  ADD CONSTRAINT allocation_one_target CHECK (
    ("invoiceId" IS NOT NULL AND "supplierBillId" IS NULL)
    OR ("invoiceId" IS NULL AND "supplierBillId" IS NOT NULL)
  );

ALTER TABLE "ValuationLayer"
  ADD CONSTRAINT valuation_value_consistent CHECK (
    abs("value" - ("quantity" * "unitCost")) < 0.000001
  );

-- Every posted entry must balance. Deferred to commit time so a service can write
-- the header and its lines in any order inside one transaction.
CREATE OR REPLACE FUNCTION assert_journal_entry_balanced()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id text;
  v_debit numeric;
  v_credit numeric;
  v_status text;
BEGIN
  v_entry_id := COALESCE(NEW."journalEntryId", OLD."journalEntryId");

  SELECT "status" INTO v_status FROM "JournalEntry" WHERE "id" = v_entry_id;
  IF v_status IS NULL THEN
    RETURN NULL; -- entry deleted in the same transaction
  END IF;

  SELECT COALESCE(SUM("debit"), 0), COALESCE(SUM("credit"), 0)
    INTO v_debit, v_credit
    FROM "JournalEntryLine" WHERE "journalEntryId" = v_entry_id;

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced: debit=% credit=%',
      v_entry_id, v_debit, v_credit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER journal_entry_balanced
  AFTER INSERT OR UPDATE OR DELETE ON "JournalEntryLine"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_journal_entry_balanced();

-- ---------------------------------------------------------------------------
-- 4. Posted entries are immutable. Corrections are made by writing a reversal.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_posted_entry_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'Posted' THEN
      RAISE EXCEPTION 'Posted journal entry % cannot be deleted; write a reversal instead', OLD."id"
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- Only the transition to Reversed is allowed on a posted entry.
  IF OLD."status" = 'Posted' AND NEW."status" NOT IN ('Posted', 'Reversed') THEN
    RAISE EXCEPTION 'Posted journal entry % cannot change status to %', OLD."id", NEW."status"
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD."status" = 'Posted' AND (
       NEW."date" IS DISTINCT FROM OLD."date"
    OR NEW."number" IS DISTINCT FROM OLD."number"
    OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId"
  ) THEN
    RAISE EXCEPTION 'Posted journal entry % is immutable', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_entry_immutable
  BEFORE UPDATE OR DELETE ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION forbid_posted_entry_mutation();

CREATE OR REPLACE FUNCTION forbid_posted_line_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_status text;
  v_entry_id text;
BEGIN
  v_entry_id := COALESCE(NEW."journalEntryId", OLD."journalEntryId");
  SELECT "status" INTO v_status FROM "JournalEntry" WHERE "id" = v_entry_id;

  -- Lines may be written while the entry is being created inside its transaction;
  -- they may never be changed once the entry exists and is Posted.
  IF v_status = 'Posted' AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Lines of posted journal entry % are immutable', v_entry_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_entry_line_immutable
  BEFORE UPDATE OR DELETE ON "JournalEntryLine"
  FOR EACH ROW EXECUTE FUNCTION forbid_posted_line_mutation();
