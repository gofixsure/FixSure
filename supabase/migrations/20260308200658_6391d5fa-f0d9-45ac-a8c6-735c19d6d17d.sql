-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid NOT NULL,
  technician_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT TO authenticated USING (true);

-- Trigger to auto-update avg_rating on technician_profiles after review insert
CREATE OR REPLACE FUNCTION public.update_technician_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_avg numeric;
BEGIN
  SELECT ROUND(AVG(rating)::numeric, 1) INTO new_avg
  FROM reviews
  WHERE technician_id = NEW.technician_id;

  UPDATE technician_profiles
  SET avg_rating = COALESCE(new_avg, 0)
  WHERE id = NEW.technician_id;

  -- Also recalculate reliability score
  PERFORM calculate_reliability_score(NEW.technician_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_technician_rating();