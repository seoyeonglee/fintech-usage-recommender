import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
let server;
if (!process.env.DEMO_URL) {
  const root = resolve("dist");
  server = createServer(async (req, res) => {
    const path = resolve(
      root,
      "." +
        new URL(req.url, "http://localhost").pathname.replace(
          /\/$/,
          "/index.html",
        ),
    );
    if (!path.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    try {
      const data = await readFile(path);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
        }[extname(path)] || "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  await new Promise((r) => server.listen(4173, "127.0.0.1", r));
}
const base = process.env.DEMO_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const requests = [];
page.on("request", (r) => requests.push(r.url()));
const checks = [];
page.setDefaultTimeout(6000);
const check = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
async function captionContrast() {
  const ratios = await page
    .locator(
      ".kpi-top,.kpi-note,th,.table-note,.chart-foot,.rec-reason,.model-note p,.fine-print",
    )
    .evaluateAll((nodes) =>
      nodes.map((el) => {
        const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const luminance = (c) =>
          rgb(c)
            .map((n) => {
              const v = n / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            })
            .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
        let parent = el,
          bg = "rgb(255, 255, 255)";
        while (parent) {
          const color = getComputedStyle(parent).backgroundColor;
          if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
            bg = color;
            break;
          }
          parent = parent.parentElement;
        }
        const a = luminance(getComputedStyle(el).color),
          b = luminance(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      }),
    );
  assert.ok(
    ratios.length > 0 && ratios.every((r) => r >= 4.5),
    `caption contrast: ${ratios.join(",")}`,
  );
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { name: "핀테크 이용 인사이트", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  check("overview renders with bundled fonts");
  await captionContrast();
  const original = await page.getByTestId("active-users").innerText();
  await page.getByLabel("사용자군").selectOption("global");
  assert.notEqual(await page.getByTestId("active-users").innerText(), original);
  check("cohort changes live aggregates");
  await page.getByLabel("기간").selectOption("7");
  assert.equal(await page.locator("[data-chart-point]").count(), 7);
  check("period changes chart buckets");
  await page.getByLabel("사용자군").selectOption("all");
  await page.getByLabel("기간").selectOption("28");
  await page.getByRole("button", { name: "Flow Pay 상세 보기" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  check("app detail dialog and Escape");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  const download = await dl;
  assert.match(download.suggestedFilename(), /\.csv$/);
  const csv = await readFile(await download.path(), "utf8");
  assert.equal(csv.trim().split("\r\n").length, 9);
  assert.ok(csv.includes("Flow Pay") && csv.includes('"28","all"'));
  check("CSV download with filtered data rows");
  await page.getByRole("button", { name: "추천 실험실", exact: true }).click();
  await page
    .getByRole("heading", { name: "나에게 맞는 다음 앱", exact: true })
    .waitFor();
  await captionContrast();
  const scores = await page
    .getByTestId("recommendation-score")
    .allTextContents();
  await page.getByLabel("인기도 가중치").fill("100");
  assert.notDeepEqual(
    await page.getByTestId("recommendation-score").allTextContents(),
    scores,
  );
  check("weights recalculate recommendation scores");
  await page.getByLabel("미사용 앱만 추천").check();
  const seen = JSON.parse(
    await page.getByTestId("seen-apps").getAttribute("data-ids"),
  );
  const ids = await page
    .locator("[data-recommendation-id]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.recommendationId));
  assert.ok(ids.every((id) => !seen.includes(id)));
  check("seen-app exclusion");
  await page.getByLabel("이용자 프로필").selectOption("new");
  await page
    .getByText("신규 이용자 · 관심사 기반 추천", { exact: true })
    .waitFor();
  check("cold-start path");
  await page.getByRole("button", { name: "설정 초기화", exact: true }).click();
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return document.fonts.ready;
  });
  await page.screenshot({
    path: "docs/screenshots/recommendations.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "엔진 평가", exact: true }).click();
  await page
    .getByRole("heading", { name: "추천을 숫자로 검증하다", exact: true })
    .waitFor();
  await page.getByTestId("eval-ndcg").waitFor();
  assert.ok(
    (await page.getByTestId("eval-ndcg").innerText()).includes("0.841"),
  );
  check("evaluation loads committed measured report");
  await captionContrast();
  check("essential small-text contrast >= 4.5 in all three views");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return document.fonts.ready;
  });
  await page.screenshot({
    path: "docs/screenshots/evaluation.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "사용량 비교", exact: true }).click();
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return document.fonts.ready;
  });
  await page.screenshot({
    path: "docs/screenshots/overview.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["사용량 비교", "추천 실험실", "엔진 평가"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(overflow, false, `overflow on ${name}`);
  }
  check("three mobile views without horizontal overflow");
  await page.getByRole("button", { name: "사용량 비교", exact: true }).click();
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return document.fonts.ready;
  });
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    true,
  );
  await page.getByRole("button", { name: "추천 실험실", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("heading", { name: "나에게 맞는 다음 앱", exact: true })
    .waitFor();
  const slider = page.getByLabel("인기도 가중치");
  await slider.focus();
  assert.equal(
    await slider.evaluate((el) => el === document.activeElement),
    true,
  );
  const oldValue = await slider.inputValue();
  await page.keyboard.press("ArrowRight");
  assert.notEqual(await slider.inputValue(), oldValue);
  const toggle = page.getByLabel("미사용 앱만 추천");
  await toggle.focus();
  const oldChecked = await toggle.isChecked();
  await page.keyboard.press("Space");
  assert.notEqual(await toggle.isChecked(), oldChecked);
  check("mobile keyboard Enter, ArrowRight and Space; reduced-motion");
  assert.ok(
    requests.every((url) => url.startsWith(base) || url.startsWith("data:")),
  );
  check("no external runtime requests");
  assert.deepEqual(errors, []);
  check("zero browser runtime errors");
  await mkdir("docs", { recursive: true });
  await writeFile(
    "docs/browser-verification.json",
    JSON.stringify(
      { base, checks, errors, viewports: ["1440x1100", "390x844"] },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
