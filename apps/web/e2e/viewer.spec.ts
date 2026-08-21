import { expect, test, type Page } from "@playwright/test";

async function openSample(page: Page): Promise<void> {
  await page.goto("./");
  await page.getByRole("button", { name: "サンプルを開く" }).click();
  await expect(page.getByText("サンプル.md")).toBeVisible();
}

async function hasSavedValue(page: Page, key: string, expected: string): Promise<boolean> {
  return page.evaluate(
    ([valueKey, expectedValue]) =>
      new Promise<boolean>((resolve, reject) => {
        const request = indexedDB.open("docfilly-web");
        request.onerror = () => reject(request.error ?? new Error("IndexedDBを開けませんでした。"));
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("document-session", "readonly");
          const sessionRequest = transaction.objectStore("document-session").get("latest");
          let matches = false;
          sessionRequest.onerror = () =>
            reject(sessionRequest.error ?? new Error("保存済みセッションを読み取れませんでした。"));
          sessionRequest.onsuccess = () => {
            const session: unknown = sessionRequest.result;
            if (typeof session !== "object" || session === null || !("values" in session)) return;
            const values: unknown = session.values;
            matches =
              typeof values === "object" &&
              values !== null &&
              valueKey in values &&
              values[valueKey as keyof typeof values] === expectedValue;
          };
          transaction.oncomplete = () => {
            database.close();
            resolve(matches);
          };
        };
      }),
    [key, expected],
  );
}

test("組み込みチュートリアルを開いてフォーム値を反映できる", async ({ page }) => {
  await openSample(page);

  await page.getByLabel("プロジェクト名").fill("Atlas");
  await expect(page.getByRole("heading", { name: "Atlas 5分チュートリアル" })).toBeVisible();
});

test("ローカル文書をファイル選択から開ける", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel("ファイルを開く").setInputFiles({
    name: "local-guide.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(`#!docfilly
title | タイトル = ローカルガイド

---

# [[title]]
`),
  });

  await expect(page.getByText("local-guide.md")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ローカルガイド" })).toBeVisible();
});

test("ページ再読み込み後に文書とフォーム値を復元する", async ({ page }) => {
  await openSample(page);
  await page.getByLabel("作成者").fill("復元する名前");
  await expect(page.getByText("復元する名前", { exact: true })).toBeVisible();
  await expect.poll(() => hasSavedValue(page, "author", "復元する名前")).toBe(true);

  await page.reload();

  await expect(page.getByText("サンプル.md")).toBeVisible();
  await expect(page.getByLabel("作成者")).toHaveValue("復元する名前");
});

test("文書を閉じると復元せず、空状態から別の文書を開ける", async ({ page }) => {
  await openSample(page);
  await page.getByLabel("作成者").fill("閉じる直前の値");
  await page.getByRole("button", { name: "文書を閉じる", exact: true }).first().click();

  await expect(page.getByRole("heading", { name: "Docfilly文書を開く" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Docfilly文書を開く" })).toBeVisible();

  await page.getByRole("button", { name: "サンプルを開く" }).click();
  await expect(page.getByText("サンプル.md")).toBeVisible();
});

test("保存データ削除を確認し、キャンセルと実行後の状態を判別できる", async ({ page }) => {
  await openSample(page);
  await expect.poll(() => hasSavedValue(page, "author", "山田太郎")).toBe(true);
  await page.getByRole("button", { name: "ヘルプ", exact: true }).first().click();
  const clearDataButton = page.getByRole("button", { name: "この端末の保存データを削除" });
  await expect(clearDataButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(clearDataButton).toHaveCSS("background-color", "rgb(180, 35, 24)");
  await clearDataButton.click();

  const confirmation = page.getByRole("dialog", {
    name: "この端末の保存データを削除しますか？",
  });
  await expect(confirmation).toContainText(
    "現在表示している文書と元のローカルファイルは削除されません",
  );
  const cancelButton = page.getByRole("button", { name: "キャンセル" });
  await expect(cancelButton).toBeFocused();
  await expect(cancelButton).toHaveCSS("color", "rgb(38, 50, 74)");
  await expect(cancelButton).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.keyboard.press("Escape");
  await expect(clearDataButton).toBeFocused();
  await expect.poll(() => hasSavedValue(page, "author", "山田太郎")).toBe(true);

  await clearDataButton.click();
  await page.getByRole("button", { name: "保存データを削除", exact: true }).click();
  await expect(page.getByText("サンプル.md")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("保存した文書データを削除しました");
  await expect.poll(() => hasSavedValue(page, "author", "山田太郎")).toBe(false);
});

test("ヘルプをキーボードで閉じると起点へフォーカスが戻る", async ({ page }) => {
  await page.goto("./");
  const helpButton = page.getByRole("button", { name: "ヘルプ", exact: true }).first();
  await expect(helpButton).toBeVisible();
  await helpButton.click();

  const dialog = page.getByRole("dialog", { name: "Docfillyの使い方" });
  await expect(dialog).toBeVisible();
  const introduction = dialog.getByRole("heading", { name: "Docfillyとは？" }).locator("..");
  const form = dialog.getByRole("heading", { name: "フォームと表示内容" }).locator("..");
  const save = dialog.getByRole("heading", { name: "Docfilly形式で保存" }).locator("..");
  const exportResult = dialog.getByRole("heading", { name: "表示結果を書き出す" }).locator("..");
  const privacy = dialog.getByRole("heading", { name: "プライバシーと端末内の保存" }).locator("..");
  await expect(introduction).toContainText("書き手があらかじめDocfilly形式に沿って");
  await expect(introduction).toContainText("書き手の設定に基づくフォーム");
  await expect(introduction).not.toContainText("外部サーバー");
  await expect(form).toContainText("書き手が文書内に定義した入力項目をもとに生成");
  await expect(save).toContainText("現在のフォーム値を次回開いたときの初期値");
  await expect(exportResult).toContainText("現在のフォーム値を反映した本文だけを保存");
  await expect(privacy).toContainText("ブラウザー内だけで処理され、外部サーバーへ送信されません");
  const sampleButton = dialog.getByRole("button", { name: "サンプル文書を開く" });
  const formatSpecificationLink = dialog.getByRole("link", {
    name: "詳細なDocfillyフォーマット仕様",
  });
  await expect(sampleButton.locator("..")).toHaveClass("help-actions");
  await expect(formatSpecificationLink).toHaveAttribute("target", "_blank");
  await expect(formatSpecificationLink).toHaveAttribute("rel", "noopener noreferrer");
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(helpButton).toBeFocused();
});

test.describe("狭い画面のオーバーフローメニュー", () => {
  test.use({ viewport: { width: 600, height: 800 }, hasTouch: true });

  test("タッチ、キーボード、メニュー項目の実行で自然に閉じる", async ({ page }) => {
    await page.goto("./");
    const overflowButton = page.getByRole("button", { name: "その他の操作" });
    const overflowMenu = page.locator("#toolbar-overflow-menu");
    await expect(overflowButton).toBeVisible();
    await expect(overflowButton).toHaveAttribute("aria-expanded", "false");

    await overflowButton.click();
    await expect(overflowMenu).toBeVisible();
    await page.touchscreen.tap(10, 160);
    await expect(overflowMenu).toBeHidden();

    await overflowButton.focus();
    await page.keyboard.press("Enter");
    await expect(overflowMenu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(overflowMenu).toBeHidden();
    await expect(overflowButton).toBeFocused();

    await overflowButton.click();
    await overflowMenu.getByRole("button", { name: "ヘルプ" }).click();
    await expect(overflowMenu).toBeHidden();
    const dialog = page.getByRole("dialog", { name: "Docfillyの使い方" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(overflowButton).toBeFocused();
  });
});

test.describe("狭い画面のレイアウト", () => {
  test.use({ viewport: { width: 240, height: 800 }, hasTouch: true });

  test("ステータスを表示しても空画面に不要な縦スクロールを作らない", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 });
    await page.goto("./");
    const heightWithoutStatus = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.getByLabel("ファイルを開く").setInputFiles({
      name: "unsupported.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("unsupported"),
    });

    await expect(page.getByRole("status")).toBeVisible();
    const pageSize = await page.evaluate(() => ({
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
    }));
    expect(heightWithoutStatus).toBeLessThanOrEqual(pageSize.viewportHeight);
    expect(pageSize.documentHeight).toBeLessThanOrEqual(pageSize.viewportHeight);
  });

  test("極端に狭い画面でも長い本文を折り返して画面内に収める", async ({ page }) => {
    await page.goto("./");
    await page.getByLabel("ファイルを開く").setInputFiles({
      name: "narrow.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(`# ${"very-long-heading-".repeat(12)}\n`),
    });

    const output = page.locator(".docfilly__output");
    await expect(output).toBeVisible();
    const layout = await page.evaluate(() => {
      const outputElement = document.querySelector<HTMLElement>(".docfilly__output");
      if (outputElement === null) throw new Error("本文エリアが見つかりません。");
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        outputClientWidth: outputElement.clientWidth,
        outputScrollWidth: outputElement.scrollWidth,
      };
    });
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.outputScrollWidth).toBeLessThanOrEqual(layout.outputClientWidth);
  });
});

