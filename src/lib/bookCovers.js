const COVER_VARIANTS = new Set(['small', 'medium', 'large'])

export function getCoverVariantPath(basePath, variant) {
  const normalizedBasePath = typeof basePath === 'string' ? basePath.trim() : ''

  if (!normalizedBasePath || !COVER_VARIANTS.has(variant)) {
    return normalizedBasePath
  }

  const queryStartIndex = normalizedBasePath.search(/[?#]/)
  const pathWithoutSuffix = queryStartIndex === -1 ? normalizedBasePath : normalizedBasePath.slice(0, queryStartIndex)
  const suffix = queryStartIndex === -1 ? '' : normalizedBasePath.slice(queryStartIndex)
  const extensionStartIndex = pathWithoutSuffix.lastIndexOf('.')
  const slashIndex = pathWithoutSuffix.lastIndexOf('/')

  if (extensionStartIndex <= slashIndex) {
    return normalizedBasePath
  }

  return `${pathWithoutSuffix.slice(0, extensionStartIndex)}-${variant}${pathWithoutSuffix.slice(extensionStartIndex)}${suffix}`
}
