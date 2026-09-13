/** FAQ 排障条目定义（硬件页）。

 *  步骤数量与 i18n 键一一对应：sections.faq.items.<id>.step1..stepN。
 *  内容只写本仓库已实测或固件侧已确认的事实，不推测。
 */
export interface DeviceFaqItem {
  id: string;
  stepCount: number;
}

export const DEVICE_FAQ_ITEMS: readonly DeviceFaqItem[] = [
  { id: "flashFail", stepCount: 4 },
  { id: "deviceNotDetected", stepCount: 4 },
  { id: "soulpodImport", stepCount: 4 },
  { id: "bootAnimation", stepCount: 3 },
];
