require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');

const config = require('./config');
const whatsapp = require('./whatsapp');
const excel = require('./excel');
const sendEngine = require('./sendEngine');
const storeAnalyzer = require('./storeAnalyzer');
const storeAnalysisHistory = require('./storeAnalysisHistory');
const contentStore = require('./contentStore');
const campaignPlanStore = require('./campaignPlanStore');
const metaAuth = require('./metaAuth');
const metaPublish = require('./metaPublish');
const auth = require('./auth');
const templateStore = require('./templateStore');
const sendHistory = require('./sendHistory');
const contactListStore = require('./contactListStore');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY ? 1 : false);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();

  const normalizedOrigin = origin.replace(/\/$/, '');
  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  if (normalizedOrigin !== requestOrigin && !config.FRONTEND_ORIGINS.includes(normalizedOrigin)) {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// DMS is a single-owner toolkit with no login screen: every request is attributed to
// the one auto-provisioned owner account instead of a session cookie.
function requireAuth(req, res, next) {
  req.user = auth.getOrCreateOwner();
  next();
}

const UPLOADS_DIR = config.UPLOADS_DIR;
for (const directory of [config.DATA_DIR, config.SESSIONS_DIR, config.UPLOADS_DIR]) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
}

// Needed so the Content Scheduler can preview uploaded post images in the browser.
// This is a single-user local tool, so exposing /uploads is acceptable.
app.use('/uploads', requireAuth, express.static(UPLOADS_DIR));

// Shared by /api/send and /api/content/posts (create + edit): a client-supplied media
// reference must resolve to a real file already inside our own uploads/ directory.
function resolveSafeMedia(media) {
  if (!media) return null;
  const filename = path.basename(String(media.filename || media.path || ''));
  if (!filename) return null;
  const resolved = path.resolve(UPLOADS_DIR, filename);
  const relative = path.relative(UPLOADS_DIR, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
    throw new Error('مرفق غير صالح / Invalid attachment');
  }
  return {
    path: resolved,
    filename,
    originalName: media.originalName || filename,
    mimetype: media.mimetype || 'application/octet-stream'
  };
}

function publicMedia(media) {
  if (!media) return null;
  return {
    filename: media.filename,
    originalName: media.originalName,
    mimetype: media.mimetype,
    size: media.size
  };
}

function publicPost(post) {
  return post ? { ...post, media: publicMedia(post.media) } : post;
}

function signPublicMedia(filename, expires) {
  return crypto
    .createHmac('sha256', config.MEDIA_SIGNING_SECRET)
    .update(`${filename}:${expires}`)
    .digest('hex');
}

function signedPublicMediaUrl(media) {
  if (!config.META_PUBLIC_BASE_URL) {
    throw new Error(
      'يجب ضبط META_PUBLIC_BASE_URL برابط عام حتى يعمل النشر على انستغرام / META_PUBLIC_BASE_URL must be set to a public URL for Instagram publishing to work'
    );
  }
  if (!config.MEDIA_SIGNING_SECRET) {
    throw new Error(
      'يجب ضبط MEDIA_SIGNING_SECRET أو META_APP_SECRET / MEDIA_SIGNING_SECRET or META_APP_SECRET must be configured'
    );
  }
  const filename = path.basename(media.filename);
  const expires = Math.floor(Date.now() / 1000) + 10 * 60;
  const signature = signPublicMedia(filename, expires);
  return `${config.META_PUBLIC_BASE_URL}/public-media/${encodeURIComponent(filename)}?expires=${expires}&signature=${signature}`;
}

