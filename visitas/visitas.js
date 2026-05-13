// visitas/visitas.js — Modulo de Checklist Pos-Vendas
// Dashboard + Form + Modal de detalhes. Tudo numa SPA simples com state.view.

import { requireAuth } from "../shared/auth-gate.js";
import { signOut }     from "../shared/auth.js";
import { db }          from "../shared/firebase.js";
import {
  collection, doc, addDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const VISITAS_COL = 'visitas';

const state = {
  user:    null,
  view:    'dashboard',  // 'dashboard' | 'form'
  records: [],
  filters: { regiao: '', busca: '', ordem: 'recent' },
  chips:   new Set(),
  unsubscribe: null
};

const $app = document.getElementById('app');
const tpls = {
  dashboard: document.getElementById('tpl-dashboard'),
  form:      document.getElementById('tpl-form'),
  detail:    document.getElementById('tpl-detail')
};

requireAuth((user) => {
  state.user = user;
  startSync();
  setView('dashboard');
});

// ---------- Roteamento de views ----------
function setView(name) {
  state.view = name;
  $app.replaceChildren(tpls[name].content.cloneNode(true));
  if (name === 'dashboard') bindDashboard();
  if (name === 'form')      bindForm();
}

// ---------- Sincronizacao live ----------
function startSync() {
  if (state.unsubscribe) state.unsubscribe();
  const q = query(collection(db, VISITAS_COL), orderBy('createdAt', 'desc'));
  state.unsubscribe = onSnapshot(
    q,
    (snap) => {
      state.records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (state.view === 'dashboard') renderDashboard();
    },
    (err) => console.error('onSnapshot visitas', err)
  );
}

// ---------- DASHBOARD ----------
function bindDashboard() {
  $app.querySelector('[data-action="signout"]').addEventListener('click', async () => {
    await signOut(); window.location.href = '../';
  });
  $app.querySelector('[data-action="nova"]').addEventListener('click', () => setView('form'));

  for (const key of Object.keys(state.filters)) {
    const el = $app.querySelector(`[data-filter="${key}"]`);
    if (!el) continue;
    el.value = state.filters[key];
    el.addEventListener('input', (e) => {
      state.filters[key] = e.target.value.toLowerCase().trim();
      renderDashboard();
    });
  }

  $app.querySelectorAll('[data-chip]').forEach((b) => {
    const key = b.getAttribute('data-chip');
    if (state.chips.has(key)) b.classList.add('active');
    b.addEventListener('click', () => {
      state.chips.has(key) ? state.chips.delete(key) : state.chips.add(key);
      b.classList.toggle('active');
      renderDashboard();
    });
  });

  renderDashboard();
}

function applyFilters(records) {
  let out = records;

  if (state.filters.regiao) {
    out = out.filter((r) => (r.identificacao?.regiao || '').toLowerCase() === state.filters.regiao);
  }
  if (state.filters.busca) {
    const q = state.filters.busca;
    out = out.filter((r) =>
      (r.identificacao?.loja || '').toLowerCase().includes(q) ||
      (r.identificacao?.cidade || '').toLowerCase().includes(q)
    );
  }
  if (state.chips.size) {
    out = out.filter((r) => Array.from(state.chips).every((c) => (r.tags || []).includes(c)));
  }

  if (state.filters.ordem === 'old') {
    out = [...out].reverse();
  } else if (state.filters.ordem === 'alpha') {
    out = [...out].sort((a, b) => (a.identificacao?.loja || '').localeCompare(b.identificacao?.loja || ''));
  }
  return out;
}

function renderDashboard() {
  // Stats
  const total = state.records.length;
  const regioes = new Set(state.records.map((r) => r.identificacao?.regiao).filter(Boolean));
  const comApp = state.records.filter((r) => r.alinhamento?.appInstalado).length;
  const comReclamacao = state.records.filter((r) => (r.relacionamento?.reclamacoes || []).length > 0).length;

  setText('[data-stat="total"]', total.toString());
  setText('[data-stat="regioes"]', regioes.size.toString());
  setText('[data-stat="comApp"]', total ? `${Math.round((comApp / total) * 100)}%` : '—');
  setText('[data-stat="comReclamacao"]', comReclamacao.toString());

  // Sync badge: ok
  const $badge = $app.querySelector('[data-sync-badge]');
  if ($badge) { $badge.className = 'sync-badge ok'; $badge.textContent = `✓ ${total} visitas`; }

  // Populate region filter options dynamically
  const $regSel = $app.querySelector('[data-filter="regiao"]');
  if ($regSel) {
    const current = $regSel.value;
    const regs = Array.from(regioes).sort();
    $regSel.innerHTML = '<option value="">Todas</option>' + regs.map((r) => `<option value="${esc(r.toLowerCase())}">${esc(r)}</option>`).join('');
    if (regs.map((r) => r.toLowerCase()).includes(current)) $regSel.value = current;
  }

  // Tabela
  const filtered = applyFilters(state.records);
  const $rows = $app.querySelector('[data-rows]');
  if (!filtered.length) {
    $rows.innerHTML = '<tr><td colspan="9"><div class="empty">Nenhuma visita encontrada.</div></td></tr>';
  } else {
    $rows.innerHTML = filtered.map((r) => rowHtml(r)).join('');
    $rows.querySelectorAll('tr[data-visit-id]').forEach((tr) => {
      tr.addEventListener('click', () => openDetail(tr.getAttribute('data-visit-id')));
    });
  }

  setText('[data-rows-count]', `${filtered.length} ${filtered.length === 1 ? 'visita' : 'visitas'}`);
}

function rowHtml(r) {
  const id = r.identificacao || {};
  const vm = r.visual?.vm || '—';
  const vendas = r.relacionamento?.vendas || '—';
  const appInst = r.alinhamento?.appInstalado;
  const tags = r.tags || [];
  const tagsHtml = tags.slice(0, 3).map((t) => {
    const cls = (t === 'com_reclamacao' || t === 'app_nao_instalado' || t === 'vm_ruim') ? 'danger' :
                (t === 'sem_sinalizador' || t === 'reclama_preco' || t === 'vendas_ruins') ? 'warn' : '';
    return `<span class="tag ${cls}">${esc(tagLabel(t))}</span>`;
  }).join('') + (tags.length > 3 ? `<span class="tag">+${tags.length - 3}</span>` : '');

  return `
    <tr data-visit-id="${esc(r.id)}">
      <td>${esc(id.data || fmtDate(r.createdAt) || '—')}</td>
      <td>${esc(id.loja || '—')}</td>
      <td>${esc(id.cidade || '—')}</td>
      <td>${esc(id.regiao || '—')}</td>
      <td>${vm !== '—' ? `<span class="qual-pill ${esc(vm)}">${esc(vm)}</span>` : '—'}</td>
      <td>${vendas !== '—' ? `<span class="qual-pill ${esc(vendas)}">${esc(vendas)}</span>` : '—'}</td>
      <td>${appInst === true ? '✓' : appInst === false ? '✗' : '—'}</td>
      <td><div class="tag-list">${tagsHtml || '<span class="dim">—</span>'}</div></td>
      <td><span class="dim">›</span></td>
    </tr>
  `;
}

function tagLabel(t) {
  return ({
    com_reclamacao: 'Reclamação',
    sem_sinalizador: 'Sem sinaliz.',
    app_nao_instalado: 'Sem app',
    vm_ruim: 'VM ruim',
    vendas_ruins: 'Vendas ruins',
    reclama_preco: 'Preço'
  })[t] || t;
}

// ---------- FORM ----------
function bindForm() {
  $app.querySelector('[data-action="signout"]').addEventListener('click', async () => {
    await signOut(); window.location.href = '../';
  });
  $app.querySelectorAll('[data-action="back"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    setView('dashboard');
  }));

  const $form = $app.querySelector('[data-form]');
  // Preenche data default = hoje
  $form.querySelector('input[name="i_data"]').valueAsDate = new Date();

  $form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const $submit = $form.querySelector('[data-submit]');
    const $status = $form.querySelector('[data-form-status]');
    $submit.disabled = true;
    $status.textContent = 'Salvando…';
    $status.className = 'form-status muted';

    try {
      const data = collectFormData($form);
      const tags = computeTags(data);
      await addDoc(collection(db, VISITAS_COL), {
        ...data,
        tags,
        createdBy: state.user.uid,
        createdAt: serverTimestamp()
      });
      $status.textContent = '✓ Visita salva.';
      $status.className = 'form-status ok';
      setTimeout(() => setView('dashboard'), 600);
    } catch (err) {
      console.error(err);
      $status.textContent = `Erro ao salvar: ${err.message || err}`;
      $status.className = 'form-status err';
      $submit.disabled = false;
    }
  });
}

