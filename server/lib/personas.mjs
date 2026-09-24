// @ts-check
/**
 * persona 装载与 `system` 组装（闸 1 的另一半）。
 *
 * 职责边界：本模块**只从磁盘读**，从不生成内容。persona 文件由
 * `scripts/build-chat-personas.mjs` 在部署期从兄弟仓库（Trace-Inhabit）合成，
 * 生成物本身不进公开仓库（见 §7.3 —— 既不在公开仓库里重复第三方 prompt 文本，
 * 也避免源更新后静默过期）。
 */

/**
 * 固定在尾部的附加约束。与 `universal_prompt.txt` 里已有的约束一致，
 * **不新增风格要求**，只是把「网页端更紧的长度上限」再说一次。
 *
 * 为什么由服务端硬编码而不是塞进 persona 文件：这条约束是**接口契约的一部分**
 * （200 tokens 的预算决定了回复不能长），不该由一份可能过期的生成物决定。
 */
export const TRAILING_NOTE = [
  "以中文回复。",
  "不使用括号、动作描写或旁白。",
  "不主动换行分段。",
  "单次回复不超过 120 字。",
].join("");

/**
 * 按 §7.2 的顺序拼 `system`：universal_prompt + story_baseline + 固定尾注。
 *
 * 字段名与 `scripts/build-chat-personas.mjs` 的产物一一对应 —— 两边用同一个名字
 * 是有意的，改一处忘一处的话，症状是"角色回复完全没有设定"（尾注还在，所以
 * 看起来仍像个正常回复），得逐字对比才能发现。
 *
 * @param {{ universalPrompt?: string, storyBaseline?: string }} persona
 * @returns {string}
 */
export function buildSystem(persona) {
  return [persona.universalPrompt, persona.storyBaseline, TRAILING_NOTE]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 把角色名映射成 `charKey`。生成脚本与运行时共用这一张表 ——
 * 两处各写一份的话，加角色时必然漏掉一处，而症状是"某个角色永远 400"，
 * 排查起来要翻到部署环节才发现。
 */
export const CHAR_KEY_BY_NAME = {
  叶修: "ye-xiu",
  夏以昼: "xia-yizhou",
  秦彻: "qin-che",
};

/**
 * 从内存表构造 `isKnownCharKey`。做成"注入"而不是让 `limits.mjs` 直接读目录 ——
 * 校验逻辑因此不需要 IO，测试可以直接传一个假的判定函数。
 *
 * @param {Map<string, unknown>} table
 * @returns {(key: string) => boolean}
 */
export function makeCharKeyChecker(table) {
  return (key) => table.has(key);
}