// Meta cannot send the owner's session cookie when it downloads an Instagram
// image. Keep uploads private and expose only a ten-minute, HMAC-signed URL.
app.get('/public-media/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const expires = Number(req.query.expires);
    const signature = String(req.query.signature || '');
    const now = Math.floor(Date.now() / 1000);
    if (
      !config.MEDIA_SIGNING_SECRET ||
      !filename ||
      !Number.isSafeInteger(expires) ||
      expires < now ||
      expires > now + 15 * 60 ||
      !/^[a-f0-9]{64}$/i.test(signature)
    ) {
      return res.status(403).json({ error: 'رابط الملف غير صالح أو منتهي / Invalid or expired media link' });
    }

    const expected = signPublicMedia(filename, expires);
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(403).json({ error: 'رابط الملف غير صالح أو منتهي / Invalid or expired media link' });
    }

    const media = resolveSafeMedia({ filename });
    res.set('Cache-Control', 'private, no-store');
    return res.sendFile(media.path);
  } catch (err) {
    return res.status(404).json({ error: 'الملف غير موجود / Media not found' });
  }
});

function frontendRedirect(pathname) {
  return config.PUBLIC_APP_URL ? `${config.PUBLIC_APP_URL}${pathname}` : pathname;
}

// Excel files are small and only need to be parsed once, so memory storage is enough.
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt = /\.(xlsx|xls)$/i.test(file.originalname);
    if (!okExt) return cb(new Error('يجب أن يكون الملف Excel (.xlsx أو .xls) / File must be an Excel file'));
    cb(null, true);
  }
});

// Media attachments are sent later via whatsapp-web.js MessageMedia.fromFilePath,
// so they need to live on disk.
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) =>
    cb(null, `media_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.upload`)
});
const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okMime = /^image\//.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (!okMime) return cb(new Error('يسمح فقط بالصور أو ملفات PDF / Only images or PDF files are allowed'));
    cb(null, true);
  }
});

function inspectMediaFile(filePath) {
  const header = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  let bytesRead;
  try {
    bytesRead = fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  const hex = header.subarray(0, bytesRead).toString('hex');
  if (hex.startsWith('ffd8ff')) return { mimetype: 'image/jpeg', extension: '.jpg' };
  if (hex.startsWith('89504e470d0a1a0a')) return { mimetype: 'image/png', extension: '.png' };
  if (header.subarray(0, 6).toString('ascii') === 'GIF87a' || header.subarray(0, 6).toString('ascii') === 'GIF89a') {
    return { mimetype: 'image/gif', extension: '.gif' };
  }
  if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mimetype: 'image/webp', extension: '.webp' };
  }
  if (header.subarray(0, 5).toString('ascii') === '%PDF-') return { mimetype: 'application/pdf', extension: '.pdf' };
  return null;
}

app.get('/api/config', (req, res) => {
  res.json({
    defaultCountryCode: config.DEFAULT_COUNTRY_CODE,
    minDelayMs: config.MIN_DELAY_MS,
    maxDelayMs: config.MAX_DELAY_MS,
    batchSize: config.BATCH_SIZE,
    batchPauseMs: config.BATCH_PAUSE_MS,
    maxValidNumbers: config.MAX_VALID_NUMBERS
  });
});

app.get('/api/health', (req, res) => {
  let storageWritable = true;
  try {
    for (const directory of [config.DATA_DIR, config.SESSIONS_DIR, config.UPLOADS_DIR]) {
      fs.accessSync(directory, fs.constants.W_OK);
    }
  } catch (err) {
    storageWritable = false;
  }
  const whatsappState = whatsapp.getState();
  res.set('Cache-Control', 'no-store');
  res.status(storageWritable ? 200 : 503).json({
    ok: storageWritable,
    service: 'DMS API',
    whatsappEnabled: !config.DISABLE_WHATSAPP,
    whatsappStatus: whatsappState.status,
    whatsappDegraded: !config.DISABLE_WHATSAPP && Boolean(whatsappState.error),
    persistentStorageConfigured: Boolean(process.env.STORAGE_DIR),
    storageWritable
  });
});

// DMS is a single-owner toolkit with no login screen: every request below is attributed
// to the one auto-provisioned owner account (see requireAuth / auth.getOrCreateOwner).
app.use('/api', requireAuth);

app.get('/api/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(whatsapp.getState());
});

