// dsh-prompt-templates —— 宿主半：模板 + 分类的存储、HTTP 端点、AI 归类。
//
// 存储：~/.dsh/prompt-templates.json
//   {
//     version: 3,
//     categories: [ { id, name, nameEn?, icon?, color?, order, collapsed? } ],
//     items:      [ { id, icon, title, desc, prompt, command?, category?, tags?, favorite?, hidden? } ],
//     ui:         { collapsed: { [categoryId]: boolean } }
//   }
//   内置模板用 `pi-*` id，可被同 id 覆盖；hidden:true 表示「移出模板库」。
//
// 端点：
//   GET  /__prompt-templates/list                    -> { items, builtin, categories, ui }
//   POST /__prompt-templates/mutate  { action, ... } -> { items, categories, ui }
//        action: upsert | remove | reset | migrate | move
//              | category/add | category/update | category/remove | category/reorder
//              | ui/collapse
//   POST /__prompt-templates/classify { ids?, force? } -> { suggestions: [...] }
//        用 dsh 自带的 llm 服务分析模板用途，只返回建议，不写盘。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-prompt-templates'
export const inject = []

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BUILTIN_FILE = path.join(HERE, 'builtin-templates.json')

/** 首次使用的初始分类；只用于初始化，之后完全由用户数据决定（不写死在逻辑里）。 */
const DEFAULT_CATEGORIES = [
  { id: 'mind', name: '思维模型', nameEn: 'Mindset', icon: '🧠', order: 0 },
  { id: 'dev', name: '开发编程', nameEn: 'Development', icon: '💻', order: 1 },
  { id: 'image', name: 'AI 生图', nameEn: 'Image generation', icon: '🎨', order: 2 },
  { id: 'video', name: '视频创作', nameEn: 'Video', icon: '🎬', order: 3 },
  { id: 'study', name: '学习研究', nameEn: 'Study & research', icon: '📚', order: 4 },
  { id: 'writing', name: '写作创作', nameEn: 'Writing', icon: '✍️', order: 5 },
  { id: 'work', name: '工作效率', nameEn: 'Productivity', icon: '⚡', order: 6 },
  { id: 'other', name: '其他', nameEn: 'Other', icon: '📦', order: 7 },
]

function storageFile() {
  return process.env.DSH_PROMPT_TEMPLATES_FILE || path.join(os.homedir(), '.dsh', 'prompt-templates.json')
}

function loadBuiltin() {
  try {
    const doc = JSON.parse(fs.readFileSync(BUILTIN_FILE, 'utf8'))
    return {
      templates: Array.isArray(doc.templates) ? doc.templates : [],
      categories: Array.isArray(doc.categories) ? doc.categories : [],
    }
  } catch (error) {
    console.error('[dsh-prompt-templates] builtin templates unreadable:', String(error))
    return { templates: [], categories: [] }
  }
}

function clamp(value, max) {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

function emptyDoc() {
  return { version: 3, categories: [], items: [], ui: { collapsed: {} } }
}

function parseTags(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((tag) => clamp(tag, 40).trim())
      .filter(Boolean)
      .slice(0, 20)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,，;；\n]/)
      .map((tag) => clamp(tag, 40).trim())
      .filter(Boolean)
      .slice(0, 20)
  }
  return []
}

function parseItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = clamp(raw.id, 200)
  if (!id) return null
  if (raw.hidden === true) return { id, hidden: true }
  const item = { id }
  for (const key of ['icon', 'title', 'desc', 'command', 'prompt', 'category']) {
    if (raw[key] !== undefined) item[key] = clamp(raw[key], key === 'prompt' ? 100000 : 4000)
  }
  if (!item.title || !item.prompt) return null
  if (raw.tags !== undefined) item.tags = parseTags(raw.tags)
  if (raw.favorite === true) item.favorite = true
  return item
}

function parseCategory(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = clamp(raw.id, 120).trim()
  const name = clamp(raw.name, 60).trim()
  if (!id || !name) return null
  const category = { id, name }
  if (raw.nameEn !== undefined) category.nameEn = clamp(raw.nameEn, 60)
  if (raw.icon !== undefined) category.icon = clamp(raw.icon, 8)
  if (raw.color !== undefined) category.color = clamp(raw.color, 32)
  if (Number.isFinite(raw.order)) category.order = Math.trunc(raw.order)
  return category
}

