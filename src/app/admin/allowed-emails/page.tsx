import { redirect } from 'next/navigation'

// Allowed emails now live on the Members page, for admins.
export default function AllowedEmailsPage() {
  redirect('/members')
}
