import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Brak zmiennych środowiskowych VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY. Skopiuj .env.example do .env i uzupełnij dane.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
