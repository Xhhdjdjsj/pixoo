import type { CompositionFormat, CompositionItem, DetailSize, LibraryComponent, PaletteScheme } from '../../types/composition'
import type { CanvasObject } from '../../types/svg'

export const FORMATS: CompositionFormat[] = [
  { id: 'wide', name: 'Горизонтальный', width: 1200, height: 800, description: '3:2 · презентация, статья' },
  { id: 'square', name: 'Квадрат', width: 1080, height: 1080, description: '1:1 · соцсети' },
  { id: 'portrait', name: 'Вертикальный', width: 1080, height: 1350, description: '4:5 · вертикальная публикация' },
]

export const STARTER_PALETTES: PaletteScheme[] = [
  { id: 'lavender', name: 'Лаванда', objectColors: ['#F2D477', '#E884A8', '#6B4EE8', '#32303A'], backgroundColors: ['#D7CDF5', '#AA9BF0', '#7864D7'] },
  { id: 'peach', name: 'Персик', objectColors: ['#E9C85D', '#E98C68', '#5145B7', '#35333A'], backgroundColors: ['#FDD7B9', '#FAC896', '#D27532'] },
  { id: 'aqua', name: 'Аква', objectColors: ['#EAC95E', '#E07E9B', '#188D91', '#30363B'], backgroundColors: ['#BEEBEB', '#80DADA', '#5ABEBE'] },
]

const SYNONYMS: Record<string, string[]> = {
  учёба: ['учеба', 'обучение', 'образование', 'книга', 'знания', 'курс', 'урок', 'школа', 'education', 'learning', 'study', 'тетрадь', 'блокнот', 'записи', 'планшет', 'заметки', 'карандаш', 'рисование', 'pencil', 'notebook', 'tablet', 'notes', 'writing', 'class', 'lesson'],
  книга: ['книги', 'чтение', 'учебник', 'страница', 'библиотека', 'book', 'reading', 'library'],
  идея: ['идеи', 'творчество', 'вдохновение', 'изобретение', 'лампа', 'idea', 'creative', 'inspiration'],
  работа: ['карьера', 'офис', 'задача', 'проект', 'бизнес', 'work', 'business', 'job', 'project'],
  команда: ['люди', 'коллеги', 'сотрудничество', 'партнёрство', 'вместе', 'team', 'people', 'together', 'collaboration'],
  связь: ['общение', 'коммуникация', 'чат', 'сообщение', 'звонок', 'connection', 'communication', 'chat', 'message'],
  рост: ['развитие', 'прогресс', 'рост', 'улучшение', 'результат', 'growth', 'progress', 'development', 'improvement'],
  отдых: ['путешествие', 'отпуск', 'природа', 'выходные', 'расслабление', 'relax', 'travel', 'vacation', 'nature'],
  финансы: ['деньги', 'оплата', 'кошелёк', 'банк', 'покупка', 'finance', 'money', 'payment', 'bank', 'purchase'],
  здоровье: ['медицина', 'здоровье', 'уход', 'врач', 'забота', 'health', 'medical', 'care', 'doctor'],
  музыка: ['звук', 'наушники', 'музыка', 'плейлист', 'концерт', 'music', 'audio', 'headphones', 'playlist'],
  технологии: ['технология', 'цифровой', 'телефон', 'смартфон', 'планшет', 'компьютер', 'данные', 'приложение', 'tech', 'digital', 'phone', 'smartphone', 'tablet', 'computer', 'data'],
  безопасность: ['защита', 'щит', 'замок', 'пароль', 'безопасный', 'security', 'protection', 'shield', 'lock', 'password'],
  время: ['срок', 'календарь', 'расписание', 'часы', 'таймер', 'time', 'deadline', 'calendar', 'schedule', 'clock'],
  дом: ['жильё', 'квартира', 'интерьер', 'комната', 'домашний', 'home', 'house', 'interior', 'room'],
  доставка: ['посылка', 'курьер', 'отправка', 'логистика', 'коробка', 'delivery', 'parcel', 'shipping', 'logistics'],
  экология: ['природа', 'планета', 'переработка', 'зелёный', 'устойчивость', 'ecology', 'planet', 'recycling', 'sustainability'],
  цель: ['план', 'задача', 'успех', 'достижение', 'фокус', 'goal', 'plan', 'success', 'achievement', 'focus'],
  помощь: ['поддержка', 'сервис', 'забота', 'консультация', 'help', 'support', 'service', 'assistance'],
  путешествие: ['поездка', 'отпуск', 'чемодан', 'билет', 'карта', 'travel', 'trip', 'vacation', 'suitcase', 'ticket'],
}

