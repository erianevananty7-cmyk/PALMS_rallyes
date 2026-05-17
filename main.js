const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMeE3Duvbb3REBsXQNJEciuKeUDI-X9bQdgcfJKRaeYpzHB_POSbSA0d65MuxciWrsjw/exec";
const RATE_LIMIT_MS   = 60_000;

const SERVICES = [
  { value: '',                label: '— Choisis un service —' },
  { value: 'Courses',         label: '🛒 Courses' },
  { value: 'Uber Eats',       label: '🍕 Uber Eats' },
  { value: 'Car Wash',        label: '🚗 Car Wash' },
  { value: 'Cigarettes',      label: '🚬 Cigarettes' },
  { value: 'Taxi',            label: '🚕 Taxi' },
  { value: 'Rallye Surprise', label: '🎁 Rallye Surprise' },
  { value: 'Ménage',          label: '🧹 Ménage' },
  { value: 'Vaisselle',       label: '🍽️ Vaisselle' },
];

const MEMBRES = [
  { value: 'Pas de préférence', label: '🎲 Pas de préférence !' },
  { value: 'Eriane',   label: 'Eriane' },
  { value: 'Maxence',  label: 'Maxence' },
  { value: 'Ambre',    label: 'Ambre' },
  { value: 'Martin',   label: 'Martin' },
  { value: 'Noah',     label: 'Noah' },
  { value: 'Thomas',   label: 'Thomas' },
  { value: 'Baptiste', label: 'Baptiste' },
  { value: 'Paul',     label: 'Paul' },
  { value: 'Clara',    label: 'Clara' },
  { value: 'Anna',     label: 'Anna' },
  { value: 'Faustine', label: 'Faustine' },
  { value: 'Léa',      label: 'Léa' },
  { value: 'Marine.G', label: 'Marine.G' },
  { value: 'Marine.P', label: 'Marine.P' },
  { value: 'Justin',   label: 'Justin' },
  { value: 'Loan',     label: 'Loan' },
  { value: 'Kaina',    label: 'Kaina' },
  { value: 'Mansour',  label: 'Mansour' },
  { value: 'Jade',     label: 'Jade' },
  { value: 'Ewan',     label: 'Ewan' },
];

let serviceStatus = null;

history.scrollRestoration = 'manual';

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.getElementById('palms-form').reset();
  document.getElementById('success-modal').classList.add('hidden');

  populateSelect('service', SERVICES);
  populateSelect('membre', MEMBRES);
  generateSlots();
  bindForm();
  bindScrollButtons();
  bindModal();
  bindFadeIn();
  loadStatus();
  setInterval(loadStatus, 60_000);
});

function populateSelect(id, options) {
  const select = document.getElementById(id);
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
}

function generateSlots() {
  const select = document.getElementById('heure');
  let h = 19;
  while (h < 21 || (h === 21)) {
    const opt = document.createElement('option');
    opt.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    opt.textContent = `🕒 ${opt.value}`;
    select.appendChild(opt);
    m += 15;
    if (m >= 60) { m = 0; h++; }
  }
}

function validateForm() {
  const rules = [
    { id: 'prenom',  msg: 'Ton prénom est requis.' },
    { id: 'nom',     msg: 'Ton nom est requis.' },
    { id: 'adresse', msg: "Ton adresse est requise." },
    { id: 'service', msg: 'Choisis un type de service.' },
    { id: 'heure',   msg: 'Choisis un créneau.' },
  ];

  let valid = true;

  rules.forEach(({ id, msg }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById('err-' + id);
    if (!el.value.trim()) {
      showFieldError(el, err, msg);
      valid = false;
    } else {
      clearFieldError(el, err);
    }
  });

  const tel    = document.getElementById('tel');
  const errTel = document.getElementById('err-tel');
  const digits = tel.value.replace(/\D/g, '');
  if (!tel.value.trim()) {
    showFieldError(tel, errTel, 'Ton numéro de téléphone est requis.');
    valid = false;
  } else if (digits.length < 10) {
    showFieldError(tel, errTel, 'Numéro invalide — ex : 06 12 34 56 78.');
    valid = false;
  } else {
    clearFieldError(tel, errTel);
  }

  return valid;
}

function showFieldError(el, errEl, msg) {
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
  el.style.borderColor = '#FF6B6B';
}

function clearFieldError(el, errEl) {
  errEl.classList.add('hidden');
  el.style.borderColor = '';
}

