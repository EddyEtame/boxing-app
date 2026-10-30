import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Le telephone ne joint qu'une URL publique (le tunnel du bridge).
 * Les routes /api/* de l'admin (contenus, videos, propositions) sont
 * renvoyees vers l'admin sur la meme machine.
 */
export function registerAdminProxy(app: FastifyInstance, adminBase: string): void {
  const base = adminBase.replace(/\/$/, '');
  app.all('/api/*', async (req: FastifyRequest, reply: FastifyReply) => {
    const target = `${base}${req.url}`;
    const headers = new Headers();
    const accept = req.headers.accept;
    const type = req.headers['content-type'];
    const auth = req.headers.authorization;
    const origin = req.headers.origin;
    if (typeof accept === 'string') headers.set('accept', accept);
    if (typeof type === 'string') headers.set('content-type', type);
    if (typeof auth === 'string') headers.set('authorization', auth);
    if (typeof origin === 'string') headers.set('origin', origin);
    const method = req.method;
    const hasBody = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    let body: string | undefined;
    if (hasBody && req.body != null) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    let res: Response;
    try {
      res = await fetch(target, { method, headers, body, redirect: 'manual' });
    } catch {
      reply.code(502).send({ error: 'admin_injoignable' });
      return;
    }
    const out = new Headers();
    const copy = ['content-type', 'cache-control', 'etag', 'location', 'retry-after'];
    for (const name of copy) {
      const value = res.headers.get(name);
      if (value) out.set(name, value);
    }
    for (const [name, value] of out.entries()) reply.header(name, value);
    const buf = Buffer.from(await res.arrayBuffer());
    reply.code(res.status).send(buf);
  });
}
