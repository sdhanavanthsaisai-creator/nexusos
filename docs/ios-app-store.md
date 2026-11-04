# Shipping NexusOS on iOS (App Store)

This is the practical release guide for this repository. It assumes the app stays a
Next.js web app served from `https://nexusos-sigma.vercel.app` and ships to the App
Store inside a native shell, exactly like the Android build in `android/` (Bubblewrap
TWA). The iOS equivalent of that shell is a **WKWebView container**, and the most
maintainable one is **Capacitor**.

Read §0 before anything else — two hard constraints and one App Review risk change
the shape of the whole plan.

---

## 0. Reality check before you start

| Topic | Current state in this repo | What iOS needs |
| --- | --- | --- |
| App type | Next.js app (`next.config.ts` → `output: "standalone"`) + PWA manifest | A native shell that loads the deployed URL |
| Android | `android/` Bubblewrap TWA (`twa-manifest.json`) | No equivalent on iOS — Bubblewrap is Android-only |
| Font | `src/app/layout.tsx` uses `Inter` + `IBM_Plex_Mono` via `next/font/google`; **no Aldrich anywhere in the repo** | Bundle Aldrich yourself and self-host it (see §1.2) |
| Safe areas | Already used widely (`mobile-tabbar.tsx`, `topbar.tsx`, `dynamic-island.tsx`, `status-bar.tsx`, `globals.css:702`) | Keep, and add the native-shell tweaks in §1.1 |
| Auth | Email + password only (`auth-screen.tsx` → `signInWithPassword` / `signUp`) | Fine for 4.8 as-is; see §2.1 if you add Google |
| Account deletion | **Missing** — `modules/settings.tsx` has no delete flow | Required by 5.1.1(v); see §2.2 |
| Camera / photos | Not used anywhere | **Do not add** camera/photo usage strings unless you add the feature |

**Hard constraints**

1. An iOS build cannot be produced on Windows. You need macOS (or a cloud Mac) with
   Xcode 16+, plus a paid Apple Developer Program membership (99 USD/year) for
   TestFlight and the App Store.
2. **App Review Guideline 4.2 (Minimum Functionality).** A shell that only loads a
   website is a common rejection on iOS. You need at least a few genuinely native
   behaviours — offline caching of the shell, haptics, Sign in with Apple or native
   push, native share — and copy in the review notes that says what they are. §1.3,
   §2.1 and §3.1 give you those.

---

## 1. Platform adaptation

### 1.1 Scaffold the iOS shell

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios
npm i @capacitor/haptics @capacitor/preferences @capacitor/share
npx cap init "NexusOS" app.nexusos.student --web-dir=public
```

> Bundle id must match what you register in App Store Connect. `app.nexusos.student`
> is already the Android package (`public/manifest.webmanifest`), so reuse it.

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexusos.student',
  appName: 'NexusOS',
  // The shell ships a tiny local page; the real UI is the deployed app.
  webDir: 'public',
  server: {
    url: 'https://nexusos-sigma.vercel.app',
    // Keep the URL you allow-list in Supabase and in ATS.
    cleartext: false,
    allowNavigation: ['nexusos-sigma.vercel.app', '*.supabase.co'],
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#000000',
  },
};

export default config;
```

```bash
npx cap add ios          # creates ios/App/App.xcworkspace
npx cap sync ios         # run after any config change
npx cap open ios         # opens Xcode
```

Keep the web build deployable on its own; the shell only points at it. If you later
want a fully offline first paint, copy the exported static build into `public/` and
remove `server.url` so the shell loads local files.

### 1.2 Safe area, layout, and the keyboard

Safe areas are already handled with `env(safe-area-inset-*)` in the components listed
in §0. Two things are still missing for the native shell.

**a) Safe-area tokens + viewport guards** — append to `src/app/globals.css`:

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --ios-tabbar-h: 56px;
}

/* WKWebView: kill rubber-band flashes and text inflation. */
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  overscroll-behavior-y: none;
}

