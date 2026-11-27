"""Generate Google Play listing images into store/ using headless Chrome.

    python scripts/store-assets.py

Uses a made-up demo collection (never personal data). Produces:
  store/icon-512.png          app icon for the listing
  store/feature-graphic.png   1024x500 banner
  store/screenshots/*.png     1080x1920 phone screenshots with captions
"""
import json, pathlib, shutil, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
WWW = ROOT / "www"
OUT = ROOT / "store"
SHOTS = OUT / "screenshots"
CHROME = r"C:/Program Files/Google/Chrome/Application/chrome.exe"
WORK = pathlib.Path(tempfile.mkdtemp(prefix="plantpals-store-"))

# name, species, room, spot, next due (days from today; negative = late), watered today?
DEMO = [
    ("Monstera", "monstera", "r1", "By the patio door", 0, False),
    ("Calathea", "calathea", "r1", "Bookshelf", 0, False),
    ("Fiddle Leaf Fig", "fiddle-leaf-fig", "r1", "Bay window", 3, False),
    ("Snake Plant", "snake-plant", "r1", "Hallway corner", 12, False),
    ("Basil", "basil", "r2", "Windowsill", -4, False),
    ("Aloe Vera", "aloe-vera", "r2", "Sunny sill", 9, False),
    ("Pothos", "pothos", "r2", "Top of the fridge", 1, False),
    ("Peace Lily", "peace-lily", "r3", "Bedside table", -1, False),
    ("String of Pearls", "string-of-pearls", "r3", "Hanging basket", 6, False),
    ("Boston Fern", "boston-fern", "r4", "By the bath", 2, True),
    ("Moth Orchid", "orchid", "r4", "Window ledge", 5, False),
    ("ZZ Plant", "zz-plant", "r5", "Under the desk lamp", 15, False),
    ("Echeveria", "echeveria", "r5", "Desk", 8, False),
    ("African Violet", "african-violet", "r5", "Shelf", 1, False),
]
ROOMS = [
    {"id": "r1", "name": "Living room", "emoji": "🛋️"},
    {"id": "r2", "name": "Kitchen", "emoji": "🍳"},
    {"id": "r3", "name": "Bedroom", "emoji": "🛏️"},
    {"id": "r4", "name": "Bathroom", "emoji": "🛁"},
    {"id": "r5", "name": "Office", "emoji": "🖥️"},
]

LOAD_DEMO = """
const T = Watering.today(), D = (n) => Watering.addDays(T, n);
const DEMO = %s, ROOMS = %s;
Store.importJson(JSON.stringify({ app: 'plant-pals', rooms: ROOMS, plants: DEMO.map(([name, key, roomId, placement, due, today]) => {
  const c = Catalog.get(key);
  return { name, detail: c.latin, species: key, roomId, placement, waterType: c.waterType, notes: c.note,
           schedule: Catalog.schedule(key, c.minDays, c.maxDays), waterMethod: Catalog.defaultMethod(key), light: Catalog.defaultLight(key),
           lastWatered: today ? T : D(-7), history: today ? [T] : [D(-7)], nextDue: today ? D(4) : D(due) };
}) }));
""" % (json.dumps(DEMO), json.dumps(ROOMS, ensure_ascii=False))

NATIVE_MOCK = """<script>
window.Capacitor = { isNativePlatform: () => true, Plugins: {
  LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
    getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async () => {}, createChannel: async () => {} },
  App: { addListener: () => {}, exitApp: () => {}, getInfo: async () => ({ version: '1.1.0' }) } } };
</script>"""

SCREENS = [
    ("01-today", "See who needs a drink today", "", "document.querySelector('[data-tab=today]').click();"),
    ("02-plants", "Every plant, room by room", "", "document.querySelector('[data-tab=plants]').click();"),
    ("03-picker", "Pick from 120 houseplants", "", "document.querySelector('[data-tab=plants]').click(); document.getElementById('fab').click();"),
    ("04-guide", "Water the right way", "",
     "document.getElementById('help-btn').click(); setTimeout(() => { const s = document.getElementById('g-bottom'); s.open = true; document.getElementById('guide-body').scrollTop = s.offsetTop - 70; }, 300);"),
    ("05-holiday", "Away? Leave a plan for your plant sitter", "native",
     "Store.setHoliday({ start: D(3), end: D(16), days: [2, 5] }); document.querySelector('[data-tab=today]').click(); setTimeout(() => document.getElementById('holiday-plan').click(), 100);"),
    ("06-reminders", "A gentle nudge on watering days", "native",
     "Store.setReminders({ on: true, time: '08:00' }); document.querySelector('[data-tab=settings]').click();"),
    ("07-dark", "Easy on the eyes at night", "dark", "document.querySelector('[data-tab=today]').click();"),
]


def chrome_shot(html_path, png_path, w, h, scale):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
                    "--allow-file-access-from-files", f"--user-data-dir={WORK / ('p-' + png_path.stem)}",
                    f"--window-size={w},{h}", f"--force-device-scale-factor={scale}", "--default-background-color=00000000",
                    "--virtual-time-budget=5000", f"--screenshot={png_path}", html_path.as_uri()],
                   check=True, capture_output=True, timeout=180)


