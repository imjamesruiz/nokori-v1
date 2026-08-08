-- Nokori MVP schema (PRD section 8.1).
-- Every business-scoped table carries business_id so ownership can be enforced
-- in a single WHERE clause on every query (PRD section 11.1).

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email));

CREATE TABLE businesses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    business_type VARCHAR(32)  NOT NULL,
    city          VARCHAR(120),
    currency      VARCHAR(3)   NOT NULL DEFAULT 'USD',
    timezone      VARCHAR(64)  NOT NULL DEFAULT 'America/Los_Angeles',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_businesses_type CHECK (
        business_type IN ('FOOD_TRUCK', 'CAFE', 'BAKERY', 'RESTAURANT', 'CATERER', 'OTHER')
    )
);

-- MVP: one business per owner (PRD F-002).
CREATE UNIQUE INDEX ux_businesses_owner ON businesses (owner_user_id);

CREATE TABLE inventory_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   UUID           NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
    name          VARCHAR(120)   NOT NULL,
    category      VARCHAR(32)    NOT NULL,
    unit          VARCHAR(16)    NOT NULL,
    cost_per_unit NUMERIC(10, 4) NOT NULL,
    active        BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_inventory_cost_non_negative CHECK (cost_per_unit >= 0),
    CONSTRAINT ck_inventory_category CHECK (
        category IN ('PRODUCE', 'PROTEIN', 'DAIRY', 'BAKED', 'PREPARED', 'BEVERAGE', 'OTHER')
    ),
    CONSTRAINT ck_inventory_unit CHECK (
        unit IN ('LB', 'OZ', 'KG', 'G', 'EACH', 'DOZEN', 'BATCH', 'TRAY', 'GALLON', 'LITER')
    )
);

-- Prevents duplicate "Tortillas" / "tortillas" within one business (PRD F-003).
CREATE UNIQUE INDEX ux_inventory_business_name_lower ON inventory_items (business_id, lower(name));
CREATE INDEX ix_inventory_business_active ON inventory_items (business_id, active);

CREATE TABLE waste_entries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id           UUID           NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
    inventory_item_id     UUID           NOT NULL REFERENCES inventory_items (id) ON DELETE RESTRICT,
    quantity_wasted       NUMERIC(12, 3) NOT NULL,
    unit                  VARCHAR(16)    NOT NULL,
    cost_per_unit_at_time NUMERIC(10, 4) NOT NULL,
    total_cost_lost       NUMERIC(12, 2) NOT NULL,
    reason                VARCHAR(32)    NOT NULL,
    note                  VARCHAR(500),
    photo_key             VARCHAR(255),
    waste_date            DATE           NOT NULL,
    created_by            UUID           REFERENCES users (id) ON DELETE SET NULL,
    client_uuid           UUID,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT ck_waste_quantity_range CHECK (quantity_wasted > 0 AND quantity_wasted <= 10000),
    CONSTRAINT ck_waste_reason CHECK (
        reason IN ('OVER_PREPPED', 'EXPIRED_SPOILED', 'BURNED_DAMAGED', 'CUSTOMER_RETURN', 'TRIM_PREP', 'OTHER')
    )
);

CREATE INDEX ix_waste_business_date ON waste_entries (business_id, waste_date);
CREATE INDEX ix_waste_business_item ON waste_entries (business_id, inventory_item_id);
CREATE INDEX ix_waste_business_created ON waste_entries (business_id, created_at DESC, id DESC);
-- Idempotency for the offline queue (PRD F-012); partial index so NULLs stay unconstrained.
CREATE UNIQUE INDEX ux_waste_business_client_uuid ON waste_entries (business_id, client_uuid)
    WHERE client_uuid IS NOT NULL;

CREATE TABLE weekly_report_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID           NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
    week_start          DATE           NOT NULL,
    week_end            DATE           NOT NULL,
    total_cost          NUMERIC(12, 2) NOT NULL,
    previous_total_cost NUMERIC(12, 2),
    entry_count         INTEGER        NOT NULL DEFAULT 0,
    top_item_name       VARCHAR(120),
    top_item_cost       NUMERIC(12, 2),
    top_reason          VARCHAR(32),
    worst_day           VARCHAR(16),
    recommendation_text VARCHAR(500),
    rule_id             VARCHAR(64),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_weekly_snapshot_business_week ON weekly_report_snapshots (business_id, week_start);

CREATE TABLE audit_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID,
    user_id     UUID,
    action      VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_audit_business_created ON audit_events (business_id, created_at DESC);
