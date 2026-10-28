// ==UserScript==
// @name         3DPD Downloader
// @namespace    3dpd-downloader
// @version      1.0.0
// @author       laynholt
// @homepageURL  https://github.com/Laynholt/3dpd-downloader
// @supportURL   https://github.com/Laynholt/3dpd-downloader/issues
// @downloadURL  https://github.com/Laynholt/3dpd-downloader/releases/latest/download/3dpd-downloader.user.js
// @updateURL    https://github.com/Laynholt/3dpd-downloader/releases/latest/download/3dpd-downloader.meta.js
// @description  Скачивание видео через кнопку загрузки сайта: качество, размер, прогресс. ПК: Violentmonkey, iPhone: прямые ссылки на видео.
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjI4IiBmaWxsPSIjMWIxYjFmIi8+PHBhdGggZmlsbD0iI2ZmYTMzMyIgZD0iTTY0IDEyIDExMiA0MCA2NCA2OCAxNiA0MFoiLz48cGF0aCBmaWxsPSIjZTA2ZDAwIiBkPSJtNjQgNjggNDgtMjh2NDhsLTQ4IDI4WiIvPjxwYXRoIGZpbGw9IiNmZjg4MDAiIGQ9Im0xNiA0MCA0OCAyOHY0OEwxNiA4OFoiLz48cGF0aCBmaWxsPSIjZmZmIiB0cmFuc2Zvcm09Im1hdHJpeCgxIC41ODMzMzMgMCAxIDE2IDQwKSIgZD0iTTE2IDhoMTZ2MTdoOUwyNCA0MyA3IDI1aDlaIi8+PC9zdmc+
// @match        *://*/video/*
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      *
// @noframes
// @run-at       document-end
// ==/UserScript==

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#1b1b1f"/><path fill="#ffa333" d="M64 12 112 40 64 68 16 40Z"/><path fill="#e06d00" d="m64 68 48-28v48l-48 28Z"/><path fill="#ff8800" d="m16 40 48 28v48L16 88Z"/><path fill="#fff" transform="matrix(1 .583333 0 1 16 40)" d="M16 8h16v17h9L24 43 7 25h9Z"/></svg>';

// KVS keeps player config in an inline script; reading it as text works in any injection context (page or sandbox).
function readSources(text) {
  const block = text.match(/flashvars\s*=\s*\{([\s\S]*?)\};/)?.[1] ?? '';
  const vars = {};
  for (const [, key, value] of block.matchAll(/(\w+):\s*'((?:[^'\\]|\\.)*)'/g)) vars[key] = value.replace(/\\(.)/g, '$1');
  const urls = Object.keys(vars).filter(k => /^video_(alt_)?url\d*$/.test(k)).map(k => vars[k]).filter(u => /^https?:\/\//.test(u));
  return { title: vars.video_title || 'video_' + (vars.video_id || ''), urls };
}

// @match is generic: only use the page's own KVS file URLs.
const ownFileUrls = (urls, origin) => urls.filter(u => {
  try { const p = new URL(u); return p.origin === origin && p.pathname.startsWith('/get_file/'); } catch { return false; }
});

// "4K, 137.38 Mb" -> url ending in "_4k.mp4/"
function pickUrl(label, urls) {
  const quality = label.split(',')[0].trim().toLowerCase();
  return urls.find(u => u.split('?')[0].toLowerCase().replace(/\/$/, '').endsWith(`_${quality}.mp4`));
}

// Safari plays a video/mp4 blob instead of saving it; octet-stream makes every browser save the file.
const SAVE_TYPE = 'application/octet-stream';
// Normalizes whatever a script manager hands back for responseType "blob" (Blob, ArrayBuffer or typed array).
function toBlob(response) {
  if (response instanceof Blob || response instanceof ArrayBuffer || ArrayBuffer.isView(response)) return new Blob([response], { type: SAVE_TYPE });
  throw new Error('менеджер скриптов вернул не файл, а ' + (typeof response === 'string' ? 'текст' : typeof response));
}
const hostOf = url => { try { return new URL(url).host; } catch { return ''; } };
// Status plus which path failed and where it ended up (after redirects) — enough to tell token expiry from host blocking.
const httpError = (status, via, finalUrl) => new Error(`сервер ответил ${status} (${[via, hostOf(finalUrl)].filter(Boolean).join(', ')})`);

