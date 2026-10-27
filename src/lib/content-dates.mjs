// @ts-check
/**
 * 构建期内容日期：只比较已提交的正文、业务元数据和直接引用的本地图片。
 * 首次入库是历史基线，不把导入时间伪装成旧文章的更新时间。
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import ts from 'typescript';
import historicalUpdates from '../data/content-date-baselines.json' with { type: 'json' };
import { articleUrl } from './post-url.mjs';

/** front matter 只声明本站真正读取的字段，其余键保留为未知值。 */
/** @typedef {Record<string, unknown> & { pubDate?: string | Date, slug?: string, heroImage?: string, date?: any }} Frontmatter */
/** @typedef {{ created?: Date, modified?: Date, updated?: Date }} ContentDates */
/** @typedef {{ hash: string, date: Date, tree: Map<string, string>, renames: Map<string, string> }} Revision */
/** @typedef {{ revisions: Revision[], blobs: Map<string, string> }} History */
/** @typedef {{ revision: Revision, sourcePath: string, source: string, signature: string }} Snapshot */

const CONTENT_FIELDS = ['title', 'description', 'heroImage', 'authors', 'categories', 'tags', 'readtime'];
/** @type {Record<string, string[]>} */
const TOP_PAGES = {
  '/about/': ['src/pages/about.md', 'src/pages/blog/about.md'],
  '/links/': ['src/pages/links.astro', 'src/pages/links.md', 'src/pages/blog/links.md'],
};
const FRIENDS = 'src/data/friends.ts';
const MAX_BUFFER = 64 * 1024 * 1024;

/** @param {string} root @param {readonly string[]} args @param {string} [input] */
const git = (root, args, input) => execFileSync('git', args, {
  cwd: root, input, encoding: 'utf8', maxBuffer: MAX_BUFFER, stdio: ['pipe', 'pipe', 'pipe'],
});
/** @param {string} text */
const normalize = (text) => text.replace(/\r\n?/g, '\n').trim();
/** @param {string | Date | number | null | undefined} value */
const validDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? date : undefined;
};
/** @param {(Date | undefined)[]} dates */
const latest = (...dates) => dates.filter((date) => date !== undefined).sort((a, b) => b.valueOf() - a.valueOf())[0];

/** @param {string} source */
function markdown(source) {
  const text = normalize(source);
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const data = /** @type {Frontmatter} */ (match ? loadYaml(match[1]) ?? {} : {});
  return { data, body: match ? text.slice(match[0].length).trim() : text };
}

/** @param {Frontmatter} data */
function contentMetadata(data) {
  return Object.fromEntries(CONTENT_FIELDS.map((key) => [key, data[key] ?? (
    key === 'authors' ? ['gytxtx'] : key === 'categories' || key === 'tags' ? [] : null
  )]));
}

// 不执行历史版本的 TS；只读取 friends 的字面量数据，排除注释、类型和代码排版。
/** @param {string} source */
function friendData(source) {
  const file = ts.createSourceFile(FRIENDS, source, ts.ScriptTarget.Latest, true);
  /** @param {ts.Node} node @returns {string | unknown[] | Record<string, unknown>} */
  function literal(node) {
    if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map((element) => literal(element));
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map((property) => {
      if (!ts.isPropertyAssignment(property)) throw new Error('友链数据必须使用字面量对象');
      return /** @type {[string, unknown]} */ ([property.name.getText(file).replace(/^['"]|['"]$/g, ''), literal(property.initializer)]);
    }).sort(([a], [b]) => a.localeCompare(b)));
    throw new Error('友链数据必须使用字面量数组、对象和字符串');
  }
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const variable = statement.declarationList.declarations.find((entry) => entry.name.getText(file) === 'friends');
    if (variable?.initializer) return literal(variable.initializer);
  }
  throw new Error('未找到 friends 数据');
}

/** @param {string} source */
function astroContent(source) {
  // 友链页是薄模板：内容数据单独比较；样式、导入、类名不属于内容。
  const body = normalize(source).replace(/^---\n[\s\S]*?\n---(?:\n|$)/, '')
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:class(?::list)?|style|data-[\w-]+|transition:[\w-]+)=(?:"[^"]*"|'[^']*'|\{[^}]*\})/g, '');
  return normalize(body);
}

/** @param {string} reference @param {string} sourcePath */
function localImage(reference, sourcePath) {
  let url = reference.trim().replace(/^<|>$/g, '').split(/[?#]/)[0];
  if (!url || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(url)) return undefined;
  try { url = decodeURIComponent(url); } catch { return undefined; }
  const resolved = url.startsWith('/') ? `public${url}` : path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), url));
  return resolved.startsWith('../') ? undefined : resolved;
}

