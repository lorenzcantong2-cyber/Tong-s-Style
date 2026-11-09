/* ============================================================
   ORDER GATE (menu.html)
   Visitors can browse the menu; only logged-in users can order.
   - Verifies the session with Supabase (a stale or fake token won't pass).
   - Logged in  → adds body.can-order (shows ORDER NOW buttons + cart),
                  pre-fills the checkout form from the user's profile.
   - Logged out → keeps ordering hidden, shows the "Log in to order" note,
                  and sends any order attempt to the log-in page.
   The database enforces the same rule (supabase/orders-require-login.sql).
============================================================ */
(function () {
    'use strict';

    const body = document.body;
    const note = document.getElementById('orderGateNote');
    let canOrder = false;

    function loginUrl() {
        return window.TSNav ? TSNav.loginUrl() : 'registration.html?next=menu.html&reason=order-login#login';
    }

    function setMode(loggedIn) {
        canOrder = loggedIn;
        body.classList.toggle('can-order', loggedIn);
        body.classList.toggle('is-guest', !loggedIn);
        if (note) note.hidden = loggedIn;
        if (window.TSNav) TSNav.apply(loggedIn);
        if (!loggedIn && typeof window.clearCart === 'function') {
            try { window.clearCart(); } catch (e) { /* cart not ready */ }
        }
    }

    // Defence in depth: even if a hidden button is triggered, guests go to log in
    ['cartAdd', 'openCartForm', 'handleCartFormSubmit'].forEach(name => {
        const original = window[name];
        if (typeof original !== 'function') return;
        window[name] = function () {
            if (!canOrder) {
                window.location.href = loginUrl();
                return;
            }
            return original.apply(this, arguments);
        };
    });

    async function prefillCheckout(user) {
        const { data: profile } = await TSAuth.client
            .from('profiles')
            .select('first_name, last_name, email, mobile')
            .eq('id', user.id)
            .maybeSingle();
        const fill = (id, value) => {
            const el = document.getElementById(id);
            if (el && !el.value && value) el.value = value;
        };
        fill('cb-name',  profile ? (profile.first_name + ' ' + profile.last_name).trim() : '');
        fill('cb-email', (profile && profile.email) || user.email);
        fill('cb-phone', profile && profile.mobile);
    }

    async function start() {
        if (!window.TSAuth) {
            setMode(false); // fail closed if the login system didn't load
            return;
        }
        const user = await TSAuth.getVerifiedUser();
        setMode(!!user);
        if (user) prefillCheckout(user).catch(() => {});

        TSAuth.client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') setMode(false);
            if (event === 'SIGNED_IN' && session && !canOrder) setMode(true);
        });
    }

    start().catch(() => setMode(false));
})();
