import english from '../../resources/lang/en_us.json';
import keywordSource from '../../resources/keywords.json';
import { roleData } from '$lib/game/roles';
import { optionalText, text } from './format';

interface Keyword { style?: string; link?: string; replacement?: string }
const configured: Record<string, Keyword | Keyword[]> = keywordSource;
let cachedLanguage = '';
let cachedKeywords = new Map<string, Keyword[]>();
let cachedMatcher = /(?:)/gu;

/** Escape plain text before placing it in generated keyword markup. */
export function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function keywordMap(): Map<string, Keyword[]> {
  const result = new Map<string, Keyword[]>();
  function add(key: string, data: Keyword[]): void {
    const value = optionalText(key);
    if (!value) return;
    result.set(value.toLowerCase(), data);
    for (let i = 0; ; i++) {
      const variant = optionalText(`${key}:var.${i}`);
      if (variant === null) break;
      result.set(variant.toLowerCase(), data.map(item => ({ ...item, replacement: item.replacement === value ? variant : item.replacement })));
    }
  }
  for (const key of Object.keys(english)) {
    const article = /^wiki\.article\.(standard|modifier|generated)\.(.+)\.title$/.exec(key);
    if (article) add(key, [{ style: 'keyword-info', link: `${article[1]}/${article[2]}` }]);
    const category = /^wiki\.category\.([^.]+)$/.exec(key);
    if (category && category[1] !== 'uncategorized') add(key, [{ style: 'keyword-info', link: `category/${category[1]}` }]);
  }
  for (const [role, data] of Object.entries(roleData)) {
    const faction = configured[data.roleSets.length === 1 ? data.roleSets[0] : data.mainRoleSet];
    if (!faction || Array.isArray(faction)) continue;
    add(`role.${role}.name`, [{ ...faction, link: `role/${role}`, replacement: text(`role.${role}.name`) }]);
  }
  for (const [key, value] of Object.entries(configured)) {
    add(key, (Array.isArray(value) ? value : [value]).map(item => ({ ...item, replacement: item.replacement === undefined ? undefined : text(item.replacement) })));
  }
  return result;
}

/** Original keyword colours and links; input is plain text, never HTML. */
export function styleText(value: string, noLinks = false): string {
  const language = text('language');
  if (cachedLanguage !== language) {
    cachedLanguage = language;
    cachedKeywords = keywordMap();
    const pattern = [...cachedKeywords.keys()].sort((a, b) => b.length - a.length).map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    cachedMatcher = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, 'giu');
  }
  let html = '';
  let offset = 0;
  for (const match of value.matchAll(cachedMatcher)) {
    html += escapeText(value.slice(offset, match.index));
    for (const keyword of cachedKeywords.get(match[0].toLowerCase()) ?? []) {
      const label = escapeText(keyword.replacement ?? match[0]);
      const content = `<span class="${escapeText(keyword.style ?? '')}" data-text="${label}">${label}</span>`;
      html += keyword.link && !noLinks ? `<a class="keyword-link" href="/wiki/${escapeText(keyword.link)}" data-wiki-page="${escapeText(keyword.link)}">${content}</a>` : content;
    }
    offset = match.index + match[0].length;
  }
  return html + escapeText(value.slice(offset));
}

/** Player mentions use the original numbered name badge, before keyword styling. */
export function stylePlayerText(value: string, players: string[], noLinks = false, sender = false, myIndex: number | null = null): string {
  const names = players.map((name, index) => ({name, index})).filter(player => player.name.length > 0).sort((a, b) => b.name.length - a.name.length);
  if (!names.length) return styleText(value, noLinks);
  const pattern = names.map(player => player.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const matcher = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, 'gu');
  let html = '';
  let offset = 0;
  for (const match of value.matchAll(matcher)) {
    html += styleText(value.slice(offset, match.index), noLinks);
    const player = names.find(player => player.name === match[0])!;
    const important = player.index === myIndex ? ' keyword-player-important' : '';
    const nameClass = (sender ? 'keyword-player-sender' : 'keyword-player') + important;
    html += `<span class="keyword-player-number${important}">${player.index + 1}</span> <span class="${nameClass}">${escapeText(player.name)}</span>`;
    offset = match.index + match[0].length;
  }
  return html + styleText(value.slice(offset), noLinks);
}
