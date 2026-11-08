// One-off migration of src/ui/styles.css for phones (safe to run again: it changes nothing that is already done):
//  1. :hover only where a mouse exists. On a touch screen a tap leaves the button "hovered" until the next tap elsewhere, so
//     every rule with :hover goes under @media (hover: hover).
//  2. Heights in vh get a dvh twin after them. On a phone browser 100vh is taller than what is visible (the address bar), dvh
//     is the visible height; the vh line stays as the fallback for engines that do not know dvh.
//   node scripts/mobile-css.mjs
import fs from 'node:fs';
import postcss from 'postcss';

const file = new URL('../src/ui/styles.css', import.meta.url);
const css = fs.readFileSync(file, 'utf8');
const root = postcss.parse(css);
let hovered = 0, dvh = 0;

const inHoverMedia = n => { for (let p = n.parent; p; p = p.parent) if (p.type === 'atrule' && p.name === 'media' && /hover\s*:\s*hover/.test(p.params)) return true; return false; };
const inKeyframes = n => { for (let p = n.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes/.test(p.name)) return true; return false; };

root.walkRules(rule => {
  if (inKeyframes(rule) || inHoverMedia(rule)) return;
  const sels = rule.selectors;
  const withHover = sels.filter(s => /:hover\b/.test(s));
  if (!withHover.length) return;
  const rest = sels.filter(s => !/:hover\b/.test(s));
  const media = postcss.atRule({name: 'media', params: '(hover: hover)', raws: {before: rule.raws.before}});
  const moved = rule.clone({selectors: withHover});
  moved.raws.before = '\n';
  media.append(moved);
  if (rest.length) { rule.selectors = rest; rule.after(media); }
  else rule.replaceWith(media);
  hovered++;
});

root.walkDecls(/^(height|min-height|max-height)$/, decl => {
  if (!/\d(\.\d+)?vh\b/.test(decl.value) || /dvh/.test(decl.value)) return;
  const next = decl.next();
  const twin = decl.value.replace(/(\d(?:\.\d+)?)vh\b/g, '$1dvh');
  if (next && next.type === 'decl' && next.prop === decl.prop && next.value === twin) return;
  decl.after(decl.clone({value: twin, raws: {before: decl.raws.before}}));
  dvh++;
});

fs.writeFileSync(file, root.toString());
console.log(`hover rules moved under (hover: hover): ${hovered}; vh heights given a dvh twin: ${dvh}`);
