import { describe, expect, it } from "vitest";

import { DIALOGUE_BG_BYTES } from "@/lib/device-assets";
import { BOOT_EAF_READ_MAX, bootBudget } from "@/lib/eaf-encoder";
import {
  MAIN_ANIM_ASSUMED_FREE_PSRAM,
  MAIN_ANIM_CACHE_HEADROOM,
  MAIN_ANIM_FPS,
  MAIN_ANIM_FRAME_READ_MAX,
  MAIN_ANIM_MAX_FRAMES,
  MAIN_ANIM_SIZE,
  expectedMainAnimFrameBytes,
  frameBudget,
  frameFileName,
} from "@/lib/main-anim-encoder";

/**
 * 这两个预算是"用户看到金色警告还是红色错误"的唯一依据，所以值得钉住：
 * 主屏超预算**不是**失败（固件会退到 SD 流式播放），开机超 8 MB 才是硬失败
 * （放不下就整段不播、且没有任何提示）。两者的语义差别比数值更容易改错。
 */

const BYTES_PER_FRAME_360 = 12 + 360 * 360 * 3; // 388,812

const CACHEABLE_360 = Math.floor(
  (MAIN_ANIM_ASSUMED_FREE_PSRAM - MAIN_ANIM_CACHE_HEADROOM) / BYTES_PER_FRAME_360,
);

describe("expectedMainAnimFrameBytes", () => {
  it("360² 每帧恒 388,812 B（12 B 头 + w×h×3）", () => {
    expect(expectedMainAnimFrameBytes(360)).toBe(388812);
    expect(expectedMainAnimFrameBytes(MAIN_ANIM_SIZE)).toBe(388812);
  });

  it("默认尺寸就是主屏尺寸", () => {
    expect(expectedMainAnimFrameBytes()).toBe(expectedMainAnimFrameBytes(MAIN_ANIM_SIZE));
  });

  it("412² 算出来正好等于对话底图的固定体积（两套格式同构）", () => {
    // 主屏帧与对话底图是两个模块各自实现的格式，但都是"12 B 头 + RGB565A8"。
    // 钉住这个同构关系：哪天有人只改了一边的布局，这里会先响。
    expect(expectedMainAnimFrameBytes(412)).toBe(DIALOGUE_BG_BYTES);
  });
});

describe("frameBudget（主屏：超预算只降级，不拒绝）", () => {
  it("360² 的 PSRAM 全额预载上限是 14 帧", () => {
    expect(CACHEABLE_360).toBe(14);
    expect(frameBudget(1).cacheableFrames).toBe(14);
  });

  it("14 帧以内 = cacheable / ok", () => {
    const b = frameBudget(14);
    expect(b.tier).toBe("cacheable");
    expect(b.reasonKey).toBe("ok");
    expect(b.bytesPerFrame).toBe(388812);
    expect(b.totalBytes).toBe(388812 * 14);
  });

  it("超过 14 帧只降级为 streaming —— 设备照样能播，界面上该是金色不是红色", () => {
    const b = frameBudget(15);
    expect(b.tier).toBe("streaming");
    expect(b.reasonKey).toBe("streaming");
    expect(b.totalBytes).toBe(388812 * 15);
  });

  it("512 帧是允许的上限，513 帧才拒绝", () => {
    expect(frameBudget(MAIN_ANIM_MAX_FRAMES).tier).toBe("streaming");
    const over = frameBudget(MAIN_ANIM_MAX_FRAMES + 1);
    expect(over.tier).toBe("rejected");
    expect(over.reasonKey).toBe("tooManyFrames");
  });

  it("单帧超过 512 KB 的读取上限 → rejected / frameTooLarge", () => {
    expect(frameBudget(1, 360).tier).toBe("cacheable");
    const huge = frameBudget(1, 420); // 420² 一帧 529,212 B > 512 KB
    expect(huge.bytesPerFrame).toBeGreaterThan(MAIN_ANIM_FRAME_READ_MAX);
    expect(huge.tier).toBe("rejected");
    expect(huge.reasonKey).toBe("frameTooLarge");
  });

  it("时长按固定 24 FPS 折算（GIF 自身的帧延时会被忽略）", () => {
    expect(frameBudget(MAIN_ANIM_FPS).durationSeconds).toBe(1);
    expect(frameBudget(12).durationSeconds).toBe(0.5);
  });

  it("0 帧不炸", () => {
    const b = frameBudget(0);
    expect(b.totalBytes).toBe(0);
    expect(b.durationSeconds).toBe(0);
    expect(b.tier).toBe("cacheable");
  });

  it("总字节数始终等于单帧 × 帧数", () => {
    for (const n of [0, 1, 7, 14, 15, 512]) {
      expect(frameBudget(n).totalBytes).toBe(expectedMainAnimFrameBytes(360) * n);
    }
  });
});

describe("bootBudget（开机：8 MB 是硬上限，没有降级路径）", () => {
  it("恰好 8 MB 通过，多 1 字节就不通过", () => {
    expect(BOOT_EAF_READ_MAX).toBe(8 * 1024 * 1024);
    expect(bootBudget(BOOT_EAF_READ_MAX, 24).withinLimit).toBe(true);
    expect(bootBudget(BOOT_EAF_READ_MAX + 1, 24).withinLimit).toBe(false);
  });

  it("时长同样按 24 FPS 折算", () => {
    expect(bootBudget(1024, 24).durationSeconds).toBe(1);
  });

  it("与主屏预算的语义差别：主屏超限仍可播，开机超限直接失败", () => {
    expect(frameBudget(200).tier).toBe("streaming"); // 远超 PSRAM 缓存预算，但能播
    expect(bootBudget(BOOT_EAF_READ_MAX * 2, 24).withinLimit).toBe(false); // 直接不行
  });

  it("原样回传输入，不做二次解释", () => {
    const b = bootBudget(12345, 7);
    expect(b.totalBytes).toBe(12345);
    expect(b.frameCount).toBe(7);
  });
});

describe("frameFileName", () => {
  it("零填充 3 位，与固件按 %lu 排序的结果一致", () => {
    expect(frameFileName(0)).toBe("frame_000.bin");
    expect(frameFileName(7)).toBe("frame_007.bin");
    expect(frameFileName(512)).toBe("frame_512.bin");
  });

  it("宽度可覆盖", () => {
    expect(frameFileName(7, 5)).toBe("frame_00007.bin");
  });
});
