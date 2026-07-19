(() => {
  const state = {
    connectionStatus: 'disconnected',
    validRecipients: [],
    hasNameColumn: false,
    media: null, // { path, mimetype, originalName }
    config: null,
    sendRunning: false,
    lastBatchId: null
  };

  const el = (id) => document.getElementById(id);

  const statusBadge = el('statusBadge');
  const statusDot = el('statusDot');
  const statusText = el('statusText');
  const qrWrap = el('qrWrap');
  const qrImage = el('qrImage');
  const connectedWrap = el('connectedWrap');
  const connectedNumber = el('connectedNumber');
  const waitingWrap = el('waitingWrap');
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

  // ---------- Step 1: Connection ----------

  async function pollStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      applyStatus(data);
    } catch (err) {
      statusText.textContent = 'تعذر الاتصال بالخادم / Cannot reach server';
    }
  }

  function applyStatus(data) {
    state.connectionStatus = data.status;
    statusDot.className = 'dot ' + data.status;

    qrWrap.classList.add('hidden');
    connectedWrap.classList.add('hidden');
    waitingWrap.classList.add('hidden');

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
    } else {
      statusText.textContent = 'غير متصل / Disconnected';
      waitingWrap.classList.remove('hidden');
      step2.classList.add('disabled');
    }
    updateSendAvailability();
  }

  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      logoutBtn.disabled = false;
    }
  });

  setInterval(pollStatus, 2000);
  pollStatus();

  // ---------- Config ----------

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      state.config = await res.json();
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
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        uploadError.textContent = data.error || 'فشل تحميل الملف / Upload failed';
        uploadError.classList.remove('hidden');
        return;
      }
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
      uploadError.textContent = 'تعذر الاتصال بالخادم / Cannot reach server';
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
      const res = await fetch('/api/contact-lists');
      renderContactLists(await res.json());
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
      await fetch(`/api/contact-lists/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/contact-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          recipients: state.validRecipients.map((r) => ({ number: r.number, name: r.name }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'فشل حفظ القائمة / Failed to save list');
        return;
      }
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
      const res = await fetch('/api/send/history');
      renderHistory(await res.json());
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
      downloadLink.href = `/api/send/results.xlsx?batchId=${encodeURIComponent(b.batchId)}`;
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
      const res = await fetch(`/api/send/history/${encodeURIComponent(batchId)}/failed`);
      const failed = await res.json();
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
    if (!mediaInput.files.length) return;
    const file = mediaInput.files[0];
    const formData = new FormData();
    formData.append('media', file);

    mediaInfo.textContent = 'جارٍ الرفع... / Uploading...';
    mediaInfo.classList.remove('hidden');

    try {
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        mediaInfo.textContent = data.error || 'فشل رفع المرفق / Attachment upload failed';
        state.media = null;
        return;
      }
      state.media = data;
      mediaInfo.textContent = `تم إرفاق: ${data.originalName} / Attached: ${data.originalName}`;
      updateMessagePreview();
    } catch (err) {
      mediaInfo.textContent = 'تعذر الاتصال بالخادم / Cannot reach server';
    }
  });

  // ---------- Message Templates ----------

  async function loadTemplates() {
    try {
      const res = await fetch('/api/message-templates');
      renderTemplates(await res.json());
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
      await fetch(`/api/message-templates/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/message-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message: messageInput.value,
          media: state.media
            ? {
                path: state.media.path,
                filename: state.media.filename,
                originalName: state.media.originalName,
                mimetype: state.media.mimetype
              }
            : null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'فشل حفظ القالب / Failed to save template');
        return;
      }
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
      media: state.media ? { path: state.media.path } : null
    };

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'فشل بدء الإرسال / Failed to start send');
        sendBtn.disabled = false;
        return;
      }
      state.sendRunning = true;
      state.lastBatchId = data.batchId;
      progressWrap.classList.remove('hidden');
      pollProgress();
    } catch (err) {
      alert('تعذر الاتصال بالخادم / Cannot reach server');
      sendBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', async () => {
    cancelBtn.disabled = true;
    try {
      await fetch('/api/send/cancel', { method: 'POST' });
    } finally {
      cancelBtn.disabled = false;
    }
  });

  let progressTimer = null;
  function pollProgress() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/send/progress');
        const p = await res.json();
        renderProgress(p);
        if (!p.running) {
          clearInterval(progressTimer);
          progressTimer = null;
          state.sendRunning = false;
          resultsWrap.classList.remove('hidden');
          downloadResults.href = `/api/send/results.xlsx?batchId=${encodeURIComponent(p.batchId)}`;
          updateSendAvailability();
        }
      } catch (err) {
        /* keep retrying on next tick */
      }
    }, 1500);
  }

  function renderProgress(p) {
    const pct = p.total > 0 ? Math.round((p.processed / p.total) * 100) : 0;
    progressBarInner.style.width = pct + '%';
    progressText.textContent = `${p.processed} / ${p.total}`;
    sentCountEl.textContent = p.sent;
    failedCountEl.textContent = p.failed;
    notOnWaCountEl.textContent = p.notOnWhatsapp;
  }
})();
