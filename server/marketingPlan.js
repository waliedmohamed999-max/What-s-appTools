const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 4096;

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    channelRecommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          recommendation: { type: 'string' }
        },
        required: ['channel', 'recommendation'],
        additionalProperties: false
      }
    },
    posts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          hook: { type: 'string' },
          caption: { type: 'string' }
        },
        required: ['platform', 'hook', 'caption'],
        additionalProperties: false
      }
    },
    timeline: { type: 'string' }
  },
  required: ['summary', 'channelRecommendations', 'posts', 'timeline'],
  additionalProperties: false
};

let client = null;
function getClient() {
  if (!config.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  return client;
}

function isConfigured() {
  return Boolean(config.ANTHROPIC_API_KEY);
}

async function generateMarketingPlan({
  brand,
  industry,
  audience,
  tone,
  language,
  totalBudget,
  durationDays,
  aov,
  channels
}) {
  const anthropic = getClient();
  if (!anthropic) return null;

  const brandName = String(brand || '').trim().slice(0, 200);
  if (!brandName) throw new Error('اسم العلامة التجارية مطلوب / Brand name is required');

  const lang = language === 'en' ? 'English' : 'Arabic';
  const channelLines = (Array.isArray(channels) ? channels : [])
    .map((c) => `- ${c.name}: ${Math.round(c.channelBudget)} SAR (${c.pct}% of the budget)`)
    .join('\n');

  const prompt = `You are a marketing strategist helping a small business owner in Saudi Arabia. Write your entire response in ${lang} only.

Business:
- Brand/business name: ${brandName}
- Industry / what they sell: ${String(industry || '').trim().slice(0, 300) || 'not specified'}
- Target audience: ${String(audience || '').trim().slice(0, 300) || 'not specified'}
- Desired tone: ${String(tone || '').trim().slice(0, 200) || 'professional and approachable'}

Campaign numbers (already calculated by the app — use these exact figures, do not invent different ones):
- Total budget: ${totalBudget} SAR over ${durationDays} days
- Average order value: ${aov} SAR
- Channel budget split:
${channelLines || '- (no channels provided)'}

Produce:
1. A short (2-4 sentence) strategic summary tying the channel mix to this specific business.
2. One concrete, specific recommendation per channel listed above (what to actually post/run there, not generic advice).
3. 4-6 ready-to-use social media post ideas for this business (mix of channels matching the ones above where sensible), each with a platform, a short attention-grabbing hook, and a full caption ready to copy-paste and post.
4. A one-paragraph suggested posting timeline across the ${durationDays}-day campaign.

Be specific to this business — reference the actual product/industry and audience, not generic marketing platitudes.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: PLAN_SCHEMA }
    },
    messages: [{ role: 'user', content: prompt }]
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('تعذر إنشاء الخطة لهذا الطلب / Could not generate a plan for this request');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('استجابة غير متوقعة من نموذج الذكاء الاصطناعي / Unexpected AI response');

  let plan;
  try {
    plan = JSON.parse(textBlock.text);
  } catch (err) {
    throw new Error('تعذر قراءة استجابة نموذج الذكاء الاصطناعي / Could not parse the AI response');
  }

  return plan;
}

module.exports = { generateMarketingPlan, isConfigured };
