import { EmptyState } from '@/components/common/empty-state'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/layout/page-header'

function App() {
  return (
    <AppShell>
      <PageHeader
        title="Codasaurus"
        description="Security review for your pull requests."
      />
      <EmptyState
        title="Nothing selected"
        description="Choose a section from the sidebar to get started."
      />
    </AppShell>
  )
}

export default App
