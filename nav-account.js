/* ============================================================
   NAV ACCOUNT + ORDER LINKS
   Quick first pass from saved session data (no library, no network):
   - [data-account-link]  → "Log in" or "My account"
   - [data-order-link]    → guests are sent to log in instead of ordering
       data-order-link=""            also swaps the text to "Log in to order"
       data-order-link="keep-label"  keeps its text/image, only changes href
       data-member-href="..."        where it points for logged-in users
   Pages that load auth.js (menu.html via order-gate.js) re-run this with
   the session verified by Supabase, so a stale token can't unlock ordering.
============================================================ */
(function () {
    'use strict';

    function hasStoredSession() {
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

    function loginUrl() {
        const here = window.location.pathname.split('/').pop() || 'index.html';
        const next = here === 'index.html' || here === '' ? 'menu.html' : here;
        return 'registration.html?next=' + encodeURIComponent(next) + '&reason=order-login#login';
    }

    function apply(loggedIn) {
        // Guests already get a "Log in to order" button, so hide the duplicate "Log in" link
        const hasOrderButton = !!document.querySelector('.nav-cta[data-order-link]');
        document.querySelectorAll('[data-account-link]').forEach(a => {
            a.textContent = loggedIn ? 'My account' : 'Log in';
            a.setAttribute('href', loggedIn ? 'dashboard.html' : 'registration.html');
            const item = a.closest('li') || a;
            item.hidden = !loggedIn && hasOrderButton;
        });

        document.querySelectorAll('[data-order-link]').forEach(a => {
            if (!a.dataset.memberLabel) a.dataset.memberLabel = a.textContent.trim();
            if (!a.dataset.memberHref)  a.dataset.memberHref  = a.getAttribute('href');
            const keepLabel = a.dataset.orderLink === 'keep-label';

            if (loggedIn) {
                a.setAttribute('href', a.dataset.memberHref);
                if (!keepLabel) a.textContent = a.dataset.memberLabel;
            } else {
                a.setAttribute('href', loginUrl());
                if (!keepLabel) a.textContent = 'Log in to order';
            }
        });
    }

    window.TSNav = { apply, hasStoredSession, loginUrl };
    apply(hasStoredSession());
})();
