import { DashboardShell } from '@/components/layout/DashboardShell'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
