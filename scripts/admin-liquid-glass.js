/* Admin Liquid Glass — powered by the locally vendored Vitrio renderer.
 * The renderer refracts a pixel-aligned clone of the real .sheet scene. It does
 * not depend on backdrop-filter:url(), which is ignored by WebKit and some shells.
 */
(() => {
  "use strict";

  function initAdminLiquidGlass() {
    const LiquidGlass = window.LiquidGlass;
    const scene = document.querySelector(".sheet");
    const anchors = [
      document.querySelector(".topbar .brand"),
      document.querySelector(".topbar .admin-email"),
      document.querySelector(".topbar #sign-out")
    ].filter(Boolean);

    if (typeof LiquidGlass !== "function" || !scene || !anchors.length) {
      document.documentElement.dataset.liquidGlass = "unavailable";
      console.error("[admin-glass] Renderer or scene is unavailable.");
      return;
    }

    const instances = [];
    for (const anchor of anchors) {
      const glass = new LiquidGlass({
        background: scene,
        attachTo: anchor,
        attachPadding: 0,
        draggable: false,
        zIndex: 80,
        radius: 999,
        scale: 18,
        depth: 13,
        curvature: 2.25,
        convexity: 1,
        chroma: 0.035,
        blur: 0,
        glow: 0.16,
        edge: 0.72,
        specAngle: 135,
        tint: 0.035,
        tintColor: "#ffffff",
        liteMotion: "auto"
      });
      instances.push(glass);
      anchor.dataset.liquidGlass = "active";
    }

    document.documentElement.dataset.liquidGlass = "active";
    window.addEventListener("pagehide", () => {
      for (const glass of instances) glass.destroy();
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminLiquidGlass, { once: true });
  } else {
    initAdminLiquidGlass();
  }
})();
