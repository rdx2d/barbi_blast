import { validateInitData } from './_lib/telegram.js';
import { redisCommand, redisPipeline } from './_lib/redis.js';

const RATE_LIMIT_SECONDS = 3600;
const MAX_TEXT_LEN = 500;
const MAX_LOG_ENTRIES = 2000;
const VALID_QUESTION_IDS = new Set([
  'platform', 'challenges', 'improvement', 'gate_comfort',
  'pay_more', 'headspace', 'frequency',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { initData, answers, rating, review } = req.body ?? {};

  const user = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!user) {
    return res.status(401).json({ error: 'invalid telegram auth' });
  }

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be 1-5' });
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers must be an object' });
  }

  const clean = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!VALID_QUESTION_IDS.has(key)) continue;
    if (typeof value === 'string') {
      clean[key] = value.slice(0, MAX_TEXT_LEN);
    } else if (Array.isArray(value)) {
      clean[key] = value.filter((v) => typeof v === 'string').map((v) => v.slice(0, 100)).slice(0, 10);
    }
  }

  const cleanReview = typeof review === 'string' ? review.slice(0, MAX_TEXT_LEN) : '';

  const rateKey = `rate:survey:${user.id}`;

  try {
    const allowed = await redisCommand(['SET', rateKey, '1', 'NX', 'EX', String(RATE_LIMIT_SECONDS)]);
    if (allowed === null) {
      return res.status(429).json({ error: 'survey already submitted recently' });
    }

    const record = {
      tgId: user.id,
      username: user.username ?? '',
      firstName: user.firstName ?? '',
      answers: clean,
      rating,
      review: cleanReview,
      submittedAt: Date.now(),
    };
    const json = JSON.stringify(record);

    await redisPipeline([
      ['HSET', `survey:${user.id}`,
        'data', json,
        'rating', String(rating),
        'updatedAt', String(Date.now()),
      ],
      ['LPUSH', 'survey:log', json],
      ['LTRIM', 'survey:log', '0', String(MAX_LOG_ENTRIES - 1)],
      ['INCR', 'survey:count'],
      ['INCRBY', 'survey:rating_sum', String(rating)],
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[survey]', err.message);
    return res.status(500).json({ error: 'storage error' });
  }
}