test("表示結果とDocfilly形式のダウンロードを開始できる", async ({ page }) => {
  await openSample(page);
  await page.getByLabel("作成者").fill("保存する名前");

  const renderedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "表示結果を書き出す", exact: true }).first().click();
  const renderedDownload = await renderedDownloadPromise;
  expect(renderedDownload.suggestedFilename()).toBe("サンプル-output.md");

  const sourceDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Docfilly形式で保存", exact: true }).first().click();
  const sourceDownload = await sourceDownloadPromise;
  expect(sourceDownload.suggestedFilename()).toBe("サンプル.md");
});

test.describe("English and Japanese locales", () => {
  test.use({ locale: "en-US" });

  test("uses the browser locale, switches language, localizes the sample and Core diagnostics", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.getByRole("heading", { name: "Open a Docfilly document" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByRole("button", { name: "Open sample" }).click();
    await expect(page.getByLabel("Project name")).toBeVisible();
    await expect(page.getByText("docfilly-tutorial.md")).toBeVisible();
    await page.getByLabel("Project name").fill("Atlas");

    await page.getByLabel("Language").selectOption("ja");
    await expect(page.getByRole("navigation", { name: "文書操作" })).toBeVisible();
    await expect(page.getByLabel("Project name")).toHaveValue("Atlas");
    await expect(page.getByRole("heading", { name: "Atlas five-minute tutorial" })).toBeVisible();
    await expect(page.getByText("docfilly-tutorial.md")).toBeVisible();
    await expect(page.getByLabel("プロジェクト名")).toHaveCount(0);
    await page.getByLabel("言語").selectOption("en");

    await page.getByLabel("Open file").setInputFiles({
      name: "warning.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("#!docfilly\nbroken setting\n---\nBody"),
    });
    await page.getByRole("button", { name: "Diagnostics (1)", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Document diagnostics (1)" })).toContainText(
      "Line 2 was skipped as a setting",
    );
    await page.keyboard.press("Escape");

    await page.getByLabel("Language").selectOption("ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.getByRole("navigation", { name: "文書操作" })).toBeVisible();
    await page.getByRole("button", { name: "診断 1件", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "文書の診断（1件）" })).toContainText(
      "2行目は「=」がないため",
    );
  });
});
