// node tests/check.cjs — checks parsing of the player config against a sample page fragment.
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert');
// The userscript exports its pure helpers when loaded as CommonJS; copy it to .cjs so Node loads it that way.
const copy = path.join(os.tmpdir(), '3dpd-downloader-test.cjs');
fs.copyFileSync(path.join(__dirname, '..', '3dpd-downloader.user.js'), copy);
const { readSources, pickUrl, labelBytes, ownFileUrls, httpError, toBlob } = require(copy);

(async () => {
  const { title, urls } = readSources(fs.readFileSync(path.join(__dirname, 'fixture.html'), 'utf8'));
  assert.equal(title, 'Sample Video');
  assert.equal(urls.length, 4);
  for (const [label, suffix] of [['4K, 137.38 Mb', '_4k.mp4'], ['1080p, 51.91 Mb', '_1080p.mp4'], ['720p, 53.17 Mb', '_720p.mp4'], ['480p, 18.74 Mb', '_480p.mp4']])
    assert.ok(pickUrl(label, urls).includes(suffix), label);
  assert.equal(pickUrl('1440p, 1 Mb', urls), undefined);
  // Only the page's own /get_file/ URLs survive: no other hosts, schemes or paths.
  assert.equal(ownFileUrls(urls, 'https://example.com').length, 4);
  assert.deepEqual(ownFileUrls(['https://evil.test/get_file/1_480p.mp4/', 'http://example.com/get_file/1_480p.mp4/',
    'https://example.com/api/secret_480p.mp4', 'https://example.com.evil.test/get_file/x', 'not a url'], 'https://example.com'), []);
  assert.equal(readSources('<html>no player here</html>').urls.length, 0);
  assert.equal(Math.round(labelBytes('4K, 137.38 Mb')), Math.round(137.38 * 1048576));
  assert.equal(readSources(String.raw`flashvars = { video_title: 'It\'s ok', video_url: 'https://x/1_480p.mp4/' };`).title, "It's ok");
  // Whatever the manager returns, the saved file is octet-stream.
  for (const input of [new Blob([new Uint8Array([1, 2, 3])], { type: 'video/mp4' }), new Uint8Array([1, 2, 3]).buffer, new Uint8Array([1, 2, 3])]) {
    const blob = toBlob(input);
    assert.equal(blob.type, 'application/octet-stream');
    assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1, 2, 3]);
  }
  assert.throws(() => toBlob('text body'), /текст/);
  assert.equal(httpError(403, 'страница', 'https://cdn.example.com/x.mp4?t=secret').message, 'сервер ответил 403 (страница, cdn.example.com)');
  assert.equal(httpError(403, 'страница', undefined).message, 'сервер ответил 403 (страница)');
  console.log('tests passed');
})().catch(error => { console.error(error); process.exit(1); });
