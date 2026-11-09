/* ============================================================
   TONG'S STYLE — SHARED AUTH MODULE
   Load order on any page that needs auth:
     1. supabase-js (CDN, pinned)   2. supabase-config.js   3. auth.js
   Exposes window.TSAuth.
============================================================ */
(function () {
    'use strict';

    const cfg = window.TS_SUPABASE;
    if (!window.supabase || !cfg) {
        console.error('auth.js: load supabase-js and supabase-config.js first.');
        return;
    }

    /* ---------- "Remember me" storage ----------
       Remembered sessions live in localStorage (survive closing the browser).
       Otherwise they live in sessionStorage (cleared when the tab closes). */
    const REMEMBER_KEY = 'ts-remember-me';

    function safe(fn, fallback) {
        try { return fn(); } catch (e) { return fallback; }
    }

    function isRemembered() {
        return safe(() => localStorage.getItem(REMEMBER_KEY) !== '0', true);
    }

    function setRemembered(on) {
        safe(() => localStorage.setItem(REMEMBER_KEY, on ? '1' : '0'));
    }

    const sessionStore = {
        getItem(key) {
            return safe(() => localStorage.getItem(key), null) ?? safe(() => sessionStorage.getItem(key), null);
        },
        setItem(key, value) {
            if (isRemembered()) {
                safe(() => localStorage.setItem(key, value));
                safe(() => sessionStorage.removeItem(key));
            } else {
                safe(() => sessionStorage.setItem(key, value));
                safe(() => localStorage.removeItem(key));
            }
        },
        removeItem(key) {
            safe(() => localStorage.removeItem(key));
            safe(() => sessionStorage.removeItem(key));
        }
    };

    const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: {
            storage: sessionStore,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Implicit flow lets email links work even when opened in a different browser
            flowType: 'implicit'
        }
    });

    /* ---------- Page URLs (relative, so they work on any host or sub-path) ---------- */
    function pageUrl(file, params) {
        const u = new URL(file, window.location.href);
        u.hash = '';
        u.search = '';
        if (params) Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
        return u.href;
    }

    const PAGES = {
        login:     'registration.html',
        dashboard: 'dashboard.html',
        reset:     'reset-password.html'
    };

    /* Only allow redirects to pages on this same site (blocks open redirects). */
    function safeNext(next) {
        if (!next) return PAGES.dashboard;
        try {
            const u = new URL(next, window.location.href);
            if (u.origin !== window.location.origin) return PAGES.dashboard;
            if (/registration\.html$|reset-password\.html$/.test(u.pathname)) return PAGES.dashboard;
            return u.pathname.split('/').pop() + u.search + u.hash;
        } catch (e) {
            return PAGES.dashboard;
        }
    }

    /* ---------- Validation (shared by every form) ---------- */
    const NAME_RE     = /^[\p{L}][\p{L}\p{M}' .-]{0,49}$/u;
    const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const MOBILE_RE   = /^\d{11}$/;
    const UPPER_RE    = /[A-Z]/;
    const SPECIAL_RE  = /[^A-Za-z0-9\s]/;

    const validate = {
        name(v, label) {
            v = (v || '').trim();
            if (!v) return `Enter your ${label}.`;
            if (!NAME_RE.test(v)) return `${label[0].toUpperCase() + label.slice(1)} can use letters, spaces, apostrophes, periods and hyphens (max 50).`;
            return '';
        },
        email(v) {
            v = (v || '').trim();
            if (!v) return 'Enter your email address.';
            if (!EMAIL_RE.test(v)) return 'Enter a valid email address, like name@example.com.';
            return '';
        },
        mobile(v) {
            v = (v || '').trim();
            if (!v) return 'Enter your mobile number.';
            if (!/^\d*$/.test(v)) return 'Use digits only — no spaces, dashes or +63.';
            if (!MOBILE_RE.test(v)) return `Mobile number must be exactly 11 digits (you entered ${v.length}).`;
            return '';
        },
        password(v) {
            v = v || '';
            if (!v) return 'Create a password.';
            return passwordRules(v).every(r => r.ok) ? '' : 'Password doesn’t meet all the requirements below.';
        },
        confirm(v, original) {
            if (!v) return 'Re-enter your password.';
            if (v !== original) return 'Passwords don’t match.';
            return '';
        },
        loginPassword(v) {
            return v ? '' : 'Enter your password.';
        }
    };

    function passwordRules(v) {
        v = v || '';
        return [
            { id: 'length',  label: '8–12 characters',            ok: v.length >= 8 && v.length <= 12 },
            { id: 'upper',   label: '1 uppercase letter',         ok: UPPER_RE.test(v) },
            { id: 'special', label: '1 symbol, like ! @ # $',     ok: SPECIAL_RE.test(v) },
            { id: 'space',   label: 'No spaces',                  ok: v.length > 0 && !/\s/.test(v) }
        ];
    }

    /* ---------- Turn Supabase errors into clear, actionable messages ---------- */
    function friendlyError(err) {
        if (!err) return 'Something went wrong. Try again.';
        const code = err.code || '';
        const msg  = (err.message || '').toLowerCase();

        if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
            return 'Email or password is incorrect.';
        if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
            return 'Verify your email first. Check your inbox for the link we sent.';
        if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered'))
            return 'An account with this email already exists. Log in instead, or reset your password.';
        if (code === 'weak_password' || msg.includes('password should'))
            return 'That password is too weak. ' + (err.message || '');
        if (code === 'same_password')
            return 'Choose a password different from your current one.';
        if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err.status === 429)
            return 'Too many attempts. Wait a few minutes, then try again.';
        if (code === 'email_address_invalid' || msg.includes('email address') && msg.includes('invalid'))
            return 'That email address can’t be used. Check it for typos.';
        if (code === 'email_address_not_authorized' || msg.includes('not authorized'))
            return 'We can’t send email to that address yet. Contact us to finish signing up.';
        if (code === 'signup_disabled')
            return 'Sign-ups are closed right now.';
        if (msg.includes('database error saving new user') || code === 'unexpected_failure')
            return 'We couldn’t save your details. Check every field and try again.';
        if (code === 'session_not_found' || code === 'session_expired' || msg.includes('jwt expired'))
            return 'Your session has expired. Log in again.';
        if (msg.includes('failed to fetch') || msg.includes('network'))
            return 'Can’t reach the server. Check your connection and try again.';
        return err.message || 'Something went wrong. Try again.';
    }

    /* ---------- Session helpers ---------- */
    async function getSession() {
        const { data, error } = await client.auth.getSession();
        if (error) return null;
        return data.session;
    }

    /* Verifies the token with Supabase (not just local storage). */
    async function getVerifiedUser() {
        const session = await getSession();
        if (!session) return null;
        const { data, error } = await client.auth.getUser();
        if (error || !data.user) {
            await client.auth.signOut({ scope: 'local' });
            return null;
        }
        return data.user;
    }

    /* Call on protected pages. Resolves with the user, or redirects to login. */
    async function requireAuth() {
        const user = await getVerifiedUser();
        if (!user) {
            const here = window.location.pathname.split('/').pop() || PAGES.dashboard;
            window.location.replace(pageUrl(PAGES.login, { next: here, reason: 'login-required' }));
            return new Promise(() => {}); // stop the page from continuing
        }
        // If the session ends later (logout in another tab, refresh token expired), leave the page
        client.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_OUT') {
                window.location.replace(pageUrl(PAGES.login, { reason: 'signed-out' }));
            }
        });
        return user;
    }

    async function signOut() {
        const { error } = await client.auth.signOut({ scope: 'local' });
        sessionStore.removeItem(storageKey());
        return error;
    }

    function storageKey() {
        const ref = new URL(cfg.url).hostname.split('.')[0];
        return `sb-${ref}-auth-token`;
    }

    window.TSAuth = {
        client,
        PAGES,
        pageUrl,
        safeNext,
        validate,
        passwordRules,
        friendlyError,
        getSession,
        getVerifiedUser,
        requireAuth,
        signOut,
        setRemembered,
        isRemembered
    };
})();