function readDoc() {
  const file = storageFile()
  let text = null
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[dsh-prompt-templates] read failed:', String(error))
  }
  if (typeof text === 'string' && text.length > 0) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
    try {
      const parsed = JSON.parse(text)
      if (parsed && Array.isArray(parsed.items)) {
        const doc = {
          version: 3,
          categories: Array.isArray(parsed.categories)
            ? parsed.categories.map(parseCategory).filter(Boolean)
            : [],
          items: parsed.items.map(parseItem).filter(Boolean),
          ui: parsed.ui && typeof parsed.ui === 'object' ? parsed.ui : { collapsed: {} },
        }
        if (!doc.ui.collapsed || typeof doc.ui.collapsed !== 'object') doc.ui.collapsed = {}
        if (doc.categories.length === 0) doc.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }))
        // 迁移：新版本新增的初始分类，对老数据补一次（只补缺失项，不改动用户已有分类）。
        addMissingDefaultCategories(doc)
        return doc
      }
    } catch (error) {
      console.error('[dsh-prompt-templates] storage corrupt, starting fresh:', String(error))
    }
  }
  return { ...emptyDoc(), categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })) }
}

/** 把当前版本新增的初始分类补给旧数据；已有的同名/同 id 分类保持不变。 */
function addMissingDefaultCategories(doc) {
  const present = new Set(doc.categories.map((category) => category.id))
  const missing = DEFAULT_CATEGORIES.filter((category) => !present.has(category.id))
  if (missing.length === 0) return doc

  // 旧数据的 order 可能已是 0..n，直接沿用默认 order 会与已有分类并列，
  // 按默认顺序落点的相对位置重新插入：整体前移，保证新分类排在它该在的位置。
  const existingOrders = doc.categories.map((category) => category.order ?? 0)
  const minExisting = existingOrders.length ? Math.min(...existingOrders) : 0
  for (const category of missing) {
    // 新分类取默认顺序的负偏移，天然排在已有分类之前且彼此有序
    doc.categories.push({ ...category, order: (category.order ?? 0) - DEFAULT_CATEGORIES.length + minExisting })
  }
  doc.categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  // 排序后统一重新编号，避免负数/重复 order 影响后续手动排序
  doc.categories.forEach((category, index) => {
    category.order = index
  })
  try {
    writeDoc(doc)
  } catch (error) {
    console.error('[dsh-prompt-templates] category migration write failed:', String(error))
  }
  return doc
}

