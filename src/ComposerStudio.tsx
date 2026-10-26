import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, Download, Eye, EyeOff, Grid2X2, ImagePlus, Layers3, Lock, Maximize2, Minus, Palette, Pencil, Plus, RotateCcw, RotateCw, Search, Sparkles, Trash2, Unlock, Upload, X, FolderOpen } from 'lucide-react'
import type { CompositionFormat, CompositionItem, CompositionMode, DetailSize, LibraryComponent, LibraryManifest, PaletteScheme } from './types/composition'
import { buildComposition, collectSvgColorUsage, exportItems, findComponents, FORMATS, getFamilyCoverage, inferMetadata, makeSceneObject, normalizeHexColor, recolorSvg, reflowComposition, STARTER_PALETTES, switchSceneVariants, trimSvgToContent, type CompositionLayout } from './features/composer/composer'
import { serializeComposition } from './features/export/SvgExporter'
import { cleanSvg } from './features/svg-import/SvgSanitizer'
import { readWorkspaceValue, writeWorkspaceValue } from './features/storage/workspaceStorage'
import { mergeRecoveredLegacyProjects } from './features/storage/legacyProjectRecovery'
import './composer.css'

type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw'
type Drag = { id: string; mode: 'move' | 'resize'; handle?: ResizeHandle; pointerX: number; pointerY: number; itemX: number; itemY: number; itemWidth: number; itemHeight: number; rotation: number; scale: number; formatWidth: number; formatHeight: number; boardWidth: number }
type DragLayout = Pick<CompositionItem, 'x' | 'y' | 'width' | 'height'>
type StoredPreferences = { paletteId?: string; formatId?: string; size?: DetailSize; backgroundColor?: string; transparent?: boolean; includeBackground?: boolean }
type LibraryRoleFilter = 'all' | 'main' | 'background'
type StudioPage = 'landing' | 'gallery' | 'templates' | 'editor'
const STUDIO_PAGES = new Set<StudioPage>(['landing', 'gallery', 'templates', 'editor'])
const CURRENT_PAGE_SESSION_KEY = 'pixo-current-page'
type BackdropId = 'solid' | 'desk' | 'paper' | 'buildplate' | 'palette'
type PaletteBackgroundId = 'lavender' | 'peach' | 'mint'
type ProjectSnapshot = {
  id: string
  name: string
  items: CompositionItem[]
  formatId: string
  size: DetailSize
  paletteId: string
  paletteBackgroundId?: PaletteBackgroundId
  backgroundColor: string
  transparent: boolean
  includeBackground: boolean
  backdropId: BackdropId
  canvasWidth?: number
  canvasHeight?: number
  preserveOriginalColors?: boolean
  updatedAt: number
  recoverySource?: 'legacy-project-html'
  recoveryKey?: string
}
type ProjectTemplate = { id: string; name: string; backdropId: BackdropId; objects: Array<{ name: string; role: 'main' | 'background' }> }

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: 'learn', name: 'Книга, смартфон и пазл', backdropId: 'desk', objects: [{ name: 'Книга', role: 'main' }, { name: 'Смартфон', role: 'main' }, { name: 'Пазл', role: 'main' }, { name: 'Карандаш', role: 'main' }, { name: 'Настольная лампа', role: 'background' }, { name: 'Цветы', role: 'background' }] },
  { id: 'creative', name: 'Рабочее место и вдохновение', backdropId: 'paper', objects: [{ name: 'Настольная лампа', role: 'main' }, { name: 'Блокнот', role: 'main' }, { name: 'Карандаш', role: 'main' }, { name: 'Монета', role: 'main' }, { name: 'Книга', role: 'background' }, { name: 'Смартфон', role: 'background' }] },
  { id: 'focus', name: 'Наушники, книга и заметки', backdropId: 'desk', objects: [{ name: 'Наушники', role: 'main' }, { name: 'Книга', role: 'main' }, { name: 'Блокнот', role: 'main' }, { name: 'Монета', role: 'main' }, { name: 'Цветы', role: 'background' }, { name: 'Настольная лампа', role: 'background' }] },
  { id: 'digital', name: 'Устройства и новые решения', backdropId: 'buildplate', objects: [{ name: 'Блокнот', role: 'main' }, { name: 'Смартфон', role: 'main' }, { name: 'Монета', role: 'main' }, { name: 'Пазл', role: 'main' }, { name: 'Книга', role: 'background' }, { name: 'Наушники', role: 'background' }] },
]

const COMPOSITION_STARTERS: Array<{ label: string; query: string; mode: CompositionMode }> = [
  { label: 'Обучение и технологии', query: 'обучение и цифровые инструменты', mode: 'metaphor' },
  { label: 'Фокус и продуктивность', query: 'фокус, работа и планирование', mode: 'metaphor' },
  { label: 'Идеи и творчество', query: 'идеи и творческая мастерская', mode: 'metaphor' },
  { label: 'Музыка и концентрация', query: 'музыка и концентрация', mode: 'metaphor' },
  { label: 'Книга · смартфон · пазл', query: 'книга, смартфон, пазл', mode: 'components' },
  { label: 'Наушники · блокнот · лампа', query: 'наушники, блокнот, настольная лампа', mode: 'components' },
  { label: 'Планшет · карандаш · цветы', query: 'планшет, карандаш, цветы', mode: 'components' },
  { label: 'Монета · смартфон · блокнот', query: 'монета, смартфон, блокнот', mode: 'components' },
]

const BACKDROPS: Array<{ id: BackdropId; label: string; description: string }> = [
  { id: 'solid', label: 'Заливка', description: 'Цвет палитры' },
  { id: 'desk', label: 'Стол', description: 'Тёплая древесина' },
  { id: 'paper', label: 'Бумага', description: 'Лист с разметкой' },
  { id: 'buildplate', label: 'Шипы', description: 'Плита со шипами' },
  { id: 'palette', label: 'Фон палитры', description: 'Декоративный SVG-фон' },
]

const uid = () => crypto.randomUUID()
const formatForProject = (project?: Pick<ProjectSnapshot, 'formatId' | 'canvasWidth' | 'canvasHeight'> | null): CompositionFormat => {
  if (project?.formatId === 'custom' && Number.isFinite(project.canvasWidth) && Number.isFinite(project.canvasHeight)) {
    const width = Math.max(200, Math.min(12000, Number(project.canvasWidth)))
    const height = Math.max(200, Math.min(12000, Number(project.canvasHeight)))
    return { id: 'custom', name: 'Свой размер', width, height, description: 'Настраиваемый размер холста' }
  }
  return FORMATS.find((entry) => entry.id === project?.formatId) ?? FORMATS[0]
}
const DEFAULT_PROJECT_FORMAT: CompositionFormat = FORMATS[0]
const isPaletteBackgroundId = (value: unknown): value is PaletteBackgroundId => value === 'lavender' || value === 'peach' || value === 'mint'
const paletteBackgroundForScheme = (paletteId?: string): PaletteBackgroundId => paletteId === 'palette-02' || paletteId === 'peach' ? 'peach' : paletteId === 'palette-03' || paletteId === 'aqua' || paletteId === 'mint' ? 'mint' : 'lavender'
const safeStorage = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T ?? fallback } catch { return fallback }
}
function readSessionPage(): StudioPage | null {
  try {
    const value = sessionStorage.getItem(CURRENT_PAGE_SESSION_KEY) as StudioPage | null
    return value && STUDIO_PAGES.has(value) ? value : null
  } catch { return null }
}
function writeSessionPage(page: StudioPage) {
  try { sessionStorage.setItem(CURRENT_PAGE_SESSION_KEY, page) } catch { /* storage can be unavailable in private browsing */ }
}

