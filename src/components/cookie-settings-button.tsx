"use client";
import { COOKIE_SETTINGS_EVENT } from "@/lib/cookie-consent";
import { Button } from "@/components/ui/button";
export function CookieSettingsButton() {
  return <Button id="cookie-settings" type="button" variant="secondary" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>Настройки cookie</Button>;
}
