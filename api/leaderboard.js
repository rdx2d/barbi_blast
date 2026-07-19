import { validateInitData } from './_lib/telegram.js';
import { redisCommand, redisPipeline } from './_lib/redis.js';
import { isoWeekKey } from './_lib/week.js';

const TOP_N = 50;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const scope = req.query.scope === 'week' ? 'week' : 'global';
  const boardKey = scope === 'week' ? `lb:week:${isoWeekKey()}` : 'lb:global';

  try {
    const raw = await redisCommand(['ZRANGE', boardKey, '0', String(TOP_N - 1), 'REV', 'WITHSCORES']);

    const ids = [];
    const scores = [];
    for (let i = 0; i < raw.length; i += 2) {
      ids.push(raw[i]);
      scores.push(Number(raw[i + 1]));
    }

    let names = [];
    if (ids.length > 0) {
      names = await redisPipeline(ids.map((id) => ['HMGET', `player:${id}`, 'username', 'firstName']));
    }

    const rows = ids.map((id, i) => {
      const [username, firstName] = names[i] ?? [null, null];
      return {
        rank: i + 1,
        name: username || firstName || `player ${String(id).slice(-4)}`,
        score: scores[i],
      };
    });

    let me = null;
    const initData = req.headers['x-telegram-init-data'];
    if (initData) {
      const user = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
      if (user) {
        const [rank, score] = await redisPipeline([
          ['ZREVRANK', boardKey, String(user.id)],
          ['ZSCORE', boardKey, String(user.id)],
        ]);
        if (rank !== null) {
          me = { rank: rank + 1, score: Number(score) };
        }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({ scope, rows, me });
  } catch (err) {
    console.error('[leaderboard]', err.message);
    return res.status(500).json({ error: 'storage error' });
  }
}
