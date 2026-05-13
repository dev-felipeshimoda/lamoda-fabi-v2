// vendas/vendas.js — Modulo de Vendas VE27
// - Visualizacao em tempo real via Firestore (collection `vendas_ve27`)
// - Importador xlsx (admin) que parseia client-side e escreve em Firestore
// - Filtros (marca, escritorio, cluster, status, busca)

import { requireAuth } from "../shared/auth-gate.js";
import { signOut }     from "../shared/auth.js";
import { db, storage } from "../shared/firebase.js";
import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  ref as storageRef, uploadBytes
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

// ---------- Constantes ----------
const COL_MAP = {
  'Cod Marca':              'marca',
  'Representante':          'escritorio',
  'Cliente':                'razao',
  'Cidade':                 'cidade',
  'Class. Clusterização':   'cluster',
  'Meta R$':                'meta',
  'Venda R$':               'venda',
  'Status Compra':          'statusCompra',
  'Status Agendamento':     'statusAg',
  'Semana agendamento':     'semana'
};

const VENDAS_COL  = 'vendas_ve27';
const UPLOADS_COL = 'vendas_ve27_uploads';

// ---------- Estado ----------
const state = {
  user:    null,
  records: [],
  filters: { marca: '', escritorio: '', cluster: '', statusClass: '', razao: '' },
  unsubscribe: null
};

// ---------- Boot ----------
const $app    = document.getElementById('app');
const tplPage = document.getElementById('tpl-page');
const tplProgress = document.getElementById('tpl-progress');

requireAuth((user) => {
  state.user = user;
  $app.replaceChildren(tplPage.content.cloneNode(true));
  bindUI();
  // No MVP, qualquer logado pode importar (admin role). Mostra ferramentas.
  $app.querySelector('[data-admin-tools]').style.display = 'flex';
  startSync();
});

// ---------- Bindings ----------
function bindUI() {
  $app.querySelector('[data-action="signout"]').addEventListener('click', async () => {
    await signOut();
    window.location.href = '../';
  });

  const $fileInput = $app.querySelector('[data-file-input]');
  $fileInput.addEventListener('change', handleFileSelect);

  $app.querySelector('[data-action="clear-all"]').addEventListener('click', confirmClearAll);

  // Filtros
  for (const key of Object.keys(state.filters)) {
    const el = $app.querySelector(`[data-filter="${key}"]`);
    if (!el) continue;
    el.addEventListener('input', (e) => {
      state.filters[key] = e.target.value.toLowerCase().trim();
      render();
    });
  }
}

// ---------- Sincronizacao live ----------
function startSync() {
  setSyncBadge('loading', '⟳ carregando…');
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = onSnapshot(
    collection(db, VENDAS_COL),
    (snap) => {
      state.records = snap.docs.map((d) => d.data());
      setSyncBadge('ok', `✓ ${state.records.length} registros`);
      render();
    },
    (err) => {
      console.error('onSnapshot error', err);
      setSyncBadge('err', `✗ ${err.code || 'erro'}`);
    }
  );
}

function setSyncBadge(state_, text) {
  const $b = $app.querySelector('[data-sync-badge]');
  if (!$b) return;
  $b.className = `sync-badge ${state_}`;
  $b.textContent = text;
}

// ---------- Importacao xlsx ----------
async function handleFileSelect(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';  // reset
  if (!files.length) return;

  const progress = openProgressModal('Importando planilha(s)');
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      progress.title(`Importando ${i + 1}/${files.length}: ${f.name}`);
      progress.text('Lendo planilha…');
      progress.bar(0);

      const buf = await f.arrayBuffer();
      const rows = parseXlsx(buf);
      if (!rows.length) throw new Error(`Aba "Base" vazia ou cabeçalhos desconhecidos em ${f.name}`);

      progress.text(`Importando ${rows.length} linhas…`);

      const uploadId = await importRows(rows, f, (done, total) => {
        progress.bar((done / total) * 100);
        progress.detail(`${done} / ${total}`);
      });

      // Upload do xlsx original como backup
      progress.text('Salvando backup do xlsx…');
      try {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const path = `backups/vendas_ve27/${ts}_${f.name}`;
        await uploadBytes(storageRef(storage, path), f);
        await setDoc(doc(db, UPLOADS_COL, uploadId), { storagePath: path }, { merge: true });
      } catch (err) {
        console.warn('Backup xlsx falhou:', err);
        // Nao bloqueia — registros ja foram importados.
      }
    }
    progress.close();
  } catch (err) {
    console.error(err);
    progress.error(err.message || String(err));
  }
}