function writeDoc(doc) {
  const file = storageFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

function categoryExists(doc, id) {
  return doc.categories.some((category) => category.id === id)
}

function applyMutation(body) {
  const doc = readDoc()
  const action = typeof body?.action === 'string' ? body.action : ''
  switch (action) {
    case 'upsert': {
      const item = parseItem(body.template)
      if (!item) throw new Error('invalid template')
      if (item.category && !categoryExists(doc, item.category)) item.category = ''
      doc.items = [...doc.items.filter((entry) => entry.id !== item.id), item]
      break
    }
    case 'remove': {
      const id = clamp(body.id, 200)
      if (!id) throw new Error('invalid template id')
      doc.items = doc.items.filter((entry) => entry.id !== id)
      break
    }
    case 'reset': {
      doc.items = []
      doc.ui.collapsed = {}
      break
    }
    case 'migrate': {
      // 旧版浏览器数据导入：只在本地没有记录时写入。
      if (doc.items.length === 0 && Array.isArray(body.templates)) {
        doc.items = body.templates.map(parseItem).filter(Boolean)
      }
      break
    }
    case 'move': {
      // 批量移动模板到某个分类（'' 或 'none' 表示未分类）。
      const target = body.category === 'none' ? '' : clamp(body.category, 120)
      if (target && !categoryExists(doc, target)) throw new Error('unknown category')
      const ids = new Set(Array.isArray(body.ids) ? body.ids.map((id) => clamp(id, 200)) : [])
      if (!ids.size) throw new Error('no template ids')
      doc.items = doc.items.map((entry) => {
        if (!ids.has(entry.id)) return entry
        // 内置模板需要写一条覆盖记录，才能记住新的分类。
        if (entry.hidden) return entry
        return { ...entry, category: target }
      })
      break
    }
    case 'category/add': {
      const category = parseCategory({
        ...body.category,
        order: doc.categories.length,
      })
      if (!category) throw new Error('invalid category')
      if (categoryExists(doc, category.id)) throw new Error('category already exists')
      doc.categories = [...doc.categories, category]
      break
    }
    case 'category/update': {
      const id = clamp(body.id, 120)
      const index = doc.categories.findIndex((category) => category.id === id)
      if (index < 0) throw new Error('unknown category')
      const next = parseCategory({ ...doc.categories[index], ...body.patch, id })
      if (!next) throw new Error('invalid category')
      doc.categories[index] = next
      break
    }
    case 'category/remove': {
      const id = clamp(body.id, 120)
      if (!categoryExists(doc, id)) throw new Error('unknown category')
      // 删除分类不允许丢模板：要么移到指定分类，要么落到未分类。
      const target = body.reassignTo === 'none' ? '' : clamp(body.reassignTo, 120)
      if (target && !categoryExists(doc, target)) throw new Error('unknown target category')
      const moves = []
      doc.items = doc.items.map((entry) => {
        if (entry.category !== id) return entry
        moves.push(entry.id)
        return { ...entry, category: target }
      })
      doc.categories = doc.categories.filter((category) => category.id !== id)
      delete doc.ui.collapsed[id]
      doc.lastRemoval = { categoryId: id, reassignedTo: target, count: moves.length }
      break
    }
    case 'category/reorder': {
      const order = Array.isArray(body.order) ? body.order.map((id) => clamp(id, 120)) : []
      const position = new Map(order.map((id, index) => [id, index]))
      doc.categories = [...doc.categories]
        .sort((a, b) => {
          const ai = position.has(a.id) ? position.get(a.id) : Number.MAX_SAFE_INTEGER
          const bi = position.has(b.id) ? position.get(b.id) : Number.MAX_SAFE_INTEGER
          return ai - bi
        })
        .map((category, index) => ({ ...category, order: index }))
      break
    }
    case 'ui/collapse': {
      const id = clamp(body.categoryId, 120)
      if (!id) throw new Error('invalid category id')
      doc.ui.collapsed[id] = body.collapsed === true
      break
    }
    default:
      throw new Error(`unknown action: ${action}`)
  }
  writeDoc(doc)
  return doc
}

// ---------------------------------------------------------------- AI 归类

const CLASSIFY_SYSTEM = [
  '你是提示词模板整理助手。给定一个提示词模板的标题、说明和正文，判断它最合适的分类与细分标签。',
  '只输出一个 JSON 对象，不要输出任何解释或代码块标记。',
  '格式：{"category":"分类名","tags":["标签1","标签2"]}',
  '要求：category 必须从给定分类列表中原样选择一项；确实无法判断时输出 "未分类"。',
  'tags 给 2 到 5 个简短中文标签，描述具体用途。',
].join('\n')

function buildClassifyPrompt(template, categoryNames) {
  const excerpt = String(template.prompt || '').slice(0, 1200)
  return [
    `可用分类：${categoryNames.join('、')}`,
    '',
    `标题：${template.title || ''}`,
    `说明：${template.desc || ''}`,
    '正文：',
    excerpt,
  ].join('\n')
}

function parseClassifyReply(text, categoryNames) {
  const raw = String(text || '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let parsed
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
  const category = typeof parsed.category === 'string' ? parsed.category.trim() : ''
  const tags = parseTags(parsed.tags)
  return {
    // 模型返回了列表外的分类时视为无法判断，不强行归类。
    category: categoryNames.includes(category) ? category : '未分类',
    tags,
  }
}

async function classifyOne(llm, provider, model, template, categoryNames) {
  const stream = llm.stream({
    provider,
    model,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: 'user', content: [{ type: 'text', text: buildClassifyPrompt(template, categoryNames) }] }],
    maxTokens: 300,
  })
  let text = ''
  for await (const chunk of stream) {
    if (chunk.type === 'text-delta') text += chunk.text
    if (chunk.type === 'finish' && chunk.reason?.kind === 'error') {
      throw new Error(chunk.reason.failure?.message || 'model call failed')
    }
  }
  return parseClassifyReply(text, categoryNames)
}

