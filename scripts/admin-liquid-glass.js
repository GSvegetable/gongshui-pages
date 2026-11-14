import { injectLiquidGlassFilter } from "../vendor/liquid-glass/core.js";

function initAdminLiquidGlass() {
  injectLiquidGlassFilter({
    scales: [-135, -131, -127],
    saturate: 1.2,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminLiquidGlass, { once: true });
} else {
  initAdminLiquidGlass();
}
