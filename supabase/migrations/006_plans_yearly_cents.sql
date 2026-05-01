-- Add yearly billing option to plans + refresh Tree Mate's seed values
-- to match the Subscription UI's actual pricing structure.
--
-- yearly_cents lets the customer pick monthly OR yearly billing on the
-- Subscription page (existing toggle UX). NULL means no yearly option
-- (e.g. trial). Tree Mate is starting fresh per operator direction so
-- the re-seed UPDATE is safe — no live tenants on these slugs yet.
--
-- Pricing (matches Tree Mate's prior hardcoded UI):
--   Trial:   free, 14 days
--   Starter: $7/mo  or $50/yr  (was Basic)       — 2 staff
--   Pro:     $15/mo or $150/yr (was Unlimited)   — 10 staff

alter table plans
  add column if not exists yearly_cents int;

comment on column plans.yearly_cents is
  'Optional yearly subscription price in cents. NULL = no yearly tier offered.';

update plans set price_cents = 0,    yearly_cents = null,  max_staff = 1  where slug = 'trial';
update plans set price_cents = 700,  yearly_cents = 5000,  max_staff = 2  where slug = 'starter';
update plans set price_cents = 1500, yearly_cents = 15000, max_staff = 10 where slug = 'pro';
