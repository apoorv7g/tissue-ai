export interface Chat {
  id: string
  title: string
  updated_at: string
  theme_mode?: string
  font_family?: string
  font_css_url?: string
  text_scale?: number
  accent_color?: string
}

export interface DiagramData {
  diagram_id: string
  version_id: string
  diagram_type: string
  version_no: number
  layout_json: unknown
  overrides: Record<
    string,
    | string
    | { label?: string; fill?: string; stroke?: string; textColor?: string; x?: number; y?: number }
  >
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  diagram?: DiagramData
}
