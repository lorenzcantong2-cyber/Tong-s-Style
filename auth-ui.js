/* ============================================================
   TONG'S STYLE — SHARED AUTH UI HELPERS
   Reusable pieces for the auth forms. Exposes window.TSAuthUI.
============================================================ */
(function () {
    'use strict';

    /* Show or clear one field's error, wired for screen readers. */
    function setFieldError(input, message) {
        const errEl = document.getElementById(input.id + '-err');
        if (errEl) errEl.textContent = message || '';
        if (message) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
    }

    /*
     * Attach live validation to a field.
     * check(value) returns '' when valid or an error message.
     * Errors appear after the first blur (not while someone is still typing),
     * then update live so they disappear as soon as the field is fixed.
     */
    function bindField(input, check) {
        let touched = false;
        input.addEventListener('blur', () => {
            if (!input.value && !touched) return;
            touched = true;
            setFieldError(input, check(input.value));
        });
        input.addEventListener('input', () => {
            if (touched || input.getAttribute('aria-invalid') === 'true') {
                setFieldError(input, check(input.value));
            }
        });
        return {
            validate() {
                touched = true;
                const msg = check(input.value);
                setFieldError(input, msg);
                return !msg;
            },
            reset() {
                touched = false;
                setFieldError(input, '');
            }
        };
    }

    /* Validate a list of bound fields; focus the first invalid one. */
    function validateAll(fields) {
        let firstBad = null;
        fields.forEach(f => {
            const ok = f.binding.validate();
            if (!ok && !firstBad) firstBad = f.input;
        });
        if (firstBad) firstBad.focus();
        return !firstBad;
    }

    /* Show/hide password buttons: <button class="password-toggle" data-toggle-for="inputId"> */
    function bindPasswordToggles(root) {
        (root || document).querySelectorAll('.password-toggle').forEach(btn => {
            const input = document.getElementById(btn.dataset.toggleFor);
            if (!input) return;
            btn.addEventListener('click', () => {
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.textContent = show ? 'Hide' : 'Show';
                btn.setAttribute('aria-pressed', String(show));
                btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
            });
        });
    }

    /* Put a submit button into a loading state (spinner + disabled + new label). */
    function setLoading(btn, loading, loadingLabel) {
        const label = btn.querySelector('.btn-label');
        if (loading) {
            btn.dataset.idleLabel = label.textContent;
            label.textContent = loadingLabel || 'Please wait…';
            btn.classList.add('is-loading');
            btn.disabled = true;
            btn.setAttribute('aria-busy', 'true');
        } else {
            if (btn.dataset.idleLabel) label.textContent = btn.dataset.idleLabel;
            btn.classList.remove('is-loading');
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
        }
    }

    /*
     * Form-level message banner.
     * type: 'error' | 'success' | 'info'
     * action (optional): { label, onClick } renders a button inside the banner.
     */
    function showBanner(el, type, message, action) {
        el.className = 'auth-banner is-' + type;
        el.textContent = '';
        const p = document.createElement('p');
        p.textContent = message;
        el.appendChild(p);
        if (action) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'auth-banner-action';
            b.textContent = action.label;
            b.addEventListener('click', () => action.onClick(b));
            el.appendChild(b);
        }
        el.setAttribute('role', type === 'error' ? 'alert' : 'status');
        el.hidden = false;
    }

    function hideBanner(el) {
        el.hidden = true;
        el.textContent = '';
    }

    /* Live password checklist: <ul class="pw-rules" data-rules-for="inputId"> */
    function bindPasswordRules(listEl, input) {
        function render() {
            const rules = window.TSAuth.passwordRules(input.value);
            listEl.innerHTML = '';
            rules.forEach(r => {
                const li = document.createElement('li');
                li.textContent = r.label;
                if (r.ok) li.classList.add('ok');
                const state = document.createElement('span');
                state.className = 'visually-hidden';
                state.textContent = r.ok ? ' (done)' : ' (not yet)';
                li.appendChild(state);
                listEl.appendChild(li);
            });
        }
        input.addEventListener('input', render);
        render();
    }

    /* Read URL hash params like #error=...&error_description=... */
    function parseHash(hash) {
        const out = {};
        const h = (hash || '').replace(/^#/, '');
        if (!h || !h.includes('=')) return out;
        new URLSearchParams(h).forEach((v, k) => { out[k] = v; });
        return out;
    }

    window.TSAuthUI = {
        setFieldError,
        bindField,
        validateAll,
        bindPasswordToggles,
        setLoading,
        showBanner,
        hideBanner,
        bindPasswordRules,
        parseHash
    };
})();