app.get('/api/qr', (req, res) => {
  const s = whatsapp.getState();
  if (s.status === 'qr_pending' && s.qr) return res.json({ qr: s.qr });
  res.status(404).json({ error: 'لا يوجد رمز QR حالياً / No QR code available right now' });
});

app.post('/api/logout', async (req, res) => {
  try {
    await whatsapp.logout();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', (req, res) => {
  excelUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'لم يتم إرفاق ملف / No file uploaded' });

      const countryCode =
        (req.body.countryCode || '').toString().replace(/\D/g, '') || config.DEFAULT_COUNTRY_CODE;
      const result = excel.parseExcelBuffer(req.file.buffer, countryCode);

      if (result.validCount > config.MAX_VALID_NUMBERS) {
        return res.status(400).json({
          error:
            `عدد الأرقام الصالحة (${result.validCount}) يتجاوز الحد الأقصى (${config.MAX_VALID_NUMBERS}). ` +
            `هذه الأداة مخصصة للإرسال بكميات صغيرة فقط. / ` +
            `Valid numbers (${result.validCount}) exceed the maximum allowed (${config.MAX_VALID_NUMBERS}).`
        });
      }

      res.json(result);
    } catch (parseErr) {
      res.status(400).json({ error: parseErr.message });
    }
  });
});

app.post('/api/media/upload', (req, res) => {
  mediaUpload.single('media')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'لم يتم إرفاق ملف / No file uploaded' });
    try {
      const detected = inspectMediaFile(req.file.path);
      if (!detected) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'الملف ليس صورة JPEG/PNG/GIF/WebP أو PDF صالحاً / File is not a valid JPEG, PNG, GIF, WebP, or PDF'
        });
      }
      const filename = `${path.basename(req.file.filename, '.upload')}${detected.extension}`;
      fs.renameSync(req.file.path, path.join(UPLOADS_DIR, filename));
      return res.json({
        filename,
        originalName: req.file.originalname,
        mimetype: detected.mimetype,
        size: req.file.size
      });
    } catch (uploadErr) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'تعذر حفظ الملف / Could not store the media file' });
    }
  });
});