/** @param {string} body @param {Frontmatter} data */
function imageReferences(body, data) {
  // fenced/inline code 中的示例路径不是页面资源。
  const prose = body.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '')
    .replace(/`+[^`\n]*`+/g, '');
  /** @type {string[]} */
  const references = [];
  for (const match of prose.matchAll(/!\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g)) references.push(match[1]);
  const definitions = new Map([...prose.matchAll(/^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm)]
    .map((match) => [match[1].toLowerCase(), match[2]]));
  for (const match of prose.matchAll(/!\[([^\]]*)\](?:\[([^\]]*)\])?(?!\()/g)) {
    const reference = definitions.get((match[2] || match[1]).toLowerCase());
    if (reference) references.push(reference);
  }
  for (const match of prose.matchAll(/<(?:img|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) references.push(match[1]);
  if (typeof data.heroImage === 'string') references.push(data.heroImage);
  return references;
}

/**
 * @param {string} sourcePath
 * @param {string} source
 * @param {Map<string, string>} tree
 * @param {unknown} friends
 */
function signature(sourcePath, source, tree, friends) {
  const isAstro = sourcePath.endsWith('.astro');
  const { data, body } = isAstro ? { data: /** @type {Frontmatter} */ ({}), body: astroContent(source) } : markdown(source);
  const images = imageReferences(body, data).map((reference) => {
    const image = localImage(reference, sourcePath);
    return image ? tree.get(image) ?? null : null;
  });
  return JSON.stringify([contentMetadata(data), body, images, friends]);
}

/** 读取第一父链的快照，合并提交按合入时的内容计算；Git worktree 也由 Git 自己解析。 */
/** @param {string} root @param {string} shallow */
function readHistory(root, shallow) {
  if (shallow !== 'false') {
    throw new Error('浅克隆缺少完整历史，请使用 git fetch --unshallow（CI 使用 fetch-depth: 0）');
  }
  const lines = git(root, ['log', '--first-parent', '--reverse', '--format=%H%x09%cI%x09%P', 'HEAD']).trim().split('\n');
  /** @type {Revision[]} */
  const revisions = [];
  /** @type {Map<string, string>} */
  let tree = new Map();
  /** @type {Set<string>} */
  const textIds = new Set();
  for (const line of lines) {
    const [hash, timestamp, parents] = line.split('\t');
    const parent = parents?.split(' ')[0];
    const args = ['diff-tree', '--no-commit-id', '--raw', '-z', '-r', '--no-abbrev', '-M'];
    const fields = git(root, [...args, ...(parent ? [parent, hash] : ['--root', hash])]).split('\0');
    tree = new Map(tree);
    /** @type {Map<string, string>} */
    const renames = new Map();
    for (let i = 0; i < fields.length - 1;) {
      const [, , , newId, status] = fields[i++].split(' ');
      const oldPath = fields[i++];
      const newPath = /^[RC]/.test(status) ? fields[i++] : oldPath;
      if (status.startsWith('R')) {
        tree.delete(oldPath);
        renames.set(newPath, oldPath);
      }
      if (status === 'D') tree.delete(oldPath);
      else tree.set(newPath, newId);
      if ((newPath.startsWith('src/content/blog/') && newPath.endsWith('.md')) ||
          Object.values(TOP_PAGES).some((aliases) => aliases.includes(newPath)) || newPath === FRIENDS) textIds.add(newId);
    }
    revisions.push({ hash, date: new Date(timestamp), tree, renames });
  }
  // 一次批量读取文本 blob；图片只比较 Git 对象 ID，无须解码或读取二进制。
  const ids = [...textIds].filter((id) => !/^0+$/.test(id));
  const output = execFileSync('git', ['cat-file', '--batch'], {
    cwd: root, input: `${ids.join('\n')}\n`, maxBuffer: MAX_BUFFER, stdio: ['pipe', 'pipe', 'pipe'],
  });
  /** @type {Map<string, string>} */
  const blobs = new Map();
  let offset = 0;
  for (const id of ids) {
    const end = output.indexOf(10, offset);
    const size = Number(output.subarray(offset, end).toString().split(' ')[2]);
    if (!Number.isFinite(size)) throw new Error(`无法读取 Git 对象 ${id}`);
    blobs.set(id, output.subarray(end + 1, end + 1 + size).toString('utf8'));
    offset = end + 1 + size + 1;
  }
  return { revisions, blobs };
}

/**
 * @param {History} history
 * @param {string} currentPath
 * @param {string[]} aliases
 * @param {Record<string, string>} baselines
 */
function historyDates(history, currentPath, aliases, baselines) {
  const { revisions, blobs } = history;
  /** @type {Snapshot[]} */
  const snapshots = [];
  let sourcePath = currentPath;
  // 逆向追踪 rename；友链从 Markdown 拆成 Astro + TS，显式记录这条旧路径链。
  for (let i = revisions.length - 1; i >= 0; i--) {
    const revision = revisions[i];
    if (!revision.tree.has(sourcePath)) sourcePath = aliases.find((candidate) => revision.tree.has(candidate)) ?? sourcePath;
    const id = revision.tree.get(sourcePath);
    const source = id === undefined ? undefined : blobs.get(id);
    if (id && source !== undefined) {
      const friendsId = revision.tree.get(FRIENDS);
      const friends = sourcePath.endsWith('.astro') && currentPath === 'src/pages/links.astro' && friendsId
        ? friendData(blobs.get(friendsId) ?? '') : undefined;
      snapshots.push({ revision, sourcePath, source, signature: signature(sourcePath, source, revision.tree, friends) });
    }
    sourcePath = revision.renames.get(sourcePath) ?? sourcePath;
  }
  snapshots.reverse();
  if (!snapshots.length) return {};
  const first = snapshots[0];
  const committed = currentPath.endsWith('.astro') ? /** @type {Frontmatter} */ ({}) : markdown(snapshots[snapshots.length - 1].source).data;
  const published = validDate(committed.pubDate ?? committed.date?.created ?? committed.date);
  // 历史手填值只作为迁移前的日期基线；单独维护日期字段不会产生 Git 内容变更。
  const historical = latest(...snapshots.map(({ sourcePath: file }) => validDate(baselines[file])));
  let updated = historical;
  for (let i = 1; i < snapshots.length; i++) {
    if (snapshots[i].signature !== snapshots[i - 1].signature) updated = latest(updated, snapshots[i].revision.date);
  }
  const created = published ?? first.revision.date;
  return { created, modified: latest(created, updated), updated: updated && updated > created ? updated : undefined };
}

/** @param {string} dir @returns {string[]} */
function listMarkdown(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? listMarkdown(file) : entry.name.endsWith('.md') ? [file] : [];
    });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return [];
    throw error;
  }
}

/** 注入仓库路径和警告接收器，便于用临时 Git 仓库验证真实提交历史。 */
/**
 * @param {string} root
 * @param {{ warn?: (message: string) => void, baselines?: Record<string, string> }} [options]
 */
export function createContentDates(root, { warn = console.warn, baselines = historicalUpdates } = {}) {
  let cacheKey = '';
  /** @type {History | undefined} */
  let history;
  let warned = false;
  /** @type {Map<string, ContentDates>} */
  const values = new Map();
  function refresh() {
    let key;
    try { key = git(root, ['rev-parse', 'HEAD', '--is-shallow-repository']).trim(); } catch { key = 'unavailable'; }
    if (key !== cacheKey) {
      cacheKey = key;
      values.clear();
      try {
        if (key === 'unavailable') throw new Error('Git 不可用或当前目录没有 Git 仓库');
        history = readHistory(root, key.split('\n')[1]);
      } catch (error) {
        history = undefined;
        if (!warned) {
          warn(`[content-dates] 无法读取完整 Git 历史，回退到已有历史日期，不使用构建时间。${error instanceof Error ? error.message : String(error)}`);
          warned = true;
        }
      }
    }
  }
  /** @param {string} sourcePath @param {string[]} aliases @param {Frontmatter} [fallback] */
  function datesFor(sourcePath, aliases, fallback) {
    const committed = history;
    if (!committed) {
      const created = validDate(fallback?.pubDate);
      const updated = validDate(baselines[sourcePath]);
      return { created, modified: latest(created, updated), updated: updated && created && updated > created ? updated : undefined };
    }
    let dates = values.get(sourcePath);
    if (!dates) {
      dates = historyDates(committed, sourcePath, aliases, baselines);
      // 尚未提交的新文章可以使用其已声明的发布日期，但没有 Git 更新记录。
      if (!dates.created && fallback?.pubDate) dates.created = dates.modified = validDate(fallback.pubDate);
      values.set(sourcePath, dates);
    }
    return dates;
  }
  return {
    /** 当前路径只负责匹配 URL；有 Git 时，日期全部来自提交快照，忽略工作区日期改动。 */
    all() {
      refresh();
      /** @type {Map<string, ContentDates>} */
      const pages = new Map();
      for (const file of listMarkdown(path.join(root, 'src/content/blog'))) {
        const { data } = markdown(readFileSync(file, 'utf8'));
        const published = validDate(data.pubDate);
        if (!published || !data.slug) continue;
        const url = articleUrl(published, String(data.slug));
        const sourcePath = path.relative(root, file).split(path.sep).join('/');
        pages.set(url, datesFor(sourcePath, [], data));
      }
      for (const [url, aliases] of Object.entries(TOP_PAGES)) pages.set(url, datesFor(aliases[0], aliases));
      return pages;
    },
  };
}

/** @type {ReturnType<typeof createContentDates> | undefined} */
let defaultDates;
/** @param {string} pathname */
export function getPageDates(pathname) {
  defaultDates ??= createContentDates(process.cwd());
  return defaultDates.all().get(pathname) ?? {};
}
