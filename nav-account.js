/* ============================================================
   NAV ACCOUNT LINK
   Turns every [data-account-link] into "My account" when a saved
   Supabase session exists. Reads storage only — no library, no network.
   The account page itself still verifies the session with Supabase.
============================================================ */
(function () {
    'use strict';
    function hasSession() {
        try {
            const stores = [window.localStorage, window.sessionStorage];
            for (const s of stores) {
                for (let i = 0; i < s.length; i++) {
                    const key = s.key(i);
                    if (/^sb-.+-auth-token$/.test(key) && s.getItem(key)) return true;
                }
            }
        } catch (e) { /* storage blocked */ }
        return false;
    }
    if (!hasSession()) return;
    document.querySelectorAll('[data-account-link]').forEach(a => {
        a.textContent = 'My account';
        a.setAttribute('href', 'dashboard.html');
    });
})();