body {
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

/* Fixed bottom UI must clear the home indicator, not sit under it. */
.safe-bottom {
  padding-bottom: max(var(--safe-bottom), 0.5rem);
}

/* Give scroll containers room so the last row is not hidden by the tab bar. */
.scroll-with-tabbar {
  padding-bottom: calc(var(--ios-tabbar-h) + var(--safe-bottom) + 1rem);
  scroll-padding-bottom: calc(var(--ios-tabbar-h) + var(--safe-bottom) + 1rem);
}
```

`src/app/layout.tsx` already exports `viewportFit: "cover"`, which is what makes
`env(safe-area-inset-*)` report real values. Do not remove it.

**b) Keyboard insets.** WKWebView resizes the visual viewport, not the layout
viewport, so sheets can hide behind the keyboard. In
`src/components/nexus/mobile-tabbar.tsx` (the sheets) and the dialogs, add:

```tsx
'use client';
import { useEffect } from 'react';

/** Exposes the on-screen keyboard height so sheets can lift above it. */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-inset', `${inset}px`);
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      document.documentElement.style.removeProperty('--kb-inset');
    };
  }, []);
}
```

Then on fixed-bottom sheets use `paddingBottom: 'calc(var(--kb-inset, 0px) + var(--safe-bottom))'`.

Replace full-height `h-screen` usages with `100dvh` (dynamic viewport) so the layout
does not jump when the Safari chrome or keyboard animates.

### 1.3 Typography: bundling Aldrich

The design tokens you described (`#000000`, `#E5E5E5`, `#C20000`, 16px radius) are
already the app's palette. **Aldrich, however, is not in the repo** — the app renders
Inter today. If Aldrich must ship, do it as a self-hosted font so web and iOS render
identically:

1. Put the files in `public/fonts/`: `Aldrich-Regular.woff2` (web) and
   `Aldrich-Regular.ttf` (iOS bundle).
2. Copy the `.ttf` into the Xcode target (drag into `ios/App/App`, tick *Copy items if
   needed* and the App target).
3. Declare it in `ios/App/App/Info.plist`:

```xml
<key>UIAppFonts</key>
<array>
  <string>Aldrich-Regular.ttf</string>
</array>
```

4. Load it in Next with `next/font/local` instead of adding a `<link>` (no FOUT, no
   external request inside WKWebView):

```ts
// src/app/fonts.ts
import localFont from 'next/font/local';

export const aldrich = localFont({
  src: '../../public/fonts/Aldrich-Regular.woff2',
  variable: '--font-aldrich',
  display: 'swap',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
});
```

5. Use the variable class on `<body>` in `layout.tsx` and map it in Tailwind:
   `fontFamily: { display: ['var(--font-aldrich)', 'sans-serif'] }`.

Two WKWebView gotchas: never rely on `font-family: "Aldrich"` alone (the bundle alias
must match the PostScript name exactly), and set `font-synthesis: none` if you style it
bold — Aldrich ships a single weight, so synthetic bold looks smeared.

### 1.4 iOS-native feel

**Swipe to go back.** Capacitor's WKWebView allows back/forward gestures only when
enabled in the AppDelegate (`ios/App/App/AppDelegate.swift`):

```swift
override func capacitorDidLoad() {
    webView?.allowsBackForwardNavigationGestures = true
}
```

Because NexusOS is a single-page app, also wire the gesture to your own history so it
does not exit the app:

```ts
// src/lib/ios/back-gesture.ts
export function installBackGesture(onBack: () => boolean) {
  if (!window.Capacitor?.isNativePlatform?.()) return;
  window.addEventListener('popstate', (event) => {
    // Returning true means "we handled it" — push the state back so the shell stays.
    if (onBack()) {
      event.preventDefault();
      window.history.pushState({ nexus: true }, '');
    }
  });
}
```

**Haptics.** Wrap `UIImpactFeedbackGenerator` behaviour behind one helper so it
degrades to a no-op on the web:

```ts
// src/lib/ios/haptics.ts
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = () => Boolean((window as any).Capacitor?.isNativePlatform?.());

export const tap = async () => {
  if (!native()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
};

export const select = async () => {
  if (!native()) return;
  await Haptics.selectionChanged();
};

export const success = async () => {
  if (!native()) return;
  await Haptics.notification({ type: NotificationType.Success });
};
```

