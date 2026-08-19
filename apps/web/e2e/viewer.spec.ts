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

test("空状態から組み込みサンプルを開き、フォーム値を本文へ反映できる", async ({ page }) => {
  await openSample(page);

  const author = page.getByLabel("作成者");
  await author.fill("鈴木花子");

  await expect(page.getByText("鈴木花子", { exact: true })).toBeVisible();
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

test("ヘルプをキーボードで閉じると起点へフォーカスが戻る", async ({ page }) => {
  await page.goto("./");
  const helpButton = page.getByRole("button", { name: "ヘルプ", exact: true }).first();
  await expect(helpButton).toBeVisible();
  await helpButton.click();

  const dialog = page.getByRole("dialog", { name: "Docfillyの使い方" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(helpButton).toBeFocused();
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
