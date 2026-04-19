export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="skeleton" style={{ height: '12px', width: '30%', marginBottom: '12px', borderRadius: '4px' }} />
      <div className="skeleton" style={{ height: '18px', width: '60%', marginBottom: '8px', borderRadius: '4px' }} />
      <div className="skeleton" style={{ height: '14px', width: '45%', borderRadius: '4px' }} />
    </div>
  )
}
