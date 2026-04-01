
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'technician');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role app_role NOT NULL DEFAULT 'customer',
  city TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Public can read profiles (for technician search)
CREATE POLICY "Anyone can read profiles" ON public.profiles
  FOR SELECT TO anon
  USING (true);

-- Create technician_profiles table for extra technician info
CREATE TABLE public.technician_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  experience_years INT NOT NULL DEFAULT 0,
  reliability_score NUMERIC(5,2) DEFAULT 0,
  total_repairs INT DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  claim_rate NUMERIC(5,2) DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  id_proof_url TEXT DEFAULT '',
  selfie_url TEXT DEFAULT '',
  shop_photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read technician profiles
CREATE POLICY "Anyone can read technician profiles" ON public.technician_profiles
  FOR SELECT USING (true);

-- Technicians can update their own profile
CREATE POLICY "Technicians can update own profile" ON public.technician_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Technicians can insert their own profile  
CREATE POLICY "Technicians can insert own profile" ON public.technician_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  technician_id UUID REFERENCES public.profiles(id) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Customers can read their own bookings
CREATE POLICY "Customers can read own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = technician_id);

-- Customers can create bookings
CREATE POLICY "Customers can create bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- Technicians can update booking status
CREATE POLICY "Technicians can update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = technician_id);

-- Create repairs table
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES public.profiles(id) NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  repair_description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  fixsure_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  booking_id UUID REFERENCES public.bookings(id),
  damage_photo_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Technicians can read their own repairs
CREATE POLICY "Technicians can read own repairs" ON public.repairs
  FOR SELECT TO authenticated
  USING (auth.uid() = technician_id);

-- Technicians can insert repairs
CREATE POLICY "Technicians can insert repairs" ON public.repairs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = technician_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );
  
  -- If technician, also create technician_profiles entry
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'technician' THEN
    INSERT INTO public.technician_profiles (id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
