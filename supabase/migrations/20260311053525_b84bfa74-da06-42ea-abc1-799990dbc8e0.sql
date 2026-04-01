
-- Admin helper function (admin enum value was added in previous migration)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'::app_role
  );
END;
$function$;

-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage OTPs" ON public.otp_verifications
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  read boolean DEFAULT false,
  related_id text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Admin RLS policies
CREATE POLICY "Admins can read all claims" ON public.claims
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all claims" ON public.claims
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read all bookings" ON public.bookings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read all repairs" ON public.repairs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Update claim rate trigger for new statuses
CREATE OR REPLACE FUNCTION public.update_claim_rate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_claims_count numeric;
  total_repairs_count numeric;
  repair_amount numeric;
BEGIN
  IF (NEW.status IN ('approved', 're_repair_approved')) AND (OLD.status IN ('pending', 'pending_technician', 'under_review')) THEN
    SELECT COUNT(*) INTO total_claims_count FROM claims WHERE technician_id = NEW.technician_id AND status IN ('approved', 're_repair_approved', 'claim_resolved');
    SELECT COALESCE(total_repairs, 0) INTO total_repairs_count FROM technician_profiles WHERE id = NEW.technician_id;
    
    IF total_repairs_count > 0 THEN
      UPDATE technician_profiles SET claim_rate = ROUND((total_claims_count / total_repairs_count) * 100, 1) WHERE id = NEW.technician_id;
    END IF;
    
    PERFORM calculate_reliability_score(NEW.technician_id);

    IF NEW.claim_type = 'refund' AND NEW.status = 'approved' THEN
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
$function$;