// Curated scene recipes only select existing library assets. They help broad
// metaphor prompts produce a complete visual story when tags match too narrowly.
const SCENE_RECIPES = [
  {
    matches: ['обуч', 'учеб', 'образован', 'знан', 'цифров', 'технолог', 'education', 'learning', 'study', 'digital', 'technology'],
    main: ['Книга', 'Смартфон', 'Пазл', 'Блокнот', 'Планшет', 'Карандаш'],
    background: ['Настольная лампа', 'Цветы'],
  },
  {
    matches: ['фокус', 'работ', 'офис', 'продуктив', 'задач', 'планир', 'focus', 'work', 'office', 'productivity', 'planning'],
    main: ['Наушники', 'Блокнот', 'Карандаш', 'Монета'],
    background: ['Настольная лампа', 'Цветы'],
  },
  {
    matches: ['иде', 'творч', 'вдохнов', 'мастерск', 'creative', 'idea', 'inspiration', 'workshop'],
    main: ['Настольная лампа', 'Блокнот', 'Карандаш', 'Пазл'],
    background: ['Цветы', 'Книга'],
  },
  {
    matches: ['музык', 'звук', 'аудио', 'концентрац', 'music', 'sound', 'audio', 'concentration'],
    main: ['Наушники', 'Книга', 'Блокнот'],
    background: ['Цветы', 'Настольная лампа'],
  },
]

const normalize = (value: string) => value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const tokens = (value: string) => normalize(value).split(/\s+/).filter((token) => token.length > 1)

function stemToken(token: string) {
  const word = normalize(token)
  if (/^[a-z\d]+$/.test(word)) {
    return word.length > 5 ? word.replace(/(?:ingly|edly|ation|ments|ment|ness|ies|ing|ed|es|s)$/i, '') : word
  }
  const endings = ['иями', 'ями', 'ами', 'иях', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ать', 'ять', 'ение', 'ения', 'ению', 'ениях', 'ями', 'ами', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ых', 'их', 'ую', 'юю', 'ия', 'ию', 'ии', 'ам', 'ям', 'ом', 'ем', 'ах', 'ях', 'ы', 'и', 'а', 'я', 'у', 'ю', 'е', 'о']
  const ending = endings.find((suffix) => word.length > suffix.length + 3 && word.endsWith(suffix))
  return ending ? word.slice(0, -ending.length) : word
}

const searchTokens = (value: string) => tokens(value).map(stemToken)

function expandTokens(value: string) {
  const result = new Set(searchTokens(value))
  for (const [group, variants] of Object.entries(SYNONYMS)) {
    const all = [group, ...variants].flatMap(searchTokens)
    if (all.some((variant) => [...result].some((token) => variant.length > 2 && token.length > 2 && (variant.includes(token) || token.includes(variant))))) {
      all.forEach((variant) => result.add(variant))
    }
  }
  return [...result]
}

export function scoreComponent(component: LibraryComponent, query: string) {
  const queryTokens = expandTokens(query)
  const name = searchTokens(component.name)
  const tags = searchTokens(component.tags.join(' '))
  const metadata = searchTokens([component.category, component.familyId].join(' '))
  return queryTokens.reduce((score, token) => {
    if (tags.includes(token)) return score + 5
    if (name.includes(token)) return score + 4
    if (metadata.includes(token)) return score + 2
    if ([...tags, ...name, ...metadata].some((word) => word.length > 3 && (word.startsWith(token) || token.startsWith(word)))) return score + 1
    return score
  }, 0)
}

