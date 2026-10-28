import { PageHeading } from '../components/ui/PageHeading'
import { Notice } from '../components/ui/Notice'

export function PlaceholderPage({ title, task }: { title: string; task: string }) {
  return (
    <main className="page-shell narrow-page">
      <PageHeading eyebrow="Раздел приложения" title={title} />
      <Notice title="Раздел готовится" role="status">
        Этот сценарий будет реализован в рамках задачи {task}.
      </Notice>
    </main>
  )
}