def app_screen(name, js, flags):
    src = (WWW / "index.html").read_text(encoding="utf-8")
    theme = "dark" if "dark" in flags else "light"
    pre = f"<script>localStorage.clear();localStorage.setItem('plantPals.theme','{theme}');</script>"
    if "native" in flags:
        pre += NATIVE_MOCK
    body = f"<script>setTimeout(() => {{ window.confirm = () => true; {LOAD_DEMO} {js} }}, 300)</script>"
    html = src.replace("<head>", f'<head><base href="{WWW.as_uri()}/">{pre}').replace("</body>", body + "</body>")
    f = WORK / f"{name}.html"; f.write_text(html, encoding="utf-8")
    png = WORK / f"{name}.png"
    chrome_shot(f, png, 540, 1010, 2)  # 1080 x 2020 raw
    return png


def framed(name, raw, caption, dark):
    bg = "linear-gradient(160deg,#3A281A,#23170F)" if dark else "linear-gradient(160deg,#F28C28,#FFC23D)"
    html = f"""<!doctype html><html><head><style>
    @font-face {{ font-family: 'Nunito'; font-weight: 500 900; src: url({(WWW / 'fonts/nunito-latin.woff2').as_uri()}) format('woff2'); }}
    html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: {bg}; font-family: 'Nunito', sans-serif; }}
    h1 {{ margin: 0; padding: 120px 90px 0; height: 330px; box-sizing: border-box; color: #fff; font-size: 78px; line-height: 1.12;
         font-weight: 900; text-align: center; text-shadow: 0 3px 0 rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; }}
    .phone {{ position: absolute; left: 110px; top: 380px; width: 860px; height: 1640px; border-radius: 64px; overflow: hidden;
             border: 14px solid #2B1C12; box-shadow: 0 30px 80px rgba(60,30,0,.35); background: #2B1C12; }}
    .phone img {{ width: 100%; display: block; }}
    </style></head><body><h1>{caption}</h1><div class="phone"><img src="{raw.as_uri()}"></div></body></html>"""
    f = WORK / f"framed-{name}.html"; f.write_text(html, encoding="utf-8")
    chrome_shot(f, SHOTS / f"{name}.png", 1080, 1920, 1)


def icon():
    svg = (WWW / "icons/icon-maskable.svg").read_text(encoding="utf-8")
    f = WORK / "icon.html"
    f.write_text(f"<!doctype html><html><body style='margin:0;width:512px;height:512px;overflow:hidden'>"
                 f"<div style='width:512px;height:512px'>{svg.replace('width=\"512\" height=\"512\"', 'width=\"512\" height=\"512\" style=\"display:block\"')}</div></body></html>", encoding="utf-8")
    chrome_shot(f, WORK / "icon-rgb.png", 512, 512, 1)
    # Play wants a 32-bit PNG (RGBA). sharp comes with @capacitor/assets.
    node = shutil.which("node") or r"C:/Program Files/nodejs/node.exe"
    subprocess.run([node, "-e", "require('sharp')(process.argv[1]).ensureAlpha().png().toFile(process.argv[2])",
                    str(WORK / "icon-rgb.png"), str(OUT / "icon-512.png")], check=True, cwd=ROOT, capture_output=True)


def feature_graphic():
    species = ["monstera", "golden-barrel", "peace-lily", "string-of-pearls", "calathea", "echeveria", "boston-fern"]
    html = f"""<!doctype html><html><head><base href="{WWW.as_uri()}/"><style>
    @font-face {{ font-family: 'Nunito'; font-weight: 500 900; src: url(fonts/nunito-latin.woff2) format('woff2'); }}
    html, body {{ margin: 0; width: 1024px; height: 500px; overflow: hidden; font-family: 'Nunito', sans-serif; }}
    body {{ background: linear-gradient(135deg, #F28C28, #FFC23D); position: relative; }}
    .text {{ position: absolute; left: 64px; top: 96px; width: 470px; color: #fff; }}
    .text h1 {{ margin: 0; font-size: 92px; font-weight: 900; line-height: 1; text-shadow: 0 4px 0 #C9651A; }}
    .text p {{ margin: 22px 0 0; font-size: 34px; font-weight: 800; line-height: 1.2; color: #4A2A0E; }}
    .pals {{ position: absolute; right: 30px; bottom: -6px; width: 470px; height: 420px; }}
    .pal {{ position: absolute; width: 150px; height: 150px; border-radius: 50%; background: #FFE7A8; box-shadow: 0 6px 0 rgba(201,101,26,.35); }}
    .pal svg {{ width: 100%; height: 100%; }}
    </style></head><body>
    <div class="text"><h1>Plant Pals</h1><p>Never forget to water<br>a houseplant again</p></div>
    <div class="pals" id="pals"></div>
    <script src="js/catalog.js"></script><script src="js/watering.js"></script><script src="js/plant-art.js"></script>
    <script>
      const pos = [[160,20,1.15],[20,110,1],[300,120,1],[150,215,1.2],[0,280,.9],[320,280,.95],[150,0,0]];
      {json.dumps(species)}.slice(0,6).forEach((k, i) => {{
        const [x, y, s] = pos[i]; const d = document.createElement('div'); d.className = 'pal';
        d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.transform = 'scale(' + s + ')';
        d.innerHTML = PlantArt.svg(k, 'happy'); document.getElementById('pals').appendChild(d);
      }});
    </script></body></html>"""
    f = WORK / "feature.html"; f.write_text(html, encoding="utf-8")
    chrome_shot(f, OUT / "feature-graphic.png", 1024, 500, 1)


if __name__ == "__main__":
    SHOTS.mkdir(parents=True, exist_ok=True)
    for name, caption, flags, js in SCREENS:
        raw = app_screen(name, js, flags)
        framed(name, raw, caption, "dark" in flags)
        print("screenshot", name)
    icon(); print("icon-512")
    feature_graphic(); print("feature-graphic")
    shutil.rmtree(WORK, ignore_errors=True)
