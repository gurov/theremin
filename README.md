# Air Theremin

**Play it: [theremin.bizibah.com](https://theremin.bizibah.com/)**

*[Русская версия](./README.ru.md)*

A browser theremin you play **in mid-air** — two ways, switched with the `GYRO / HANDS` control in the panel. The whole app is one self-contained [`index.html`](./index.html): vanilla JS, Web Audio API, DeviceOrientation and MediaPipe. No build step, no dependencies to install.

**GYRO** — your phone's gyroscope replaces the mouse:

- tilt **left–right** → volume;
- tilt **forward–back** → pitch.

The full range lives inside the on-screen frame; move the marker outside it and the sound cuts.

**HANDS** — camera hand tracking (MediaPipe Hand Landmarker), the "conductor" mapping:

- **distance between your palms** → volume (spread them for louder, **palms together = silence**);
- **mean height of both palms** → pitch (raise both to go higher);
- **angle of the line between your palms** → vibrato depth (see-saw them and the note starts to sing; a dead zone keeps it from creeping in on its own);
- **distance from the camera** → timbre: lean in for a bright, dry tone, lean back and it darkens and drowns in reverb.

Two palms give exactly three independent numbers — their mean height, the gap between them and the angle joining them — and the mapping above is those three. Both hands are equal, so there are no left/right roles to memorise. This mode has no frame: the hands bound the range themselves. A three-step animated coach appears the first time you switch to it in a visit.

Hand tracking runs entirely on your own machine and **no video is uploaded anywhere** — there is no server to upload it to. The MediaPipe module, its wasm and the model file are fetched from a CDN once; see [Hosting](#hosting) for vendoring them locally.

## Features

- Waveforms: sine / triangle / warm / reed. The last two are custom `PeriodicWave`s with a smooth harmonic rolloff — raw saw and square were dropped because they buzzed on phone speakers.
- Cave reverb (toggle, on by default).
- Note snap: quantise to the nearest chromatic semitone (toggle).
- Effects: vibrato / tremolo / echo. In HANDS mode the vibrato toggle is locked out and reads as a caption, because the see-saw of your palms owns its depth there.
- Zero calibration for your current grip (hidden in HANDS mode, where there is nothing to calibrate).
- Oscilloscope and a note/frequency readout. In HANDS mode the waveform is strung between your palms.
- Audio recording → file download (webm/opus, or mp4 on iOS).
- Desktop fallback: no gyroscope means mouse control.

The range is **C2–C7**, five octaves. Phone speakers cannot physically reproduce anything below ~150 Hz, so the low end is handled by a psychoacoustic bass exciter rather than by gain: the bottom octave is saturated to generate harmonics and its fundamental is then filtered out, letting the ear reconstruct the missing fundamental. Bass reads as present and in tune even on a tiny speaker. The saturator is driven from the bare oscillator rather than from the post-volume signal, so it produces the same harmonics however loudly you play, and the filter that removes the fundamental tracks the note instead of sitting at a fixed corner.

## Requirements: HTTPS

Both DeviceOrientation (gyroscope) and `getUserMedia` (camera) only work in a **secure context** — over `https://` or via `localhost`. On iOS 13+ the gyroscope additionally asks for permission on tap, which the START button handles.

## Running locally / testing on a phone

1. Generate a self-signed certificate in the project directory (substitute your machine's LAN IP):

   ```bash
   IP=192.168.1.50   # ← your IP (find it with: hostname -I / ip addr)
   openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
     -keyout key.pem -out cert.pem -subj "/CN=$IP"
   ```

   Or with [mkcert](https://github.com/FiloSottile/mkcert), for a certificate without browser warnings:
   ```bash
   mkcert -key-file key.pem -cert-file cert.pem 192.168.1.50 localhost
   ```

2. Start the server:

   ```bash
   node serve-https.js
   ```
   It prints an address like `https://192.168.1.50:8443`.

   > Without the bundled server: `npx http-server -S -C cert.pem -K key.pem -p 8443`

3. Open that address on your phone (same Wi-Fi), accept the self-signed certificate warning, press START and allow motion access (iOS).

On a desktop just open `https://localhost:8443` — you get mouse control, or HANDS if you have a webcam.

## Hosting

The app is static — serving `index.html` behind real TLS is enough. Both input modes need permissions in the response headers, though, or the browser will block them silently:

```
Permissions-Policy: gyroscope=(self), accelerometer=(self), camera=(self)
```

HANDS mode also pulls an ES module and wasm from `cdn.jsdelivr.net` and the model from `storage.googleapis.com`. Under a strict `Content-Security-Policy` you must either allow those hosts (`script-src` / `connect-src` / `worker-src`, plus `'wasm-unsafe-eval'`) or — preferably — vendor `vision_bundle.mjs`, `wasm/` and `hand_landmarker.task` next to `index.html` and switch `initCamera` to relative paths. Note that those MediaPipe assets are Apache-2.0 licensed: if you vendor them, ship their LICENSE and NOTICE too.

**nginx:**
```nginx
server {
    listen 443 ssl;
    server_name theremin.example.com;
    ssl_certificate     /etc/letsencrypt/live/theremin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/theremin.example.com/privkey.pem;
    root /var/www/theremin;   # index.html goes here
    index index.html;
    add_header Permissions-Policy "gyroscope=(self), accelerometer=(self), camera=(self)";
}
```
Get the certificate with `certbot`.

**Caddy** (automatic TLS in a couple of lines of `Caddyfile`):
```
theremin.example.com {
    root * /var/www/theremin
    file_server
    header Permissions-Policy "gyroscope=(self), accelerometer=(self), camera=(self)"
}
```

## Credits

Built by [Pavel Gurov](mailto:lucius.gu@gmail.com). Inspired by [theremin.site](https://theremin.site/) — no code was taken from it.

Licensed under the [MIT License](./LICENSE).
