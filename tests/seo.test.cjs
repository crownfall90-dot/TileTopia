// Search visibility: the About pages carry the tags a search engine reads, and the test build is never indexed.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = f => fs.readFileSync(__dirname + '/../' + f, 'utf8');

test('seo: About pages have a title, description, canonical, hreflang, Open Graph and structured data', () => {
  for (const [f, lang] of [['web/about.html', 'ru'], ['web/about-en.html', 'en']]) {
    const h = read(f);
    assert.match(h, new RegExp(`<html lang="${lang}"`));
    const title = h.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(title.includes('Tiletopia') && title.length <= 110, f + ' title: ' + title.length);
    const desc = h.match(/<meta name="description" content="(.*?)">/)[1];
    assert.ok(desc.length >= 80 && desc.length <= 300, f + ' description: ' + desc.length);
    assert.match(h, /<link rel="canonical" href="https:\/\/crownfall90-dot\.github\.io\/TileTopia\/about(-en)?\.html">/);
    assert.match(h, /hreflang="x-default"/);
    assert.match(h, /property="og:image" content="https:\/\//, 'Open Graph image is an absolute address');
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld['@type'], 'VideoGame');
    assert.equal(ld.offers.price, '0');
    assert.equal((h.match(/<h1>/g) || []).length, 1, 'one h1');
    for (const img of h.match(/<img [^>]*>/g)) assert.match(img, /alt="[^"]+"/, 'every picture has a text alternative');
  }
});

test('seo: the build writes robots.txt and sitemap.xml and keeps the test build out of search', () => {
  const sh = read('scripts/wrap-web.sh'), seo = read('scripts/seo.py');
  assert.match(seo, /Sitemap: /);
  for (const dir of ['staging', 'admin', 'tiles', 'store']) assert.ok(seo.includes(dir + '/'), dir + ' is disallowed');
  assert.match(sh, /scripts\/seo\.py/);
  assert.match(sh, /IS_STAGING = true[^\n]*\n\s*printf '<meta name="robots" content="noindex,nofollow">/, 'the test page says noindex');
  assert.match(sh, /<link rel="canonical" href="https:\/\/crownfall90-dot\.github\.io\/TileTopia\/">/);
});
