import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import SideRays from './effects/SideRays';
import SwarmCursor from './effects/SwarmCursor';
import RippleDistortion from './effects/RippleDistortion';
import FlyingButton from './effects/FlyingButton';

const APK_URL = `/${__APK_FILE__}`;
const WEB_APP_URL = 'https://nexusos-sigma.vercel.app';

/** Set this to the App Store or TestFlight URL once the native iOS build ships. */
const IOS_STORE_URL = '';

/** Live media-query hook so effects can opt out on touch, narrow or reduced-motion setups. */
const useMedia = query => {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = event => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
};

/**
 * The whole page sits on one rippling surface. It is fixed to the viewport, behind every
 * section, and lets pointer events through — the ripple listens on window, so the page stays
 * fully interactive while the water moves under it.
 */
const PageRipple = () => {
  const still = useMedia('(prefers-reduced-motion: reduce)');
  const small = useMedia('(max-width: 720px)');

  if (still) return null;

  return (
    <>
      <RippleDistortion
        src="/art/ripple-surface.svg"
        brushSize={small ? 128 : 196}
        strength={0.18}
        swirl={1.1}
        rings={4}
        spread={5}
        fade={3.4}
        spacing={small ? 20 : 16}
        dispersion={0.05}
        glint={0.4}
        tint="#ffffff"
        tintAmount={0.06}
        grayscale
        trigger="both"
        clickStrength={1.9}
        quality={small ? 'low' : 'medium'}
      />
      <span className="page-ripple__scrim" aria-hidden="true" />
    </>
  );
};

/** Soft light fan behind the hero — monochrome, leaning toward the cursor. */
const HeroBackground = () => {
  const still = useMedia('(prefers-reduced-motion: reduce)');
  const wide = useMedia('(min-width: 720px)');

  return (
    <SideRays
      rayColor1="#ffffff"
      rayColor2="#9aa3b2"
      blend={0.5}
      origin="top-right"
      speed={still ? 0 : 1.5}
      intensity={0.85}
      spread={2.8}
      density={11}
      sharpness={0.82}
      falloff={2.2}
      glow={0.5}
      dust={wide ? 0.1 : 0}
      opacity={wide ? 0.34 : 0.26}
      followMouse={!still}
      mouseInfluence={0.5}
      intro={!still}
      maxDevicePixelRatio={1.5}
    />
  );
};

/**
 * Ambient dust over the whole hero. It drifts across the area on its own, parts around the
 * cursor, and bursts on click. Touch, narrow and reduced-motion visitors get nothing at all.
 */
const SwarmField = () => {
  const fine = useMedia('(pointer: fine)');
  const wide = useMedia('(min-width: 900px)');
  const still = useMedia('(prefers-reduced-motion: reduce)');

  if (!fine || !wide || still) return null;

  return (
    <SwarmCursor
      className="swarm-field"
      count={1000}
      size={1.35}
      spread={115}
      speed={1.1}
      swirl={0.6}
      tail={0.6}
      trail={0.7}
      wander={0.5}
      depth={0.85}
      color="#ffffff"
      accentColor="#ffffff"
      clickEffect="burst"
      idle="roam"
      targets=""
      dpr={1.5}
    />
  );
};

/**
 * One download action, rendered as a FlyingButton. The click handler is on the stage rather than
 * only on the component so that a tap works on touch devices too: while the button is airborne it
 * swallows its own click, and the press is read from the stage instead.
 */
