
CREATE TABLE public.claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  technician_id uuid NOT NULL REFERENCES public.profiles(id),
  claim_type text NOT NULL CHECK (claim_type IN ('refund', 're-repair')),
  description text NOT NULL DEFAULT '',
  photo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert own claims" ON public.claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can read own claims" ON public.claims FOR SELECT TO authenticated USING (auth.uid() = customer_id OR auth.uid() = technician_id);
CREATE POLICY "Technicians can update claims" ON public.claims FOR UPDATE TO authenticated USING (auth.uid() = technician_id);

-- Trigger: when a claim is approved, increment technician's claim_rate
CREATE OR REPLACE FUNCTION public.update_claim_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_claims_count numeric;
  total_repairs_count numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    SELECT COUNT(*) INTO total_claims_count FROM claims WHERE technician_id = NEW.technician_id AND status = 'approved';
    SELECT COALESCE(total_repairs, 0) INTO total_repairs_count FROM technician_profiles WHERE id = NEW.technician_id;
    
    IF total_repairs_count > 0 THEN
      UPDATE technician_profiles SET claim_rate = ROUND((total_claims_count / total_repairs_count) * 100, 1) WHERE id = NEW.technician_id;
    END IF;
    
    PERFORM calculate_reliability_score(NEW.technician_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_claim_update
  AFTER UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_claim_rate();