export function apply(ctx) {
  const builtinDoc = loadBuiltin()
  // 内置 id 集合：不再依赖任何前缀约定，改由数据本身决定。
  const builtinIds = new Set(builtinDoc.templates.map((tpl) => tpl.id))

  const sendJson = (res, status, payload) => {
    const body = JSON.stringify(payload)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      'cache-control': 'no-store',
    })
    res.end(body)
  }

  const readBody = async (req) => {
    let raw = ''
    try {
      for await (const chunk of req) raw += chunk
    } catch {
      /* ignore */
    }
    if (!raw) return {}
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  const registerHttp = (server, scope) => {
    scope.effect(() =>
      server.register({
        kind: 'exact',
        path: '/__prompt-templates/list',
        handler: async (req, res) => {
          if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' })
          try {
            const doc = readDoc()
            sendJson(res, 200, {
              items: doc.items,
              builtin: builtinDoc.templates,
              builtinCategories: builtinDoc.categories,
              categories: doc.categories,
              ui: doc.ui,
            })
          } catch (error) {
            sendJson(res, 500, { error: String(error?.message ?? error) })
          }
        },
      }),
    )

    scope.effect(() =>
      server.register({
        kind: 'exact',
        path: '/__prompt-templates/mutate',
        handler: async (req, res) => {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })
          if (req.headers['sec-fetch-site'] === 'cross-site') {
            return sendJson(res, 403, { error: 'cross-site template write rejected' })
          }
          try {
            const doc = applyMutation(await readBody(req))
            sendJson(res, 200, { items: doc.items, categories: doc.categories, ui: doc.ui })
          } catch (error) {
            sendJson(res, 400, { error: String(error?.message ?? error) })
          }
        },
      }),
    )

    scope.effect(() =>
      server.register({
        kind: 'exact',
        path: '/__prompt-templates/classify',
        handler: async (req, res) => {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })
          if (req.headers['sec-fetch-site'] === 'cross-site') {
            return sendJson(res, 403, { error: 'cross-site write rejected' })
          }
          const llm = ctx.get('llm')
          if (!llm) return sendJson(res, 503, { error: 'llm service unavailable' })
          try {
            const body = await readBody(req)
            const doc = readDoc()
            const categoryNames = doc.categories.map((category) => category.name)
            // 候选模板：显式 ids，否则全部内置 + 自定义。
            const pool = builtinDoc.templates
              .filter((tpl) => !doc.items.some((item) => item.id === tpl.id && item.hidden))
              .map((tpl) => {
                const override = doc.items.find((item) => item.id === tpl.id) || {}
                return { ...tpl, ...override, builtin: true }
              })
              .concat(doc.items.filter((item) => !item.hidden && !builtinIds.has(item.id)))
            const ids = Array.isArray(body.ids) ? body.ids : null
            const candidates = ids ? pool.filter((tpl) => ids.includes(tpl.id)) : pool
            // 提供商/模型优先用调用方传入；否则取 dsh 当前已注册的第一个路由，
            // 避免把某个提供商写死（用户可以在设置里随时换）。
            let provider = clamp(body.provider, 80)
            let model = clamp(body.model, 120)
            if (!provider || !model) {
              const first = await pickDefaultRoute(llm)
              if (!first) return sendJson(res, 503, { error: 'no LLM provider registered' })
              provider = provider || first.provider
              model = model || first.model
            }
            const limit = Math.min(Number.isFinite(body.limit) ? body.limit : 40, 80)
            const suggestions = []
            for (const tpl of candidates.slice(0, limit)) {
              try {
                const verdict = await classifyOne(llm, provider, model, tpl, categoryNames)
                if (verdict) suggestions.push({ id: tpl.id, ...verdict })
              } catch (error) {
                suggestions.push({ id: tpl.id, error: String(error?.message ?? error) })
              }
            }
            sendJson(res, 200, { suggestions })
          } catch (error) {
            sendJson(res, 500, { error: String(error?.message ?? error) })
          }
        },
      }),
    )
  }

  const ws = ctx.get('webServer')
  if (ws !== undefined) {
    registerHttp(ws, ctx)
  } else {
    ctx.inject(['webServer'], (sub) => registerHttp(sub.webServer, sub))
  }

  console.log('[dsh-prompt-templates] host ready, storage at', storageFile(), `(${builtinDoc.templates.length} builtin)`)
}

/**
 * 选择默认调用路由：取 dsh 当前注册的第一个提供商，及其首个可用模型。
 * 不写死任何提供商名，用户改设置后自然跟随。
 */
async function pickDefaultRoute(llm) {
  let providers = []
  try {
    providers = llm.listProviders() || []
  } catch {
    return null
  }
  for (const info of providers) {
    try {
      const models = await llm.listModels(info.id)
      const modelId = Array.isArray(models) && models.length ? models[0].id : ''
      if (modelId) return { provider: info.id, model: modelId }
    } catch {
      /* try next provider */
    }
  }
  return providers.length ? { provider: providers[0].id, model: '' } : null
}
