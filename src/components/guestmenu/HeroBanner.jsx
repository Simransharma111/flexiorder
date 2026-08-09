export default function HeroBanner({ hotel }) {
  if (!hotel?.coverImage && !hotel?.bannerImage) return null;
  const image = hotel.coverImage || hotel.bannerImage;
  return (
    <section className="guest-feature-banner" aria-label="Restaurant highlight">
      <img src={image} alt="" />
      <div>
        <strong>{hotel?.tagline || hotel?.name}</strong>
        {hotel?.description && <span>{hotel.description}</span>}
      </div>
    </section>
  );
}
