// js/account.js v2 — gecorrigeerd schema
// Gedeelde account settings module voor alle Internly rollen.
// Vereist: db (Supabase client op window), notify(), window._currentUserId
//
// SCHEMA-CONTRACT (bevestigd 29 april 2026):
//   subscriptions: profile_id, plan, status, mollie_subscription_id,
//                  next_billing_date (date), mollie_customer_id
//   payments:      id, profile_id, mollie_id, amount, currency,
//                  status, description, paid_at, created_at
//   profiles:      telefoon, taal_voorkeur, email_notificaties,
//                  deletion_requested, deletion_requested_at
//
// Plan-namen zijn de bestaande DB-namen (company_pro, begeleider_starter, …).
// Geen Mollie API-aanroep — alleen DB-reads. Webhook vult de tabellen.
// Geen db.auth.admin.* — alleen deletion_requested = true.

const AccountModule = (() => {
  'use strict';

  // ── DATA LADEN ────────────────────────────────────────────────────────

  async function loadContactData(userId) {
    const { data, error } = await db.from('profiles')
      .select('naam, email, telefoon, taal_voorkeur, email_notificaties')
      .eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  async function loadSubscription(userId) {
    const { data, error } = await db.from('subscriptions')
      .select('plan, status, next_billing_date, mollie_subscription_id')
      .eq('profile_id', userId).maybeSingle();
    if (error) throw error;
    return data; // null = geen subscription-rij = free
  }

  async function loadPayments(userId) {
    const { data, error } = await db.from('payments')
      .select('id, amount, currency, status, description, paid_at')
      .eq('profile_id', userId)
      .order('paid_at', { ascending: false })
      .limit(24);
    if (error) throw error;
    return data || [];
  }

  // ── PLAN HELPERS ──────────────────────────────────────────────────────

  const PLAN_LABELS = {
    nl: {
      company_pro:            'Pro — €59/maand',
      company_business:       'Business — €169/maand',
      school_premium:         'School Premium — €249/jaar',
      school_premium_monthly: 'School Premium — €29/maand',
      begeleider_starter:     'Starter — €49/maand',
      begeleider_pro:         'Pro — €79/maand'
    },
    en: {
      company_pro:            'Pro — €59/month',
      company_business:       'Business — €169/month',
      school_premium:         'School Premium — €249/year',
      school_premium_monthly: 'School Premium — €29/month',
      begeleider_starter:     'Starter — €49/month',
      begeleider_pro:         'Pro — €79/month'
    }
  };

  const PAID_PLANS = [
    'company_pro', 'company_business',
    'school_premium', 'school_premium_monthly',
    'begeleider_starter', 'begeleider_pro'
  ];

  function getPlanLabel(plan, lang) {
    const set = PLAN_LABELS[lang] || PLAN_LABELS.nl;
    if (set[plan]) return set[plan];
    return lang === 'en' ? 'Free — always free' : 'Free — altijd gratis';
  }

  function isPaidPlan(plan, status) {
    return PAID_PLANS.includes(plan) && status === 'active';
  }

  // ── CSV EXPORT ────────────────────────────────────────────────────────

  async function exportPaymentsCSV(userId, lang) {
    const nl = lang !== 'en';
    const payments = await loadPayments(userId);
    if (!payments.length) {
      notify(nl ? 'Geen betalingen gevonden om te exporteren'
                : 'No payments found to export');
      return;
    }
    const header = nl
      ? 'Datum,Omschrijving,Bedrag,Valuta,Status'
      : 'Date,Description,Amount,Currency,Status';
    const rows = payments.map(p => [
      p.paid_at
        ? new Date(p.paid_at).toLocaleDateString(nl ? 'nl-NL' : 'en-GB')
        : '—',
      '"' + (p.description || '').replace(/"/g, '""') + '"',
      Number(p.amount).toFixed(2),
      p.currency,
      p.status
    ].join(','));
    const blob = new Blob([[header, ...rows].join('\n')],
      { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'internly-payments-' +
      new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    notify(nl ? 'CSV gedownload' : 'CSV downloaded');
  }

  // ── ACCOUNT VERWIJDEREN ───────────────────────────────────────────────
  // Alleen deletion_requested-vlag. NOOIT auth.admin.deleteUser() in browser.

  async function requestAccountDeletion(userId, inputText, expectedWord, lang) {
    const nl = lang !== 'en';
    if (inputText !== expectedWord) {
      notify(nl
        ? 'Bevestigingstekst klopt niet — account niet verwijderd'
        : 'Confirmation text incorrect — account not deleted');
      return false;
    }
    const { error } = await db.from('profiles').update({
      deletion_requested:    true,
      deletion_requested_at: new Date().toISOString()
    }).eq('id', userId);
    if (error) throw error;
    await db.auth.signOut();
    // Run 1.6: full state cleanup bij account-deletion verzoek
    if (typeof clearUserState === 'function') clearUserState();
    notify(nl
      ? 'Verwijderverzoek ingediend — je account wordt binnen 30 dagen verwijderd'
      : 'Deletion request submitted — your account will be deleted within 30 days');
    setTimeout(() => { window.location.href = 'index.html'; }, 2500);
    return true;
  }

  // ── HTML HELPERS ──────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _fmtDate(value, lang) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'nl-NL');
  }

  // ── RENDERERS ─────────────────────────────────────────────────────────

  function renderContactForm(data, lang) {
    const nl = lang !== 'en';
    return `
      <div class="account-section">
        <h3 class="account-section-title">
          ${nl ? 'Contactgegevens' : 'Contact information'}
        </h3>
        <div class="account-form">
          <div class="form-group">
            <label class="form-label">${nl ? 'Volledige naam' : 'Full name'}</label>
            <input type="text" id="acc-naam" class="form-input"
                   value="${_esc(data.naam || '')}" maxlength="100">
          </div>
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input type="email" id="acc-email" class="form-input"
                   value="${_esc(data.email || '')}" disabled>
            <span class="form-hint">
              ${nl
                ? 'Neem contact op via hallo@internly.pro om je e-mail te wijzigen.'
                : 'Contact hallo@internly.pro to change your email address.'}
            </span>
          </div>
          <div class="form-group">
            <label class="form-label">
              ${nl ? 'Telefoonnummer' : 'Phone number'}
              <span class="form-optional">(${nl ? 'optioneel' : 'optional'})</span>
            </label>
            <input type="tel" id="acc-telefoon" class="form-input"
                   value="${_esc(data.telefoon || '')}" maxlength="20">
          </div>
          <div class="form-group">
            <label class="form-label">
              ${nl ? 'Interfacetaal' : 'Interface language'}
            </label>
            <select id="acc-taal" class="form-select">
              <option value="nl" ${data.taal_voorkeur === 'nl' ? 'selected' : ''}>Nederlands</option>
              <option value="en" ${data.taal_voorkeur === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>
          <div class="form-group form-group--inline">
            <label class="form-label">
              ${nl ? 'E-mailnotificaties' : 'Email notifications'}
            </label>
            <label class="toggle">
              <input type="checkbox" id="acc-notifs"
                     ${data.email_notificaties !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <button class="btn btn-primary"
                  onclick="AccountModule.handleSaveContact('${lang}')">
            ${nl ? 'Wijzigingen opslaan' : 'Save changes'}
          </button>
        </div>
      </div>`;
  }

  function renderSubscriptionSection(sub, lang) {
    const nl   = lang !== 'en';
    const plan = sub?.plan || 'free';
    const status = sub?.status || 'active';
    const paid = isPaidPlan(plan, status);
    const label = getPlanLabel(plan, lang);

    const statusColors = {
      active: 'green', cancelled: 'red',
      past_due: 'amber', trialing: 'blue', pending: 'amber'
    };
    const statusLabels = {
      nl: { active: 'Actief', cancelled: 'Opgezegd',
            past_due: 'Betaling mislukt', trialing: 'Proefperiode',
            pending: 'In behandeling' },
      en: { active: 'Active', cancelled: 'Cancelled',
            past_due: 'Payment failed', trialing: 'Trial',
            pending: 'Pending' }
    };

    return `
      <div class="account-section">
        <h3 class="account-section-title">
          ${nl ? 'Abonnement' : 'Subscription'}
        </h3>
        <div class="account-plan-card ${paid ? 'account-plan-card--paid' : ''}">
          <div class="plan-label">${nl ? 'Huidig plan' : 'Current plan'}</div>
          <div class="plan-name">${_esc(label)}</div>
          ${sub ? `<div class="plan-status plan-status--${statusColors[status] || 'green'}">
            ${(statusLabels[lang] || statusLabels.nl)[status] || _esc(status)}
          </div>` : ''}
          ${paid && sub?.next_billing_date ? `
            <div class="plan-next">
              ${nl ? 'Volgende betaaldatum' : 'Next billing date'}:
              ${_fmtDate(sub.next_billing_date, lang)}
            </div>` : ''}
        </div>
        <div class="account-plan-actions">
          <a href="pricing.html" class="btn btn-ghost">
            ${nl ? 'Plan wijzigen →' : 'Change plan →'}
          </a>
          ${paid ? `
            <button class="btn btn-danger-ghost"
                    onclick="AccountModule.handleCancelSubscription('${lang}')">
              ${nl ? 'Abonnement opzeggen' : 'Cancel subscription'}
            </button>` : ''}
        </div>
      </div>`;
  }

  function renderPaymentsSection(payments, lang) {
    const nl = lang !== 'en';
    const statusLabel = {
      paid:     nl ? '✓ Betaald'        : '✓ Paid',
      pending:  nl ? '⏳ In behandeling' : '⏳ Pending',
      failed:   nl ? '✕ Mislukt'        : '✕ Failed',
      refunded: nl ? '↩ Terugbetaald'   : '↩ Refunded'
    };

    return `
      <div class="account-section">
        <div class="account-section-head">
          <h3 class="account-section-title">
            ${nl ? 'Factuurhistorie' : 'Payment history'}
          </h3>
          ${payments.length > 0 ? `
            <button class="btn btn-ghost btn-sm"
                    onclick="AccountModule.handleExportCSV('${lang}')">
              ↓ ${nl ? 'CSV exporteren' : 'Export CSV'}
            </button>` : ''}
        </div>
        ${payments.length === 0
          ? `<p class="account-empty">
               ${nl ? 'Nog geen betalingen gevonden.' : 'No payments found yet.'}
             </p>`
          : `<div class="payments-table-wrap">
               <table class="payments-table">
                 <thead><tr>
                   <th>${nl ? 'Datum' : 'Date'}</th>
                   <th>${nl ? 'Omschrijving' : 'Description'}</th>
                   <th>${nl ? 'Bedrag' : 'Amount'}</th>
                   <th>Status</th>
                 </tr></thead>
                 <tbody>
                   ${payments.map(p => `
                     <tr>
                       <td>${_fmtDate(p.paid_at, lang)}</td>
                       <td>${_esc(p.description || '—')}</td>
                       <td>€${Number(p.amount).toFixed(2)}</td>
                       <td><span class="payment-status payment-status--${_esc(p.status)}">
                         ${statusLabel[p.status] || _esc(p.status)}
                       </span></td>
                     </tr>`).join('')}
                 </tbody>
               </table>
             </div>`}
      </div>`;
  }

  function renderDeleteSection(lang) {
    const nl   = lang !== 'en';
    const word = nl ? 'VERWIJDER' : 'DELETE';
    return `
      <div class="account-section account-section--danger">
        <h3 class="account-section-title account-section-title--danger">
          ${nl ? 'Account verwijderen' : 'Delete account'}
        </h3>
        <p class="account-warning">
          ${nl
            ? 'Deze actie is permanent. Al je gegevens worden binnen 30 dagen verwijderd.'
            : 'This action is permanent. All your data will be deleted within 30 days.'}
        </p>
        <div class="form-group">
          <label class="form-label">
            ${nl
              ? `Typ <strong>${word}</strong> ter bevestiging`
              : `Type <strong>${word}</strong> to confirm`}
          </label>
          <input type="text" id="acc-delete-confirm" class="form-input"
                 placeholder="${word}" maxlength="20" autocomplete="off">
        </div>
        <button class="btn btn-danger"
                onclick="AccountModule.handleDeleteAccount('${word}','${lang}')">
          ${nl ? 'Account permanent verwijderen' : 'Permanently delete account'}
        </button>
      </div>`;
  }

  // ── HOOFDFUNCTIE ──────────────────────────────────────────────────────

  async function renderAccountScreen(containerId, lang = 'nl') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const nl = lang !== 'en';
    el.innerHTML = `<div class="account-loading">
      ${nl ? 'Accountinstellingen laden…' : 'Loading account settings…'}
    </div>`;

    try {
      const uid = window._currentUserId;
      if (!uid) throw new Error('No user ID');

      const [contact, sub, payments] = await Promise.all([
        loadContactData(uid),
        loadSubscription(uid),
        loadPayments(uid).catch(err => {
          // payments-tabel bestaat mogelijk nog niet; toon dan lege state
          console.warn('[account] loadPayments fout (negeerbaar):', err?.message || err);
          return [];
        })
      ]);

      const plan   = sub?.plan   || 'free';
      const status = sub?.status || 'active';
      el.innerHTML =
        renderContactForm(contact, lang) +
        renderSubscriptionSection(sub, lang) +
        (isPaidPlan(plan, status) ? renderPaymentsSection(payments, lang) : '') +
        renderDeleteSection(lang);

    } catch (err) {
      console.error('[account] renderAccountScreen fout:', err?.message || err);
      notify(nl ? 'Kon accountinstellingen niet laden'
                : 'Could not load account settings');
      el.innerHTML = `<div class="account-error">
        ${nl
          ? 'Kon instellingen niet laden. Probeer het opnieuw.'
          : 'Could not load settings. Please try again.'}
      </div>`;
    }

    // Deterministisch ready-signaal: resolve pas nadat de browser de
    // innerHTML heeft gepaint zodat callers (intl-school _fCtx._plant)
    // de DOM betrouwbaar kunnen lezen zonder setTimeout-race.
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  // ── EVENT HANDLERS ────────────────────────────────────────────────────

  async function handleSaveContact(lang) {
    // Honeypot guard — silently abort if a bot filled the trap.
    // Geen notify, geen console.error: bots krijgen geen signaal terug.
    if (typeof _fCtx !== 'undefined' && _fCtx._guard && !_fCtx._guard('account-save')) return;

    const nl = lang !== 'en';
    try {
      const naam = document.getElementById('acc-naam')?.value?.trim();
      if (!naam) {
        notify(nl ? 'Naam is verplicht' : 'Name is required');
        return;
      }
      const { error } = await db.from('profiles').update({
        naam,
        telefoon:           document.getElementById('acc-telefoon')?.value?.trim() || null,
        taal_voorkeur:      document.getElementById('acc-taal')?.value || 'nl',
        email_notificaties: document.getElementById('acc-notifs')?.checked ?? true
      }).eq('id', window._currentUserId);
      if (error) throw error;
      notify(nl ? 'Gegevens opgeslagen' : 'Changes saved');
    } catch (err) {
      console.error('[account] saveContact fout:', err?.message || err);
      notify(nl ? 'Kon gegevens niet opslaan — probeer opnieuw'
                : 'Could not save changes — please try again');
    }
  }

  async function handleExportCSV(lang) {
    const nl = lang !== 'en';
    try {
      await exportPaymentsCSV(window._currentUserId, lang);
    } catch (err) {
      console.error('[account] exportCSV fout:', err?.message || err);
      notify(nl ? 'Export mislukt — probeer opnieuw'
                : 'Export failed — please try again');
    }
  }

  function handleCancelSubscription(lang) {
    const nl = lang !== 'en';
    notify(nl
      ? 'Neem contact op via hallo@internly.pro om je abonnement op te zeggen'
      : 'Contact hallo@internly.pro to cancel your subscription');
  }

  async function handleDeleteAccount(expectedWord, lang) {
    const nl = lang !== 'en';
    try {
      const input = document.getElementById('acc-delete-confirm')?.value?.trim();
      await requestAccountDeletion(window._currentUserId, input, expectedWord, lang);
    } catch (err) {
      console.error('[account] deleteAccount fout:', err?.message || err);
      notify(nl
        ? 'Verwijdering mislukt — neem contact op via hallo@internly.pro'
        : 'Deletion failed — contact hallo@internly.pro');
    }
  }

  return {
    renderAccountScreen,
    handleSaveContact,
    handleExportCSV,
    handleCancelSubscription,
    handleDeleteAccount
  };
})();

window.AccountModule = AccountModule;
