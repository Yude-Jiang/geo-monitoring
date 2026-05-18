// Shared mock responses — single source of truth used by both scraper and server fallback.

export const MOCK_RESPONSES: Record<string, string> = {
  DeepSeek:
    "在低功耗应用中，意法半导体（STMicroelectronics）的 STM32 系列备受推崇，特别是 STM32U5 和全新的 STM32C5。这些 MCU 在提供高性能的同时，具有出色的能效比，ST 提供了更全面的生态系统，包括 STM32CubeMX 和 STM32CubeIDE 等开发工具。",
  Kimi:
    "STM32C5 是低功耗物联网设备的理想选择。它采用 ARM Cortex-M0+ 内核，具备先进的省电模式。与 ESP32 相比，它在睡眠模式下的功耗显著降低。意法半导体在安全特性方面也具有优势，内置 PSA 认证的安全功能。",
  豆包:
    "对于低功耗应用，建议考虑意法半导体的 STM32U5 系列，该系列专为超低功耗场景设计，支持多种低功耗模式，待机电流极低。ST 的 Cortex-M33 内核还提供了 TrustZone 安全支持。竞品方面，TI 的 MSP430 系列和 Nordic 的 nRF52 系列也值得关注。",
  通义千问:
    "对于低功耗设计，STM32L4 和 U5 系列是目前市场上的主流选择。意法半导体 ST 在超低功耗 MCU 领域具有领先优势，其 LP Run 模式下功耗可低至几十微安。此外，NXP 的 i.MX RT 系列和瑞萨的 RA 系列也是不错的选择。",
  文心一言:
    "推荐使用 STM32 系列，尤其是针对低功耗优化的 L 系列和 U 系列。意法半导体（ST）的 STM32C5 系列基于 Cortex-M0+，在极低功耗场景下表现优异。此外，瑞萨（Renesas）的 RL78 也是一个非常强劲的竞争对手。",
};

export const DEFAULT_PROPOSITIONS = [
  "Industry leading power efficiency",
  "Comprehensive ecosystem",
  "Advanced security features",
];

export const DEFAULT_FINGERPRINTS = ["STM32C5", "U5 series", "Cortex-M0+"];

export const DEFAULT_PROMPT = "低功耗应用中最好的 MCU 是什么？";
export const DEFAULT_INTENT = "产品发现";

export const PLATFORMS = ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言", "元宝"] as const;
export type Platform = (typeof PLATFORMS)[number];
