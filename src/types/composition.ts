import type { CanvasObject, SvgAsset } from './svg'

export type IllustrationRole = 'main' | 'background'
export type DetailSize = 'S' | 'L'

export interface LibraryComponent extends SvgAsset {
  role: IllustrationRole
  familyId: string
  detailSize: DetailSize
  tags: string[]
}

export interface PaletteScheme {
  id: string
  name: string
  objectColors: string[]
  backgroundColors: string[]
  /** Source SVG color -> palette color, used for main illustration components. */
  objectColorMap?: Record<string, string>
  /** Source SVG color -> palette color, restricted to background colors. */
  backgroundColorMap?: Record<string, string>
}

export interface LibraryManifest {
  version: 1
  assets: LibraryComponent[]
  palettes?: PaletteScheme[]
}

export type CompositionMode = 'metaphor' | 'components'

export interface CompositionItem extends CanvasObject {
  assetId: string
  role: IllustrationRole
  familyId: string
  detailSize: DetailSize
  tags: string[]
  layoutMode?: 'auto' | 'manual'
}

export interface CompositionFormat {
  id: string
  name: string
  width: number
  height: number
  description: string
}
