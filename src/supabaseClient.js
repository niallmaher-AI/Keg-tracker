import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mymdodfpxvagwsfpbogn.supabase.co";
const supabaseKey = "sb_publishable_8Fvma_ke1i2JiBpRNTy3ig_B4g-G5Q8";

export const supabase = createClient(supabaseUrl, supabaseKey);
