import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fhziqnrsreigycybrkyg.supabase.co";

const supabaseKey =
  "sb_publishable_-uo5LmJCN2P8u1WyaTNdUw_zdZwzVrN";

export const supabase = createClient(supabaseUrl, supabaseKey);