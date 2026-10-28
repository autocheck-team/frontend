export function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
    </div>
  )
}