function parseXlsx(arrayBuffer) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS não carregou (verifique CDN)');
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  // Procura aba "Base" case-insensitive; fallback pra primeira aba.
  let sheetName = wb.SheetNames.find((n) => n.toLowerCase() === 'base') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });

  const records = [];
  for (const row of raw) {
    const rec = {};
    for (const [header, field] of Object.entries(COL_MAP)) {
      if (row[header] !== undefined) rec[field] = row[header];
    }
    // Filtra linhas sem cliente (planilhas tem cabeçalhos extras)
    if (!rec.razao || typeof rec.razao !== 'string') continue;
    records.push(normalize(rec));
  }
  return records;
}

function normalize(r) {
  const meta  = toNumber(r.meta);
  const venda = toNumber(r.venda);
  const atingimentoPct = meta > 0 ? venda / meta : 0;
  const variacao = venda - meta;
  return {
    marca:        String(r.marca || '').trim() || null,
    escritorio:   String(r.escritorio || '').trim() || null,
    razao:        String(r.razao || '').trim(),
    cidade:       String(r.cidade || '').trim() || null,
    cluster:      String(r.cluster || '').trim() || null,
    meta, venda,
    statusCompra: String(r.statusCompra || '').trim() || null,
    statusAg:     String(r.statusAg || '').trim() || null,
    semana:       String(r.semana || '').trim() || null,
    atingimentoPct,
    variacao,
    statusClass:  classifyStatus(r, meta, venda)
  };
}

function toNumber(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  // Excel as ja deve trazer numero, mas se vier string:
  const s = String(v).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function classifyStatus(r, meta, venda) {
  const statusAg = String(r.statusAg || '').toLowerCase();
  const statusCompra = String(r.statusCompra || '').toLowerCase();
  if (statusAg.includes('desativado')) return 'desativado';
  if (statusCompra.includes('não comprou') || statusCompra.includes('nao comprou')) return 'nao_comprou';
  if (meta > 0 && venda >= meta) return 'atingiu';
  if (venda > 0) return 'abaixo';
  return 'outros';
}

function clienteId(marca, razao) {
  const slug = `${marca || 'sem-marca'}_${razao || 'sem-razao'}`
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return slug || 'sem-id';
}

async function importRows(rows, file, onProgress) {
  // 1) Cria doc de upload em vendas_ve27_uploads
  const uploadId = doc(collection(db, UPLOADS_COL)).id;
  await setDoc(doc(db, UPLOADS_COL, uploadId), {
    filename:     file.name,
    marca:        rows[0]?.marca || null,
    uploadedBy:   state.user.uid,
    uploadedAt:   serverTimestamp(),
    rowsTotal:    rows.length,
    rowsImported: 0,
    status:       'pending'
  });

  // 2) Escreve em batches de 500
  const BATCH_SIZE = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = rows.slice(i, i + BATCH_SIZE);
    for (const rec of chunk) {
      const id = clienteId(rec.marca, rec.razao);
      batch.set(doc(db, VENDAS_COL, id), {
        ...rec,
        importedFrom: uploadId,
        importedAt:   serverTimestamp()
      });
    }
    await batch.commit();
    written += chunk.length;
    onProgress(written, rows.length);
  }

  await setDoc(doc(db, UPLOADS_COL, uploadId), {
    rowsImported: written,
    status:       'imported'
  }, { merge: true });

  return uploadId;
}

// ---------- Limpar tudo ----------
async function confirmClearAll() {
  const n = state.records.length;
  if (!confirm(`Apagar TODOS os ${n} registros de vendas_ve27?\n\nIsso não apaga os xlsx de backup no Storage nem o histórico de uploads.`)) return;

  const progress = openProgressModal('Limpando dados');
  try {
    progress.text(`Buscando documentos…`);
    const snap = await getDocs(collection(db, VENDAS_COL));
    const ids = snap.docs.map((d) => d.id);
    progress.text(`Apagando ${ids.length} registros…`);

    const BATCH_SIZE = 500;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      for (const id of ids.slice(i, i + BATCH_SIZE)) {
        batch.delete(doc(db, VENDAS_COL, id));
      }
      await batch.commit();
      progress.bar(((i + BATCH_SIZE) / ids.length) * 100);
    }
    progress.close();
  } catch (err) {
    console.error(err);
    progress.error(err.message || String(err));
  }
}

// ---------- Render ----------
function render() {
  populateFilterOptions();
  const filtered = applyFilters(state.records);
  renderKpis(filtered);
  renderTable(filtered);
}

function populateFilterOptions() {
  const fields = ['marca', 'escritorio', 'cluster'];
  for (const f of fields) {
    const $sel = $app.querySelector(`[data-filter="${f}"]`);
    if (!$sel) continue;
    const current = $sel.value;
    const opts = Array.from(new Set(state.records.map((r) => r[f]).filter(Boolean))).sort();
    $sel.innerHTML = '<option value="">' + (f === 'marca' ? 'Todas' : 'Todos') + '</option>';
    for (const v of opts) {
      const o = document.createElement('option');
      o.value = v.toLowerCase();
      o.textContent = v;
      $sel.appendChild(o);
    }
    if (opts.map((v) => v.toLowerCase()).includes(current)) $sel.value = current;
  }
}

