export default function MobileRegistryCards({ items, emptyLabel = 'No records found.', renderCard }) {
  if (!items?.length) {
    return <p className="mobile-registry-empty">{emptyLabel}</p>;
  }

  return (
    <div className="mobile-registry-cards">
      {items.map((item, idx) => (
        <article key={item.id ?? item._key ?? idx} className="mobile-registry-card">
          {renderCard(item)}
        </article>
      ))}
    </div>
  );
}
