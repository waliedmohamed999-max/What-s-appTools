const fs = require('fs');

const GRAPH_VERSION = 'v19.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Facebook Pages accept a direct file upload (multipart), so this works from
// localhost with no public URL needed.
async function publishFacebookPost({ pageId, pageAccessToken, message, imagePath }) {
  if (imagePath) {
    const form = new FormData();
    form.append('caption', message || '');
    form.append('access_token', pageAccessToken);
    form.append('source', new Blob([fs.readFileSync(imagePath)]), 'image.jpg');

    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل النشر على فيسبوك / Failed to publish to Facebook');
    return { id: data.post_id || data.id };
  }

  const params = new URLSearchParams({ message: message || '', access_token: pageAccessToken });
  const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, { method: 'POST', body: params });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'فشل النشر على فيسبوك / Failed to publish to Facebook');
  return { id: data.id };
}

// Instagram's Content Publishing API only accepts a hosted image_url that Meta's
// servers fetch themselves — it cannot take a direct file upload like Facebook does.
async function publishInstagramPost({ igUserId, pageAccessToken, imageUrl, caption }) {
  const createParams = new URLSearchParams({ image_url: imageUrl, caption: caption || '', access_token: pageAccessToken });
  const createRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, { method: 'POST', body: createParams });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    throw new Error(createData.error?.message || 'فشل تجهيز منشور انستغرام / Failed to prepare Instagram post');
  }

  const publishParams = new URLSearchParams({ creation_id: createData.id, access_token: pageAccessToken });
  const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, { method: 'POST', body: publishParams });
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error(publishData.error?.message || 'فشل نشر منشور انستغرام / Failed to publish Instagram post');
  }
  return { id: publishData.id };
}

module.exports = { publishFacebookPost, publishInstagramPost };
