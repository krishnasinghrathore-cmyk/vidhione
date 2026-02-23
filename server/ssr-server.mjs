import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distClientDir = path.resolve(projectRoot, 'dist/client');
const distServerEntry = path.resolve(projectRoot, 'dist/server/entry-server.js');

const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 5173);

const MIME_BY_EXT = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const DEV_NON_HTML_PREFIXES = [
    '/@vite',
    '/@react-refresh',
    '/@id/',
    '/@fs/',
    '/__vite_ping',
    '/src/',
    '/node_modules/',
];

const isViteDevAssetRequest = (pathname) =>
    DEV_NON_HTML_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isHtmlRequest = (req, pathname) => {
    if (req.method !== 'GET') return false;
    if (pathname.includes('.')) return false;
    if (!isProd && isViteDevAssetRequest(pathname)) return false;

    const fetchDest = String(req.headers['sec-fetch-dest'] || '');
    if (fetchDest === 'document') return true;

    const accept = String(req.headers.accept || '');
    if (accept.includes('text/html')) return true;
    if (accept.length === 0) return true;
    return false;
};

const serializeState = (value) => JSON.stringify(value ?? null).replace(/</g, '\\u003c');

const injectSsrHtml = (template, renderResult) => {
    const stateScript = `<script>window.__APOLLO_STATE__=${serializeState(
        renderResult.apolloState
    )};window.__AUTH_STATE__=${serializeState(renderResult.authState)};</script>`;
    return template.replace('<div id="root"></div>', `<div id="root">${renderResult.appHtml}</div>${stateScript}`);
};

const sanitizePath = (pathname) => {
    try {
        return decodeURIComponent(pathname);
    } catch {
        return pathname;
    }
};

const serveStaticFile = async (pathname, res) => {
    const normalizedPath = sanitizePath(pathname);
    const relativePath = normalizedPath === '/' ? 'index.html' : normalizedPath.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(distClientDir, relativePath));
    const relativeToDist = path.relative(distClientDir, filePath);
    if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) return false;
    if (!existsSync(filePath)) return false;

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    const body = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.end(body);
    return true;
};

let vite = null;
let prodTemplate = null;
let prodSsrModule = null;

if (!isProd) {
    vite = await createViteServer({
        root: projectRoot,
        server: { middlewareMode: true },
        appType: 'custom',
    });
} else {
    prodTemplate = await readFile(path.resolve(distClientDir, 'index.html'), 'utf-8');
}

const loadSsrModule = async () => {
    if (!isProd) {
        return await vite.ssrLoadModule('/src/entry-server.tsx');
    }
    if (!prodSsrModule) {
        prodSsrModule = await import(pathToFileURL(distServerEntry).href);
    }
    return prodSsrModule;
};

const server = http.createServer(async (req, res) => {
    const requestUrl = req.url || '/';
    const pathname = requestUrl.split('?')[0] || '/';

    try {
        if (!isProd && !isHtmlRequest(req, pathname)) {
            vite.middlewares(req, res, () => {
                res.statusCode = 404;
                res.end('Not found');
            });
            return;
        }
        if (isProd && !isHtmlRequest(req, pathname)) {
            const served = await serveStaticFile(pathname, res);
            if (!served) {
                res.statusCode = 404;
                res.end('Not found');
            }
            return;
        }

        const ssrModule = await loadSsrModule();
        const shouldSsr = Boolean(ssrModule.isSsrReportRoute?.(requestUrl));

        let template;
        if (!isProd) {
            template = await readFile(path.resolve(projectRoot, 'index.html'), 'utf-8');
            template = await vite.transformIndexHtml(requestUrl, template);
        } else {
            template = prodTemplate;
        }

        if (!shouldSsr) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(template);
            return;
        }

        const renderResult = await ssrModule.render(requestUrl, {
            cookie: req.headers.cookie ?? null,
        });
        if (renderResult.redirectTo) {
            res.statusCode = renderResult.statusCode || 302;
            res.setHeader('Location', renderResult.redirectTo);
            res.end();
            return;
        }

        const html = injectSsrHtml(template, renderResult);
        res.statusCode = renderResult.statusCode || 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
    } catch (error) {
        if (!isProd && vite) {
            vite.ssrFixStacktrace(error);
        }
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(error instanceof Error ? error.stack || error.message : String(error));
    }
});

server.listen(port, () => {
    const mode = isProd ? 'production' : 'development';
    console.log(`SSR server listening on http://localhost:${port} (${mode})`);
});
