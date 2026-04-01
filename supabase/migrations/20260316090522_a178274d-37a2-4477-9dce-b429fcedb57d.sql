-- Fix: payout should only trigger on customer confirmation (claim_resolved), not technician marking complete
CREATE OR REPLACE FUNCTION public.update_fixsure_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  repair_price numeric;
BEGIN
  -- Only trigger when status changes to claim_resolved (customer confirmed)
  IF NEW.status = 'claim_resolved' AND OLD.status = 're_repair_completed' THEN
    SELECT COALESCE(r.price, 0) INTO repair_price
    FROM repairs r
    WHERE r.booking_id = NEW.booking_id
    LIMIT 1;

    UPDATE technician_profiles
    SET fixsure_payout = COALESCE(fixsure_payout, 0) + ROUND(repair_price * 0.5, 2)
    WHERE id = NEW.technician_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Allow customers to update their own claims (for confirming re-repair)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Customers can update own claims' AND tablename = 'claims'
  ) THEN
    CREATE POLICY "Customers can update own claims"
    ON public.claims
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = customer_id);
  END IF;
END $$;