function bindForm() {
  ['prenom', 'nom', 'tel', 'adresse', 'service', 'heure'].forEach(id => {
    const el  = document.getElementById(id);
    const err = document.getElementById('err-' + id);
    el.addEventListener('input',  () => clearFieldError(el, err));
    el.addEventListener('change', () => clearFieldError(el, err));
  });

  document.getElementById('palms-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submit-btn');

    if (serviceStatus === 'closed') {
      showErrorModal('🚫', 'Service fermé', 'Les rallyes ne sont pas disponibles ce soir.<br>Repassez plus tard !');
      return;
    }

    if (!validateForm()) return;

    const lastSubmit = parseInt(localStorage.getItem('palms_last_submit') || '0', 10);
    if (Date.now() - lastSubmit < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastSubmit)) / 1000);
      showErrorModal('⏳', 'Pas si vite !', `Tu viens d'envoyer une demande.<br>Réessaie dans ${remaining} seconde${remaining > 1 ? 's' : ''}.`);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin align-middle mr-1.5"></span>Envoi en cours…`;

    const payload = {
      prenom:    document.getElementById('prenom').value.trim(),
      nom:       document.getElementById('nom').value.trim(),
      telephone: document.getElementById('tel').value.trim(),
      adresse:   document.getElementById('adresse').value.trim(),
      service:   document.getElementById('service').value,
      heure:     document.getElementById('heure').value,
      membre:    document.getElementById('membre').value,
      details:   document.getElementById('details').value.trim(),
    };

    try {
      const params = new URLSearchParams({
        action:    'submit',
        prenom:    payload.prenom,
        nom:       payload.nom,
        telephone: payload.telephone,
        adresse:   payload.adresse,
        service:   payload.service,
        heure:     payload.heure,
        membre:    payload.membre,
        details:   payload.details,
      });

      const res  = await fetch(`${APPS_SCRIPT_URL}?${params}`);
      const data = await res.json();

      if (data.status !== 'ok') throw new Error('Apps Script error');

      localStorage.setItem('palms_last_submit', Date.now().toString());
      e.target.reset();
      document.getElementById('success-modal').classList.remove('hidden');

    } catch (err) {
      console.error(err);
      showErrorModal('😕', 'Une erreur est survenue', 'Réessaie ou contacte-nous<br>directement sur Instagram.');

    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Envoyer ma demande 🐊';
    }
  });
}

function bindScrollButtons() {
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.scrollTo)
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bindModal() {
  const modal = document.getElementById('success-modal');
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-ok').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  const errorModal = document.getElementById('error-modal');
  document.getElementById('btn-error-close').addEventListener('click', closeErrorModal);
  document.getElementById('btn-error-ok').addEventListener('click', closeErrorModal);
  errorModal.addEventListener('click', e => { if (e.target === errorModal) closeErrorModal(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeErrorModal(); }
  });
}

function closeModal() {
  document.getElementById('success-modal').classList.add('hidden');
}

function showErrorModal(emoji, title, text) {
  document.getElementById('error-modal-emoji').textContent = emoji;
  document.getElementById('error-modal-title').textContent = title;
  document.getElementById('error-modal-text').innerHTML   = text;
  const inner = document.getElementById('error-modal-inner');
  inner.classList.remove('animate-pop');
  void inner.offsetWidth;
  inner.classList.add('animate-pop');
  document.getElementById('error-modal').classList.remove('hidden');
}

function closeErrorModal() {
  document.getElementById('error-modal').classList.add('hidden');
}

async function loadStatus() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=status`);
    if (!res.ok) return;
    const data = await res.json();
    if (!['open', 'closed'].includes(data.status)) return;

    serviceStatus = data.status;
    const isOpen = data.status === 'open';
    const banner = document.getElementById('status-banner');
    const dot    = document.getElementById('status-dot');
    const text   = document.getElementById('status-text');

    banner.className = isOpen
      ? 'absolute left-4 sm:left-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full border bg-p-green/10 border-p-green/30 text-[#276b2c]'
      : 'absolute left-4 sm:left-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full border bg-p-coral/10 border-p-coral/30 text-p-coral';

    dot.className = isOpen
      ? 'w-2 h-2 rounded-full flex-shrink-0 bg-p-green animate-pulse'
      : 'w-2 h-2 rounded-full flex-shrink-0 bg-p-coral';

    text.textContent = isOpen ? 'Rallyes disponibles' : 'Rallyes indisponibles';
  } catch {
    // Bandeau masqué si le statut est inaccessible
  }
}

function bindFadeIn() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('opacity-0', 'translate-y-7');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-fade]').forEach(el => observer.observe(el));
}
