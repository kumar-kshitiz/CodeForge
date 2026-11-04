// Run after building: node --test tests/realtime.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

test('realtime authenticates, isolates users, reconnects and expires sessions/matches', { timeout: 15000 }, async () => {
  process.env.JWT_ACCESS_SECRET = 'realtime-test-secret';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  let listener;
  let finished = false;
  const match = { id: 'private-match', status: 'LIVE', endsAt: new Date(Date.now() + 700).toISOString() };
  const storePath = require.resolve('../dist/store/match.store');
  require.cache[storePath] = { id: storePath, filename: storePath, loaded: true, exports: {
    onMatchChange: fn => { listener = fn; return () => { listener = null; }; },
    getActiveMatchForUser: async id => id === 'member' ? match : null,
    getMatch: async () => finished ? null : match,
  } };
  const servicePath = require.resolve('../dist/services/match.service');
  require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: {
    finishExpiredMatch: async () => { finished = true; },
  } };
  const { attachRealtime } = require('../dist/realtime');
  const server = http.createServer();
  const close = attachRealtime(server);
  const clients = [];
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}`;
    const connect = (token, origin = 'http://localhost:3000') => {
      const socket = io(url, { transports: ['websocket'], auth: { token },
        extraHeaders: { origin }, autoConnect: false, reconnection: false });
      clients.push(socket);
      return socket;
    };
    const token = sub => jwt.sign({ sub }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    const invalid = connect('invalid');
    const rejected = once(invalid, 'connect_error'); invalid.connect(); await rejected;
    const foreign = connect(token('member'), 'https://foreign.example');
    const denied = once(foreign, 'connect_error'); foreign.connect(); await denied;
    const member = connect(token('member')), outsider = connect(token('outsider'));
    const ready = Promise.all([once(member, 'connect'), once(outsider, 'connect')]);
    member.connect(); outsider.connect(); await ready;
    let leaks = 0;
    outsider.on('match:changed', () => leaks++);
    const changed = once(member, 'match:changed');
    listener({ matchId: match.id, userIds: ['member'], deleted: false });
    assert.deepEqual((await changed)[0], { matchId: match.id, deleted: false });
    member.disconnect();
    const reconnected = once(member, 'connect'); member.connect(); await reconnected;
    const deleted = once(member, 'match:changed');
    listener({ matchId: match.id, userIds: ['member'], deleted: true });
    assert.equal((await deleted)[0].deleted, true);
    const expiring = connect(jwt.sign({ sub: 'short-session' }, process.env.JWT_ACCESS_SECRET, { expiresIn: 2 }));
    const expires = once(expiring, 'disconnect');
    const connected = once(expiring, 'connect'); expiring.connect(); await connected; await expires;
    assert.equal(leaks, 0);
    assert.equal(finished, true);
  } finally {
    clients.forEach(socket => socket.disconnect());
    await close();
  }
});