const labelBytes = label => Number(label.match(/([\d.]+)\s*mb/i)?.[1] || 0) * 1048576;
const mb = bytes => (bytes / 1048576).toFixed(1);
const safeName = s => s.replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_').replace(/[. ]+$/, '').slice(0, 120) || 'video';

if (typeof module !== 'undefined') module.exports = { readSources, pickUrl, labelBytes, ownFileUrls, httpError, toBlob };
else (() => {
  // @match is generic: quietly skip pages without a KVS player config.
  const parsed = readSources([...document.scripts].map(s => s.textContent).join('\n'));
  const { title } = parsed, urls = ownFileUrls(parsed.urls, location.origin);
  if (!urls.length) return;
  // iPhone/iPad: script reads of the file fail ("Load failed" / 403), but Safari itself opens it — so there the
  // menu items are plain links to the file (tap opens the video, long-press copies the link).
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const button = document.querySelector('button.drop-btn .download_icon')?.closest('button');
  const links = button?.parentElement.querySelectorAll('a.download-link') ?? [];
  if (!button || !links.length) return console.warn('[3dpd] Кнопка загрузки не найдена — возможно, сайт изменил разметку.');

  const style = document.createElement('style');
  style.textContent = `
    .dpdl-badge{margin-left:4px;font-size:11px;font-weight:700;color:#ff8800}
    .dpdl-badge:empty{display:none}
    .dpdl-bar{display:block;width:100%;height:4px;margin-top:3px;accent-color:#ff8800}
    .dpdl-bar[hidden]{display:none}
    .fav-drop.dpdl-menu{width:max-content;min-width:150px;max-width:calc(100vw - 32px)}
    .fav-drop.dpdl-menu a{white-space:normal;overflow:visible;overflow-wrap:anywhere}`;
  document.head.append(style);
  links[0].closest('.fav-drop')?.classList.add('dpdl-menu'); // site menu is 150px wide and ellipsizes; let our status text wrap

  const icon = button.querySelector('.download_icon');
  icon.innerHTML = ICON_SVG;
  icon.firstElementChild?.classList.add('svg-icon');
  const badge = document.createElement('span');
  badge.className = 'dpdl-badge';
  icon.after(badge);
  let active = 0;

  for (const link of links) {
    const label = link.textContent.trim();
    const url = pickUrl(label, urls);
    if (!url) { link.textContent = `${label} (нет ссылки)`; continue; }
    const quality = label.split(',')[0].trim();
    const name = `${safeName(title)} [${quality}].mp4`;
    link.removeAttribute('data-fancybox');
    link.removeAttribute('data-href');
    link.href = url;
    if (isIOS) {
      // Safari names the saved file after the link; copy the title (no extension) so it can be pasted in Files → Rename.
      // A new tab keeps this page alive so the clipboard write is not cut off by navigation.
      link.target = '_blank';
      link.addEventListener('click', event => {
        event.stopImmediatePropagation(); // keep the site's login popup out
        navigator.clipboard?.writeText(name.replace(/\.mp4$/, '')).catch(() => {});
      }, true);
      continue;
    }
    const bar = document.createElement('progress');
    bar.className = 'dpdl-bar';
    bar.max = 100;
    bar.hidden = true;
    link.after(bar);
    let controller, blobUrl;

    link.addEventListener('click', event => {
      event.stopImmediatePropagation(); // keep the site's menu/login handlers out
      if (blobUrl) return; // now a real <a download href="blob:"> — the browser saves it (iOS needs this tap)
      event.preventDefault();
      if (!event.isTrusted) return; // page scripts must not start downloads
      if (controller) controller.abort(); // second tap cancels
      else start();
    }, true);

    async function start() {
      controller = new AbortController();
      active++;
      bar.hidden = false;
      bar.removeAttribute('value');
      link.textContent = `${quality} · подключение…`;
      try {
        const target = await freshUrl(label, url, controller.signal);
        const blob = await fetchBlob(target, controller.signal, (loaded, total) => {
          total ||= labelBytes(label);
          const percent = total ? Math.min(100, Math.floor(loaded / total * 100)) : 0;
          bar.value = percent;
          link.textContent = `${quality} · ${percent}% · ${mb(loaded)} / ${mb(total)} МБ`;
          badge.textContent = percent + '%';
        });
        blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        link.download = name;
        link.textContent = `✔ ${quality} · сохранено (${mb(blob.size)} МБ)`;
        link.click();
      } catch (error) {
        if (error.name !== 'AbortError') console.error('[3dpd]', quality, error);
        link.textContent = error.name === 'AbortError' ? `${label} · отменено` : `${label} · ошибка: ${error.message}`;
        link.href = url;
      } finally {
        controller = undefined;
        bar.hidden = true;
        if (!--active) badge.textContent = '';
      }
    }
  }

  // File links carry a short-lived token (v-acctoken); re-read the page right before downloading, like a reload would.
  async function freshUrls(signal) {
    try {
      const response = await fetch(location.href, { signal, credentials: 'include', cache: 'no-store' });
      return ownFileUrls(readSources(await response.text()).urls, location.origin);
    } catch (error) {
      if (signal?.aborted) throw error;
      return null;
    }
  }

  async function freshUrl(label, fallback, signal) {
    return pickUrl(label, (await freshUrls(signal)) ?? []) || fallback;
  }

  async function fetchBlob(url, signal, onProgress) {
    let response;
    try { response = await fetch(url, { signal, credentials: 'include' }); }
    catch (error) { if (signal.aborted) throw error; return gmBlob(url, signal, onProgress); } // file host blocks page reads (CORS) → manager request
    if (!response.ok) throw httpError(response.status, 'страница', response.url);
    if (/text\/html/i.test(response.headers.get('content-type'))) throw new Error('сервер вернул страницу вместо видео');
    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader(), chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress(loaded, total);
    }
    return new Blob(chunks, { type: SAVE_TYPE });
  }

  // Desktop fallback: Violentmonkey sends the site's cookies with this request (Userscripts on iOS does not → 403).
  function gmBlob(url, signal, onProgress) {
    const request = (typeof GM !== 'undefined' && GM.xmlHttpRequest) || (typeof GM_xmlhttpRequest !== 'undefined' && GM_xmlhttpRequest);
    if (!request) return Promise.reject(new Error('браузер заблокировал запрос, а GM.xmlHttpRequest недоступен'));
    return new Promise((resolve, reject) => {
      const aborted = () => reject(new DOMException('Отменено', 'AbortError'));
      const handle = request({
        method: 'GET', url, responseType: 'blob', headers: { Referer: location.href },
        onprogress: e => onProgress(e.loaded, e.lengthComputable ? e.total : 0),
        onload: r => {
          try {
            if (r.status < 200 || r.status >= 300) throw httpError(r.status, 'менеджер', r.finalUrl || r.responseURL);
            if (/text\/html/i.test(r.response?.type)) throw new Error('сервер вернул страницу вместо видео');
            resolve(toBlob(r.response));
          } catch (error) { reject(error); }
        },
        onerror: e => reject(new Error('сетевая ошибка' + (e?.error ? ': ' + e.error : ''))),
        ontimeout: () => reject(new Error('сервер не ответил вовремя')),
        onabort: aborted,
      });
      handle?.catch?.(() => {}); // GM.* returns a promise in some managers; errors already go through the callbacks
      signal.addEventListener('abort', () => { handle?.abort?.(); aborted(); }, { once: true });
    });
  }
})();
