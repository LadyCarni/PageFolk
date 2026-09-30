export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || !process.env.ADMIN_EMAIL) return false
  return email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
}
