/**
 * Brand name and logo in one place. To rebrand, change BRAND_NAME and replace
 * public/brand/logo-on-dark.png and public/brand/logo-on-light.png.
 */
export const BRAND_NAME = 'Ingram Micro'

/** Supplied logo artwork. Keep it at least 100 px wide and do not apply filters or effects. */
export function BrandLogo({
  onDark = true,
  className = 'w-32',
}: {
  onDark?: boolean
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onDark ? '/brand/logo-on-dark.png' : '/brand/logo-on-light.png'}
      alt={BRAND_NAME}
      className={className}
    />
  )
}