Wire `tap()` into task completion and timer start/stop, `select()` into the semester
picker and subject chips in `onboarding-wizard.tsx`, `success()` into habit check-off.
Do not fire haptics on every render or scroll frame — iOS throttles and it drains
battery.

**iOS-styled modals.** Your dialogs are shadcn `Dialog`s. On iOS the platform
expectation is a sheet that slides from the bottom with a grabber. Reuse the existing
sheet markup from `mobile-tabbar.tsx` (`rounded-t-3xl`, `animate-sheet-up`,
`pb-[max(env(safe-area-inset-bottom,0px),0.75rem)]`) and pick it when the platform is
iOS:

```ts
export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
```

**Small native touches worth adding** (they also help 4.2): disable long-press
selection on chrome (`-webkit-user-select: none` on nav/headers), keep momentum
scrolling (`-webkit-overflow-scrolling: touch` on scroll areas), and use
`@capacitor/share` for the "Export report" action so it opens the native share sheet
instead of a download.

---

## 2. Authentication and App Store policy

### 2.1 Sign in with Apple (Guideline 4.8)

**Current status: not required.** 4.8 is triggered by offering a *third-party* login
(Google, Facebook, GitHub…). NexusOS only offers email + password, which Apple
explicitly accepts as the primary account mechanism. Adding Sign in with Apple now is
optional and cannot hurt you.

**If you add Google (or any social login), you must add Sign in with Apple in the same
screen, at least as prominent.** Implementation with Supabase:

1. Apple Developer → *Identifiers* → your App ID → enable **Sign In with Apple**.
2. Xcode → target → *Signing & Capabilities* → add **Sign In with Apple** (adds the
   `com.apple.developer.applesignin` entitlement).
3. Create a **Services ID** for the web flow, plus a **Key (.p8)**.
4. Supabase → *Authentication → Providers → Apple*: paste Services ID, Team ID, Key
   ID, and the `.p8`. Add `https://fsskictkphtpxduasylq.supabase.co/auth/v1/callback`
   to the Apple return URLs.
5. Add the button next to the existing form in `auth-screen.tsx`:

```tsx
const signInWithApple = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: `${window.location.origin}/auth/confirm` },
  });
  if (error) setError(error.message);
};
```

Use Apple's own button artwork (`ASAuthorizationAppleIDButton`, or the HIG-approved
web button) — App Review rejects restyled Apple buttons. Inside a WKWebView the OAuth
hop opens an in-app browser sheet, which is acceptable; if you want the fully native
sheet, call `ASAuthorizationController` from a small Capacitor plugin instead.

### 2.2 Account deletion (Guideline 5.1.1(v))

Required for any app that lets users create an account, and it must be reachable
in-app without contacting support. Add it to Settings.

**Server side** — a security-definer function that only deletes the caller:

```sql
-- supabase/schema.sql (append)
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Explicit deletes keep this correct even where FKs are not ON DELETE CASCADE.
  delete from public.user_state   where user_id = uid;
  delete from public.onboarding   where user_id = uid;
  delete from public.profiles     where user_id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
```

**Client side** — in `src/components/nexus/modules/settings.tsx`, under a
"Danger zone" card, with a typed confirmation and a final warning that data is gone:

```tsx
const deleteAccount = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;

  await supabase.auth.signOut();
  localStorage.removeItem('nexus:data');   // match your actual storage key
  window.location.replace('/');
};
```

Two rules App Review enforces here: deletion must actually delete (no "email us"
fallback, no soft-deactivate that keeps the row), and if you sell subscriptions you
must tell the user to cancel it in iOS Settings before deleting.

### 2.3 Privacy declarations

Declare **only** what the app actually uses. Today NexusOS touches no camera, photos,
contacts or location, so `Info.plist` needs **none** of those strings — adding unused
usage descriptions is an easy review flag.

If you later add profile photos, add exactly these:

```xml
<key>NSCameraUsageDescription</key>
<string>NexusOS uses the camera so you can take a profile photo.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>NexusOS needs access to your photos so you can choose a profile picture.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>NexusOS saves images you export to your photo library.</string>
<key>NSMicrophoneUsageDescription</key>
<string>NexusOS uses the microphone when you record a voice note.</string>
```

Also required:

- **Privacy policy URL** in App Store Connect (5.1.1) — must be publicly reachable and
  cover what you store: email, name, year, degree/branch, semester, subjects, study
  logs, tasks, habits, AI coach messages.
- **App Privacy questionnaire** ("Data linked to you"): Contact info → email; User
  content → your study data and AI coach messages; Identifiers → user id. Purpose:
  App Functionality. Tracking: **No** (so you also do not need an ATT prompt).
- **AI coach disclosure.** If messages go to Gemini with a user-supplied key, say so in
  the policy and in the Settings copy; users must know their text leaves the device.

---

## 3. Build, signing, and submission

### 3.1 Info.plist

```xml
<key>CFBundleDisplayName</key><string>NexusOS</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>UILaunchScreen</key>
<dict>
  <key>UIColorName</key><string>LaunchBackground</string>
  <key>UIImageName</key><string>LaunchLogo</string>
</dict>
<key>UIStatusBarStyle</key><string>UIStatusBarStyleLightContent</string>
<key>UIViewControllerBasedStatusBarAppearance</key><false/>
<key>UISupportedInterfaceOrientations</key>
<array><string>UIInterfaceOrientationPortrait</string></array>
<key>UIRequiresFullScreen</key><true/>
<key>ITSAppUsesNonExemptEncryption</key><false/>
<key>UIAppFonts</key>
<array><string>Aldrich-Regular.ttf</string></array>
```

`ITSAppUsesNonExemptEncryption=false` is correct here: the app only uses HTTPS and
Supabase's TLS, which is exempt. Leaving it out means answering the export-compliance
question on every upload.

`LaunchBackground` must be a colour asset set to `#000000`; `LaunchLogo` should be a
transparent PNG/PDF of the mark at ~40% width. Prefer the `UILaunchScreen` dictionary
over a storyboard — Apple deprecates custom launch storyboards for new apps, and any
splash that lingers more than a moment reads as a hang.

### 3.2 Icons

Xcode 14+ needs a single **1024×1024** app icon, no alpha channel, no rounded corners
(the OS masks it). Generate from the existing mark:

```bash
npx pwa-asset-generator public/icons/icon-512.png ios/App/App/Assets.xcassets/AppIcon.appiconset \
  --icon-only --opaque false --padding "0" --background "#000000"
```

If the source has alpha, flatten first — an alpha channel is an automatic upload
failure: `magick icon.png -background black -alpha remove -alpha off AppIcon-1024.png`.

### 3.3 Local storage and offline behaviour

WKWebView keeps `localStorage`/IndexedDB across launches, but iOS can evict them for
apps under storage pressure, and the ITP rules clear script-writable storage after
seven days of non-use for *web* contexts. For an app holding study history that is
unacceptable, so mirror the store:

```ts
// src/lib/ios/storage.ts
import { Preferences } from '@capacitor/preferences';

const native = () => Boolean((window as any).Capacitor?.isNativePlatform?.());

/** Persist the Nexus store in native preferences as well as web storage. */
export async function mirrorSave(key: string, value: string) {
  localStorage.setItem(key, value);
  if (native()) await Preferences.set({ key, value });
}

export async function mirrorLoad(key: string): Promise<string | null> {
  const local = localStorage.getItem(key);
  if (local) return local;
  if (!native()) return null;
  const { value } = await Preferences.get({ key });
  if (value) localStorage.setItem(key, value);
  return value ?? null;
}
```