function collectFormData(form) {
  const fd = new FormData(form);
  // Helper pra coletar multiplos checkboxes com mesmo name
  const multi = (name) => fd.getAll(name);

  return {
    identificacao: {
      data:          fd.get('i_data')          || null,
      supervisora:   fd.get('i_supervisora')   || null,
      loja:          fd.get('i_loja')          || null,
      cidade:        fd.get('i_cidade')        || null,
      regiao:        fd.get('i_regiao')        || null,
      representante: fd.get('i_representante') || null
    },
    visual: {
      vm:               fd.get('v_vm')        || null,
      exposicao:        fd.get('v_exposicao') || null,
      marcasSinalizador: splitCSV(fd.get('v_sinalizadores'))
    },
    relacionamento: {
      vendas:              fd.get('r_vendas')        || null,
      comportamentoCliente: fd.get('r_comportamento') || null,
      reclamacoes:         multi('r_reclamacoes')
    },
    diagnostico: {
      maisPerformou:     fd.get('d_mais')   || null,
      menosVenderam:     fd.get('d_menos')  || null,
      opiniaoPrecos:     fd.get('d_precos') || null,
      dificuldadeMix:    fd.get('d_mix')    || null,
      performanceEquipe: fd.get('d_equipe') || null
    },
    alinhamento: {
      multiplicaReforcado:    fd.get('a_multiplica') === 'on',
      appInstalado:           fd.get('a_app')        === 'on',
      indicadoresDiscutidos:  multi('a_indicadores'),
      acoesImplantadas:       fd.get('a_acoes') || null
    },
    fotos: []
  };
}

