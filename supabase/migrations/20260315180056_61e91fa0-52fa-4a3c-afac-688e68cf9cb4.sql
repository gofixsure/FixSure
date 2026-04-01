
-- Add fixsure_payout column to track re-repair payouts owed to technicians
ALTER TABLE public.technician_profiles ADD COLUMN IF NOT EXISTS fixsure_payout numeric NOT NULL DEFAULT 0;

-- Create trigger function to update fixsure_payout when re-repair is completed
CREATE OR REPLACE FUNCTION public.update_fixsure_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  repair_price numeric;
BEGIN
  -- Only trigger when status changes to re_repair_completed or claim_resolved from re_repair_approved
  IF NEW.status IN ('re_repair_completed', 'claim_resolved') AND OLD.status = 're_repair_approved' THEN
    -- Get the original repair price (base price, not total_amount which includes fee)
    SELECT COALESCE(r.price, 0) INTO repair_price
    FROM repairs r
    WHERE r.booking_id = NEW.booking_id
    LIMIT 1;

    -- Add 50% of original repair cost to technician's fixsure_payout
    UPDATE technician_profiles
    SET fixsure_payout = COALESCE(fixsure_payout, 0) + ROUND(repair_price * 0.5, 2)
    WHERE id = NEW.technician_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on claims table
CREATE TRIGGER on_rerepair_completed
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fixsure_payout();
