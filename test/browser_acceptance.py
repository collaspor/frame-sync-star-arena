from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts"
OUT.mkdir(exist_ok=True)


def mint_center(page):
    return page.locator("#arena").evaluate("""canvas => {
      const pixels = canvas.getContext('2d').getImageData(100, 260, 320, 20).data;
      const xs = [];
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 320; x++) {
          const i = (y * 320 + x) * 4;
          if (pixels[i] === 185 && pixels[i + 1] === 239 && pixels[i + 2] === 108) xs.push(x + 100);
        }
      }
      return xs.length ? Math.trunc(xs.reduce((a, b) => a + b, 0) / xs.length) : -1;
    }""")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, channel="chrome")
    first = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    second = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    errors = []
    first.on("pageerror", lambda error: errors.append(str(error)))
    second.on("pageerror", lambda error: errors.append(str(error)))

    first.goto("http://127.0.0.1:3000", wait_until="networkidle")
    print("first title:", first.title())
    print("first status:", first.locator("#overlay-title").inner_text())
    second.goto("http://127.0.0.1:3000", wait_until="networkidle")
    first.wait_for_function("Number(document.querySelector('#frame').textContent) >= 3")
    second.wait_for_function("Number(document.querySelector('#frame').textContent) >= 3")
    assert first.locator("#overlay").get_attribute("class") == "arena-overlay hidden"
    assert second.locator("#overlay").get_attribute("class") == "arena-overlay hidden"
    assert first.locator("#role").inner_text().startswith("你是 薄荷舰队")
    assert second.locator("#role").inner_text().startswith("你是 珊瑚舰队")
    start_x = mint_center(first)
    first.keyboard.down("d")
    first.wait_for_timeout(360)
    first.keyboard.up("d")
    moved_x = mint_center(first)
    assert moved_x > start_x + 12, (start_x, moved_x)
    assert abs(mint_center(second) - moved_x) <= 6
    print("sync labels:", repr(first.locator("#sync-status").inner_text()), repr(second.locator("#sync-status").inner_text()))
    assert "两端状态已同步" in first.locator("#sync-status").inner_text()
    assert "两端状态已同步" in second.locator("#sync-status").inner_text()
    first.screenshot(path=str(OUT / "desktop.png"), full_page=True)

    first.set_viewport_size({"width": 390, "height": 844})
    first.wait_for_timeout(150)
    assert first.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    first.screenshot(path=str(OUT / "mobile.png"), full_page=True)
    assert not errors, errors
    print("frames:", first.locator("#frame").inner_text(), second.locator("#frame").inner_text())
    print("movement:", start_x, "->", moved_x)
    print("page errors:", errors)
    browser.close()