function normalizeAsset(asset: Partial<LibraryComponent> & Record<string, unknown>): LibraryComponent | null {
  if (!asset.markup || !asset.viewBox || !asset.id) return null
  const meta = inferMetadata(String(asset.name ?? 'Компонент.svg'))
  const id = String(asset.id)
  if (id.startsWith('service-') || id.startsWith('demo-')) return null
  return {
    id, name: String(asset.name ?? 'Компонент'), category: String(asset.category ?? 'Без категории'),
    width: Number(asset.width) || 512, height: Number(asset.height) || 512, viewBox: String(asset.viewBox),
    markup: String(asset.markup), source: String(asset.source ?? 'Импорт SVG'), sourceFileId: typeof asset.sourceFileId === 'string' ? asset.sourceFileId : undefined,
    imported: true, role: asset.role === 'background' || asset.role === 'main' ? asset.role : meta.role,
    familyId: String(asset.familyId ?? meta.familyId), detailSize: asset.detailSize === 'S' ? 'S' : asset.detailSize === 'L' ? 'L' : meta.detailSize,
    tags: Array.isArray(asset.tags) ? asset.tags.map(String) : meta.tags,
  }
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^(?:#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8})$/i.test(value)
}

function isColorMap(value: unknown): value is Record<string, string> {
  return value === undefined || (typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.entries(value).every(([source, target]) => isHexColor(source) && isHexColor(target)))
}

function normalizePalette(value: unknown): PaletteScheme | null {
  if (typeof value !== 'object' || value === null) return null
  const entry = value as Partial<PaletteScheme>
  if (!Array.isArray(entry.objectColors) || !entry.objectColors.length || !entry.objectColors.every(isHexColor)) return null
  if (!Array.isArray(entry.backgroundColors) || !entry.backgroundColors.length || !entry.backgroundColors.every(isHexColor)) return null
  if (!isColorMap(entry.objectColorMap) || !isColorMap(entry.backgroundColorMap)) return null
  const objectTargets = new Set([...entry.objectColors, ...entry.backgroundColors].map((color) => normalizeHexColor(color)))
  const backgroundTargets = new Set(entry.backgroundColors.map((color) => normalizeHexColor(color)))
  if (Object.values(entry.objectColorMap ?? {}).some((color) => !objectTargets.has(normalizeHexColor(color) ?? ''))) return null
  if (Object.values(entry.backgroundColorMap ?? {}).some((color) => !backgroundTargets.has(normalizeHexColor(color) ?? ''))) return null
  const normalizeMap = (map: Record<string, string> | undefined) => Object.fromEntries(Object.entries(map ?? {})
    .map(([source, target]) => [normalizeHexColor(source)!, normalizeHexColor(target)!]))
  return {
    id: typeof entry.id === 'string' ? entry.id : `palette-${uid()}`,
    name: typeof entry.name === 'string' ? entry.name : 'Новая палитра',
    objectColors: entry.objectColors.map((color) => normalizeHexColor(color)!),
    backgroundColors: entry.backgroundColors.map((color) => normalizeHexColor(color)!),
    objectColorMap: normalizeMap(entry.objectColorMap),
    backgroundColorMap: normalizeMap(entry.backgroundColorMap),
  }
}

function completePaletteMaps(palette: PaletteScheme, sourcePalette?: PaletteScheme): PaletteScheme {
  if (!sourcePalette) return palette
  const backgroundSources = Object.keys(sourcePalette.backgroundColorMap ?? {})
  const backgroundSourceSet = new Set(backgroundSources.map((color) => normalizeHexColor(color)))
  const objectSources = Object.keys(sourcePalette.objectColorMap ?? {}).filter((color) => !backgroundSourceSet.has(normalizeHexColor(color)))
  const mapSlots = (sources: string[], targets: string[]) => Object.fromEntries(sources.flatMap((source, index) => {
    const target = normalizeHexColor(source) === '#181817'
      ? targets.find((color) => normalizeHexColor(color) === '#181817') ?? targets.at(-1)
      : targets[Math.min(index, targets.length - 1)]
    return target ? [[source, target]] : []
  }))
  const backgroundColorMap = { ...mapSlots(backgroundSources, palette.backgroundColors), ...palette.backgroundColorMap }
  const objectColorMap = {
    ...backgroundColorMap,
    ...mapSlots(objectSources, palette.objectColors),
    ...palette.objectColorMap,
  }
  return { ...palette, objectColorMap, backgroundColorMap }
}

async function sanitizeLibraryAsset(value: unknown): Promise<LibraryComponent | null> {
  if (typeof value !== 'object' || value === null) return null
  const asset = normalizeAsset(value as Partial<LibraryComponent> & Record<string, unknown>)
  if (!asset) return null
  try {
    const viewBox = asset.viewBox.replace(/[&<>"']/g, '')
    const cleaned = cleanSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${asset.markup}</svg>`)
    const parsed = new DOMParser().parseFromString(cleaned.markup, 'image/svg+xml')
    if (parsed.querySelector('image')) return null
    return { ...asset, viewBox: cleaned.viewBox, width: cleaned.width, height: cleaned.height, markup: cleaned.markup }
  } catch {
    return null
  }
}

async function readBundledManifest() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}library.json`)
    if (!response.ok) return { assets: [] as LibraryComponent[], palettes: [] as PaletteScheme[] }
    const manifest = await response.json() as Partial<LibraryManifest>
    const assets = Array.isArray(manifest.assets)
      ? (await Promise.all(manifest.assets.map((asset) => sanitizeLibraryAsset(asset)))).filter((asset): asset is LibraryComponent => asset !== null)
      : []
    const palettes = Array.isArray(manifest.palettes)
      ? manifest.palettes.map(normalizePalette).filter((entry): entry is PaletteScheme => entry !== null)
      : []
    return { assets, palettes }
  } catch {
    return { assets: [] as LibraryComponent[], palettes: [] as PaletteScheme[] }
  }
}

function mergeLibraryAssets(bundled: LibraryComponent[], local: LibraryComponent[]) {
  const key = (asset: LibraryComponent) => asset.sourceFileId
    ? `source:${asset.sourceFileId.toLocaleLowerCase('ru')}|${asset.detailSize}`
    : `id:${asset.id}`
  const localByKey = new Map(local.map((asset) => [key(asset), asset]))
  const bundledKeys = new Set(bundled.map(key))
  const refreshed = bundled.map((asset) => {
    const previous = localByKey.get(key(asset))
    if (!previous) return asset
    return {
      ...asset,
      ...previous,
      id: previous.id,
      source: asset.source,
      sourceFileId: asset.sourceFileId,
      width: asset.width,
      height: asset.height,
      viewBox: asset.viewBox,
      markup: asset.markup,
    }
  })
  return [...refreshed, ...local.filter((asset) => !bundledKeys.has(key(asset)))]
}

function AppIcon() {
  return <span className="studio-mark" aria-hidden="true"><i /><i /><i /><i /></span>
}

function SvgPreview({ markup, viewBox, className = '' }: { markup: string; viewBox: string; className?: string }) {
  return <span className={`svg-preview ${className}`} aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" dangerouslySetInnerHTML={{ __html: markup }} /></span>
}

function surfaceStyle(color: string, palette: PaletteScheme): CSSProperties {
  const rgba = (source: string, alpha: number) => {
    const hex = normalizeHexColor(source) ?? '#d8d5e8'
    const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  const detail = palette.backgroundColors[1] ?? palette.backgroundColors[0] ?? color
  const highlight = palette.backgroundColors[2] ?? palette.backgroundColors[0] ?? color
  return { backgroundColor: color, '--surface-detail': rgba(detail, .34), '--surface-highlight': rgba(highlight, .6) } as CSSProperties
}

export default function ComposerStudio() {
  const [assets, setAssets] = useState<LibraryComponent[]>([])
  const [items, setItems] = useState<CompositionItem[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [page, setPage] = useState<StudioPage>('landing')
  const [projects, setProjects] = useState<ProjectSnapshot[]>([])
  const [projectDialog, setProjectDialog] = useState<{ mode: 'rename' | 'delete'; projectId: string; name: string } | null>(null)
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [currentProjectId, setCurrentProjectId] = useState('')
  const [mode, setMode] = useState<CompositionMode>('metaphor')
  const [query, setQuery] = useState('Обучение и цифровые инструменты')
  const [size, setSize] = useState<DetailSize>('L')
  const [format, setFormat] = useState<CompositionFormat>(FORMATS[0])
  const [palettes, setPalettes] = useState<PaletteScheme[]>(STARTER_PALETTES)
  const [palette, setPalette] = useState<PaletteScheme>(STARTER_PALETTES[0])
  const [backgroundColor, setBackgroundColor] = useState(STARTER_PALETTES[0].backgroundColors[0])
  const [transparent, setTransparent] = useState(false)
  const [includeBackground, setIncludeBackground] = useState(true)
  const [backdropId, setBackdropId] = useState<BackdropId>('solid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [libraryRoleFilter, setLibraryRoleFilter] = useState<LibraryRoleFilter>('all')
  const [librarySizeFilter, setLibrarySizeFilter] = useState<DetailSize>('L')
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState(true)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [boardDragActive, setBoardDragActive] = useState(false)
  const [activePanel, setActivePanel] = useState<'components' | 'layers'>('components')
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const folderImportRef = useRef<HTMLInputElement>(null)
  const libraryImportRef = useRef<HTMLInputElement>(null)
  const paletteRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const dragLayoutRef = useRef<DragLayout | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const projectsRef = useRef<ProjectSnapshot[]>([])
  const projectActionLock = useRef(false)
  const projectNameInputRef = useRef<HTMLInputElement>(null)
  const landingFrameRef = useRef<HTMLIFrameElement>(null)
  const projectsFrameRef = useRef<HTMLIFrameElement>(null)
  const templateFrameRef = useRef<HTMLIFrameElement>(null)
  const editorFrameRef = useRef<HTMLIFrameElement>(null)
  const landingActionsRef = useRef<{ openEditor: () => void; createProject: () => void; openProjects: () => void; openTemplate: (templateId: string) => void; composeEditorRequest: (request: { query: string; mode: CompositionMode; layout: CompositionLayout }) => void; syncProjects: () => void; openProject: (projectId: string) => void; duplicateProject: (projectId: string) => void; requestDeleteProject: (projectId: string) => void; renameProject: (projectId: string) => void; sendEditorProjectData: () => void; applyEditorChange: (projectId: string, state: unknown) => void; importEditorAssets: (assets: unknown[]) => void; importEditorPalette: (palette: unknown) => void }>({ openEditor: () => {}, createProject: () => {}, openProjects: () => {}, openTemplate: () => {}, composeEditorRequest: () => {}, syncProjects: () => {}, openProject: () => {}, duplicateProject: () => {}, requestDeleteProject: () => {}, renameProject: () => {}, sendEditorProjectData: () => {}, applyEditorChange: () => {}, importEditorAssets: () => {}, importEditorPalette: () => {} })

  useEffect(() => {
    const handleLandingMessage = (event: MessageEvent) => {
      const knownFrame = event.source === landingFrameRef.current?.contentWindow || event.source === projectsFrameRef.current?.contentWindow || event.source === templateFrameRef.current?.contentWindow || event.source === editorFrameRef.current?.contentWindow
      if (event.origin !== window.location.origin || !knownFrame) return
      if (typeof event.data !== 'object' || event.data === null) return
      if (event.data.type === 'pixo:open-editor') landingActionsRef.current.openEditor()
      if (event.data.type === 'pixo:create-project') landingActionsRef.current.createProject()
      if (event.data.type === 'pixo:open-projects') landingActionsRef.current.openProjects()
      if (event.data.type === 'pixo:request-projects' && event.source === projectsFrameRef.current?.contentWindow) landingActionsRef.current.syncProjects()
      if (event.source === projectsFrameRef.current?.contentWindow && typeof event.data.projectId === 'string') {
        if (event.data.type === 'pixo:open-project') landingActionsRef.current.openProject(event.data.projectId)
        if (event.data.type === 'pixo:duplicate-project') landingActionsRef.current.duplicateProject(event.data.projectId)
        if (event.data.type === 'pixo:delete-project') landingActionsRef.current.requestDeleteProject(event.data.projectId)
        if (event.data.type === 'pixo:rename-project') landingActionsRef.current.renameProject(event.data.projectId)
      }
      if (event.data.type === 'pixo:open-library') openLibrarySection()
      if (event.data.type === 'pixo:open-templates') setPage('templates')
      if (event.data.type === 'pixo:open-landing') setPage('landing')
      if (event.data.type === 'pixo:open-template' && typeof event.data.templateId === 'string') landingActionsRef.current.openTemplate(event.data.templateId)
      if (event.source === editorFrameRef.current?.contentWindow && event.data.type === 'pixo:editor-ready') landingActionsRef.current.sendEditorProjectData()
      if (event.source === editorFrameRef.current?.contentWindow && event.data.type === 'pixo:compose-request' && typeof event.data.query === 'string') landingActionsRef.current.composeEditorRequest({ query: event.data.query, mode: event.data.mode === 'components' ? 'components' : 'metaphor', layout: event.data.layout === 'grid' || event.data.layout === 'diagonal' || event.data.layout === 'focus' ? event.data.layout : 'balanced' })
      if (event.source === editorFrameRef.current?.contentWindow && event.data.type === 'pixo:editor-change' && typeof event.data.projectId === 'string') landingActionsRef.current.applyEditorChange(event.data.projectId, event.data.state)
      if (event.source === editorFrameRef.current?.contentWindow && event.data.type === 'pixo:editor-import-assets' && Array.isArray(event.data.assets)) landingActionsRef.current.importEditorAssets(event.data.assets)
      if (event.source === editorFrameRef.current?.contentWindow && event.data.type === 'pixo:editor-add-palette') landingActionsRef.current.importEditorPalette(event.data.palette)
      if (event.data.type === 'pixo:set-theme' && (event.data.theme === 'light' || event.data.theme === 'dark')) {
        landingFrameRef.current?.contentWindow?.postMessage({ type: 'pixo:theme', theme: event.data.theme }, window.location.origin)
      }
    }
    window.addEventListener('message', handleLandingMessage)
    return () => window.removeEventListener('message', handleLandingMessage)
  }, [])

  const selectedItem = (items.find((item) => item.objectId === selectedId) ?? null) as CompositionItem
  const selectedAsset = (assets.find((asset) => asset.id === selectedAssetId) ?? null) as LibraryComponent
  const filteredAssets = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('ru')
    return assets.filter((asset) => asset.detailSize === librarySizeFilter
      && (libraryRoleFilter === 'all' || asset.role === libraryRoleFilter)
      && (!needle || `${asset.name} ${asset.category} ${asset.tags.join(' ')} ${asset.sourceFileId ?? asset.source}`.toLocaleLowerCase('ru').includes(needle)))
  }, [assets, search, librarySizeFilter, libraryRoleFilter])
  const colorUsage = useMemo(() => collectSvgColorUsage(assets), [assets])
  const familyCoverage = useMemo(() => getFamilyCoverage(assets), [assets])
  const templates = useMemo(() => PROJECT_TEMPLATES.map((template) => {
    const chosen = template.objects.flatMap(({ name, role }) => {
      const asset = assets.find((entry) => entry.name === name && entry.role === role && entry.detailSize === size)
      return asset ? [asset] : []
    })
    return { ...template, items: buildComposition(format, chosen) }
  }), [assets, format, size])
  useEffect(() => { projectsRef.current = projects }, [projects])

  useEffect(() => {
    if (!ready) return
    writeSessionPage(page)
  }, [page, ready])

  useEffect(() => {
    if (page === 'gallery' && ready && !loadError) landingActionsRef.current.syncProjects()
  }, [projects, page, ready, loadError])

  useEffect(() => {
    if (page === 'editor') landingActionsRef.current.sendEditorProjectData()
  }, [page, currentProjectId, ready])

  useEffect(() => {
    if (!projectDialog) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setProjectDialog(null) }
    document.addEventListener('keydown', closeOnEscape)
    if (projectDialog.mode === 'rename') projectNameInputRef.current?.focus()
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [projectDialog])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const removeEmptyProjects = new URLSearchParams(window.location.search).get('removeEmptyProjects') === '1'
        const [newAssets, oldAssets, savedItems, preferences, savedPalettes, bundled, savedProjects, savedProjectId, projectsMigrated, legacyProjectsRecovered, archivedProjects] = await Promise.all([
          readWorkspaceValue<LibraryComponent[] | null>('composer-assets', null),
          readWorkspaceValue<Array<Record<string, unknown>> | null>('assets', null),
          readWorkspaceValue<CompositionItem[] | null>('composer-scene', null),
          readWorkspaceValue<StoredPreferences>('composer-preferences', {}),
          readWorkspaceValue<PaletteScheme[] | null>('composer-palettes', null),
          readBundledManifest(),
          readWorkspaceValue<ProjectSnapshot[] | null>('composer-projects', null),
          readWorkspaceValue<string | null>('composer-current-project', null),
          readWorkspaceValue<boolean>('composer-projects-migrated', false),
          readWorkspaceValue<boolean>('pixo-legacy-projects-recovered', false),
          readWorkspaceValue<ProjectSnapshot[]>('pixo-projects-before-legacy-recovery', []),
        ])
        const savedPage = readSessionPage()
        const legacy = safeStorage<Array<Record<string, unknown>>>('pixo-library-assets', [])
        const chosen = (newAssets?.length ? newAssets : oldAssets?.length ? oldAssets : legacy) as Array<Record<string, unknown>>
        const normalized = chosen.map(normalizeAsset).filter((asset): asset is LibraryComponent => asset !== null)
        const initialAssets = mergeLibraryAssets(bundled.assets, normalized)
        const restoredPalettes = (savedPalettes ?? []).map(normalizePalette).filter((entry): entry is PaletteScheme => entry !== null)
        const starterPaletteIds = new Set(STARTER_PALETTES.map((entry) => entry.id))
        const bundledPaletteIds = new Set(bundled.palettes.map((entry) => entry.id))
        const sourcePalette = bundled.palettes.find((entry) => entry.id === 'palette-01' && Object.keys(entry.objectColorMap ?? {}).length)
          ?? bundled.palettes.find((entry) => Object.keys(entry.objectColorMap ?? {}).length)
        const storedPalettes = bundled.palettes.length
          ? [...bundled.palettes, ...restoredPalettes.filter((entry) => !starterPaletteIds.has(entry.id) && !bundledPaletteIds.has(entry.id))]
          : restoredPalettes.length ? restoredPalettes : STARTER_PALETTES
        const activePalettes = storedPalettes.map((entry) => completePaletteMaps(entry, sourcePalette))
        const selectedPalette = activePalettes.find((entry) => entry.id === preferences.paletteId) ?? activePalettes[0]
        const preferredSize = preferences.size === 'S' ? 'S' : 'L'
        const preferredFormat = FORMATS.find((entry) => entry.id === preferences.formatId) ?? FORMATS[0]
        const initialScene = (savedItems ?? []).filter((item) => item && typeof item.markup === 'string' && typeof item.viewBox === 'string')
        const storedProjects = (savedProjects ?? []).filter((project) => project && typeof project.id === 'string' && typeof project.name === 'string' && Array.isArray(project.items))
          .map((project) => {
            const normalizedProject = {
              ...project,
              backdropId: BACKDROPS.some((entry) => entry.id === project.backdropId) ? project.backdropId : 'solid' as BackdropId,
              paletteBackgroundId: isPaletteBackgroundId(project.paletteBackgroundId) ? project.paletteBackgroundId : paletteBackgroundForScheme(project.paletteId),
              items: project.items.length || project.id !== savedProjectId ? project.items : initialScene,
            }
            const isCurrentReferenceProject = project.id === savedProjectId
              && project.name.trim().toLocaleLowerCase('ru') === 'новый проект'
              && project.formatId === 'wide'
              && !project.canvasWidth
              && !project.canvasHeight
            if (!isCurrentReferenceProject) return normalizedProject
            const oldFormat = FORMATS.find((entry) => entry.id === project.formatId) ?? FORMATS[0]
            const scale = Math.min(DEFAULT_PROJECT_FORMAT.width / oldFormat.width, DEFAULT_PROJECT_FORMAT.height / oldFormat.height)
            const items = normalizedProject.items.map((item) => {
              const width = Math.max(1, item.width * scale)
              const height = Math.max(1, item.height * scale)
              const centerX = (item.x + item.width / 2) / oldFormat.width * DEFAULT_PROJECT_FORMAT.width
              const centerY = (item.y + item.height / 2) / oldFormat.height * DEFAULT_PROJECT_FORMAT.height
              return {
                ...item,
                x: Math.max(0, Math.min(DEFAULT_PROJECT_FORMAT.width - width, centerX - width / 2)),
                y: Math.max(0, Math.min(DEFAULT_PROJECT_FORMAT.height - height, centerY - height / 2)),
                width,
                height,
              }
            })
            const referencePalette = activePalettes.find((entry) => entry.id === project.paletteId) ?? selectedPalette
            return {
              ...normalizedProject,
              formatId: DEFAULT_PROJECT_FORMAT.id,
              canvasWidth: DEFAULT_PROJECT_FORMAT.width,
              canvasHeight: DEFAULT_PROJECT_FORMAT.height,
              backgroundColor: referencePalette.backgroundColors[0],
              items,
            }
          })
        const emptyPlaceholders = legacyProjectsRecovered ? [] : storedProjects.filter((project) => project.name.trim().toLocaleLowerCase('ru') === 'новый проект' && project.items.length === 0)
        const projectArchive = [...archivedProjects, ...storedProjects.filter((project) => !archivedProjects.some((archived) => archived.id === project.id))]
        const projectsToRecover = emptyPlaceholders.length
          ? storedProjects.filter((project) => !emptyPlaceholders.some((placeholder) => placeholder.id === project.id))
          : storedProjects
        const restoredProjects = legacyProjectsRecovered ? storedProjects : mergeRecoveredLegacyProjects(projectsToRecover, initialAssets, selectedPalette.id)
        const projectsToRestore = removeEmptyProjects ? restoredProjects.filter((project) => project.items.length > 0) : restoredProjects
        const removedEmptyProjectCount = restoredProjects.length - projectsToRestore.length
        const currentSavedProject = projectsToRestore.find((project) => project.id === savedProjectId) ?? projectsToRestore[0]
        const activeSavedProject = !legacyProjectsRecovered
          && currentSavedProject
          && !currentSavedProject.items.length
          && currentSavedProject.name.toLocaleLowerCase('ru').startsWith('новый проект')
          ? projectsToRestore.find((project) => project.recoverySource === 'legacy-project-html' && project.items.length > 0) ?? currentSavedProject
          : currentSavedProject
        const activeProjectPalette = activePalettes.find((entry) => entry.id === activeSavedProject?.paletteId) ?? selectedPalette
        const hydratedProject: ProjectSnapshot | null = activeSavedProject ?? (!projectsMigrated && initialScene.length ? {
          id: uid(),
          name: 'Обучение и цифровые инструменты',
          items: initialScene,
          formatId: preferredFormat.id,
          size: preferredSize,
          paletteId: selectedPalette.id,
          backgroundColor: selectedPalette.backgroundColors.includes(preferences.backgroundColor ?? '') ? preferences.backgroundColor! : selectedPalette.backgroundColors[0],
          transparent: Boolean(preferences.transparent),
          includeBackground: preferences.includeBackground !== false,
          backdropId: 'solid',
          updatedAt: Date.now(),
        } : null)
        const nextProjects = hydratedProject && !activeSavedProject ? [hydratedProject, ...projectsToRestore] : projectsToRestore
        const projectFormat = hydratedProject ? formatForProject(hydratedProject) : preferredFormat
        const projectPalette = activeSavedProject ? activeProjectPalette : selectedPalette
        if (!alive) return
        setAssets(initialAssets)
        setProjects(nextProjects)
        projectsRef.current = nextProjects
        setCurrentProjectId(hydratedProject?.id ?? '')
        setItems(hydratedProject?.items ?? [])
        setPalettes(activePalettes)
        setPalette(projectPalette)
        setFormat(projectFormat)
        setSize(hydratedProject?.size === 'S' ? 'S' : preferredSize)
        setLibrarySizeFilter(hydratedProject?.size === 'S' ? 'S' : preferredSize)
        setBackgroundColor(hydratedProject && (hydratedProject.backdropId === 'palette' || hydratedProject.recoverySource === 'legacy-project-html' || projectPalette.backgroundColors.includes(hydratedProject.backgroundColor)) ? hydratedProject.backgroundColor : projectPalette.backgroundColors[0])
        setTransparent(hydratedProject?.transparent ?? Boolean(preferences.transparent))
        setIncludeBackground(hydratedProject?.includeBackground ?? (preferences.includeBackground !== false))
        setBackdropId(hydratedProject?.backdropId ?? 'solid')
        if (removeEmptyProjects) {
          await Promise.all([
            writeWorkspaceValue('composer-projects', nextProjects),
            writeWorkspaceValue('composer-current-project', hydratedProject?.id ?? ''),
            writeWorkspaceValue('composer-projects-migrated', true),
            writeWorkspaceValue('pixo-legacy-projects-recovered', true),
            writeWorkspaceValue('pixo-projects-before-legacy-recovery', projectArchive),
          ])
          const cleanUrl = new URL(window.location.href)
          cleanUrl.searchParams.delete('removeEmptyProjects')
          window.history.replaceState(null, '', cleanUrl)
          setPage('gallery')
          showNotice(removedEmptyProjectCount ? `Удалено пустых проектов: ${removedEmptyProjectCount}.` : 'Пустых проектов не найдено.')
        } else {
          await Promise.all([
            writeWorkspaceValue('composer-projects', nextProjects),
            writeWorkspaceValue('composer-current-project', hydratedProject?.id ?? ''),
            writeWorkspaceValue('composer-projects-migrated', true),
            writeWorkspaceValue('pixo-legacy-projects-recovered', true),
            writeWorkspaceValue('pixo-projects-before-legacy-recovery', projectArchive),
          ])
          const pageToRestore = savedPage && STUDIO_PAGES.has(savedPage) ? savedPage : 'landing'
          setPage(pageToRestore === 'editor' && !hydratedProject ? 'gallery' : pageToRestore)
        }
      } catch {
        if (alive) setLoadError(true)
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => { alive = false }
  }, [loadAttempt])

  useEffect(() => {
    if (!ready || !currentProjectId) return
    const timer = window.setTimeout(() => {
      setSaved(false)
      const currentProject = projectsRef.current.find((project) => project.id === currentProjectId)
      const snapshot: ProjectSnapshot = { id: currentProjectId, name: currentProject?.name ?? 'Новый проект', items, formatId: format.id, canvasWidth: format.id === 'custom' ? format.width : undefined, canvasHeight: format.id === 'custom' ? format.height : undefined, preserveOriginalColors: currentProject?.preserveOriginalColors, size, paletteId: palette.id, paletteBackgroundId: currentProject?.paletteBackgroundId ?? paletteBackgroundForScheme(palette.id), backgroundColor, transparent, includeBackground, backdropId, updatedAt: Date.now(), recoverySource: currentProject?.recoverySource, recoveryKey: currentProject?.recoveryKey }
      const nextProjects = projectsRef.current.some((project) => project.id === currentProjectId)
        ? projectsRef.current.map((project) => project.id === currentProjectId ? snapshot : project)
        : [snapshot, ...projectsRef.current]
      projectsRef.current = nextProjects
      setProjects(nextProjects)
      void Promise.all([
        writeWorkspaceValue('composer-assets', assets),
        writeWorkspaceValue('composer-scene', items),
        writeWorkspaceValue('composer-palettes', palettes),
        writeWorkspaceValue('composer-preferences', { paletteId: palette.id, formatId: format.id, size, backgroundColor, transparent, includeBackground } satisfies StoredPreferences),
        writeWorkspaceValue('composer-projects', nextProjects),
        writeWorkspaceValue('composer-current-project', currentProjectId),
      ]).then(() => setSaved(true)).catch(() => setSaved(false))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [assets, items, palettes, ready, palette, format, size, backgroundColor, transparent, includeBackground, backdropId, currentProjectId])

  useLayoutEffect(() => {
    if (page !== 'editor') return
    const node = stageRef.current
    if (!node) return
    const measure = () => {
      const rect = node.getBoundingClientRect()
      setStageSize({ width: rect.width, height: rect.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [page])

  useEffect(() => {
    folderImportRef.current?.setAttribute('webkitdirectory', '')
    folderImportRef.current?.setAttribute('directory', '')
  }, [])

  useEffect(() => {
    const previewDrag = (current: Drag, layout: DragLayout) => {
      const element = boardRef.current?.querySelector<HTMLElement>(`[data-object-id="${current.id}"]`)
      if (!element) return
      element.style.left = `${layout.x / current.formatWidth * current.boardWidth}px`
      element.style.top = `${layout.y / current.formatHeight * (current.boardWidth * current.formatHeight / current.formatWidth)}px`
      element.style.width = `${layout.width / current.formatWidth * current.boardWidth}px`
      element.style.height = `${layout.height / current.formatHeight * (current.boardWidth * current.formatHeight / current.formatWidth)}px`
    }
    const onMove = (event: PointerEvent) => {
      const current = dragRef.current
      if (!current) return
      const dx = (event.clientX - current.pointerX) / current.scale
      const dy = (event.clientY - current.pointerY) / current.scale
      if (current.mode === 'move') {
        const layout = { x: current.itemX + dx, y: current.itemY + dy, width: current.itemWidth, height: current.itemHeight }
        dragLayoutRef.current = layout
        previewDrag(current, layout)
        return
      }
      const angle = current.rotation * Math.PI / 180
      const localDx = dx * Math.cos(angle) + dy * Math.sin(angle)
      const localDy = -dx * Math.sin(angle) + dy * Math.cos(angle)
      const handle = current.handle ?? 'se'
      const directionX = handle.endsWith('e') ? 1 : -1
      const directionY = handle.startsWith('s') ? 1 : -1
      const horizontalDelta = localDx * directionX
      const verticalDelta = localDy * directionY * current.itemWidth / Math.max(1, current.itemHeight)
      const widthDelta = Math.abs(horizontalDelta) >= Math.abs(verticalDelta) ? horizontalDelta : verticalDelta
      const itemWidth = Math.max(18, current.itemWidth + widthDelta)
      const itemHeight = itemWidth * current.itemHeight / Math.max(1, current.itemWidth)
      const itemX = directionX < 0 ? current.itemX + current.itemWidth - itemWidth : current.itemX
      const itemY = directionY < 0 ? current.itemY + current.itemHeight - itemHeight : current.itemY
      const layout = { x: itemX, y: itemY, width: itemWidth, height: itemHeight }
      dragLayoutRef.current = layout
      previewDrag(current, layout)
    }
    const onUp = () => {
      const current = dragRef.current
      const layout = dragLayoutRef.current
      if (current && layout) {
        setItems((previous) => previous.map((item) => item.objectId === current.id
          ? { ...item, ...layout, layoutMode: 'manual' as const }
          : item))
      }
      dragRef.current = null
      dragLayoutRef.current = null
      setDrag(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [])

  function showNotice(message: string) {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3200)
  }

  async function saveAndOpenProject(project: ProjectSnapshot, showTemplateNotice = false) {
    if (projectActionLock.current) return
    projectActionLock.current = true
    const nextProjects = [project, ...projectsRef.current.filter((entry) => entry.id !== project.id)]
    projectsRef.current = nextProjects
    setProjects(nextProjects)
    try {
      await Promise.all([
        writeWorkspaceValue('composer-projects', nextProjects),
        writeWorkspaceValue('composer-current-project', project.id),
      ])
    } catch {
      showNotice('Проект открыт, но не удалось сохранить его в браузере.')
    } finally {
      setCurrentProjectId(project.id)
      setItems(project.items)
      setFormat(formatForProject(project))
      setSize(project.size === 'S' ? 'S' : 'L')
      setLibrarySizeFilter(project.size === 'S' ? 'S' : 'L')
      const projectPalette = palettes.find((entry) => entry.id === project.paletteId) ?? palettes[0]
      setPalette(projectPalette)
      setBackgroundColor(project.backdropId === 'palette' || project.recoverySource === 'legacy-project-html' || projectPalette.backgroundColors.includes(project.backgroundColor) ? project.backgroundColor : projectPalette.backgroundColors[0])
      setTransparent(project.transparent)
      setIncludeBackground(project.includeBackground)
      setBackdropId(project.backdropId)
      setSelectedId(null)
      setPage('editor')
      setSaved(true)
      if (showTemplateNotice) {
        setQuery(project.name)
        setActivePanel('components')
        showNotice(`Создан проект «${project.name}» из исходных SVG-компонентов.`)
      }
      projectActionLock.current = false
    }
  }

  function createProject() {
    const project: ProjectSnapshot = {
      id: uid(), name: 'Новый проект', items: [], formatId: DEFAULT_PROJECT_FORMAT.id, canvasWidth: DEFAULT_PROJECT_FORMAT.width, canvasHeight: DEFAULT_PROJECT_FORMAT.height, size, paletteId: palette.id, paletteBackgroundId: 'lavender',
      backgroundColor, transparent, includeBackground, backdropId, updatedAt: Date.now(),
    }
    void saveAndOpenProject(project)
  }

  function continueProject() {
    const project = projectsRef.current.find((entry) => entry.id === currentProjectId) ?? projectsRef.current[0]
    if (project) openSavedProject(project)
    else createProject()
  }

  function openSavedProject(project: ProjectSnapshot) {
    setCurrentProjectId(project.id)
    setItems(project.items)
    setFormat(formatForProject(project))
    setSize(project.size === 'S' ? 'S' : 'L')
    setLibrarySizeFilter(project.size === 'S' ? 'S' : 'L')
    setPalette(palettes.find((entry) => entry.id === project.paletteId) ?? palettes[0])
    const selectedPalette = palettes.find((entry) => entry.id === project.paletteId) ?? palettes[0]
    setBackgroundColor(project.backdropId === 'palette' || project.recoverySource === 'legacy-project-html' || selectedPalette.backgroundColors.includes(project.backgroundColor) ? project.backgroundColor : selectedPalette.backgroundColors[0])
    setTransparent(project.transparent)
    setIncludeBackground(project.includeBackground)
    setBackdropId(project.backdropId ?? 'solid')
    setSelectedId(null)
    setPage('editor')
    void writeWorkspaceValue('composer-current-project', project.id)
  }

  function openTemplate(template: (typeof templates)[number]) {
    if (!template.items.length) { showNotice('Не нашёл SVG-объекты для этого шаблона. Проверьте библиотеку.'); return }
    const project: ProjectSnapshot = {
      id: uid(), name: template.name, items: template.items.map((item) => ({ ...item, objectId: uid() })), formatId: format.id, canvasWidth: format.id === 'custom' ? format.width : undefined, canvasHeight: format.id === 'custom' ? format.height : undefined, size, paletteId: palette.id, paletteBackgroundId: 'lavender',
      backgroundColor, transparent: false, includeBackground: true, backdropId: template.backdropId, updatedAt: Date.now(),
    }
    void saveAndOpenProject(project, true)
  }

  function beginProjectRename(project: ProjectSnapshot) {
    setProjectNameDraft(project.name)
    setProjectDialog({ mode: 'rename', projectId: project.id, name: project.name })
  }

  async function saveProjectRename() {
    if (!projectDialog || projectDialog.mode !== 'rename') return
    const name = projectNameDraft.trim()
    if (!name) { showNotice('Введите название проекта.'); return }
    const nextProjects = projectsRef.current.map((project) => project.id === projectDialog.projectId ? { ...project, name, updatedAt: Date.now() } : project)
    projectsRef.current = nextProjects
    setProjects(nextProjects)
    setProjectDialog(null)
    try {
      await writeWorkspaceValue('composer-projects', nextProjects)
      showNotice('Название проекта обновлено.')
    } catch { showNotice('Не удалось сохранить новое название.') }
  }

  async function duplicateProject(project: ProjectSnapshot) {
    if (projectActionLock.current) return
    projectActionLock.current = true
    const duplicate: ProjectSnapshot = {
      ...project,
      id: uid(),
      name: `${project.name} — копия`,
      items: project.items.map((item) => ({ ...item, objectId: uid() })),
      updatedAt: Date.now(),
    }
    const nextProjects = [duplicate, ...projectsRef.current]
    projectsRef.current = nextProjects
    setProjects(nextProjects)
    try {
      await writeWorkspaceValue('composer-projects', nextProjects)
      showNotice(`Создана копия «${duplicate.name}».`)
    } catch { showNotice('Копия создана, но не удалось сохранить её в браузере.') }
    finally {
      projectActionLock.current = false
    }
  }

  async function deleteProjectById(projectId: string) {
    const nextProjects = projectsRef.current.filter((project) => project.id !== projectId)
    projectsRef.current = nextProjects
    setProjects(nextProjects)
    if (currentProjectId === projectId) {
      setCurrentProjectId('')
      void writeWorkspaceValue('composer-current-project', '')
    }
    try {
      await writeWorkspaceValue('composer-projects', nextProjects)
      showNotice('Проект удалён.')
    } catch { showNotice('Проект удалён из списка, но не удалось обновить локальное хранилище.') }
  }

  async function confirmProjectDelete() {
    if (!projectDialog || projectDialog.mode !== 'delete') return
    const projectId = projectDialog.projectId
    setProjectDialog(null)
    await deleteProjectById(projectId)
  }

  function retryProjectLoad() {
    setReady(false)
    setLoadError(false)
    setLoadAttempt((attempt) => attempt + 1)
  }

  function returnToLanding() {
    setPage('landing')
  }

  function returnToProjects() {
    setPage('gallery')
    setSelectedId(null)
  }

  function openLibrarySection() {
    setActivePanel('components')
    setPage('editor')
  }

  function sendEditorProjectData() {
    const frame = editorFrameRef.current?.contentWindow
    if (!frame || !currentProjectId || !ready) return
    const project = projectsRef.current.find((entry) => entry.id === currentProjectId)
    frame.postMessage({
      type: 'pixo:load-project',
      project: {
        id: currentProjectId,
        name: projectsRef.current.find((project) => project.id === currentProjectId)?.name ?? 'Новый проект',
        canvasWidth: projectsRef.current.find((project) => project.id === currentProjectId)?.canvasWidth,
        canvasHeight: projectsRef.current.find((project) => project.id === currentProjectId)?.canvasHeight,
        preserveOriginalColors: projectsRef.current.find((project) => project.id === currentProjectId)?.preserveOriginalColors,
        items,
        formatId: format.id,
        size,
        paletteId: palette.id,
        paletteBackgroundId: project?.paletteBackgroundId ?? paletteBackgroundForScheme(project?.paletteId ?? palette.id),
        backgroundColor,
        transparent,
        includeBackground,
        backdropId,
      },
      assets,
      palettes,
    }, window.location.origin)
  }

  function applyEditorChange(projectId: string, value: unknown) {
    if (typeof value !== 'object' || value === null || projectId !== currentProjectId) return
    const state = value as Record<string, unknown>
    if (!Array.isArray(state.items) || !currentProjectId) return
    const customWidth = typeof state.canvasWidth === 'number' && Number.isFinite(state.canvasWidth) ? Math.max(200, Math.min(12000, state.canvasWidth)) : undefined
    const customHeight = typeof state.canvasHeight === 'number' && Number.isFinite(state.canvasHeight) ? Math.max(200, Math.min(12000, state.canvasHeight)) : undefined
    const selectedFormat = state.formatId === 'custom' && customWidth && customHeight
      ? { id: 'custom', name: 'Свой размер', width: customWidth, height: customHeight, description: 'Настраиваемый размер холста' }
      : FORMATS.find((entry) => entry.id === state.formatId)
    const selectedPalette = palettes.find((entry) => entry.id === state.paletteId)
    const changedItems = state.items as CompositionItem[]
    const currentProject = projectsRef.current.find((project) => project.id === currentProjectId)
    const snapshot: ProjectSnapshot = {
      ...(currentProject ?? { id: currentProjectId, name: 'Новый проект', items: [], formatId: format.id, size, paletteId: palette.id, backgroundColor, transparent, includeBackground, backdropId, updatedAt: Date.now() }),
      name: typeof state.name === 'string' ? state.name : currentProject?.name ?? 'Новый проект',
      items: changedItems,
      formatId: selectedFormat?.id ?? currentProject?.formatId ?? format.id,
      canvasWidth: selectedFormat?.id === 'custom' ? selectedFormat.width : undefined,
      canvasHeight: selectedFormat?.id === 'custom' ? selectedFormat.height : undefined,
      preserveOriginalColors: typeof state.preserveOriginalColors === 'boolean' ? state.preserveOriginalColors : currentProject?.preserveOriginalColors,
      size: state.size === 'S' || state.size === 'L' ? state.size : currentProject?.size ?? size,
      paletteId: selectedPalette?.id ?? currentProject?.paletteId ?? palette.id,
      paletteBackgroundId: isPaletteBackgroundId(state.paletteBackgroundId) ? state.paletteBackgroundId : currentProject?.paletteBackgroundId ?? paletteBackgroundForScheme(selectedPalette?.id ?? currentProject?.paletteId ?? palette.id),
      backgroundColor: isHexColor(state.backgroundColor) ? state.backgroundColor : currentProject?.backgroundColor ?? backgroundColor,
      transparent: typeof state.transparent === 'boolean' ? state.transparent : currentProject?.transparent ?? transparent,
      includeBackground: typeof state.includeBackground === 'boolean' ? state.includeBackground : currentProject?.includeBackground ?? includeBackground,
      backdropId: state.backdropId === 'solid' || state.backdropId === 'desk' || state.backdropId === 'paper' || state.backdropId === 'buildplate' || state.backdropId === 'palette' ? state.backdropId : currentProject?.backdropId ?? backdropId,
      updatedAt: Date.now(),
    }
    const nextProjects = projectsRef.current.some((project) => project.id === currentProjectId)
      ? projectsRef.current.map((project) => project.id === currentProjectId ? snapshot : project)
      : [snapshot, ...projectsRef.current]
    projectsRef.current = nextProjects
    setProjects(nextProjects)
    setItems(changedItems)
    if (selectedFormat) setFormat(selectedFormat)
    if (state.size === 'S' || state.size === 'L') {
      setSize(state.size)
      setLibrarySizeFilter(state.size)
    }
    if (selectedPalette) setPalette(selectedPalette)
    if (isHexColor(state.backgroundColor)) setBackgroundColor(state.backgroundColor)
    if (typeof state.transparent === 'boolean') setTransparent(state.transparent)
    if (typeof state.includeBackground === 'boolean') setIncludeBackground(state.includeBackground)
    if (state.backdropId === 'solid' || state.backdropId === 'desk' || state.backdropId === 'paper' || state.backdropId === 'buildplate' || state.backdropId === 'palette') setBackdropId(state.backdropId)
    setSaved(false)
    void Promise.all([
      writeWorkspaceValue('composer-projects', nextProjects),
      writeWorkspaceValue('composer-current-project', currentProjectId),
      writeWorkspaceValue('composer-scene', changedItems),
      writeWorkspaceValue('composer-preferences', { paletteId: snapshot.paletteId, formatId: snapshot.formatId, size: snapshot.size, backgroundColor: snapshot.backgroundColor, transparent: snapshot.transparent, includeBackground: snapshot.includeBackground } satisfies StoredPreferences),
    ]).then(() => {
      setSaved(true)
      editorFrameRef.current?.contentWindow?.postMessage({ type: 'pixo:editor-saved', projectId: currentProjectId }, window.location.origin)
    }).catch(() => {
      setSaved(false)
      editorFrameRef.current?.contentWindow?.postMessage({ type: 'pixo:editor-save-error', projectId: currentProjectId }, window.location.origin)
    })
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const imported: LibraryComponent[] = []
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.svg')) { showNotice(`${file.name}: загружайте исходные SVG-файлы`); continue }
      try {
        const cleaned = cleanSvg(await file.text())
        const parsed = new DOMParser().parseFromString(cleaned.markup, 'image/svg+xml')
        if (parsed.querySelector('image')) { showNotice(`${file.name}: внутри SVG найдена растровая картинка. Нужен векторный исходник.`); continue }
        const trimmed = trimSvgToContent(cleaned.markup, cleaned.viewBox, cleaned.width, cleaned.height)
        const sourceFileId = file.webkitRelativePath || file.name
        const componentName = file.name.replace(/\.svg$/i, '')
        const metadata = inferMetadata(sourceFileId)
        imported.push({
          id: `svg-${uid()}`, name: componentName, category: 'Импортированные', source: sourceFileId,
          width: trimmed.width, height: trimmed.height, viewBox: trimmed.viewBox, markup: cleaned.markup,
          sourceFileId, imported: true, role: metadata.role, familyId: metadata.familyId, detailSize: metadata.detailSize, tags: metadata.tags,
        })
      } catch {
        showNotice(`${file.name}: файл не удалось прочитать как SVG`)
      }
    }
    if (imported.length) {
      setAssets((previous) => [...imported, ...previous])
      setSelectedAssetId(imported[0].id)
      setActivePanel('components')
      showNotice(`Добавлено SVG-компонентов: ${imported.length}. Проверьте размер и роль в свойствах.`)
    }
  }

  const importEditorAssets = (values: unknown[]) => {
    void Promise.all(values.slice(0, 100).map((value) => sanitizeLibraryAsset(value))).then((results) => {
      const imported = results.filter((asset): asset is LibraryComponent => asset !== null)
      if (!imported.length) {
        showNotice('SVG не удалось импортировать. Нужен корректный векторный файл без встроенных растровых изображений.')
        editorFrameRef.current?.contentWindow?.postMessage({ type: 'pixo:editor-assets-imported', assets: [] }, window.location.origin)
        return
      }
      setAssets((previous) => {
        const known = new Set(previous.map((asset) => asset.id))
        return [...imported.filter((asset) => !known.has(asset.id)), ...previous]
      })
      editorFrameRef.current?.contentWindow?.postMessage({ type: 'pixo:editor-assets-imported', assets: imported }, window.location.origin)
      showNotice(`Добавлено SVG-компонентов: ${imported.length}. Они сохранены в библиотеке.`)
    })
  }

  const importEditorPalette = (value: unknown) => {
    const candidate = typeof value === 'object' && value !== null ? value as Partial<PaletteScheme> : null
    const parsed = candidate ? normalizePalette({ ...candidate, id: `palette-${uid()}` }) : null
    if (!parsed) {
      showNotice('Палитра должна содержать не менее трёх корректных HEX-цветов.')
      return
    }
    const sourcePalette = palettes.find((entry) => entry.id === 'palette-01' && Object.keys(entry.objectColorMap ?? {}).length)
      ?? palettes.find((entry) => Object.keys(entry.objectColorMap ?? {}).length)
    const next = completePaletteMaps(parsed, sourcePalette)
    setPalettes((previous) => [...previous, next])
    setPalette(next)
    if (backdropId !== 'palette') setBackgroundColor(next.backgroundColors[0])
    editorFrameRef.current?.contentWindow?.postMessage({ type: 'pixo:editor-palette-added', palette: next }, window.location.origin)
    showNotice(`Палитра «${next.name}» добавлена и сохранена.`)
  }

  const handleLibraryImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Partial<LibraryManifest>
      if (parsed.version !== 1 || !Array.isArray(parsed.assets)) throw new Error('bad library manifest')
      const imported = (await Promise.all(parsed.assets.map((asset) => sanitizeLibraryAsset(asset))))
        .filter((asset): asset is LibraryComponent => asset !== null)
        .map((asset) => ({ ...asset, id: `svg-${uid()}`, source: asset.source || file.name, sourceFileId: asset.sourceFileId || asset.source }))
      if (!imported.length) throw new Error('no vector components')
      const importedPalettesRaw = (Array.isArray(parsed.palettes) ? parsed.palettes : []).map(normalizePalette).filter((entry): entry is PaletteScheme => entry !== null)
      const sourcePalette = palettes.find((entry) => entry.id === 'palette-01' && Object.keys(entry.objectColorMap ?? {}).length)
        ?? palettes.find((entry) => Object.keys(entry.objectColorMap ?? {}).length)
      const importedPalettes = importedPalettesRaw.map((entry) => completePaletteMaps(entry, sourcePalette))
      setAssets((previous) => [...imported, ...previous])
      setSelectedAssetId(imported[0].id)
      setActivePanel('components')
      if (importedPalettes.length) {
        const importedIds = new Set(importedPalettes.map((entry) => entry.id))
        setPalettes((previous) => [...previous.filter((entry) => !importedIds.has(entry.id)), ...importedPalettes])
        choosePalette(importedPalettes[0])
      }
      showNotice(`Из пакета добавлено SVG-компонентов: ${imported.length}${importedPalettes.length ? ` · палитр: ${importedPalettes.length}` : ''}`)
    } catch {
      showNotice('Не удалось прочитать пакет. Нужен JSON версии 1 с массивом assets.')
    }
  }

  const exportLibrary = () => {
    if (!assets.length) { showNotice('Библиотека пуста: нечего экспортировать'); return }
    const manifest: LibraryManifest = { version: 1, assets, palettes }
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'pixo-library.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    showNotice('Пакет библиотеки сохранён. Положите его как public/library.json, чтобы включить в публикацию.')
  }

  const updateAsset = (id: string, changes: Partial<LibraryComponent>) => {
    setAssets((previous) => previous.map((asset) => asset.id === id ? { ...asset, ...changes } : asset))
    setItems((previous) => previous.map((item) => item.assetId === id ? { ...item, ...changes, objectId: item.objectId, assetId: item.assetId, x: item.x, y: item.y, width: item.width, height: item.height } : item))
  }

  const changeFormat = (next: CompositionFormat) => {
    if (next.id === format.id) return
    setItems((previous) => reflowComposition(next, previous))
    setFormat(next)
    showNotice(`Формат изменён на «${next.name}»: объекты перестроены с сохранением исходных SVG и пропорций.`)
  }

  const changeSize = (next: DetailSize) => {
    if (next === size) return
    const switched = switchSceneVariants(items, assets, next)
    if (switched.missing.length) {
      showNotice(`Не хватает исходных вариантов ${next} для: ${switched.missing.join(', ')}. Сцена не изменена.`)
      return
    }
    setItems(switched.items)
    setSize(next)
    setLibrarySizeFilter(next)
    setSelectedAssetId(null)
    showNotice(`Сцена переключена на исходные SVG-варианты ${next}.`)
  }

  const changeLibrarySize = (next: DetailSize) => {
    setLibrarySizeFilter(next)
    setSelectedAssetId(null)
  }

  const changeLibraryRole = (next: LibraryRoleFilter) => {
    setLibraryRoleFilter(next)
    setSelectedAssetId(null)
  }

  const addAsset = (asset: LibraryComponent) => {
    const variant = asset.detailSize === size
      ? asset
      : assets.find((candidate) => candidate.familyId === asset.familyId && candidate.role === asset.role && candidate.detailSize === size)
    if (!variant) {
      showNotice(`Для «${asset.name}» нет исходного варианта ${size}.`)
      return
    }
    asset = variant
    const scale = Math.min(format.width, format.height) * 0.28
    const ratio = asset.width / Math.max(1, asset.height)
    const width = ratio >= 1 ? scale : scale * ratio
    const height = ratio >= 1 ? scale / ratio : scale
    const object = makeSceneObject(asset, (format.width - width) / 2, (format.height - height) / 2, width, height)
    setItems((previous) => [...previous, object])
    setSelectedId(object.objectId)
  }

  const addAssetAt = (asset: LibraryComponent, clientX: number, clientY: number) => {
    const board = boardRef.current
    if (!board) return addAsset(asset)
    const rect = board.getBoundingClientRect()
    if (!rect.width || !rect.height) return addAsset(asset)
    const boardX = ((clientX - rect.left) / rect.width) * format.width
    const boardY = ((clientY - rect.top) / rect.height) * format.height
    const activeAsset = asset.detailSize === size
      ? asset
      : assets.find((candidate) => candidate.familyId === asset.familyId && candidate.role === asset.role && candidate.detailSize === size)
    if (!activeAsset) {
      showNotice(`Для «${asset.name}» нет исходного варианта ${size}.`)
      return
    }
    const scale = Math.min(format.width, format.height) * 0.28
    const ratio = activeAsset.width / Math.max(1, activeAsset.height)
    const width = Math.min(format.width, ratio >= 1 ? scale : scale * ratio)
    const height = Math.min(format.height, ratio >= 1 ? scale / ratio : scale)
    const x = Math.max(0, Math.min(format.width - width, boardX - width / 2))
    const y = Math.max(0, Math.min(format.height - height, boardY - height / 2))
    const object = makeSceneObject(activeAsset, x, y, width, height)
    setItems((previous) => [...previous, object])
    setSelectedId(object.objectId)
  }

  const onAssetDragStart = (event: ReactDragEvent<HTMLElement>, asset: LibraryComponent) => {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/x-pixo-asset', asset.id)
    event.dataTransfer.setData('text/plain', asset.id)
  }

  const onBoardDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const onBoardDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setBoardDragActive(true)
  }

  const onBoardDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBoardDragActive(false)
  }

  const onBoardDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setBoardDragActive(false)
    const assetId = event.dataTransfer.getData('application/x-pixo-asset') || event.dataTransfer.getData('text/plain')
    const asset = assets.find((entry) => entry.id === assetId)
    if (asset) addAssetAt(asset, event.clientX, event.clientY)
  }

  const generate = (request: { query: string; mode: CompositionMode; layout?: CompositionLayout } = { query, mode }, replyToEditor = false) => {
    const reportToEditor = (type: 'pixo:composition-error', message: string) => {
      if (replyToEditor) editorFrameRef.current?.contentWindow?.postMessage({ type, message }, window.location.origin)
    }
    if (!assets.length) { const message = 'Сначала загрузите SVG-компоненты из исходной библиотеки'; showNotice(message); reportToEditor('pixo:composition-error', message); setActivePanel('components'); return }
    const candidates = findComponents(assets, request.query, size, request.mode)
    const filtered = includeBackground ? candidates : candidates.filter((asset) => asset.role === 'main')
    if (!filtered.length) {
      const message = `Не нашёл компонентов размера ${size} по этому запросу. Проверьте теги и вариант размера.`
      showNotice(message)
      reportToEditor('pixo:composition-error', message)
      return
    }
    const composition = buildComposition(format, filtered.slice(0, 8), request.layout ?? 'balanced')
    setItems(composition)
    setSelectedId(null)
    if (replyToEditor) editorFrameRef.current?.contentWindow?.postMessage({ type: 'pixo:editor-composition', items: composition, layout: request.layout ?? 'balanced' }, window.location.origin)
    const message = `Собрано из ${composition.length} исходных SVG-компонентов · ${size}`
    showNotice(message)
  }

  const applyCompositionStarter = (starter: (typeof COMPOSITION_STARTERS)[number]) => {
    setMode(starter.mode)
    setQuery(starter.query)
    generate(starter)
  }

  const choosePalette = (next: PaletteScheme) => {
    setPalette(next)
    if (backdropId !== 'palette' && !next.backgroundColors.includes(backgroundColor)) setBackgroundColor(next.backgroundColors[0])
  }

  const updatePaletteMapping = (kind: 'objectColorMap' | 'backgroundColorMap', source: string, target: string) => {
    const allowedTargets = kind === 'backgroundColorMap' ? palette.backgroundColors : [...palette.objectColors, ...palette.backgroundColors]
    if (target && !allowedTargets.some((color) => normalizeHexColor(color) === normalizeHexColor(target))) {
      showNotice(kind === 'backgroundColorMap'
        ? 'Фоновому объекту можно назначить только цвет из фоновой палитры.'
        : 'Для главного объекта выберите цвет объекта или фона из текущей схемы.')
      return
    }
    const mapping = { ...(palette[kind] ?? {}) }
    if (target) mapping[source] = target
    else delete mapping[source]
    const next = { ...palette, [kind]: mapping }
    setPalette(next)
    setPalettes((previous) => previous.map((entry) => entry.id === palette.id ? next : entry))
  }

  const importPalette = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Partial<PaletteScheme>
      const parsedPalette = normalizePalette({ ...parsed, id: `palette-${uid()}`, name: parsed.name || file.name.replace(/\.json$/i, '') })
      if (!parsedPalette) throw new Error('bad palette')
      const sourcePalette = palettes.find((entry) => entry.id === 'palette-01' && Object.keys(entry.objectColorMap ?? {}).length)
        ?? palettes.find((entry) => Object.keys(entry.objectColorMap ?? {}).length)
      const next = completePaletteMaps(parsedPalette, sourcePalette)
      setPalettes((previous) => [...previous, next])
      choosePalette(next)
      showNotice('Палитра добавлена и автоматически применена к исходным SVG по ролям.')
    } catch {
      showNotice('Палитра: JSON с objectColors, backgroundColors и необязательными картами цветов в HEX')
    }
  }

  const removeItem = (id: string) => { setItems((previous) => previous.filter((item) => item.objectId !== id)); setSelectedId((current) => current === id ? null : current) }
  const duplicateItem = (item: CompositionItem) => {
    const duplicate = { ...item, objectId: `scene-${uid()}`, x: item.x + 28, y: item.y + 28, layoutMode: 'manual' as const }
    setItems((previous) => [...previous, duplicate]); setSelectedId(duplicate.objectId)
  }
  const moveItem = (id: string, direction: -1 | 1) => {
    setItems((previous) => {
      const index = previous.findIndex((item) => item.objectId === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= previous.length) return previous
      const next = [...previous]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const reorderLayer = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    setItems((previous) => {
      const sourceIndex = previous.findIndex((item) => item.objectId === sourceId)
      const targetIndex = previous.findIndex((item) => item.objectId === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return previous
      const next = [...previous]
      ;[next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]]
      return next
    })
  }

  const onLayerDragStart = (event: ReactDragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-pixo-layer', id)
    setDraggedLayerId(id)
  }

  const onLayerDrop = (event: ReactDragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('application/x-pixo-layer')
    if (sourceId) reorderLayer(sourceId, targetId)
    setDraggedLayerId(null)
  }

  const exportSvg = () => {
    if (!items.length) { showNotice('Добавьте компоненты на холст перед экспортом'); return }
    const recolored = items.map((item) => ({ ...item, markup: recolorSvg(item.markup, item.role, palette) }))
    const svg = serializeComposition(exportItems(recolored), transparent, backgroundColor, format.width, format.height, 0, 0, backdropId, palette.backgroundColors)
      .replace('width="100%"', `width="${format.width}px"`).replace('height="100%"', `height="${format.height}px"`)
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    link.href = url
    link.download = `pixo-${format.id}-${Date.now()}.svg`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    showNotice('SVG экспортирован: в файле остались векторные пути и редактируемые группы')
  }

  const onItemPointerDown = (event: ReactPointerEvent<HTMLDivElement>, item: CompositionItem) => {
    if (event.button !== 0 || item.locked) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = stageRef.current?.getBoundingClientRect()
    const scale = rect ? boardWidth * zoom / format.width : 1
    const next: Drag = { id: item.objectId, mode: 'move', pointerX: event.clientX, pointerY: event.clientY, itemX: item.x, itemY: item.y, itemWidth: item.width, itemHeight: item.height, rotation: item.rotation, scale, formatWidth: format.width, formatHeight: format.height, boardWidth }
    dragRef.current = next
    dragLayoutRef.current = { x: item.x, y: item.y, width: item.width, height: item.height }
    setDrag(next)
    setSelectedId(item.objectId)
  }

  const onResizePointerDown = (event: ReactPointerEvent<HTMLElement>, item: CompositionItem, handle: ResizeHandle) => {
    if (event.button !== 0 || item.locked) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = stageRef.current?.getBoundingClientRect()
    const scale = rect ? boardWidth * zoom / format.width : 1
    const next: Drag = { id: item.objectId, mode: 'resize', handle, pointerX: event.clientX, pointerY: event.clientY, itemX: item.x, itemY: item.y, itemWidth: item.width, itemHeight: item.height, rotation: item.rotation, scale, formatWidth: format.width, formatHeight: format.height, boardWidth }
    dragRef.current = next
    dragLayoutRef.current = { x: item.x, y: item.y, width: item.width, height: item.height }
    setDrag(next)
    setSelectedId(item.objectId)
  }

  const boardWidth = (() => {
    const ratio = format.width / format.height
    const availableWidth = Math.max(280, stageSize.width - 72)
    const availableHeight = Math.max(240, stageSize.height - 100)
    return Math.floor(Math.min(availableWidth, availableHeight * ratio, 1100))
  })()
  const boardHeight = Math.floor(boardWidth * format.height / format.width)
  const isDragging = drag !== null
  const renderColorMap = (title: string, sources: Array<[string, number]>, kind: 'objectColorMap' | 'backgroundColorMap', targets: string[]) => (
    <div className="palette-map-group">
      <strong>{title} <small>{Object.keys(palette[kind] ?? {}).length}/{sources.length}</small></strong>
      {sources.length ? sources.map(([source, count]) => <label className="palette-map-row" key={source}>
        <span><i style={{ background: source }} />{source}<small>{count}</small></span>
        <select value={palette[kind]?.[source] ?? ''} onChange={(event) => updatePaletteMapping(kind, source, event.target.value)} aria-label={`Цвет ${source}: ${title}`}>
          <option value="">Автоматически</option>
          {targets.map((color) => <option key={color} value={color}>{color}</option>)}
        </select>
      </label>) : <p className="field-help">В библиотеке пока нет SVG этой роли.</p>}
    </div>
  )

  landingActionsRef.current = {
    openEditor: continueProject,
    createProject,
    openProjects: () => setPage('gallery'),
    composeEditorRequest: (request) => generate(request, true),
    openTemplate: (templateId) => {
      const template = templates.find((entry) => entry.id === templateId)
      if (template) openTemplate(template)
    },
    syncProjects: () => projectsFrameRef.current?.contentWindow?.postMessage({
      type: 'pixo:projects-data',
      projects: projectsRef.current.map((project) => {
        const projectPalette = palettes.find((entry) => entry.id === project.paletteId) ?? palettes[0]
        return {
          id: project.id,
          name: project.name,
          updatedAt: project.updatedAt,
          format: formatForProject(project),
          backgroundColor: project.backgroundColor,
          transparent: project.transparent,
          backdropId: project.backdropId,
          paletteId: project.paletteId,
          paletteBackgroundId: project.paletteBackgroundId ?? paletteBackgroundForScheme(project.paletteId),
          backgroundColors: projectPalette?.backgroundColors ?? [],
          items: project.items.map((item) => ({ ...item, markup: item.sourceFileId?.startsWith('recovered-project-html:') ? item.markup : projectPalette ? recolorSvg(item.markup, item.role, projectPalette) : item.markup })),
        }
      }),
    }, window.location.origin),
    openProject: (projectId) => {
      const project = projectsRef.current.find((entry) => entry.id === projectId)
      if (project) openSavedProject(project)
    },
    duplicateProject: (projectId) => {
      const project = projectsRef.current.find((entry) => entry.id === projectId)
      if (project) void duplicateProject(project)
    },
    requestDeleteProject: (projectId) => {
      const project = projectsRef.current.find((entry) => entry.id === projectId)
      if (project) void deleteProjectById(project.id)
    },
    renameProject: (projectId) => {
      const project = projectsRef.current.find((entry) => entry.id === projectId)
      if (project) beginProjectRename(project)
    },
    sendEditorProjectData,
    applyEditorChange,
    importEditorAssets,
    importEditorPalette,
  }

  return (
    <main className={page === 'editor' ? 'studio editor-theme' : 'studio'}>
      {page === 'landing' ? <iframe ref={landingFrameRef} className="pixo-landing-frame" title="Pixo — главная страница" src={`${import.meta.env.BASE_URL}pixo-landing.html?v=3`} /> : page === 'gallery' ? (!ready ? <div className="gallery-loading"><AppIcon /><span>Загружаю проекты и SVG-библиотеку…</span></div> : loadError ? <div className="gallery-error"><div className="gallery-error-mark"><FolderOpen size={23} /></div><h2>Не удалось загрузить проекты</h2><p>Локальное хранилище временно недоступно. Повторите загрузку.</p><button className="gallery-create-button" onClick={retryProjectLoad}><RotateCw size={15} /> Повторить</button></div> : <iframe ref={projectsFrameRef} className="pixo-landing-frame" title="Pixo — Мои проекты" src={`${import.meta.env.BASE_URL}pixo-projects.html?v=6`} onLoad={() => landingActionsRef.current.syncProjects()} />): page === 'templates' ? <iframe ref={templateFrameRef} className="pixo-landing-frame" title="Шаблоны из библиотеки" src={`${import.meta.env.BASE_URL}template-library.html`} /> : <><iframe ref={editorFrameRef} className="pixo-landing-frame" title="Pixo — редактор" src={`${import.meta.env.BASE_URL}pixo-editor.html?v=27`} onLoad={sendEditorProjectData} />{false && <><header className="studio-header">
        <div className="studio-brand"><button className="studio-brand-home" type="button" onClick={returnToLanding} aria-label="Pixo — главная страница" title="На главную"><AppIcon /><strong>Pixo</strong></button><span className="brand-divider" /><button className="project-title" onClick={returnToProjects} title="Открыть мои проекты"><small>МОИ ПРОЕКТЫ</small><span>{projects.find((project) => project.id === currentProjectId)?.name ?? 'Проект'} <ChevronDown size={13} /></span></button></div>
        <div className="studio-header-actions">
          <span className="studio-project"><i className="save-dot" data-saved={saved} />{saved ? 'Сохранено' : 'Сохраняем…'}</span>
          <button className="header-auto" onClick={() => query.trim() ? generate() : promptRef.current?.focus()}><Sparkles size={15} /> Автокомпоновка</button>
          <button className="primary-button export-button" onClick={exportSvg} disabled={!items.length}><Download size={15} /> Экспорт SVG <span>↗</span></button>
        </div>
      </header>

      <nav className="editor-toolbar" aria-label="Панель инструментов">
        <div className="toolbar-group">
          <button className={'toolbar-button' + (activePanel === 'components' ? ' active' : '')} onClick={() => setActivePanel('components')} title="Компоненты"><ImagePlus size={16} /><span>Компоненты</span></button>
          <button className={'toolbar-button' + (activePanel === 'layers' ? ' active' : '')} onClick={() => setActivePanel('layers')} title="Слои"><Layers3 size={16} /><span>Слои</span></button>
          <span className="toolbar-divider" />
          <button className={'toolbar-icon' + (showGrid ? ' active' : '')} onClick={() => setShowGrid((value) => !value)} title="Показать сетку"><Grid2X2 size={16} /></button>
          <span className="toolbar-divider" />
          <span className="canvas-state"><i />{items.length ? `${items.length} объектов на холсте` : 'Холст готов'}</span>
        </div>
        <div className="toolbar-group toolbar-meta"><span>SVG · Векторный формат</span><span className="toolbar-divider" /><span>{format.width} × {format.height} px</span></div>
      </nav>

      <div className="studio-workspace">
        <aside className="studio-sidebar">
          <label className="library-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти компонент..." /><kbd>/</kbd></label>
          <div className="sidebar-tabs" role="tablist" aria-label="Библиотека и слои">
            <button role="tab" aria-selected={activePanel === 'components'} className={activePanel === 'components' ? 'selected' : ''} onClick={() => setActivePanel('components')}>Компоненты <span>{filteredAssets.length}</span></button>
            <button role="tab" aria-selected={activePanel === 'layers'} className={activePanel === 'layers' ? 'selected' : ''} onClick={() => setActivePanel('layers')}>Слои <span>{items.length}</span></button>
          </div>
          {activePanel === 'components' ? <>
            <div className="sidebar-scroll library-panel">
              <div className="library-role-filters">{([['all', 'Все'], ['main', 'Главные'], ['background', 'Фоновые']] as const).map(([role, label]) => <button key={role} className={libraryRoleFilter === role ? 'selected' : ''} onClick={() => changeLibraryRole(role)}>{label}</button>)}</div>
              <div className="library-size-row"><div><strong>Размер в библиотеке</strong><small>{familyCoverage.complete} семейств · исходники L/S</small></div><div className="library-size-filters">{(['L', 'S'] as const).map((entry) => <button key={entry} className={librarySizeFilter === entry ? 'selected' : ''} onClick={() => changeLibrarySize(entry)}>{entry}</button>)}</div></div>
              {familyCoverage.incomplete > 0 && <p className="library-coverage-note">{familyCoverage.incomplete} семейств без пары S/L</p>}
              <div className="asset-list">
                {!filteredAssets.length && <div className="library-empty"><ImagePlus size={24} /><strong>{assets.length ? 'Ничего не найдено' : 'Библиотека пуста'}</strong><span>{assets.length ? 'Измените поиск или фильтр.' : 'Импортируйте исходные SVG для сборки сцен.'}</span>{!assets.length && <button className="primary-button" onClick={() => importRef.current?.click()}><Upload size={14} /> Импортировать SVG</button>}</div>}
                {filteredAssets.map((asset) => <article draggable className={'asset-card' + (selectedAssetId === asset.id ? ' selected' : '')} key={asset.id} onDragStart={(event) => onAssetDragStart(event, asset)} title={`Перетащите на холст · Источник: ${asset.sourceFileId ?? asset.source}`}><button className="asset-main" onClick={() => setSelectedAssetId(asset.id)}><span className="asset-art"><SvgPreview markup={recolorSvg(asset.markup, asset.role, palette)} viewBox={asset.viewBox} /></span><span className="asset-copy"><strong>{asset.name}</strong><small>{asset.role === 'main' ? 'Главный' : 'Фоновый'} · {asset.detailSize}</small><small className="asset-source">Источник: {asset.source}</small></span></button><button className="asset-add" title={`Добавить ${asset.name} на холст`} onClick={() => addAsset(asset)}><Plus size={15} /></button></article>)}
              </div>
              {selectedAsset && <details className="asset-properties"><summary>Свойства · {selectedAsset.name}</summary><label className="property-field"><span>Название</span><input value={selectedAsset.name} onChange={(event) => updateAsset(selectedAsset.id, { name: event.target.value })} /></label><label className="property-field"><span>Теги</span><input value={selectedAsset.tags.join(', ')} onChange={(event) => updateAsset(selectedAsset.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label><div className="property-row"><label className="property-field"><span>Размер исходника</span><select value={selectedAsset.detailSize} onChange={(event) => updateAsset(selectedAsset.id, { detailSize: event.target.value as DetailSize })}><option value="S">S · компактный</option><option value="L">L · детальный</option></select></label><label className="property-field"><span>Роль</span><select value={selectedAsset.role} onChange={(event) => updateAsset(selectedAsset.id, { role: event.target.value as 'main' | 'background' })}><option value="main">Главный</option><option value="background">Фоновый</option></select></label></div><small className="asset-source-note">Здесь меняются только метаданные файла. В сцене переключатель L/S подставляет парный SVG-исходник без изменения контуров.</small></details>}
              <div className="library-import-tools"><button onClick={() => importRef.current?.click()}><Upload size={14} /> SVG</button><button onClick={() => folderImportRef.current?.click()}><Layers3 size={14} /> Папка</button><button onClick={() => libraryImportRef.current?.click()}><Download size={14} /> Пакет</button><button onClick={exportLibrary} disabled={!assets.length}><Plus size={14} /> JSON</button></div><p className="library-note">Перетащите объект на холст или нажмите + · только исходные SVG</p>
            </div>
          </> : <div className="sidebar-scroll layer-panel"><div className="sidebar-panel-heading"><strong>Объекты и слои</strong><small>Перетащите строку для смены порядка</small></div>{[...items].reverse().map((item) => <div className={'layer-row' + (selectedId === item.objectId ? ' selected' : '') + (draggedLayerId === item.objectId ? ' dragging' : '')} key={item.objectId} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onLayerDrop(event, item.objectId)}><button className="layer-select" draggable onDragStart={(event) => onLayerDragStart(event, item.objectId)} onDragEnd={() => setDraggedLayerId(null)} onClick={() => setSelectedId(item.objectId)} title="Перетащите, чтобы изменить порядок"><span className="layer-thumb"><SvgPreview markup={recolorSvg(item.markup, item.role, palette)} viewBox={item.viewBox} /></span><span><strong>{item.name}</strong><small>{item.role === 'background' ? 'Фоновый' : 'Главный'} · {item.detailSize}{item.locked ? ' · Закреплён' : ''}</small></span></button><div className="layer-actions"><button className="layer-eye" title={item.visible ? 'Скрыть объект' : 'Показать объект'} aria-label={item.visible ? `Скрыть ${item.name}` : `Показать ${item.name}`} onClick={() => setItems((previous) => previous.map((entry) => entry.objectId === item.objectId ? { ...entry, visible: !entry.visible } : entry))}>{item.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button className="layer-eye" title={item.locked ? 'Разблокировать объект' : 'Закрепить объект'} aria-label={item.locked ? `Разблокировать ${item.name}` : `Закрепить ${item.name}`} onClick={() => setItems((previous) => previous.map((entry) => entry.objectId === item.objectId ? { ...entry, locked: !entry.locked } : entry))}>{item.locked ? <Lock size={13} /> : <Unlock size={13} />}</button><button className="layer-eye" title="Дублировать объект" aria-label={`Дублировать ${item.name}`} onClick={() => duplicateItem(item)}><Copy size={13} /></button><button className="layer-eye layer-delete" title="Удалить объект" aria-label={`Удалить ${item.name}`} onClick={() => removeItem(item.objectId)}><Trash2 size={13} /></button></div></div>)}{!items.length && <div className="layers-empty"><Layers3 size={22} /><span>Добавьте компоненты из библиотеки на холст.</span><button className="primary-button" onClick={() => setActivePanel('components')}><Plus size={13} /> Выбрать компоненты</button></div>}</div>}
        </aside>

        <section className="studio-canvas">
          <div className="composition-command">
            <div className="command-heading"><span className="command-sparkle"><Sparkles size={18} /></span><span><strong>{mode === 'metaphor' ? 'Собрать по смыслу' : 'Собрать по компонентам'}</strong><small>Подберём и расставим только существующие SVG-компоненты</small></span><span className="source-count">{familyCoverage.total} компонентов · {assets.length} SVG</span></div>
            <div className="command-input-row"><div className="command-field"><div className="mode-switch" role="group" aria-label="Режим подбора"><button className={mode === 'metaphor' ? 'selected' : ''} onClick={() => setMode('metaphor')}>По смыслу</button><button className={mode === 'components' ? 'selected' : ''} onClick={() => setMode('components')}>По объектам</button></div><input ref={promptRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); generate() } }} placeholder={mode === 'metaphor' ? 'Например: обучение и цифровые инструменты' : 'Например: книга, смартфон, пазл'} /><button className="command-clear" onClick={() => setQuery('')} title="Очистить запрос" disabled={!query}><X size={14} /></button></div><button className="primary-button generate-button" onClick={() => generate()} disabled={!query.trim() || !assets.length}><Sparkles size={15} /> Собрать композицию</button></div>
            <div className="composition-starters" aria-label={mode === 'metaphor' ? 'Примеры по смыслу' : 'Примеры по объектам'}>{COMPOSITION_STARTERS.filter((starter) => starter.mode === mode).map((starter) => <button key={starter.label} type="button" className="active" onClick={() => applyCompositionStarter(starter)}><span>{starter.mode === 'metaphor' ? '✦' : '⊞'}</span>{starter.label}</button>)}</div>
            {!assets.length && <p className="command-empty-note">Импортируйте SVG-библиотеку в панели слева.</p>}
          </div>

          <div className="canvas-topline"><div className="canvas-title"><span className="canvas-live-dot" /><strong>Рабочий холст</strong><span className="canvas-object-count"><Layers3 size={12} />{items.length} {items.length === 1 ? 'объект' : items.length > 1 && items.length < 5 ? 'объекта' : 'объектов'}</span></div><div className="canvas-dimensions"><span className="canvas-format-name">{format.name}</span><span className="canvas-size-pill">{size}</span><span>{format.width} × {format.height} px</span></div></div>
          <div className="stage" ref={stageRef} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null) }}>
            {items.length ? <div ref={boardRef} className={'artboard' + (transparent ? ' transparent-board' : '') + (!transparent ? ' surface-' + backdropId : '') + (showGrid ? ' grid-enabled' : '') + (boardDragActive ? ' drop-active' : '')} style={{ ...surfaceStyle(backgroundColor, palette), width: boardWidth, height: boardHeight, transform: 'scale(' + zoom + ')', backgroundColor: transparent ? 'transparent' : backgroundColor }} onPointerDown={() => setSelectedId(null)} onDragEnter={onBoardDragEnter} onDragLeave={onBoardDragLeave} onDragOver={onBoardDragOver} onDrop={onBoardDrop}>
              {items.map((item, index) => { const left = item.x / format.width * boardWidth; const top = item.y / format.height * boardHeight; const width = item.width / format.width * boardWidth; const height = item.height / format.height * boardHeight; const selected = item.objectId === selectedId; return <div key={item.objectId} data-object-id={item.objectId} className={'canvas-item' + (selected ? ' is-selected' : '') + (isDragging && selected ? ' is-dragging' : '') + (item.visible === false ? ' is-hidden' : '')} style={{ left, top, width, height, transform: 'rotate(' + item.rotation + 'deg)', zIndex: index + 1 }} onPointerDown={(event) => onItemPointerDown(event, item)} onDoubleClick={() => duplicateItem(item)} title={item.name}><SvgPreview markup={recolorSvg(item.markup, item.role, palette)} viewBox={item.viewBox} />{selected && <span className="selection-box">{(['nw', 'ne', 'se', 'sw'] as const).map((handle) => <i key={handle} className={'resize-handle ' + handle} onPointerDown={(event) => onResizePointerDown(event, item, handle)} />)}</span>}</div>})}
            </div> : <div ref={boardRef} className={'empty-board' + (transparent ? ' transparent-board' : '') + (!transparent ? ' surface-' + backdropId : '') + (showGrid ? ' grid-enabled' : '') + (boardDragActive ? ' drop-active' : '')} style={{ ...surfaceStyle(backgroundColor, palette), width: boardWidth, height: boardHeight, transform: 'scale(' + zoom + ')', backgroundColor: transparent ? 'transparent' : backgroundColor }} onDragEnter={onBoardDragEnter} onDragLeave={onBoardDragLeave} onDragOver={onBoardDragOver} onDrop={onBoardDrop}><div className="empty-board-inner"><span className="empty-board-icon"><Layers3 size={25} /></span><strong>Холст готов к сборке</strong><p>Перетащите сюда компонент из библиотеки или соберите сцену по запросу.</p><button onClick={() => setActivePanel('components')}><Plus size={14} /> Открыть библиотеку</button></div><span className="format-badge">{format.width} × {format.height}</span></div>}
          </div>
          <div className="canvas-bottom"><div className="canvas-footer"><span><i /> {items.length} объектов</span><span className="canvas-footer-divider" /><span>Векторный холст · SVG</span></div><div className="canvas-zoom"><button title="Уменьшить" onClick={() => setZoom((value) => Math.max(.5, Math.round((value - .1) * 10) / 10))}><Minus size={15} /></button><span>{Math.round(zoom * 100)}%</span><button title="Увеличить" onClick={() => setZoom((value) => Math.min(2, Math.round((value + .1) * 10) / 10))}><Plus size={15} /></button><i /><button className={showGrid ? 'active' : ''} title="Сетка" onClick={() => setShowGrid((value) => !value)}><Grid2X2 size={15} /></button><button title="Вписать" onClick={() => setZoom(1)}><Maximize2 size={15} /></button></div></div>
          {selectedItem && <div className="selection-toolbar" onPointerDown={(event) => event.stopPropagation()}><strong>{selectedItem.name}</strong><span className="toolbar-divider" /><button title="Поворот влево" onClick={() => setItems((previous) => previous.map((item) => item.objectId === selectedId ? { ...item, rotation: item.rotation - 15, layoutMode: 'manual' as const } : item))}><RotateCcw size={15} /></button><button title="Поворот вправо" onClick={() => setItems((previous) => previous.map((item) => item.objectId === selectedId ? { ...item, rotation: item.rotation + 15, layoutMode: 'manual' as const } : item))}><RotateCw size={15} /></button><button title="Вверх по слоям" onClick={() => selectedId && moveItem(selectedId, 1)}><ArrowUp size={15} /></button><button title="Вниз по слоям" onClick={() => selectedId && moveItem(selectedId, -1)}><ArrowDown size={15} /></button><button title="Дублировать" onClick={() => duplicateItem(selectedItem)}><Plus size={15} /></button><button className="delete-action" title="Удалить" onClick={() => removeItem(selectedItem.objectId)}><Trash2 size={15} /></button></div>}
        </section>

        <aside className="studio-inspector"><div className="inspector-main"><div className="inspector-heading"><div><span className="eyebrow">НАСТРОЙКИ</span><h2>{selectedItem ? 'Выбранный объект' : 'Свойства'}</h2></div><span className="inspector-status">{selectedItem ? 'Объект' : 'Сцена'}</span></div>
          <section className="inspector-section"><div className="inspector-label"><strong>Формат холста</strong><small>{format.width} × {format.height}</small></div><div className="format-picker">{FORMATS.map((entry) => <button key={entry.id} className={'format-option ' + (format.id === entry.id ? 'selected' : '')} onClick={() => changeFormat(entry)}><span className={'format-glyph ' + entry.id} /><strong>{entry.name}</strong></button>)}</div></section>
          <section className="inspector-section"><div className="inspector-label"><strong>Детализация композиции</strong><small>Подмена исходного SVG</small></div><div className="segmented size-toggle">{(['L', 'S'] as const).map((entry) => <button key={entry} className={size === entry ? 'selected' : ''} onClick={() => changeSize(entry)}><strong>{entry}</strong><span>{entry === 'S' ? 'Компактный' : 'Детальный'}</span></button>)}</div></section>
          <section className="inspector-section"><div className="inspector-label"><strong>Цветовая схема</strong><button className="text-action" onClick={() => paletteRef.current?.click()}><Plus size={13} /> Импорт</button></div><div className="palette-list">{palettes.map((entry, index) => <button key={entry.id} className={'palette-option ' + (palette.id === entry.id ? 'selected' : '')} onClick={() => choosePalette(entry)} title={entry.name}><span className="palette-swatch-row">{entry.objectColors.slice(0, 2).map((color, i) => <i key={'o' + i} style={{ background: color }} />)}{entry.backgroundColors.slice(0, 2).map((color, i) => <i key={'b' + i} style={{ background: color }} />)}</span><strong>{entry.name || 'Схема ' + (index + 1)}</strong></button>)}</div><details className="palette-mapping"><summary><span>Сопоставить цвета SVG</span><ChevronDown size={13} /></summary><p className="field-help">Главным объектам доступны цвета объектов и фона; фоновым — только цвета фона. Несопоставленные цвета заменяются ближайшим разрешённым оттенком.</p>{renderColorMap('Главные объекты', colorUsage.main, 'objectColorMap', [...new Set([...palette.objectColors, ...palette.backgroundColors])])}{renderColorMap('Фоновые объекты', colorUsage.background, 'backgroundColorMap', palette.backgroundColors)}</details></section>
          <section className="inspector-section backdrop-section"><div className="inspector-label"><strong>Поверхность</strong><small>Фон сцены и SVG</small></div><div className="backdrop-options">{BACKDROPS.map((entry) => <button key={entry.id} className={'backdrop-option' + (backdropId === entry.id ? ' selected' : '')} onClick={() => setBackdropId(entry.id)} aria-pressed={backdropId === entry.id}><span className={'backdrop-swatch surface-' + entry.id} style={surfaceStyle(backgroundColor, palette)} /><strong>{entry.label}</strong><small>{entry.description}</small></button>)}</div><p className="field-help">Поверхность — оформление холста, а не новый объект. Исходные SVG остаются без изменений.</p></section>
          <section className="inspector-section"><div className="inspector-label"><strong>Заливка холста</strong><div className="background-toggle"><span>Прозрачный фон</span><button type="button" className={'toggle-switch' + (transparent ? ' on' : '')} onClick={() => setTransparent((value) => !value)} role="switch" aria-checked={transparent} aria-label="Прозрачный фон"><i /></button></div></div><p className="field-help">Выключено — цвет из палитры. Включено — прозрачный фон в SVG.</p>{!transparent && <div className="color-swatches">{palette.backgroundColors.map((color) => <button key={color} className={backgroundColor === color ? 'selected' : ''} style={{ background: color }} aria-label={'Цвет фона ' + color} onClick={() => setBackgroundColor(color)} />)}</div>}<label className="check-row"><input type="checkbox" checked={includeBackground} onChange={(event) => { const enabled = event.target.checked; setIncludeBackground(enabled); setItems((previous) => previous.map((item) => item.role === 'background' ? { ...item, visible: enabled } : item)) }} /><span>Использовать фоновые объекты</span></label></section>
          {selectedItem && <section className="inspector-section selected-properties"><div className="inspector-label"><strong>Трансформация</strong><button className="text-action danger" onClick={() => removeItem(selectedItem.objectId)}><Trash2 size={13} /> Удалить</button></div><div className="selected-name">{selectedItem.name}<small>{selectedItem.role === 'background' ? 'Фоновый' : 'Главный'} · {selectedItem.detailSize}</small></div><div className="numeric-grid"><label><span>X</span><input type="number" value={Math.round(selectedItem.x)} onChange={(event) => setItems((previous) => previous.map((item) => item.objectId === selectedId ? { ...item, x: Number(event.target.value), layoutMode: 'manual' as const } : item))} /></label><label><span>Y</span><input type="number" value={Math.round(selectedItem.y)} onChange={(event) => setItems((previous) => previous.map((item) => item.objectId === selectedId ? { ...item, y: Number(event.target.value), layoutMode: 'manual' as const } : item))} /></label><label><span>Ширина</span><input type="number" min="1" value={Math.round(selectedItem.width)} onChange={(event) => setItems((previous) => previous.map((item) => item.objectId === selectedId ? { ...item, width: Math.max(1, Number(event.target.value)), height: Math.max(1, Number(event.target.value)) * item.height / Math.max(1, item.width), layoutMode: 'manual' as const } : item))} /></label><label><span>Угол</span><input type="number" value={selectedItem.rotation} onChange={(event) => setItems((previous) => previous.map((item) => item.objectId === selectedId ? { ...item, rotation: Number(event.target.value), layoutMode: 'manual' as const } : item))} /></label></div><button className="duplicate-button" onClick={() => duplicateItem(selectedItem)}><Plus size={14} /> Дублировать объект</button></section>}
          <section className="inspector-section scene-objects"><div className="inspector-label"><strong>Объекты сцены</strong><small>{items.length}</small></div>{[...items].reverse().map((item) => <div className={'scene-object-row' + (selectedId === item.objectId ? ' selected' : '')} key={item.objectId}><button className="scene-object-main" onClick={() => setSelectedId(item.objectId)}><span className="layer-thumb"><SvgPreview markup={recolorSvg(item.markup, item.role, palette)} viewBox={item.viewBox} /></span><span>{item.name}<small>{item.role === 'background' ? 'Фоновый' : 'Главный'}</small></span></button><button className="layer-eye" title={item.visible ? 'Скрыть' : 'Показать'} onClick={() => setItems((previous) => previous.map((entry) => entry.objectId === item.objectId ? { ...entry, visible: !entry.visible } : entry))}>{item.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button></div>)}{!items.length && <p className="scene-empty">Здесь будут компоненты композиции.</p>}</section>
          <div className="inspector-tip"><Palette size={15} /><p>Сохраняются исходные векторные контуры и пропорции.</p></div>
        </div></aside>
      </div>
      <input ref={importRef} className="hidden-input" type="file" accept="image/svg+xml,.svg" multiple onChange={handleImport} /><input ref={folderImportRef} className="hidden-input" type="file" accept="image/svg+xml,.svg" multiple onChange={handleImport} /><input ref={libraryImportRef} className="hidden-input" type="file" accept="application/json,.json" onChange={handleLibraryImport} /><input ref={paletteRef} className="hidden-input" type="file" accept="application/json,.json" onChange={importPalette} />
      </>}</>}
      {projectDialog && <div className="gallery-modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setProjectDialog(null) }}>
        {projectDialog.mode === 'rename' ? <form className="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" onSubmit={(event) => { event.preventDefault(); void saveProjectRename() }}>
          <span className="gallery-modal-icon"><Pencil size={18} /></span><h2 id="project-dialog-title">Переименовать проект</h2><p>Название будет показано в списке проектов.</p>
          <label className="gallery-modal-field"><span>Название</span><input ref={projectNameInputRef} maxLength={80} value={projectNameDraft} onChange={(event) => setProjectNameDraft(event.target.value)} aria-label="Название проекта" /></label>
          <div className="gallery-modal-actions"><button type="button" className="gallery-modal-secondary" onClick={() => setProjectDialog(null)}>Отмена</button><button type="submit" className="gallery-modal-primary">Сохранить</button></div>
        </form> : <div className="gallery-modal" role="alertdialog" aria-modal="true" aria-labelledby="project-dialog-title" aria-describedby="project-delete-description">
          <span className="gallery-modal-icon danger"><Trash2 size={18} /></span><h2 id="project-dialog-title">Удалить проект?</h2><p id="project-delete-description">«{projectDialog.name}» будет удалён из этого браузера. Это действие нельзя отменить.</p>
          <div className="gallery-modal-actions"><button className="gallery-modal-secondary" onClick={() => setProjectDialog(null)}>Отмена</button><button className="gallery-modal-danger" onClick={() => void confirmProjectDelete()}>Удалить проект</button></div>
        </div>}
      </div>}
      {notice && <div className="studio-toast"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Закрыть"><X size={14} /></button></div>}
    </main>
  )
}