const FlyAction = ({ label, onAction, altitude }) => {
  const stageRef = useRef(null);
  const lastFired = useRef(0);
  const pressedOnCraft = useRef(false);

  const fire = () => {
    const now = Date.now();
    if (now - lastFired.current < 900) return;
    lastFired.current = now;
    onAction();
  };

  /** True when a point falls inside the craft, wherever it currently is in the air. */
  const overCraft = (x, y) => {
    const craft = stageRef.current?.querySelector('.flying-button__craft');
    if (!craft) return false;
    const rect = craft.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

  /** The component flags its button while the pointer is on it, even after it has lifted off. */
  const onCraft = () => Boolean(stageRef.current?.querySelector('.flying-button__craft[data-hover]'));

  return (
    <div
      ref={stageRef}
      className="fly-slot"
      onPointerDown={event => {
        // The button lifts on hover, so decide at press time: it was aimed at if the press hit
        // the craft, the craft's box, or the craft's own hover state.
        pressedOnCraft.current =
          Boolean(event.target.closest('.flying-button__craft')) ||
          overCraft(event.clientX, event.clientY) ||
          onCraft();
      }}
      onPointerUp={() => {
        const armed = pressedOnCraft.current;
        pressedOnCraft.current = false;
        if (armed) fire();
      }}
      onPointerCancel={() => {
        pressedOnCraft.current = false;
      }}
      onClick={event => {
        // Keyboard activation only — pointer presses are handled above.
        if (event.detail === 0 && event.target.closest('.flying-button__craft')) fire();
      }}
    >
      <FlyingButton
        theme="dark"
        size="large"
        altitude={altitude}
        hoverTime={2.2}
        jets={2}
        thrusters
        trigger="hover"
        carryCursor
        smoke={1}
        turbulence={1}
        wobble={1}
        thrustColor="#ffffff"
        smokeColor="#e8e8ee"
        buttonColor="#ffffff"
        textColor="#08080a"
        onClick={fire}
      >
        {label}
      </FlyingButton>
    </div>
  );
};

/** Small eased scroll that works the same in every engine (some ignore scrollTo's smooth flag). */
const smoothScrollTo = top => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = window.scrollY;
  const distance = top - start;
  if (still || Math.abs(distance) < 4) {
    window.scrollTo(0, top);
    return;
  }
  const duration = Math.min(700, Math.max(280, Math.abs(distance) * 0.5));
  const t0 = performance.now();
  let ticking = false;
  const step = now => {
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, start + distance * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(now => {
    ticking = true;
    step(now);
  });
  // Frames can be throttled (hidden tab, aggressive power saving): land the jump regardless.
  setTimeout(() => {
    if (!ticking) window.scrollTo(0, top);
  }, 120);
};

/** The two download actions: Android serves the signed APK, iOS opens the install steps. */
const DownloadActions = () => {
  const small = useMedia('(max-width: 720px)');
  const altitude = small ? 96 : 152;

  const downloadAndroid = () => {
    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = __APK_FILE__;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadIos = () => {
    if (IOS_STORE_URL) {
      window.open(IOS_STORE_URL, '_blank', 'noreferrer noopener');
      return;
    }
    // No .ipa exists yet — iOS installs from Safari through Add to Home Screen, so walk the
    // visitor to those steps instead of handing them a file iOS would refuse.
    const section = document.getElementById('ios');
    if (!section) {
      window.open(WEB_APP_URL, '_blank', 'noreferrer noopener');
      return;
    }
    smoothScrollTo(section.getBoundingClientRect().top + window.scrollY - 76);
  };

  return (
    <>
      <div className="cta-row">
        <FlyAction label="Download for Android" altitude={altitude} onAction={downloadAndroid} />
        <FlyAction label="Download for iOS" altitude={altitude} onAction={downloadIos} />
      </div>
      <p className="fly-hint">
        iOS install path — <strong>Safari → Share → Add to Home Screen</strong>
      </p>
    </>
  );
};

/** Rippling surface under the wordmark — hover or tap to disturb the texture. */
const ShowcaseTile = () => {
  const still = useMedia('(prefers-reduced-motion: reduce)');
  const small = useMedia('(max-width: 720px)');

  if (still) {
    return <img className="showcase-static" src="/art/spotlight.svg" alt="" aria-hidden="true" />;
  }

  return (
    <RippleDistortion
      src="/art/spotlight.svg"
      brushSize={small ? 118 : 168}
      strength={0.24}
      swirl={1}
      rings={4}
      spread={5}
      fade={3.2}
      spacing={14}
      dispersion={0.06}
      glint={0.55}
      tint="#ffffff"
      tintAmount={0.05}
      grayscale
      trigger="both"
      clickStrength={2.2}
      quality={small ? 'low' : 'medium'}
    />
  );
};

const mounts = {
  'page-ripple': PageRipple,
  'hero-rays': HeroBackground,
  'hero-swarm': SwarmField,
  'cta-stage': DownloadActions,
  'ripple-tile': ShowcaseTile
};

document.querySelectorAll('[data-mount]').forEach(node => {
  const Component = mounts[node.dataset.mount];
  if (!Component) return;
  // Reuse the root across dev hot reloads: mounting twice on the same node leaves a stale tree
  // on top of the live one, and that tree eats the pointer events.
  if (!node.__nexusRoot) node.__nexusRoot = createRoot(node);
  node.__nexusRoot.render(<Component />);
});
