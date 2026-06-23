import { brands } from '../../vendors/brands.ts';

const APOTHEM = 300;

export default function OctagonScene() {
  return (
    <>
      <div className="canvas-floor" />

      {/* 8 fence panels */}
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="fence-panel"
          style={{ transform: `rotateY(${i * 45}deg) translateZ(${APOTHEM}px)` }} />
      ))}

      {/*
       * Floor advertisement panels — brand logos lying flat near each fence.
       * Transform right-to-left: translateY(220px) → rotateX(90deg) → rotateY(i*45deg)
       * translateY(220px) shifts the centred div down in layout;
       * rotateX(90deg) maps that layout-Y offset to world +Z, placing the
       * panel 220px from centre along the radial direction, flat on the floor.
       */}
      {Array.from({ length: 8 }, (_, i) => {
        const brand = brands[i % brands.length]!;
        const icon = brand.icon;
        const url = typeof icon === 'string' ? null : icon.url;
        return (
          <div key={`ad-${i}`} className="floor-ad"
            style={{ transform: `rotateY(${i * 45}deg) rotateX(90deg) translateY(220px) rotateZ(180deg)` }}>
            {url
              ? <img src={url} alt={brand.name} className="floor-ad-img" />
              : <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(40,30,10,0.65)', whiteSpace: 'nowrap' }}>{brand.name}</span>
            }
          </div>
        );
      })}

      {/* Corner glow lights */}
      <div className="corner-glow corner-glow-red" />
      <div className="corner-glow corner-glow-blue" />

      {/* Overhead spotlights */}
      <div className="spot-light spot-light-1" />
      <div className="spot-light spot-light-2" />
      <div className="spot-light spot-light-3" />
    </>
  );
}
