/* ============================================================
   SUPABASE CONFIG (browser)
   Values mirror SUPABASE_URL and SUPABASE_ANON_KEY in .env.
   This site has no build step, so the browser cannot read .env —
   keep the two in sync by hand if you ever rotate the key.

   Only the PUBLISHABLE (anon) key belongs here. It is designed to be
   public: Row Level Security decides what it can read or write.
   NEVER put the service_role / secret key in any file in this repo.
============================================================ */
window.TS_SUPABASE = {
    url: 'https://tbxxkncornforjfraewp.supabase.co',
    publishableKey: 'sb_publishable_zPZa5_d9H8MyO7J4hX0qxg_lo_hc5YM'
};
