import fs from 'fs';
(async () => {
    try {
        await import('./index.mjs');
    } catch (e) {
        fs.writeFileSync('err2.txt', String(e.stack || e), 'utf8');
    }
})();