app.post('/api/send', (req, res) => {
  try {
    const { recipients, message, media } = req.body;
    const safeMedia = resolveSafeMedia(media);

    if (!message && !safeMedia) {
      return res.status(400).json({ error: 'الرجاء إدخال نص الرسالة أو إرفاق ملف / Enter a message or attach media' });
    }

    const result = sendEngine.startSend({ recipients, message, media: safeMedia });
    res.json({ started: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/template/download', (req, res) => {
  const templatePath = path.join(__dirname, '..', 'templates', 'sample-template.xlsx');
  if (!fs.existsSync(templatePath)) {
    return res.status(404).json({ error: 'نموذج الإكسل غير موجود / Template file not found' });
  }
  res.download(templatePath, 'whatsapp-bulk-sender-template.xlsx');
});

app.get('/api/message-templates', (req, res) => {
  res.json(
    templateStore.listTemplates().map((template) => ({
      ...template,
      media: publicMedia(template.media)
    }))
  );
});

app.post('/api/message-templates', async (req, res) => {
  try {
    const { name, message, media } = req.body;
    const safeMedia = resolveSafeMedia(media);
    const template = await templateStore.createTemplate({ name, message, media: safeMedia });
    res.json({ ...template, media: publicMedia(template.media) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/message-templates/:id', async (req, res) => {
  try {
    await templateStore.deleteTemplate(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/contact-lists', (req, res) => {
  res.json(contactListStore.listLists());
});

app.post('/api/contact-lists', async (req, res) => {
  try {
    const list = await contactListStore.createList(req.body);
    res.json(list);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/contact-lists/:id', async (req, res) => {
  try {
    await contactListStore.deleteList(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/send/history', (req, res) => {
  res.json(sendHistory.listBatches());
});

app.get('/api/send/history/:batchId/failed', (req, res) => {
  res.json(sendHistory.getFailedRecipients(req.params.batchId));
});

app.get('/api/send/progress', (req, res) => {
  res.json(sendEngine.getProgress());
});

app.post('/api/send/cancel', (req, res) => {
  sendEngine.requestCancel();
  res.json({ ok: true });
});

app.get('/api/send/results.xlsx', (req, res) => {
  try {
    const buffer = sendEngine.buildResultsWorkbook(req.query.batchId);
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp-send-results.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/store-analysis/analyze', async (req, res) => {
  try {
    const result = await storeAnalyzer.analyzeUrl(req.body.url);

    const previous = storeAnalysisHistory.findLatestByHostname(result.hostname);
    await storeAnalysisHistory.recordAnalysis({
      hostname: result.hostname,
      url: result.url,
      score: result.score,
      categoryScores: result.categoryScores,
      fetchedAt: result.fetchedAt
    });

    res.json({
      ...result,
      previousScore: previous ? previous.score : null,
      scoreDelta: previous ? result.score - previous.score : null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/store-analysis/history', (req, res) => {
  res.json(storeAnalysisHistory.listHistory());
});

app.get('/api/store-analysis/history.xlsx', (req, res) => {
  const rows = storeAnalysisHistory.listHistory(200).map((r) => ({
    'الموقع / Site': r.url,
    'النتيجة / Score': r.score,
    'SEO': r.categoryScores?.seo ?? '',
    'تقني / Technical': r.categoryScores?.technical ?? '',
    'ثقة / Trust': r.categoryScores?.trust ?? '',
    'سوشيال / Social': r.categoryScores?.social ?? '',
    'التاريخ / Date': r.fetchedAt
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'History');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="store-analysis-history.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.get('/api/campaign-plans', (req, res) => {
  res.json(campaignPlanStore.listPlans());
});

app.post('/api/campaign-plans', async (req, res) => {
  try {
    const plan = await campaignPlanStore.createPlan(req.body);
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/campaign-plans/:id', async (req, res) => {
  try {
    await campaignPlanStore.deletePlan(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/campaign-plans/:id/export.xlsx', (req, res) => {
  try {
    const plan = campaignPlanStore.getPlan(req.params.id);
    const buffer = campaignPlanStore.buildPlanWorkbook(plan);
    const safeName = plan.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'campaign-plan';
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/content/posts', requireAuth, (req, res) => {
  res.json(contentStore.listPosts(req.user.id).map(publicPost));
});

app.get('/api/content/posts/export.xlsx', requireAuth, (req, res) => {
  const rows = contentStore.listPosts(req.user.id).map((p) => ({
    'المنصة / Platform': p.platform,
    'النص / Caption': p.caption,
    'الموعد / Scheduled At': p.scheduledAt || '',
    'الحالة / Status': p.status,
    'تاريخ الإنشاء / Created At': p.createdAt
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="content-schedule.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.post('/api/content/posts/bulk', requireAuth, async (req, res) => {
  try {
    const platforms = [...new Set(Array.isArray(req.body.platforms) ? req.body.platforms : [])];
    const safeMedia = resolveSafeMedia(req.body.media);
    const posts = await contentStore.createPosts(
      req.user.id,
      platforms.map((platform) => ({
        platform,
        caption: req.body.caption,
        scheduledAt: req.body.scheduledAt,
        media: safeMedia
      }))
    );
    res.json(posts.map(publicPost));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/content/posts', requireAuth, async (req, res) => {
  try {
    const { platform, caption, scheduledAt, media } = req.body;
    const safeMedia = resolveSafeMedia(media);
    const post = await contentStore.createPost(req.user.id, { platform, caption, scheduledAt, media: safeMedia });
    res.json(publicPost(post));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/content/posts/:id', requireAuth, async (req, res) => {
  try {
    const patch = { ...req.body };
    if ('media' in patch) patch.media = resolveSafeMedia(patch.media);
    const post = await contentStore.updatePost(req.user.id, req.params.id, patch);
    res.json(publicPost(post));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/content/posts/:id', requireAuth, async (req, res) => {
  try {
    await contentStore.deletePost(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/meta/status', requireAuth, (req, res) => {
  // This is polled by the UI to decide whether to show a live "Connect" button, so it must
  // never be cached by the browser — a stale response could show a button that shouldn't work.
  res.set('Cache-Control', 'no-store');
  res.json(metaAuth.getStatus(req.user.id));
});

app.get('/api/meta/auth', requireAuth, (req, res) => {
  try {
    const url = metaAuth.startLogin(req.user.id);
    res.redirect(url);
  } catch (err) {
    // This link is a full page navigation, not a fetch() call — on failure, send the user
    // back into the app with a clear message instead of dumping a raw JSON error page.
    res.redirect(frontendRedirect(`/content-scheduler?meta_error=${encodeURIComponent(err.message)}`));
  }
});

app.get('/api/meta/callback', async (req, res) => {
  // No requireAuth here: Meta's redirect lands here as a fresh top-level navigation, and the
  // `state` value already carries which user started this login (checked inside completeLogin).
  const { code, state, error, error_description: errorDescription } = req.query;
  if (error) {
    return res.redirect(
      frontendRedirect(`/content-scheduler?meta_error=${encodeURIComponent(errorDescription || error)}`)
    );
  }
  try {
    await metaAuth.completeLogin(code, state);
    res.redirect(frontendRedirect('/content-scheduler?meta_connected=1'));
  } catch (err) {
    res.redirect(frontendRedirect(`/content-scheduler?meta_error=${encodeURIComponent(err.message)}`));
  }
});

app.post('/api/meta/disconnect', requireAuth, (req, res) => {
  metaAuth.clearConnection(req.user.id);
  res.json({ ok: true });
});

app.post('/api/content/posts/:id/publish', requireAuth, async (req, res) => {
  try {
    const post = contentStore.getPost(req.user.id, req.params.id);
    if (!post) return res.status(404).json({ error: 'المنشور غير موجود / Post not found' });

    const page = metaAuth.getPage(req.user.id, req.body.pageId);
    let result;

    if (post.platform === 'facebook') {
      result = await metaPublish.publishFacebookPost({
        pageId: page.id,
        pageAccessToken: page.accessToken,
        message: post.caption,
        imagePath: post.media?.path || null
      });
    } else if (post.platform === 'instagram') {
      if (!page.instagramBusinessAccountId) {
        return res.status(400).json({ error: 'لا يوجد حساب انستغرام مرتبط بهذه الصفحة / No Instagram account linked to this Page' });
      }
      if (!post.media) {
        return res.status(400).json({ error: 'انستغرام يتطلب صورة / Instagram requires an image' });
      }
      if (!String(post.media.mimetype || '').startsWith('image/')) {
        return res.status(400).json({ error: 'انستغرام يتطلب ملف صورة صالح / Instagram requires a valid image file' });
      }
      result = await metaPublish.publishInstagramPost({
        igUserId: page.instagramBusinessAccountId,
        pageAccessToken: page.accessToken,
        imageUrl: signedPublicMediaUrl(post.media),
        caption: post.caption
      });
    } else {
      return res.status(400).json({
        error: 'النشر المباشر متاح فقط لفيسبوك وانستغرام حالياً / Direct publishing is only available for Facebook and Instagram for now'
      });
    }

    await contentStore.updatePost(req.user.id, post.id, { status: 'posted' });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

whatsapp.init();

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'مسار API غير موجود / API endpoint not found' });
});

// SPA fallback: any other GET request (e.g. /products, /store-analyzer) is a client-side
// React Router route, so serve the landing bundle and let the router handle it.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = app.listen(config.PORT, () => {
  console.log(`DMS running at http://localhost:${config.PORT}`);
});

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`DMS received ${signal}; shutting down`);

  const closeServer = new Promise((resolve) => server.close(resolve));
  const forceExit = setTimeout(() => {
    console.error('DMS shutdown timed out');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    await Promise.all([closeServer, whatsapp.shutdown(), sendEngine.shutdown()]);
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error('DMS shutdown failed:', err);
    process.exit(1);
  }
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
