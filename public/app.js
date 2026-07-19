(async () => {
  try {
    const meRes = await fetch(window.DMS_API ? window.DMS_API.url('/api/auth/me') : '/api/auth/me', { cache: 'no-store' });
    const me = await meRes.json().catch(() => ({}));
    if (!me?.user) {
      window.location.replace('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
  } catch (_) {
    // Auth check itself failed (offline/DNS/etc.) — fall through so the normal
    // status polling below reports the real connection error instead of masking it.
  }

  const state = {
    connectionStatus: 'disconnected',
    validRecipients: [],
    hasNameColumn: false,
    media: null, // { filename, mimetype, originalName }
    config: null,
    sendRunning: false,
    lastBatchId: null
  };

  const el = (id) => document.getElementById(id);
  const apiUrl = (path) => (window.DMS_API ? window.DMS_API.url(path) : path);

  async function requestJson(path, options) {
    const res = await fetch(path, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Invalid server response (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  const statusBadge = el('statusBadge');
  const statusDot = el('statusDot');
  const statusText = el('statusText');
  const qrWrap = el('qrWrap');
  const qrImage = el('qrImage');
  const connectedWrap = el('connectedWrap');
  const connectedNumber = el('connectedNumber');
  const waitingWrap = el('waitingWrap');
  const connectionErrorWrap = el('connectionErrorWrap');
  const connectionErrorText = el('connectionErrorText');
  const retryConnectionBtn = el('retryConnectionBtn');
  const logoutBtn = el('logoutBtn');

  const step2 = el('step2');
  const step3 = el('step3');
  const step4 = el('step4');

  const countryCodeInput = el('countryCode');
  const dropzone = el('dropzone');
  const fileInput = el('fileInput');
  const uploadError = el('uploadError');
  const previewWrap = el('previewWrap');
  const validCountEl = el('validCount');
  const invalidCountEl = el('invalidCount');
  const dupCountEl = el('dupCount');
  const totalCountEl = el('totalCount');
  const invalidTableBody = document.querySelector('#invalidTable tbody');
  const contactListList = el('contactListList');
  const saveListBtn = el('saveListBtn');
  const historyList = el('historyList');

  const messageInput = el('messageInput');
  const messagePreview = el('messagePreview');
  const mediaInput = el('mediaInput');
  const mediaInfo = el('mediaInfo');
  const templateList = el('templateList');
  const saveTemplateBtn = el('saveTemplateBtn');

  const sendBtn = el('sendBtn');
  const sendCount = el('sendCount');
  const sendCount2 = el('sendCount2');
  const progressWrap = el('progressWrap');
  const progressBarInner = el('progressBarInner');
  const progressText = el('progressText');
  const sentCountEl = el('sentCount');
  const failedCountEl = el('failedCount');
  const notOnWaCountEl = el('notOnWaCount');
  const cancelBtn = el('cancelBtn');
  const resultsWrap = el('resultsWrap');
  const downloadResults = el('downloadResults');
  el('downloadTemplate').href = apiUrl('/api/template/download');

  // ---------- Step 1: Connection ----------

  let statusInFlight = false;
  async function pollStatus() {
    if (statusInFlight) return;
    statusInFlight = true;
    try {
      const data = await requestJson('/api/status');
      applyStatus(data);
    } catch (err) {
      showConnectionError(err);
    } finally {
      statusInFlight = false;
    }
  }

  function showConnectionError(err) {
    state.connectionStatus = 'error';
    statusDot.className = 'dot error';
    statusText.textContent = 'الخادم غير متاح / Server unavailable';
    qrWrap.classList.add('hidden');
    connectedWrap.classList.add('hidden');
    waitingWrap.classList.add('hidden');
    connectionErrorWrap.classList.remove('hidden');
    const noBackendConfigured = !window.DMS_API?.baseUrl && window.location.hostname.endsWith('.vercel.app');
    connectionErrorText.textContent = noBackendConfigured
      ? 'لم يتم ربط Vercel بخادم DMS الدائم بعد / Vercel is not connected to the DMS backend yet'
      : `تعذر الاتصال بخادم DMS / Cannot reach the DMS server${err?.message ? ` — ${err.message}` : ''}`;
    step2.classList.add('disabled');
    updateSendAvailability();
  }

  function applyStatus(data) {
    state.connectionStatus = data.status;
    statusDot.className = 'dot ' + data.status;

    qrWrap.classList.add('hidden');
    connectedWrap.classList.add('hidden');
    waitingWrap.classList.add('hidden');
    connectionErrorWrap.classList.add('hidden');

    if (data.status === 'connected') {
      statusText.textContent = 'متصل / Connected';
      connectedWrap.classList.remove('hidden');
      connectedNumber.textContent = data.number || '-';
      step2.classList.remove('disabled');
    } else if (data.status === 'qr_pending') {
      statusText.textContent = 'يرجى مسح رمز QR / Please scan the QR code';
      qrWrap.classList.remove('hidden');
      if (data.qr) qrImage.src = data.qr;
      step2.classList.add('disabled');
    } else if (data.status === 'disabled') {
      statusText.textContent = 'خدمة واتساب غير مفعلة / WhatsApp service disabled';
      statusDot.className = 'dot disabled';
      connectionErrorText.textContent =
        'يجب تشغيل DMS على خادم دائم يدعم Chromium والتخزين الدائم / Run DMS on a persistent server with Chromium';
      connectionErrorWrap.classList.remove('hidden');
      step2.classList.add('disabled');
    } else {
      statusText.textContent = 'غير متصل / Disconnected';
      if (data.error) {
        connectionErrorText.textContent = `تعذر بدء واتساب / WhatsApp could not start — ${data.error}`;
        connectionErrorWrap.classList.remove('hidden');
      } else {
        waitingWrap.classList.remove('hidden');
      }
      step2.classList.add('disabled');
    }
    updateSendAvailability();
  }

  retryConnectionBtn.addEventListener('click', () => {
    retryConnectionBtn.disabled = true;
    pollStatus().finally(() => {
      retryConnectionBtn.disabled = false;
    });
  });

  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    try {
      await requestJson('/api/logout', { method: 'POST' });
    } finally {
      logoutBtn.disabled = false;
    }
  });

  async function statusLoop() {
    await pollStatus();
    setTimeout(statusLoop, 2000);
  }
  statusLoop();

  // ---------- Config ----------

  async function loadConfig() {
    try {
      state.config = await requestJson('/api/config');
      if (state.config.defaultCountryCode) countryCodeInput.value = state.config.defaultCountryCode;
    } catch (err) {
      /* fall back to defaults already in the UI */
    }
  }
  loadConfig();

  // ---------- Step 2: Upload ----------

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  async function handleFile(file) {
    uploadError.classList.add('hidden');
    previewWrap.classList.add('hidden');
    state.validRecipients = [];
    step3.classList.add('disabled');
    updateSendAvailability();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('countryCode', countryCodeInput.value || '966');

    try {
      const data = await requestJson('/api/upload', { method: 'POST', body: formData });
      state.validRecipients = data.valid;
      state.hasNameColumn = data.hasNameColumn;

      validCountEl.textContent = data.validCount;
      invalidCountEl.textContent = data.invalidCount;
      dupCountEl.textContent = data.duplicateCount;
      totalCountEl.textContent = data.totalRows;

      invalidTableBody.innerHTML = '';
      data.invalid.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.row}</td><td>${escapeHtml(row.value)}</td><td>${escapeHtml(row.reason)}</td>`;
        invalidTableBody.appendChild(tr);
      });

      previewWrap.classList.remove('hidden');

      if (data.validCount > 0) {
        step3.classList.remove('disabled');
      }
      updateSendAvailability();
      updateMessagePreview();
    } catch (err) {
      uploadError.textContent = err.message || 'تعذر الاتصال بالخادم / Cannot reach server';
      uploadError.classList.remove('hidden');
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Used by both "load a saved contact list" and "retry failed recipients" — both bypass
  // the Excel upload step and hand the recipient list straight to the same state/preview.
  function setRecipients(recipients) {
    state.validRecipients = recipients;
    state.hasNameColumn = recipients.some((r) => r.name);

    uploadError.classList.add('hidden');
    validCountEl.textContent = recipients.length;
    invalidCountEl.textContent = 0;
    dupCountEl.textContent = 0;
    totalCountEl.textContent = recipients.length;
    invalidTableBody.innerHTML = '';
    previewWrap.classList.remove('hidden');

    if (recipients.length > 0) step3.classList.remove('disabled');
    updateSendAvailability();
    updateMessagePreview();
  }

  // ---------- Saved Contact Lists ----------

  async function loadContactLists() {
    try {
      renderContactLists(await requestJson('/api/contact-lists'));
    } catch (err) {
      contactListList.innerHTML = '';
    }
  }

  function renderContactLists(lists) {
    contactListList.innerHTML = '';
    if (!lists.length) {
      const empty = document.createElement('p');
      empty.className = 'template-empty';
      empty.textContent = 'لا توجد قوائم محفوظة بعد / No saved lists yet';
      contactListList.appendChild(empty);
      return;
    }

    lists.forEach((l) => {
      const item = document.createElement('div');
      item.className = 'template-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'template-name';
      nameSpan.textContent = `${l.name} (${l.count})`;
      nameSpan.title = 'اضغط للتحميل / Click to load';
      nameSpan.addEventListener('click', () => setRecipients(l.recipients));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'template-delete';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'حذف / Delete';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeContactList(l.id);
      });

      item.appendChild(nameSpan);
      item.appendChild(deleteBtn);
      contactListList.appendChild(item);
    });
  }

  async function removeContactList(id) {
    try {
      await requestJson(`/api/contact-lists/${id}`, { method: 'DELETE' });
      loadContactLists();
    } catch (err) {
      /* list stays as-is until next reload */
    }
  }

  saveListBtn.addEventListener('click', async () => {
    if (!state.validRecipients.length) {
      alert('لا توجد أرقام صالحة لحفظها / No valid numbers to save');
      return;
    }
    const name = prompt('اسم القائمة / List name:');
    if (!name || !name.trim()) return;

    saveListBtn.disabled = true;
    try {
      await requestJson('/api/contact-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          recipients: state.validRecipients.map((r) => ({ number: r.number, name: r.name }))
        })
      });
      loadContactLists();
    } catch (err) {
      alert('تعذر الاتصال بالخادم / Cannot reach server');
    } finally {
      saveListBtn.disabled = false;
    }
  });

  loadContactLists();

  // ---------- Send History ----------

  async function loadHistory() {
    try {
      renderHistory(await requestJson('/api/send/history'));
    } catch (err) {
      historyList.innerHTML = '';
    }
  }

  function renderHistory(batches) {
    historyList.innerHTML = '';
    if (!batches.length) {
      const empty = document.createElement('p');
      empty.className = 'template-empty';
      empty.textContent = 'لا توجد حملات سابقة بعد / No previous campaigns yet';
      historyList.appendChild(empty);
      return;
    }

    batches.forEach((b) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const date = new Date(b.startedAt).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      item.innerHTML = `
        <div class="history-head">
          <strong>${date}</strong>
          <span class="history-date">${b.total} رقم / numbers</span>
        </div>
        <div class="history-stats">
          <span>✔ <b>${b.sent}</b> تم الإرسال</span>
          <span>✕ <b>${b.failed}</b> فشل</span>
          <span>⦸ <b>${b.notOnWhatsapp}</b> ليس على واتساب</span>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'history-actions';

      const downloadLink = document.createElement('a');
      downloadLink.className = 'btn btn-secondary';
      downloadLink.href = apiUrl(`/api/send/results.xlsx?batchId=${encodeURIComponent(b.batchId)}`);
      downloadLink.textContent = 'تحميل النتائج / Download';
      actions.appendChild(downloadLink);

      if (b.failed > 0) {
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'btn btn-secondary';
        retryBtn.textContent = `إعادة إرسال الفاشلين (${b.failed}) / Retry Failed`;
        retryBtn.addEventListener('click', () => retryFailed(b.batchId));
        actions.appendChild(retryBtn);
      }

      item.appendChild(actions);
      historyList.appendChild(item);
    });
  }

  async function retryFailed(batchId) {
    try {
      const failed = await requestJson(`/api/send/history/${encodeURIComponent(batchId)}/failed`);
      if (!failed.length) {
        alert('لا يوجد أرقام فاشلة لإعادة الإرسال / No failed numbers to retry');
        return;
      }
      setRecipients(failed);
      const step3El = document.getElementById('step3');
      if (step3El) step3El.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      alert('تعذر الاتصال بالخادم / Cannot reach server');
    }
  }

  loadHistory();

  // ---------- Step 3: Message ----------

  messageInput.addEventListener('input', updateMessagePreview);

  function updateMessagePreview() {
    const sample = state.validRecipients.find((r) => r.name)?.name || 'أحمد';
    const text = messageInput.value || '';
    messagePreview.textContent = text.split('{name}').join(sample);
    updateSendAvailability();
    if (messageInput.value.trim() || state.media) {
      step4.classList.remove('disabled');
    } else {
      step4.classList.add('disabled');
    }
  }

  mediaInput.addEventListener('change', async () => {
    state.media = null;
    updateMessagePreview();
    if (!mediaInput.files.length) {
      mediaInfo.textContent = '';
      mediaInfo.classList.add('hidden');
      return;
    }
    const file = mediaInput.files[0];
    const formData = new FormData();
    formData.append('media', file);

    mediaInfo.textContent = 'جارٍ الرفع... / Uploading...';
    mediaInfo.classList.remove('hidden');

    try {
      const data = await requestJson('/api/media/upload', { method: 'POST', body: formData });
      state.media = data;
      mediaInfo.textContent = `تم إرفاق: ${data.originalName} / Attached: ${data.originalName}`;
      updateMessagePreview();
    } catch (err) {
      mediaInfo.textContent =
        err instanceof Error ? err.message : 'تعذر الاتصال بالخادم / Cannot reach server';
      updateMessagePreview();
    }
  });

  // ---------- Message Templates ----------

  async function loadTemplates() {
    try {
      renderTemplates(await requestJson('/api/message-templates'));
    } catch (err) {
      templateList.innerHTML = '';
    }
  }

  function renderTemplates(templates) {
    templateList.innerHTML = '';
    if (!templates.length) {
      const empty = document.createElement('p');
      empty.className = 'template-empty';
      empty.textContent = 'لا توجد قوالب محفوظة بعد / No saved templates yet';
      templateList.appendChild(empty);
      return;
    }

    templates.forEach((t) => {
      const item = document.createElement('div');
      item.className = 'template-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'template-name';
      nameSpan.textContent = t.name;
      nameSpan.title = 'اضغط للتحميل / Click to load';
      nameSpan.addEventListener('click', () => applyTemplate(t));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'template-delete';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'حذف / Delete';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTemplate(t.id);
      });

      item.appendChild(nameSpan);
      item.appendChild(deleteBtn);
      templateList.appendChild(item);
    });
  }

  function applyTemplate(template) {
    messageInput.value = template.message;
    if (template.media) {
      state.media = template.media;
      mediaInfo.textContent = `تم إرفاق: ${template.media.originalName} / Attached: ${template.media.originalName}`;
      mediaInfo.classList.remove('hidden');
    } else {
      state.media = null;
      mediaInfo.textContent = '';
      mediaInfo.classList.add('hidden');
    }
    updateMessagePreview();
  }

  async function removeTemplate(id) {
    try {
      await requestJson(`/api/message-templates/${id}`, { method: 'DELETE' });
      loadTemplates();
    } catch (err) {
      /* list just stays as-is until the next reload */
    }
  }

  saveTemplateBtn.addEventListener('click', async () => {
    if (!messageInput.value.trim()) {
      alert('اكتب نص الرسالة أولاً / Write the message text first');
      return;
    }
    const name = prompt('اسم القالب / Template name:');
    if (!name || !name.trim()) return;

    saveTemplateBtn.disabled = true;
    try {
      await requestJson('/api/message-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message: messageInput.value,
          media: state.media
            ? {
                filename: state.media.filename,
                originalName: state.media.originalName,
                mimetype: state.media.mimetype
              }
            : null
        })
      });
      loadTemplates();
    } catch (err) {
      alert('تعذر الاتصال بالخادم / Cannot reach server');
    } finally {
      saveTemplateBtn.disabled = false;
    }
  });

  loadTemplates();

  // ---------- Step 4: Send ----------

  function updateSendAvailability() {
    const ready =
      state.connectionStatus === 'connected' &&
      state.validRecipients.length > 0 &&
      (messageInput.value.trim() || state.media) &&
      !state.sendRunning;

    sendBtn.disabled = !ready;
    sendCount.textContent = state.validRecipients.length;
    sendCount2.textContent = state.validRecipients.length;
  }

  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true;
    resultsWrap.classList.add('hidden');
    uploadError.classList.add('hidden');

    const payload = {
      recipients: state.validRecipients.map((r) => ({ number: r.number, name: r.name })),
      message: messageInput.value,
      media: state.media ? { filename: state.media.filename } : null
    };

    try {
      const data = await requestJson('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.sendRunning = true;
      state.lastBatchId = data.batchId;
      progressWrap.classList.remove('hidden');
      pollProgress();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'تعذر الاتصال بالخادم / Cannot reach server');
      sendBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', async () => {
    cancelBtn.disabled = true;
    try {
      await requestJson('/api/send/cancel', { method: 'POST' });
    } finally {
      cancelBtn.disabled = false;
    }
  });

  let progressTimer = null;
  let progressInFlight = false;
  function pollProgress() {
    if (progressTimer) clearTimeout(progressTimer);
    const tick = async () => {
      if (progressInFlight) {
        progressTimer = setTimeout(tick, 1500);
        return;
      }
      progressInFlight = true;
      try {
        const p = await requestJson('/api/send/progress');
        renderProgress(p);
        if (!p.running) {
          progressTimer = null;
          state.sendRunning = false;
          resultsWrap.classList.remove('hidden');
          downloadResults.href = apiUrl(`/api/send/results.xlsx?batchId=${encodeURIComponent(p.batchId)}`);
          updateSendAvailability();
          return;
        }
      } catch (err) {
        /* keep retrying on next tick */
      } finally {
        progressInFlight = false;
      }
      progressTimer = setTimeout(tick, 1500);
    };
    tick();
  }

  async function resumeSendProgress() {
    try {
      const p = await requestJson('/api/send/progress');
      if (!p.batchId) return;
      state.lastBatchId = p.batchId;
      state.sendRunning = Boolean(p.running);
      progressWrap.classList.remove('hidden');
      renderProgress(p);
      if (p.running) {
        pollProgress();
      } else {
        resultsWrap.classList.remove('hidden');
        downloadResults.href = apiUrl(`/api/send/results.xlsx?batchId=${encodeURIComponent(p.batchId)}`);
      }
      updateSendAvailability();
    } catch (err) {
      /* status polling already reports backend/auth failures */
    }
  }

  function renderProgress(p) {
    const pct = p.total > 0 ? Math.round((p.processed / p.total) * 100) : 0;
    progressBarInner.style.width = pct + '%';
    progressText.textContent = `${p.processed} / ${p.total}`;
    sentCountEl.textContent = p.sent;
    failedCountEl.textContent = p.failed;
    notOnWaCountEl.textContent = p.notOnWhatsapp;
  }

  resumeSendProgress();
})();
