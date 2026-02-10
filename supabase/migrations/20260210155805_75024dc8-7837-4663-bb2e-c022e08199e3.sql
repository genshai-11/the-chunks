-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Re-create with explicit auth.uid() IS NOT NULL check
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = id);