function splitCSV(s) {
  if (!s) return [];
  return String(s).split(',').map((x) => x.trim()).filter(Boolean);
}

function computeTags(d) {
  const tags = [];
  if ((d.relacionamento?.reclamacoes || []).length > 0) tags.push('com_reclamacao');
  if ((d.visual?.marcasSinalizador || []).length === 0) tags.push('sem_sinalizador');
  if (d.alinhamento?.appInstalado === false)            tags.push('app_nao_instalado');
  if (['ruim', 'pessimo'].includes(d.visual?.vm))       tags.push('vm_ruim');
  if (['ruim', 'pessimo'].includes(d.relacionamento?.vendas)) tags.push('vendas_ruins');
  if ((d.relacionamento?.reclamacoes || []).includes('preco')) tags.push('reclama_preco');
  return tags;
}

// ---------- MODAL DE DETALHES ----------
function openDetail(id) {
  const r = state.records.find((x) => x.id === id);
  if (!r) return;
  document.body.appendChild(tpls.detail.content.cloneNode(true));
  const $bd = document.body.querySelector('[data-detail-backdrop]');

  $bd.querySelector('[data-detail-title]').textContent = r.identificacao?.loja || 'Visita';
  $bd.querySelector('[data-detail-body]').innerHTML = detailHtml(r);
  $bd.querySelector('[data-action="close-detail"]').addEventListener('click', () => $bd.remove());
  $bd.addEventListener('click', (e) => { if (e.target === $bd) $bd.remove(); });

  $bd.querySelector('[data-action="delete-visit"]').addEventListener('click', async () => {
    if (!confirm(`Excluir esta visita à loja "${r.identificacao?.loja}"?`)) return;
    try {
      await deleteDoc(doc(db, VISITAS_COL, id));
      $bd.remove();
    } catch (err) {
      alert(`Erro ao excluir: ${err.message || err}`);
    }
  });
}

function detailHtml(r) {
  const id = r.identificacao || {};
  const v  = r.visual         || {};
  const re = r.relacionamento || {};
  const d  = r.diagnostico    || {};
  const a  = r.alinhamento    || {};

  return `
    <div class="detail-section">
      <h3>Identificação</h3>
      ${detailRow('Data', id.data)}
      ${detailRow('Supervisora', id.supervisora)}
      ${detailRow('Loja', id.loja)}
      ${detailRow('Cidade', id.cidade)}
      ${detailRow('Região', id.regiao)}
      ${detailRow('Representante', id.representante)}
    </div>

    <div class="detail-section">
      <h3>Visual</h3>
      ${detailRow('VM', v.vm)}
      ${detailRow('Exposição', v.exposicao)}
      ${detailRow('Marcas com sinalizador', (v.marcasSinalizador || []).join(', ') || '—')}
    </div>

    <div class="detail-section">
      <h3>Relacionamento</h3>
      ${detailRow('Vendas', re.vendas)}
      ${detailRow('Comportamento da cliente', re.comportamentoCliente)}
      ${detailRow('Reclamações', (re.reclamacoes || []).map(tagLabel).join(', ') || '—')}
    </div>

    <div class="detail-section">
      <h3>Diagnóstico</h3>
      ${detailRow('Mais performou', d.maisPerformou)}
      ${detailRow('Menos venderam', d.menosVenderam)}
      ${detailRow('Opinião sobre preços', d.opiniaoPrecos)}
      ${detailRow('Dificuldade de mix', d.dificuldadeMix)}
      ${detailRow('Performance da equipe', d.performanceEquipe)}
    </div>

    <div class="detail-section">
      <h3>Alinhamento</h3>
      ${detailRow('Multiplica reforçado', a.multiplicaReforcado ? 'Sim' : 'Não')}
      ${detailRow('App instalado', a.appInstalado ? 'Sim' : 'Não')}
      ${detailRow('Indicadores discutidos', (a.indicadoresDiscutidos || []).join(', ') || '—')}
      ${detailRow('Ações implantadas', a.acoesImplantadas)}
    </div>
  `;
}

function detailRow(label, value) {
  return `<div class="detail-row"><strong>${esc(label)}</strong><span>${esc(value || '—')}</span></div>`;
}

// ---------- Helpers ----------
function setText(sel, text) {
  const el = $app.querySelector(sel);
  if (el) el.textContent = text;
}

function fmtDate(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
