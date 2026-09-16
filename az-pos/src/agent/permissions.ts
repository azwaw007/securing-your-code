import type { AppState, ShopSettings } from '../types'

/** Droits de l’agent dans l’app (pas de modification du code source). */
export interface AgentPermissions {
  /** Naviguer entre les écrans */
  navigate: boolean
  /** Lire stock, dettes, gains, historique */
  readBusiness: boolean
  /** Modifier réglages sûrs (thème, mode facile, langue, affichage) */
  editSettings: boolean
  /** Organiser menus / icônes visibles */
  organizeUi: boolean
  /** Ajouter client / calculer zakat / actions métier simples */
  mutateBusiness: boolean
  /** Ouvrir WhatsApp / partage */
  openExternal: boolean
  /** Mode agentic multi-étapes (plan → outils → réponse) */
  agenticLoop: boolean
}

export const DEFAULT_AGENT_PERMISSIONS: AgentPermissions = {
  navigate: true,
  readBusiness: true,
  editSettings: true,
  organizeUi: true,
  mutateBusiness: true,
  openExternal: true,
  agenticLoop: true,
}

export function getAgentPermissions(state: AppState): AgentPermissions {
  const p = (state.settings as ShopSettings & { agentPermissions?: Partial<AgentPermissions> })
    .agentPermissions
  return { ...DEFAULT_AGENT_PERMISSIONS, ...p }
}

export function can(state: AppState, key: keyof AgentPermissions): boolean {
  return getAgentPermissions(state)[key] === true
}

/** Ce que l’agent n’a JAMAIS le droit de faire */
export const AGENT_HARD_DENY = [
  'rewrite_source_code',
  'delete_all_data',
  'exfiltrate_secrets',
  'bypass_license',
] as const
