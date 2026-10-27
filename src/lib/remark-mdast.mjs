// @ts-check
/**
 * remark 插件共用的最小 AST 形状：只声明本站读取到的字段，
 * 完整 mdast 类型需要引入未列入依赖的 vfile，这里按实际用法收敛。
 * @typedef {object} MdNode
 * @property {string} type
 * @property {string} [name] 指令名，如 icon、cards
 * @property {string} [value]
 * @property {string} [identifier]
 * @property {string} [url]
 * @property {string} [title]
 * @property {boolean | null} [checked]
 * @property {boolean} [ordered]
 * @property {Record<string, string>} [attributes]
 * @property {MdPosition} position
 * @property {MdNode[]} [children]
 * @typedef {{ start: { offset: number }, end: { offset: number } }} MdPosition
 * @typedef {object} MdFile
 * @property {unknown} value 源 Markdown 全文
 * @property {{ astro?: { frontmatter?: Record<string, unknown> } }} data
 * @property {(message: string, origin?: MdNode | MdPosition) => never} fail 总是抛出，因此调用后无需再 return
 */
export {};
