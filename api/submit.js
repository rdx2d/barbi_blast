import { validateInitData } from './_lib/telegram.js';
import { redisCommand, redisPipeline } from './_lib/redis.js';
import { isoWeekKey } from './_lib/week.js';

const SCORE_SANITY_CAP = 1_000_000;
const RATE_LIMIT_SECONDS = 5;
const WEEK_TTL_SECONDS = 60 * 60 * 24 * 21;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { initData, score } = req.body ?? {};

  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'invalid score' });
  }
  if (score > SCORE_SANITY_CAP) {
    return res.status(400).json({ error: 'score exceeds sanity cap' });
  }

  const user = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!user) {
    return res.status(401).json({ error: 'invalid telegram auth' });
  }

  const flooredScore = Math.floor(score);
  const playerKey = `player:${user.id}`;
  const weekKey = `lb:week:${isoWeekKey()}`;
  const rateKey = `rate:submit:${user.id}`;

  try {
    const allowed = await redisCommand(['SET', rateKey, '1', 'NX', 'EX', String(RATE_LIMIT_SECONDS)]);
    if (allowed === null) {
      return res.status(429).json({ error: 'too many submissions' });
    }

    const prevHigh = Number((await redisCommand(['HGET', playerKey, 'highScore'])) ?? 0);
    const newHigh = Math.max(prevHigh, flooredScore);

    const results = await redisPipeline([
      ['HSET', playerKey,
        'highScore', String(newHigh),
        'username', user.username ?? '',
        'firstName', user.firstName ?? '',
        'updatedAt', String(Date.now()),
      ],
      ['HINCRBY', playerKey, 'gamesPlayed', '1'],
      ['ZADD', 'lb:global', 'GT', String(flooredScore), String(user.id)],
      ['ZADD', weekKey, 'GT', String(flooredScore), String(user.id)],
      ['EXPIRE', weekKey, String(WEEK_TTL_SECONDS)],
      ['ZREVRANK', 'lb:global', String(user.id)],
      ['ZREVRANK', weekKey, String(user.id)],
    ]);

    const gamesPlayed = results[1];
    const globalRank = results[5];
    const weekRank = results[6];

    return res.status(200).json({
      highScore: newHigh,
      gamesPlayed,
      globalRank: globalRank === null ? null : globalRank + 1,
      weekRank: weekRank === null ? null : weekRank + 1,
    });
  } catch (err) {
    console.error('[submit]', err.message);
    return res.status(500).json({ error: 'storage error' });
  }
}
