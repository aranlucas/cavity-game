import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("treat a visit, bank a sticker, meet Leo and restore the saved visit", async ({
  app,
  browser,
  screen,
}) => {
  await app.open("/");
  await expect(screen.getByRole("button", "Approach the patient chair")).toBeVisible();
  // Follow the chair's collision boundary using the documented walking controls.
  await browser.keyboard.down("w");
  await expect(screen.getByRole("button", "Begin treatment")).toBeEnabled({ timeout: 180_000 });
  await browser.keyboard.up("w");
  await screen.getByRole("button", "Begin treatment").tap();
  const stages = [
    ["Dental mirror", "Look closely", "A fresh start"],
    ["Polisher", "A fresh start", "Gentle little passes"],
    ["Precision bur", "Gentle little passes", "Make it whole"],
    ["Composite", "Make it whole", "The finishing glow"],
    ["Curing light", "The finishing glow", "One happier smile."],
  ];
  for (const [instrument, current, next] of stages) {
    await expect(screen.getByRole("heading", current)).toBeVisible();
    await screen.getByRole("button", instrument, { exact: true }).tap();
    const first = screen.getByRole("button", "Treat spot 1");
    await first.focus();
    await browser.keyboard.down("Space");
    await expect(first).toBeDisabled();
    await browser.keyboard.up("Space");
    const second = screen.getByRole("button", "Treat spot 2");
    await second.focus();
    await browser.keyboard.down("Space");
    await expect(screen.getByRole("heading", next)).toBeVisible();
    await browser.keyboard.up("Space");
  }
  await expect(screen.getByText("Mia earned the Cosmic explorer sticker.")).toBeVisible();
  await screen.getByRole("button", "Meet your next patient").tap();
  await expect(screen.getByRole("heading", "Leo", { level: 1 })).toBeVisible();
  await screen.getByRole("button", "Pause and controls").tap();
  await screen.getByRole("button", "Sound on").tap();
  await expect
    .poll(() =>
      browser.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem("little-smiles:clinic:v1") ?? "null");
        return (
          saved && {
            patient: saved.appointment.patient,
            stickers: saved.appointment.stickers,
            sound: saved.sound,
          }
        );
      }),
    )
    .toEqual({ patient: 1, stickers: [0], sound: false });
  await browser.reload();
  await expect(screen.getByRole("heading", "Leo", { level: 1 })).toBeVisible();
  await screen.getByRole("button", "Pause and controls").tap();
  await expect(screen.getByRole("button", "Sound off")).toBeVisible();
  await screen.getByText("Clinic day & sticker collection", { exact: true }).tap();
  await screen.getByRole("button", "Start new day", { exact: true }).tap();
  await expect(screen.getByRole("heading", "Mia", { level: 1 })).toBeVisible();
  await expect(screen.getByText("Day 2", { exact: true })).toBeVisible();
});

test("corrupt saves and denied writes leave the menu usable and report unsaved progress", async ({
  app,
  browser,
  screen,
}) => {
  await browser.addInitScript(() => {
    if (location.origin !== "http://127.0.0.1:5173") return;
    localStorage.setItem("little-smiles:clinic:v1", "{broken");
    Storage.prototype.setItem = () => {
      throw new DOMException("Test quota", "QuotaExceededError");
    };
  });
  await app.open("/");
  await expect(screen.getByRole("heading", "Mia", { level: 1 })).toBeVisible();
  await screen.getByRole("button", "Pause and controls").tap();
  await expect(
    screen.getByText("Saving is unavailable in this browser", { exact: false }),
  ).toBeVisible();
  await screen.getByRole("button", "Sound on").tap();
  await expect(screen.getByRole("button", "Sound off")).toBeVisible();
  await screen.getByRole("button", "Back to the clinic", { exact: false }).tap();
  await expect(screen.getByRole("dialog")).toBeHidden();
});
