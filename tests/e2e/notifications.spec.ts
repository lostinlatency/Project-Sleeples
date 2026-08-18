import { expect, test } from "@playwright/test";

test("an incoming MSN message appears as an XP notification and opens the chat", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase("project-sleepless");
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.reload();
  const notification = page.getByTestId("msn-notification-sleepless_17");
  await expect(notification).toBeVisible({ timeout: 10_000 });
  await expect(notification).toContainText("sent you a message");
  await notification.getByRole("button").last().click();
  await expect(
    page.getByText("You have started a conversation with sleepless_17."),
  ).toBeVisible();
  await expect(notification).not.toBeVisible();
});
