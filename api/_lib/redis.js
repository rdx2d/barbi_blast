const URL_ENV = 'UPSTASH_REDIS_REST_URL';
const TOKEN_ENV = 'UPSTASH_REDIS_REST_TOKEN';

function config() {
  const url = process.env[URL_ENV] ?? process.env.KV_REST_API_URL;
  const token = process.env[TOKEN_ENV] ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('Upstash Redis env vars missing (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)');
  }
  return { url, token };
}

export async function redisCommand(command) {
  const { url, token } = config();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`redis ${command[0]} failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (json.error) throw new Error(`redis ${command[0]}: ${json.error}`);
  return json.result;
}

export async function redisPipeline(commands) {
  const { url, token } = config();
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`redis pipeline failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.map((entry, i) => {
    if (entry.error) throw new Error(`redis ${commands[i][0]}: ${entry.error}`);
    return entry.result;
  });
}