Call `mirrorSave` wherever the store currently writes (the debounce in
`auth-gate.tsx`'s sync path is the natural single point), and `mirrorLoad` during
hydration. Keep Supabase as the source of truth for signed-in users so a reinstall
restores everything.

### 3.4 Push notifications (APNs)

Only worth doing if you actually send reminders; it also strengthens 4.2.

1. Apple Developer → Keys → create an **APNs key (.p8)**, note Key ID + Team ID.
2. Xcode → target → *Signing & Capabilities* → **Push Notifications**, then add
   **Background Modes → Remote notifications**.
3. Entitlement lands in `ios/App/App/App.entitlements` as `aps-environment`
   (`development` for debug, `production` for TestFlight/App Store).
4. Client:

```ts
import { PushNotifications } from '@capacitor/push-notifications';

export async function registerPush() {
  let { receive } = await PushNotifications.checkPermissions();
  if (receive === 'prompt') ({ receive } = await PushNotifications.requestPermissions());
  if (receive !== 'granted') return null;

  await PushNotifications.register();

  return new Promise<string>((resolve) => {
    PushNotifications.addListener('registration', (token) => resolve(token.value));
  });
}
```

Ask for permission **after** onboarding, on an explicit "Turn on study reminders"
button — a cold prompt at first launch is denied forever and looks bad in review.

5. Server: APNs needs HTTP/2 with a JWT signed by the `.p8`
   (`https://api.push.apple.com/3/device/<token>`, headers `apns-topic`,
   `apns-push-type`). Send it from a Next route handler or a Supabase Edge Function;
   never ship the key to the client. Store tokens per user in Supabase.

### 3.5 Build and upload

```bash
# after any web change
npx cap sync ios

# CLI archive (CI-friendly, no Xcode UI)
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath build/NexusOS.xcarchive clean archive

xcodebuild -exportArchive -archivePath build/NexusOS.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/ipa
```

`ExportOptions.plist`:

```xml
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>YOUR_TEAM_ID</string>
  <key>uploadSymbols</key><true/>
  <key>signingStyle</key><string>automatic</string>
</dict>
```

GUI path: open the workspace → select the **App** scheme → *Any iOS Device (arm64)* →
**Product → Archive** → **Distribute App → App Store Connect → Upload**. Then
App Store Connect → TestFlight (build appears after processing, usually 10–30 min) →
add yourself as an internal tester → install via the TestFlight app.

**EAS Build** works too, since Capacitor projects are "bare" Xcode projects:

```bash
npm i -g eas-cli && eas login
eas build -p ios --profile production   # eas.json: { "build": { "production": { "ios": { "simulator": false } } } }
eas submit -p ios --latest
```

EAS does not remove the Apple requirements: you still need the paid membership, an App
ID, and distribution certificates (EAS can generate them with your Apple ID).

### 3.6 App Store Connect checklist

- [ ] App record with bundle id `app.nexusos.student`, name, subtitle, category
      (Education), age rating 4+.
- [ ] Screenshots: 6.9" (1320×2868) and 6.5" (1242×2688) iPhone; iPad only if you
      support it — otherwise mark iPhone-only.
- [ ] Description, keywords, support URL, **privacy policy URL**.
- [ ] App Privacy questionnaire completed (see §2.3).
- [ ] Review notes: demo account credentials (email + password that works), plus one
      line per native capability ("haptics on task completion, offline cache of the
      shell, native share for report export") — this is your 4.2 defence.
- [ ] Export compliance answered (`ITSAppUsesNonExemptEncryption=false` covers it).
- [ ] Age rating, content rights, pricing (free), availability.
- [ ] Test on a real device with the production build, signed out → sign up → verify
      email → onboarding → create data → relaunch → delete account.

---

## 4. Order of work (suggested)

1. macOS machine + Apple Developer membership (blocking everything else).
2. `npx cap add ios`, point at the Vercel URL, run on a device via Xcode.
3. §1.2 safe-area/keyboard CSS, §1.4 haptics + back gesture + sheets.
4. §1.3 Aldrich bundling (if it must ship) — otherwise keep Inter and skip the font
   plumbing entirely.
5. §2.2 account deletion (server function + settings UI) — do not submit without it.
6. §3.1/§3.2 plist + icon + launch screen.
7. Archive → TestFlight → fix what the first build exposes → submit.

## 5. Known gaps in this repo that will appear in review

| Gap | Why it matters | Fix |
| --- | --- | --- |
| No account deletion | 5.1.1(v) rejection | §2.2 |
| Web-only shell | 4.2 rejection | §1.4, §3.3, §3.4 |
| No privacy policy page linked in-app | 5.1.1 | Add `/privacy` and link it in Settings |
| Aldrich named in the design spec but absent from code | Branding mismatch | §1.3 |
| Email verification email may be rate-limited by Supabase's default SMTP | Reviewers cannot sign in | Configure custom SMTP before submitting |
