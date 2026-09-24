import { describe, expect, it } from "vitest";

import { toBlobPart } from "@/lib/bytes";
import { formatBytes } from "@/lib/device-assets";

describe("toBlobPart", () => {
  it("原样返回同一个视图：不拷贝、字节不变", () => {
    // 这个函数存在的唯一理由是给 TS 5.7 的类型收窄让路（Uint8Array 现在带
    // 后备存储类型参数，DOM 的 BlobPart 只接受普通 ArrayBuffer 上的视图）。
    // 所以"零拷贝"正是它的契约，值得钉住 —— 一旦有人改成复制，编码器会静默变慢。
    const bytes = new Uint8Array([1, 2, 3, 255]);
    const part = toBlobPart(bytes);
    expect(part).toBe(bytes);
    expect(Array.from(part as Uint8Array)).toEqual([1, 2, 3, 255]);
  });
});

describe("formatBytes", () => {
  it("B / KB / MB 三档", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });

  it("档位边界（1024 进一位，1024² 换单位）", () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe("1024.0 KB");
    expect(formatBytes(8 * 1024 * 1024)).toBe("8.00 MB");
  });

  it("设备真实体积的显示口径", () => {
    // 这两个数字是用户在素材面板上会直接对照的：一帧主屏动画、一张对话底图。
    expect(formatBytes(388812)).toBe("379.7 KB");
    expect(formatBytes(509244)).toBe("497.3 KB");
  });
});