function applyFilters(records) {
  return records.filter((r) => {
    if (state.filters.marca       && (r.marca       || '').toLowerCase() !== state.filters.marca)        return false;
    if (state.filters.escritorio  && (r.escritorio  || '').toLowerCase() !== state.filters.escritorio)   return false;
    if (state.filters.cluster     && (r.cluster     || '').toLowerCase() !== state.filters.cluster)      return false;
    if (state.filters.statusClass && r.statusClass !== state.filters.statusClass)                        return false;
    if (state.filters.razao       && !(r.razao || '').toLowerCase().includes(state.filters.razao))       return false;
    return true;
  });
}

function renderKpis(filtered) {
  const meta  = filtered.reduce((s, r) => s + (r.meta  || 0), 0);
  const venda = filtered.reduce((s, r) => s + (r.venda || 0), 0);
  const ating = meta > 0 ? venda / meta : 0;
  $app.querySelector('[data-kpi="meta"]').textContent     = fmtBRL(meta);
  $app.querySelector('[data-kpi="venda"]').textContent    = fmtBRL(venda);
  $app.querySelector('[data-kpi="atingimento"]').textContent = fmtPct(ating);
  $app.querySelector('[data-kpi="clientes"]').textContent = filtered.length.toString();
}

const PAGE_SIZE = 200;

function renderTable(filtered) {
  const $rows  = $app.querySelector('[data-rows]');
  const $count = $app.querySelector('[data-rows-count]');
  const $page  = $app.querySelector('[data-rows-page]');

  if (!filtered.length) {
    $rows.innerHTML = '<tr><td colspan="9"><div class="empty">Nenhum registro encontrado. Importe uma planilha pra começar.</div></td></tr>';
    $count.textContent = '0 clientes';
    $page.textContent = '';
    return;
  }

  // Ordena por atingimentoPct desc, depois por venda desc
  const sorted = [...filtered].sort((a, b) => (b.atingimentoPct - a.atingimentoPct) || (b.venda - a.venda));
  const slice = sorted.slice(0, PAGE_SIZE);

  $rows.innerHTML = slice.map((r) => `
    <tr>
      <td>${esc(r.marca || '—')}</td>
      <td>${esc(r.razao)}</td>
      <td>${esc(r.cidade || '—')}</td>
      <td>${esc(r.cluster || '—')}</td>
      <td class="num">${fmtBRL(r.meta || 0)}</td>
      <td class="num">${fmtBRL(r.venda || 0)}</td>
      <td class="num">
        <span class="atingimento-bar"><span style="width: ${Math.min(100, (r.atingimentoPct || 0) * 100)}%"></span></span>
        ${fmtPct(r.atingimentoPct || 0)}
      </td>
      <td><span class="status-pill ${r.statusClass}">${statusLabel(r.statusClass)}</span></td>
      <td>${esc(r.semana || '—')}</td>
    </tr>
  `).join('');

  $count.textContent = `${filtered.length} clientes`;
  $page.textContent  = filtered.length > PAGE_SIZE ? `mostrando top ${PAGE_SIZE}` : '';
}

function statusLabel(c) {
  return ({
    atingiu:     'Atingiu',
    abaixo:      'Abaixo',
    nao_comprou: 'Não comprou',
    desativado:  'Desativado',
    outros:      'Outros'
  })[c] || c;
}

// ---------- Helpers ----------
function fmtBRL(n) {
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(p) {
  return ((p || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Modal de progresso ----------
function openProgressModal(title) {
  const node = tplProgress.content.cloneNode(true);
  document.body.appendChild(node);
  const $backdrop = document.body.querySelector('.modal-backdrop');
  const $title    = $backdrop.querySelector('[data-progress-title]');
  const $text     = $backdrop.querySelector('[data-progress-text]');
  const $detail   = $backdrop.querySelector('[data-progress-detail]');
  const $bar      = $backdrop.querySelector('[data-progress-bar]');
  $title.textContent = title;

  return {
    title:  (t) => { $title.textContent = t; },
    text:   (t) => { $text.textContent = t; },
    detail: (t) => { $detail.textContent = t; },
    bar:    (pct) => { $bar.style.width = pct + '%'; },
    error:  (msg) => {
      $text.innerHTML = `<span style="color: var(--danger)">Erro: ${esc(msg)}</span>`;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn--ghost';
      closeBtn.textContent = 'Fechar';
      closeBtn.style.marginTop = '12px';
      closeBtn.onclick = () => $backdrop.remove();
      $backdrop.querySelector('.card').appendChild(closeBtn);
    },
    close: () => { setTimeout(() => $backdrop.remove(), 400); }
  };
}
