import { ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}) {
  const base = variant === 'secondary' ? 'btn-secondary' : 'btn-primary'
  return <button className={`${base} ${className}`.trim()} {...rest} />
}
