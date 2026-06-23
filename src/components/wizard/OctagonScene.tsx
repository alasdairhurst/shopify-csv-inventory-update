import { brands } from '../../vendors/brands.ts';

const APOTHEM = 300;

/* Radius of the crowd ring — well beyond the camera's furthest travel so it
 * never clips through when the camera pans across or zooms out. */
const CROWD_RADIUS = 760;

/* Stable, randomised crowd-flash positions (computed once at module load). */
const CROWD_FLASHES = Array.from({ length: 28 }, () => ({
  angle: Math.random() * 360,
  radius: CROWD_RADIUS - 20 + Math.random() * 50,
  y: -50 - Math.random() * 420,
  delay: (Math.random() * 6).toFixed(2),
  dur: (1.4 + Math.random() * 2.4).toFixed(2),
}));

/*
 * A solid 3D body part: a CSS cuboid built from five extruded faces (the bottom
 * is never seen). The front face hosts any detail passed as children — e.g. the
 * head's face. Per-face brightness in scene.css fakes directional lighting so
 * the volume reads as a real model rather than a flat sprite.
 */
function Cube({ part, children }: { part: string; children?: React.ReactNode }) {
  return (
    <div className={`f-cube ${part}`}>
      <div className="cf cf-front">{children}</div>
      <div className="cf cf-back" />
      <div className="cf cf-left" />
      <div className="cf cf-right" />
      <div className="cf cf-top" />
    </div>
  );
}

function Fighter({ corner }: { corner: 'red' | 'blue' }) {
  return (
    <div className={`fighter fighter-${corner}`}>
      <div className="fighter-lunge">
        <div className="fighter-billboard">
          <div className="fighter-mirror">
            <div className="fighter-body">
              {/* Static 3/4 turn so the camera always reads the model's depth. */}
              <div className="fighter-3q">
                <div className="fighter-shadow" />
                <Cube part="fighter-leg fighter-leg-back" />
                <Cube part="fighter-leg fighter-leg-front" />
                <Cube part="fighter-torso" />
                <Cube part="fighter-arm fighter-arm-back" />
                <Cube part="fighter-arm fighter-arm-front" />
                <Cube part="fighter-head">
                  <div className="f-face">
                    <div className="f-brow f-brow-l" />
                    <div className="f-brow f-brow-r" />
                    <div className="f-eye f-eye-l"><span className="f-pupil" /></div>
                    <div className="f-eye f-eye-r"><span className="f-pupil" /></div>
                    <div className="f-nose" />
                    <div className="f-mouth" />
                  </div>
                </Cube>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OctagonScene() {
  return (
    <>
      <div className="canvas-floor" />

      {/* Actual octagon-shaped fighting mat with cage markings */}
      <div className="octagon-mat">
        <div className="octagon-mat-ring" />
        <div className="octagon-center-logo">OCTAGON</div>
      </div>

      {/* The fight — two sparring figures at centre */}
      <div className="fight">
        <Fighter corner="red" />
        <Fighter corner="blue" />
      </div>

      {/* 8 fence panels */}
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="fence-panel"
          style={{ transform: `rotateY(${i * 45}deg) translateZ(${APOTHEM}px)` }} />
      ))}

      {/* Crowd ring — tiered audience behind the cage.
       * rotateY(180deg) turns each panel's textured face inward (toward centre),
       * so combined with backface-visibility:hidden the near-side panels between
       * the camera and the cage are culled, leaving a clear view through. */}
      {Array.from({ length: 8 }, (_, i) => (
        <div key={`crowd-${i}`} className="crowd-panel"
          style={{ transform: `rotateY(${i * 45}deg) translateZ(${CROWD_RADIUS}px) rotateY(180deg)` }} />
      ))}

      {/* Camera flashes from the crowd */}
      {CROWD_FLASHES.map((f, i) => (
        <div key={`flash-${i}`} className="crowd-flash"
          style={{
            transform: `rotateY(${f.angle}deg) translateZ(${f.radius}px) translateY(${f.y}px)`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.dur}s`,
          }} />
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
            style={{ transform: `rotateY(${i * 45}deg) rotateX(90deg) translateZ(3px) translateY(220px) rotateZ(180deg)` }}>
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

      {/* Light show — sweeping beams from the rig */}
      <div className="light-rig">
        <div className="beam beam-red" />
        <div className="beam beam-blue" />
        <div className="beam beam-gold" />
        <div className="beam beam-white" />
      </div>
    </>
  );
}
