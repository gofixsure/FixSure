
-- Fix bookings RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can read own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Technicians can update bookings" ON public.bookings;

CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can read own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING ((auth.uid() = customer_id) OR (auth.uid() = technician_id));

CREATE POLICY "Technicians can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = technician_id);

-- Fix repairs RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Technicians can insert repairs" ON public.repairs;
DROP POLICY IF EXISTS "Technicians can read own repairs" ON public.repairs;

CREATE POLICY "Technicians can insert repairs"
  ON public.repairs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Technicians can read own repairs"
  ON public.repairs FOR SELECT
  TO authenticated
  USING (auth.uid() = technician_id);

-- Also let customers read repairs linked to their bookings
CREATE POLICY "Customers can read own repairs"
  ON public.repairs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id = auth.uid()
    )
  );

-- Fix profiles policies too
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Fix technician_profiles policies
DROP POLICY IF EXISTS "Anyone can read technician profiles" ON public.technician_profiles;
DROP POLICY IF EXISTS "Technicians can insert own profile" ON public.technician_profiles;
DROP POLICY IF EXISTS "Technicians can update own profile" ON public.technician_profiles;

CREATE POLICY "Anyone can read technician profiles"
  ON public.technician_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Technicians can insert own profile"
  ON public.technician_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Technicians can update own profile"
  ON public.technician_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
