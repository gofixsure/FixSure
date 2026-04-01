
-- Add platform_dues to technician_profiles
ALTER TABLE public.technician_profiles ADD COLUMN IF NOT EXISTS platform_dues numeric NOT NULL DEFAULT 0;

-- Add pending_refund to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_refund numeric NOT NULL DEFAULT 0;

-- Update the repair trigger to also accumulate fixsure_fee into platform_dues
CREATE OR REPLACE FUNCTION public.update_total_repairs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE technician_profiles
  SET total_repairs = COALESCE(total_repairs, 0) + 1,
      platform_dues = COALESCE(platform_dues, 0) + COALESCE(NEW.fixsure_fee, 0)
  WHERE id = NEW.technician_id;

  PERFORM calculate_reliability_score(NEW.technician_id);
  RETURN NEW;
END;
$$;

-- Update claim approval trigger to accumulate refund for customer when claim type is 'refund'
CREATE OR REPLACE FUNCTION public.update_claim_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_claims_count numeric;
  total_repairs_count numeric;
  repair_amount numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Update claim rate
    SELECT COUNT(*) INTO total_claims_count FROM claims WHERE technician_id = NEW.technician_id AND status = 'approved';
    SELECT COALESCE(total_repairs, 0) INTO total_repairs_count FROM technician_profiles WHERE id = NEW.technician_id;
    
    IF total_repairs_count > 0 THEN
      UPDATE technician_profiles SET claim_rate = ROUND((total_claims_count / total_repairs_count) * 100, 1) WHERE id = NEW.technician_id;
    END IF;
    
    PERFORM calculate_reliability_score(NEW.technician_id);

    -- If claim type is refund, add 50% of repair amount to customer's pending_refund
    IF NEW.claim_type = 'refund' THEN
      SELECT COALESCE(r.total_amount, 0) INTO repair_amount
      FROM repairs r
      WHERE r.booking_id = NEW.booking_id
      LIMIT 1;

      UPDATE profiles
      SET pending_refund = COALESCE(pending_refund, 0) + ROUND(repair_amount * 0.5, 2)
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
