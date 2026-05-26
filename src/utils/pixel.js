/**
 * utils/pixel.js — Wrapper seguro para Meta Pixel (SellerSystem)
 *
 * - trackEvent: eventos custom de Ventaz (fbq "trackCustom")
 * - trackStdEvent: eventos estándar de Meta como Login, CompleteRegistration (fbq "track")
 *
 * Ambas funciones chequean que fbq esté disponible antes de llamar,
 * evitando errores en dev o con ad blockers.
 */

export function trackEvent(eventName, params = {}) {
  if (typeof fbq === "undefined") return;
  fbq("trackCustom", eventName, params);
}

export function trackStdEvent(eventName, params = {}) {
  if (typeof fbq === "undefined") return;
  fbq("track", eventName, params);
}
