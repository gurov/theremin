#!/usr/bin/env node
// Минимальный статический HTTPS-сервер для локального теста гироскопа на телефоне.
// Требует cert.pem и key.pem рядом (см. README). Запуск: node serve-https.js
'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8443;
const ROOT = __dirname;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

function handler(req, res){
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if(urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if(!filePath.startsWith(ROOT)){ res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if(err){ res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function lanIPs(){
  const out = [];
  const ifs = os.networkInterfaces();
  for(const name of Object.keys(ifs))
    for(const i of ifs[name])
      if(i.family === 'IPv4' && !i.internal) out.push(i.address);
  return out;
}

const keyPath = path.join(ROOT, 'key.pem');
const certPath = path.join(ROOT, 'cert.pem');

if(fs.existsSync(keyPath) && fs.existsSync(certPath)){
  const opts = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  https.createServer(opts, handler).listen(PORT, '0.0.0.0', () => {
    console.log('HTTPS готов. Открой на телефоне (тот же Wi-Fi):');
    lanIPs().forEach(ip => console.log(`  https://${ip}:${PORT}`));
    console.log('На телефоне прими предупреждение о самоподписанном сертификате.');
  });
} else {
  console.warn('Нет cert.pem/key.pem — поднимаю HTTP (гироскоп на телефоне НЕ заработает без HTTPS).');
  console.warn('Сгенерируй сертификат по инструкции в README.md.\n');
  http.createServer(handler).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP на http://localhost:${PORT} (только для desktop/mouse-режима)`);
  });
}
