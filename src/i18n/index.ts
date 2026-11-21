import { useSettingsStore } from '../store/settingsStore.ts'
import type { ElementId, WeaponDef, WeaponId } from '../types/game.ts'
import { en } from './en.ts'
import type { AppLanguage, Dict } from './types.ts'
import { zhHans } from './zh-Hans.ts'
import { zhHant } from './zh-Hant.ts'

export type { AppLanguage }

export const LANGUAGE_OPTIONS: { id: AppLanguage; label: string }[] = [
  { id: 'zh-Hant', label: '繁體中文' },
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'en', label: 'English' },
]

const TABLES: Record<AppLanguage, Dict> = {
  'zh-Hant': zhHant,
  'zh-Hans': zhHans,
  en,
}

export function translate(lang: AppLanguage, key: string, vars?: Record<string, string | number>) {
  const table = TABLES[lang] ?? zhHant
  let text = table[key] ?? TABLES['zh-Hant'][key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

export function tNow(key: string, vars?: Record<string, string | number>) {
  return translate(useSettingsStore.getState().language, key, vars)
}

export function useT() {
  const language = useSettingsStore((state) => state.language)
  return (key: string, vars?: Record<string, string | number>) => translate(language, key, vars)
}

export function localizedWeapon(weapon: WeaponDef, lang: AppLanguage = useSettingsStore.getState().language) {
  const id = weapon.id as WeaponId
  const elementLabel = translate(lang, `el.${weapon.element as ElementId}`)
  const suffix = translate(lang, 'el.suffix')
  return {
    ...weapon,
    name: translate(lang, `w.${id}.name`),
    description: translate(lang, `w.${id}.desc`),
    elementLabel,
    elementTag: suffix ? `${elementLabel}${suffix}` : elementLabel,
    kindLabel: translate(lang, `kind.${weapon.kind}`),
  }
}
