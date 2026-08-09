import type { Component } from 'vue'

interface TemplateManifest {
  name: string
  description?: string
  version?: string
  author?: string
  preview?: string
  padType: string
}

interface TemplateInfo {
  id: string
  manifest: TemplateManifest
  component: () => Promise<Component>
}

const manifestModules = import.meta.glob('./**/manifest.json', { eager: true })
const componentModules = import.meta.glob('./**/index.vue')

const registry = new Map<string, Map<string, TemplateInfo>>()

for (const [path, mod] of Object.entries(manifestModules)) {
  const manifest = (mod as { default: TemplateManifest }).default
  const dir = path.replace('/manifest.json', '')
  const parts = dir.split('/')
  const padType = parts[1]
  const templateId = parts[2]
  const componentPath = `${dir}/index.vue`

  if (!registry.has(padType)) {
    registry.set(padType, new Map())
  }
  registry.get(padType)!.set(templateId, {
    id: templateId,
    manifest,
    component: componentModules[componentPath] as () => Promise<Component>,
  })
}

export function getTemplates(padType: string): TemplateInfo[] {
  return Array.from(registry.get(padType)?.values() ?? [])
}

export function getTemplate(padType: string, templateId: string): TemplateInfo | undefined {
  return registry.get(padType)?.get(templateId)
}

export function getAllPadTypes(): string[] {
  return Array.from(registry.keys())
}