export function explainComponentMatch(component: LibraryComponent, query: string, mode: 'metaphor' | 'components') {
  const name = searchTokens(component.name)
  const tags = searchTokens(component.tags.join(' '))
  const category = searchTokens([component.category, component.familyId].join(' '))
  const requested = mode === 'components'
    ? query.split(/[,;\n]+/).flatMap(searchTokens)
    : searchTokens(query)
  const matchedTag = tags.find((tag) => requested.some((token) => tag === token || tag.startsWith(token) || token.startsWith(tag)))
  if (matchedTag) return `совпал тег «${component.tags.find((tag) => searchTokens(tag).includes(matchedTag)) ?? matchedTag}»`
  const matchedName = name.find((word) => requested.some((token) => word === token || word.startsWith(token) || token.startsWith(word)))
  if (matchedName) return 'совпало название компонента'
  const matchedCategory = category.find((word) => requested.some((token) => word === token || word.startsWith(token) || token.startsWith(word)))
  return matchedCategory ? 'совпала категория или семейство' : 'подобран по связанным понятиям'
}

export function findComponents(assets: LibraryComponent[], query: string, size: 'S' | 'L', mode: 'metaphor' | 'components') {
  const variants = assets.filter((asset) => asset.detailSize === size)
  if (!query.trim() || !variants.length) return []
  const sameComponent = (first: LibraryComponent, second: LibraryComponent) =>
    first.familyId === second.familyId || normalize(first.name) === normalize(second.name)
  if (mode === 'metaphor') {
    const ranked = variants.map((asset) => ({ asset, score: scoreComponent(asset, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || Number(a.asset.role === 'background') - Number(b.asset.role === 'background'))
    const selectedMain: LibraryComponent[] = []
    const selectedBackground: LibraryComponent[] = []
    const rankedBackground: LibraryComponent[] = []
    const addUnique = (target: LibraryComponent[], asset: LibraryComponent) => {
      if (!target.some((entry) => sameComponent(entry, asset))) target.push(asset)
    }

    for (const { asset } of ranked) {
      if (asset.role === 'main') addUnique(selectedMain, asset)
      else addUnique(rankedBackground, asset)
    }

    const normalizedQuery = normalize(query)
    const recipe = SCENE_RECIPES.find((entry) => entry.matches.some((term) => normalizedQuery.includes(normalize(term))))
    if (recipe) {
      const addRecipeAssets = (names: string[], role: LibraryComponent['role'], target: LibraryComponent[], limit: number) => {
        for (const name of names) {
          const asset = variants.find((entry) => entry.role === role && normalize(entry.name) === normalize(name))
          if (asset) addUnique(target, asset)
          if (target.length >= limit) break
        }
      }
      addRecipeAssets(recipe.main, 'main', selectedMain, 6)
      addRecipeAssets(recipe.background, 'background', selectedBackground, 2)
    }

    for (const asset of rankedBackground) {
      if (selectedBackground.length >= 2) break
      if (selectedMain.some((main) => normalize(main.name) === normalize(asset.name))) continue
      addUnique(selectedBackground, asset)
    }

    return [...selectedMain.slice(0, 6), ...selectedBackground.slice(0, 2)]
  }
  const requested = query.split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean)
  const results = new Map<string, { asset: LibraryComponent; score: number }>()
  requested.forEach((term, index) => {
    const scored = variants.map((asset) => ({ asset, score: scoreComponent(asset, term) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || Number(a.asset.role === 'background') - Number(b.asset.role === 'background'))
    const chosen = scored.find((entry) => ![...results.values()].some((result) => sameComponent(result.asset, entry.asset)))
    if (chosen) results.set(`${index}:${chosen.asset.id}`, chosen)
  })
  return [...results.values()].sort((a, b) => b.score - a.score).map(({ asset }) => asset)
}

type LayoutPoint = { x: number; y: number; size: number }
type LayoutAnchor = [number, number, number]
export type CompositionLayout = 'balanced' | 'grid' | 'diagonal' | 'focus'

function layoutPoints(format: CompositionFormat, role: LibraryComponent['role'], count: number): LayoutPoint[] {
  const aspect = format.width / format.height
  const portrait = aspect < 0.9
  const square = aspect >= 0.9 && aspect <= 1.1
  if (role === 'background') {
    const anchors = portrait
      ? [[0.16, 0.12], [0.84, 0.12], [0.13, 0.87], [0.87, 0.87], [0.5, 0.14], [0.5, 0.91], [0.08, 0.5], [0.92, 0.5]]
      : square
        ? [[0.13, 0.14], [0.87, 0.14], [0.13, 0.86], [0.87, 0.86], [0.5, 0.11], [0.5, 0.89], [0.1, 0.5], [0.9, 0.5]]
        : [[0.12, 0.13], [0.88, 0.13], [0.12, 0.87], [0.88, 0.87], [0.5, 0.12], [0.5, 0.88], [0.08, 0.5], [0.92, 0.5]]
    return Array.from({ length: count }, (_, index) => ({ x: anchors[index % anchors.length][0], y: anchors[index % anchors.length][1], size: 0.12 }))
  }

  const anchors = portrait
    ? [[0.5, 0.34, 0.39], [0.27, 0.68, 0.22], [0.73, 0.68, 0.22], [0.5, 0.85, 0.18], [0.2, 0.9, 0.14], [0.8, 0.9, 0.14], [0.13, 0.49, 0.13], [0.87, 0.49, 0.13]]
    : square
      ? [[0.5, 0.4, 0.42], [0.26, 0.77, 0.22], [0.74, 0.77, 0.22], [0.5, 0.84, 0.17], [0.2, 0.2, 0.14], [0.8, 0.2, 0.14], [0.13, 0.5, 0.13], [0.87, 0.5, 0.13]]
      : [[0.4, 0.51, 0.43], [0.75, 0.36, 0.25], [0.75, 0.69, 0.25], [0.27, 0.82, 0.2], [0.92, 0.52, 0.15], [0.5, 0.16, 0.14], [0.08, 0.5, 0.13], [0.9, 0.85, 0.13]]
  return Array.from({ length: count }, (_, index) => {
    const [x, y, size] = anchors[index % anchors.length]
    return { x, y, size }
  })
}

function variantPoints(format: CompositionFormat, variant: CompositionLayout, role: LibraryComponent['role'], count: number): LayoutPoint[] {
  if (variant === 'balanced') return layoutPoints(format, role, count)
  const aspect = format.width / format.height
  const portrait = aspect < 0.9
  const square = aspect >= 0.9 && aspect <= 1.1
  const layouts: Record<Exclude<CompositionLayout, 'balanced'>, { main: LayoutAnchor[][]; background: LayoutAnchor[][] }> = {
    grid: {
      main: [
        [[.2,.28,.2],[.5,.28,.2],[.8,.28,.2],[.2,.68,.2],[.5,.68,.2],[.8,.68,.2],[.35,.87,.16],[.65,.87,.16]],
        [[.28,.22,.2],[.72,.22,.2],[.28,.5,.2],[.72,.5,.2],[.28,.78,.2],[.72,.78,.2],[.5,.36,.16],[.5,.64,.16]],
        [[.28,.2,.2],[.72,.2,.2],[.28,.5,.2],[.72,.5,.2],[.28,.8,.2],[.72,.8,.2],[.5,.35,.16],[.5,.65,.16]],
      ],
      background: [
        [[.12,.12,.1],[.88,.12,.1],[.12,.88,.1],[.88,.88,.1],[.5,.12,.1],[.5,.88,.1],[.08,.5,.1],[.92,.5,.1]],
        [[.12,.12,.1],[.88,.12,.1],[.12,.88,.1],[.88,.88,.1],[.5,.12,.1],[.5,.88,.1],[.12,.5,.1],[.88,.5,.1]],
        [[.12,.12,.1],[.88,.12,.1],[.12,.88,.1],[.88,.88,.1],[.5,.12,.1],[.5,.88,.1],[.12,.5,.1],[.88,.5,.1]],
      ],
    },
    diagonal: {
      main: [
        [[.16,.73,.19],[.39,.56,.25],[.62,.39,.25],[.84,.23,.19],[.26,.31,.16],[.72,.72,.16],[.48,.84,.15],[.9,.5,.13]],
        [[.24,.78,.17],[.38,.59,.23],[.62,.42,.23],[.76,.23,.17],[.2,.48,.15],[.8,.55,.15],[.5,.88,.15],[.5,.16,.14]],
        [[.22,.78,.17],[.4,.58,.23],[.6,.4,.23],[.78,.22,.17],[.18,.48,.15],[.82,.55,.15],[.5,.88,.15],[.5,.14,.14]],
      ],
      background: [
        [[.12,.16,.1],[.88,.84,.1],[.84,.12,.1],[.16,.88,.1],[.5,.14,.09],[.5,.86,.09],[.12,.5,.09],[.88,.5,.09]],
        [[.13,.14,.09],[.87,.86,.09],[.87,.14,.09],[.13,.86,.09],[.5,.12,.09],[.5,.88,.09],[.1,.5,.09],[.9,.5,.09]],
        [[.13,.14,.09],[.87,.86,.09],[.87,.14,.09],[.13,.86,.09],[.5,.12,.09],[.5,.88,.09],[.1,.5,.09],[.9,.5,.09]],
      ],
    },
    focus: {
      main: [
        [[.5,.5,.38],[.22,.26,.17],[.78,.25,.17],[.24,.76,.17],[.76,.75,.17],[.5,.17,.14],[.5,.84,.14],[.9,.5,.13]],
        [[.5,.38,.36],[.27,.67,.2],[.73,.67,.2],[.5,.84,.16],[.18,.45,.14],[.82,.45,.14],[.3,.18,.13],[.7,.18,.13]],
        [[.5,.4,.36],[.27,.68,.2],[.73,.68,.2],[.5,.85,.16],[.18,.47,.14],[.82,.47,.14],[.3,.17,.13],[.7,.17,.13]],
      ],
      background: [
        [[.12,.13,.1],[.88,.13,.1],[.12,.87,.1],[.88,.87,.1],[.5,.12,.09],[.5,.88,.09],[.1,.5,.09],[.9,.5,.09]],
        [[.14,.13,.09],[.86,.13,.09],[.14,.87,.09],[.86,.87,.09],[.5,.12,.09],[.5,.89,.09],[.1,.5,.09],[.9,.5,.09]],
        [[.14,.13,.09],[.86,.13,.09],[.14,.87,.09],[.86,.87,.09],[.5,.12,.09],[.5,.89,.09],[.1,.5,.09],[.9,.5,.09]],
      ],
    },
  }
  const orientation = portrait ? 2 : square ? 1 : 0
  const anchors = layouts[variant][role][orientation]
  return Array.from({ length: count }, (_, index) => {
    const [x, y, size] = anchors[index % anchors.length]
    return { x, y, size }
  })
}

function positionAssets(format: CompositionFormat, assets: LibraryComponent[], role: LibraryComponent['role'], placementRole = role, variant: CompositionLayout = 'balanced') {
  const unit = Math.min(format.width, format.height)
  const points = variantPoints(format, variant, placementRole, assets.length)
  return assets.map((asset, index) => {
    const point = points[index]
    const ratio = asset.width / Math.max(1, asset.height)
    let width = ratio >= 1 ? point.size * unit : point.size * unit * ratio
    let height = ratio >= 1 ? point.size * unit / ratio : point.size * unit
    const fit = Math.min(1, format.width * 0.68 / width, format.height * 0.48 / height)
    width *= fit
    height *= fit
    const centerX = point.x * format.width
    const centerY = point.y * format.height
    const x = Math.max(0, Math.min(format.width - width, centerX - width / 2))
    const y = Math.max(0, Math.min(format.height - height, centerY - height / 2))
    const item = asset as LibraryComponent & Partial<CompositionItem>
    return {
      ...asset,
      assetId: item.assetId ?? asset.id,
      objectId: item.objectId ?? `scene-${crypto.randomUUID()}`,
      x, y, width, height,
      rotation: item.rotation ?? 0,
      opacity: item.opacity ?? 1,
      visible: item.visible ?? true,
      locked: item.locked ?? false,
      layoutMode: item.layoutMode ?? 'auto',
    } satisfies CompositionItem
  })
}

function layoutFor(format: CompositionFormat, selected: LibraryComponent[], variant: CompositionLayout = 'balanced') {
  const main = selected.filter((asset) => asset.role === 'main')
  const background = selected.filter((asset) => asset.role === 'background')
  return [
    ...positionAssets(format, background, 'background', main.length ? 'background' : 'main', variant),
    ...positionAssets(format, main, 'main', 'main', variant),
  ]
}

export function buildComposition(format: CompositionFormat, selected: LibraryComponent[], variant: CompositionLayout = 'balanced') {
  return layoutFor(format, selected, variant)
}

export function reflowComposition(format: CompositionFormat, items: CompositionItem[]) {
  if (!items.length) return []
  if (items.every((item) => item.layoutMode === 'auto')) return layoutFor(format, items)

  const bounds = items.map((item) => {
    const angle = item.rotation * Math.PI / 180
    const halfWidth = Math.abs(Math.cos(angle)) * item.width / 2 + Math.abs(Math.sin(angle)) * item.height / 2
    const halfHeight = Math.abs(Math.sin(angle)) * item.width / 2 + Math.abs(Math.cos(angle)) * item.height / 2
    const centerX = item.x + item.width / 2
    const centerY = item.y + item.height / 2
    return { left: centerX - halfWidth, top: centerY - halfHeight, right: centerX + halfWidth, bottom: centerY + halfHeight }
  })
  const left = Math.min(...bounds.map((bound) => bound.left))
  const top = Math.min(...bounds.map((bound) => bound.top))
  const width = Math.max(1, Math.max(...bounds.map((bound) => bound.right)) - left)
  const height = Math.max(1, Math.max(...bounds.map((bound) => bound.bottom)) - top)
  const scale = Math.min(format.width * 0.84 / width, format.height * 0.84 / height)
  const sourceCenterX = left + width / 2
  const sourceCenterY = top + height / 2
  return items.map((item) => ({
    ...item,
    x: (item.x + item.width / 2 - sourceCenterX) * scale + format.width / 2 - item.width * scale / 2,
    y: (item.y + item.height / 2 - sourceCenterY) * scale + format.height / 2 - item.height * scale / 2,
    width: item.width * scale,
    height: item.height * scale,
    layoutMode: 'manual' as const,
  }))
}

export function switchSceneVariants(items: CompositionItem[], assets: LibraryComponent[], detailSize: DetailSize) {
  const variants = new Map(assets.map((asset) => [`${asset.role}:${asset.familyId}:${asset.detailSize}`, asset]))
  const missing = [...new Set(items.filter((item) => !variants.has(`${item.role}:${item.familyId}:${detailSize}`)).map((item) => item.name))]
  if (missing.length) return { items, missing }
  const switched = items.map((item) => {
    const variant = variants.get(`${item.role}:${item.familyId}:${detailSize}`)
    if (!variant) return item
    const maxSide = Math.max(item.width, item.height)
    const ratio = variant.width / Math.max(1, variant.height)
    const width = ratio >= 1 ? maxSide : maxSide * ratio
    const height = ratio >= 1 ? maxSide / ratio : maxSide
    const centerX = item.x + item.width / 2
    const centerY = item.y + item.height / 2
    return {
      ...item,
      ...variant,
      objectId: item.objectId,
      assetId: variant.id,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: item.rotation,
      opacity: item.opacity,
      visible: item.visible,
      locked: item.locked,
    }
  })
  return { items: switched, missing: [] as string[] }
}

const COLOR_PROPERTIES = new Set(['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'])
const HEX_COLOR = /^(?:#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8})$/i

export function normalizeHexColor(value: string) {
  const color = value.trim().toLowerCase()
  if (!HEX_COLOR.test(color)) return null
  if (color.length === 4 || color.length === 5) return `#${[...color.slice(1)].map((digit) => `${digit}${digit}`).join('')}`
  return color
}

function colorForRole(source: string, role: LibraryComponent['role'], palette: PaletteScheme) {
  const normalizedSource = normalizeHexColor(source)
  if (!normalizedSource) return null
  const sourceMap = role === 'background' ? palette.backgroundColorMap : palette.objectColorMap
  const mapped = Object.entries(sourceMap ?? {}).find(([key]) => normalizeHexColor(key) === normalizedSource)?.[1]
  const normalizedTarget = mapped ? normalizeHexColor(mapped) : null
  const allowedColors = role === 'background' ? palette.backgroundColors : [...palette.objectColors, ...palette.backgroundColors]
  const allowed = allowedColors.map(normalizeHexColor).filter((color): color is string => color !== null)
  if (normalizedTarget && allowed.includes(normalizedTarget)) return normalizedTarget
  if (allowed.includes(normalizedSource)) return normalizedSource
  const hexToRgb = (hex: string) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
  const [r, g, b] = hexToRgb(normalizedSource)
  const nearest = allowed.reduce<{ color: string; distance: number } | null>((best, color) => {
    if (color.length !== 7) return best
    const [cr, cg, cb] = hexToRgb(color)
    const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    return !best || distance < best.distance ? { color, distance } : best
  }, null)
  return nearest?.color ?? allowed[0] ?? null
}

function recolorDeclarations(value: string, role: LibraryComponent['role'], palette: PaletteScheme) {
  return value.replace(/(^|[;{]\s*)(fill|stroke|stop-color|flood-color|lighting-color|color)\s*:\s*(#[\da-f]{3,8})(?=\s*(?:!important\b|[;} ]|$))/gi, (whole, prefix: string, property: string, source: string) => {
    const target = colorForRole(source, role, palette)
    return target ? `${prefix}${property}:${target}` : whole
  })
}

const recoloredMarkupCache = new Map<string, string>()

export function recolorSvg(markup: string, role: LibraryComponent['role'], palette: PaletteScheme) {
  if (typeof DOMParser === 'undefined') return markup
  const paletteKey = [
    ...palette.objectColors,
    ...palette.backgroundColors,
    ...Object.entries(palette.objectColorMap ?? {}).sort().flat(),
    ...Object.entries(palette.backgroundColorMap ?? {}).sort().flat(),
  ].join('|')
  const cacheKey = `${role}\u0000${paletteKey}\u0000${markup}`
  const cached = recoloredMarkupCache.get(cacheKey)
  if (cached !== undefined) return cached

  const document = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml')
  for (const element of [document.documentElement, ...Array.from(document.querySelectorAll('*'))]) {
    for (const attribute of Array.from(element.attributes)) {
      const property = attribute.name.toLowerCase()
      if (COLOR_PROPERTIES.has(property)) {
        const target = colorForRole(attribute.value, role, palette)
        if (target) element.setAttribute(attribute.name, target)
      } else if (property === 'style') {
        element.setAttribute(attribute.name, recolorDeclarations(attribute.value, role, palette))
      }
    }
  }
  document.querySelectorAll('style').forEach((style) => {
    style.textContent = recolorDeclarations(style.textContent ?? '', role, palette)
  })
  const recolored = document.documentElement.innerHTML
  if (recoloredMarkupCache.size >= 500) recoloredMarkupCache.clear()
  recoloredMarkupCache.set(cacheKey, recolored)
  return recolored
}

export function collectSvgColorUsage(assets: LibraryComponent[]) {
  const usage: Record<LibraryComponent['role'], Map<string, number>> = { main: new Map(), background: new Map() }
  const record = (role: LibraryComponent['role'], value: string) => {
    const color = normalizeHexColor(value)
    if (color) usage[role].set(color, (usage[role].get(color) ?? 0) + 1)
  }
  const addDeclarations = (role: LibraryComponent['role'], value: string) => {
    const declaration = /(?:^|[;{]\s*)(fill|stroke|stop-color|flood-color|lighting-color|color)\s*:\s*(#[\da-f]{3,8})\s*(?=!important\b|[;} ]|$)/gi
    for (const match of value.matchAll(declaration)) record(role, match[2])
  }
  for (const asset of assets) {
    if (typeof DOMParser === 'undefined') break
    const document = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${asset.markup}</svg>`, 'image/svg+xml')
    for (const element of [document.documentElement, ...Array.from(document.querySelectorAll('*'))]) {
      for (const attribute of Array.from(element.attributes)) {
        const property = attribute.name.toLowerCase()
        if (COLOR_PROPERTIES.has(property)) record(asset.role, attribute.value)
        else if (property === 'style') addDeclarations(asset.role, attribute.value)
      }
    }
    document.querySelectorAll('style').forEach((style) => addDeclarations(asset.role, style.textContent ?? ''))
  }
  return {
    main: [...usage.main].sort(([a], [b]) => a.localeCompare(b)),
    background: [...usage.background].sort(([a], [b]) => a.localeCompare(b)),
  }
}

export function getFamilyCoverage(assets: LibraryComponent[]) {
  const families = new Map<string, Set<'S' | 'L'>>()
  for (const asset of assets) {
    const sizes = families.get(asset.familyId) ?? new Set<'S' | 'L'>()
    sizes.add(asset.detailSize)
    families.set(asset.familyId, sizes)
  }
  const complete = [...families.values()].filter((sizes) => sizes.has('S') && sizes.has('L')).length
  return { total: families.size, complete, incomplete: families.size - complete }
}

export function makeSceneObject(asset: LibraryComponent, x: number, y: number, width: number, height: number, markup = asset.markup): CompositionItem {
  const object: CompositionItem = {
    ...asset, objectId: `scene-${crypto.randomUUID()}`, assetId: asset.id, x, y, width, height,
    rotation: 0, opacity: 1, visible: true, locked: false, markup, layoutMode: 'manual',
  }
  return object
}

export function exportItems(items: CompositionItem[]): CanvasObject[] { return items }

export function trimSvgToContent(markup: string, viewBox: string, width: number, height: number) {
  if (typeof document === 'undefined' || !document.body) return { viewBox, width, height }
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  host.setAttribute('viewBox', viewBox)
  host.setAttribute('width', '1000')
  host.setAttribute('height', '1000')
  Object.assign(host.style, { position: 'fixed', left: '-2000px', top: '0', overflow: 'visible', opacity: '0.01', pointerEvents: 'none' })
  host.innerHTML = markup
  document.body.append(host)
  try {
    const box = host.getBBox()
    if (!Number.isFinite(box.x) || box.width < 1 || box.height < 1) return { viewBox, width, height }
    const padX = box.width * 0.015
    const padY = box.height * 0.015
    const trimmedBox = `${box.x - padX} ${box.y - padY} ${box.width + padX * 2} ${box.height + padY * 2}`
    return { viewBox: trimmedBox, width: box.width + padX * 2, height: box.height + padY * 2 }
  } catch {
    return { viewBox, width, height }
  } finally {
    host.remove()
  }
}

export function inferMetadata(fileName: string): Pick<LibraryComponent, 'role' | 'familyId' | 'detailSize' | 'tags'> {
  const path = fileName.replace(/\\/g, '/').split('/').filter(Boolean)
  const filename = (path.pop() ?? fileName).replace(/\.svg$/i, '')
  const directory = path.filter((part) => !/^(?:(?:size|detail|variant)[-_ ]*)?(?:s|l|small|large|compact|detailed)$/i.test(part)
    && !/^(?:assets?|library|components?|illustrations?|svg|main|foreground|objects?)$/i.test(part))
  const sourceName = filename.replace(/[-_]+/g, ' ').trim()
  const sizeName = /(?:^|\s)(?:size\s*)?(s|l|small|large|compact|detailed)(?:$|\s)/i.exec(sourceName)?.[1]
  const sizeFolder = path.map((part) => /^(?:(?:size|detail|variant)[-_ ]*)?(s|l|small|large|compact|detailed)$/i.exec(part)?.[1]).find(Boolean)
  const sizeToken = sizeName ?? sizeFolder
  const size = /^(s|small|compact)$/i.test(sizeToken ?? '') ? 'S' : sizeToken ? 'L' : undefined
  const familyName = normalize(sourceName).replace(/\b(?:size\s*)?(?:s|l|small|large|compact|detailed)\b/g, '').trim()
  const familyId = normalize([...directory, familyName].join(' ')).replace(/\s+/g, '-') || crypto.randomUUID()
  const context = [...directory, filename].join(' ')
  const tags = [...new Set(tokens(context).filter((word) => !['size', 'фон', 'background', 'small', 'large', 'compact', 'detailed', 'assets', 'asset', 'library', 'component', 'components', 'illustration', 'illustrations', 'svg'].includes(word)))]
  return { role: /фон|background|(?:^|\W)bg(?:$|\W)/i.test(context) ? 'background' : 'main', familyId, detailSize: size ?? 'L', tags }
}
