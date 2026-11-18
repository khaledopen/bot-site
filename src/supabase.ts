import { createClient, type AuthError } from '@supabase/supabase-js'
import { accountApi, type Account } from './account'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://owitgvfygdjkopkrvpej.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_W5APB_boZLwL4HgmZdfbxg_byaGXBoI'

export const supabase = createClient(url, key, {
  auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
})

export const redirectTo = (path: string) => `${window.location.origin}${path}`

/** Échange la session Supabase contre la session du site (cookie posé par l’API). */
export async function openSession(accessToken: string) {
  return (await accountApi<{ account: Account }>('supabase-session', { accessToken })).account
}

/** Lit une erreur renvoyée par Supabase dans l’adresse d’un lien reçu par email. */
export function linkError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1))
  const code = params.get('error_code') || params.get('error')
  if (!code) return ''
  return code === 'otp_expired'
    ? 'Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien.'
    : 'Ce lien n’est pas valide. Demande un nouveau lien.'
}

export function authMessage(error: AuthError | Error | null | undefined) {
  const code = error && 'code' in error ? error.code : undefined
  const status = error && 'status' in error ? error.status : undefined
  switch (code) {
    case 'invalid_credentials': return 'Email ou mot de passe incorrect.'
    case 'email_not_confirmed': return 'Confirme d’abord ton adresse email : clique sur le lien reçu par mail.'
    case 'user_already_exists':
    case 'email_exists': return 'Un compte existe déjà avec cet email. Connecte-toi.'
    case 'weak_password': return 'Ce mot de passe est trop faible. Choisis-en un plus long.'
    case 'same_password': return 'Choisis un mot de passe différent de l’ancien.'
    case 'email_address_invalid':
    case 'validation_failed': return 'Cette adresse email n’est pas valide.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Trop de demandes. Réessaie dans quelques minutes.'
    case 'signup_disabled': return 'Les inscriptions sont fermées pour le moment.'
  }
  if (status === 429) return 'Trop de demandes. Réessaie dans quelques minutes.'
  return 'Le service de connexion ne répond pas. Réessaie.'
}
