import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Admin pages are served by PHP, never by Vite dev/preview servers.
function phpOnlyAdmin() {
  const blockAdmin = (server) => {
    server.middlewares.use((req, res, next) => {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (/^\/admin(?:\/|$)/i.test(pathname)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end('Admin panel is available only on the PHP server.');
        return;
      }
      next();
    });
  };
  return { name: 'php-only-admin', configureServer: blockAdmin, configurePreviewServer: blockAdmin };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), phpOnlyAdmin()],
  base: '/',
})

