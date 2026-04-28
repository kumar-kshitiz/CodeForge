import dotenv from 'dotenv';
import server from './app';

dotenv.config();

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`[socket-service] listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => console.log('[socket-service] shut down'));
});
