import buildMeta from './build-meta.json'

export const APP_VERSION = buildMeta.version || '0.0.0'
export const GIT_SHA = buildMeta.gitSha || 'dev'
export const BUILD_TIME = buildMeta.buildTime || ''
export const APP_VERSION_LABEL = buildMeta.label || `v${APP_VERSION}`

export default {
  version: APP_VERSION,
  gitSha: GIT_SHA,
  buildTime: BUILD_TIME,
  label: APP_VERSION_LABEL,
}
