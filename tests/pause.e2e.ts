import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("holding Escape pauses once until a new physical press", async ({ app, browser, screen }) => {
  await app.open("/");
  await expect(screen.getByRole("button", "Approach the patient chair")).toBeVisible();
  await browser.keyboard.down("Escape");
  await expect(screen.getByRole("dialog")).toBeVisible();
  // Playwright down on an already held key produces an auto-repeat keydown.
  await browser.keyboard.down("Escape");
  await expect(screen.getByRole("dialog")).toBeVisible();
  await browser.keyboard.up("Escape");
  await browser.keyboard.press("Escape");
  await expect(screen.getByRole("dialog")).toBeHidden();
});
