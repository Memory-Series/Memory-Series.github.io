#!/usr/bin/env node
/**
 * 部署期合成 persona → `server/personas/<charKey>.json`。
 *
 * 用法：
 *   node scripts/build-chat-personas.mjs [--src <Trace-Inhabit 根目录>] [--out <输出目录>]
 *   或设 `SOULPOD_SRC`（与 `--src` 等价）
 *
 * 为什么是**部署期**而不是构建期：
 *   - 生成物不进公开仓库（`server/personas/` 在 `.gitignore` 里）——
 *     既不在公开仓库里重复一份第三方 prompt 文本，也避免源更新后静默过期；
 *   - 构建期做的话，`vite build` 就会依赖兄弟仓库存在，而 CI（GitHub 侧）
 *     根本没有那个仓库。部署期生成则 CI 完全不受影响。
 *
 * 幂等：同一份源跑两次，产物逐字节相同（除了 `generatedAt`）。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CHAR_KEY_BY_NAME } from "../server/lib/personas.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** 源目录候选：先看显式指定的，再退回同机兄弟仓库的默认位置。 */
const DEFAULT_SRC_CANDIDATES = [
  "G:/Memory-Series/Trace-Inhabit",
  join(REPO_ROOT, "..", "Trace-Inhabit"),
];

function parseArgs(argv) {
  const out = { src: process.env.SOULPOD_SRC || "", dest: join(REPO_ROOT, "server", "personas") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--src") out.src = argv[i + 1] ?? "";
    else if (argv[i] === "--out") out.dest = argv[i + 1] ?? out.dest;
  }
  return out;
}

/**
 * 读文本文件并 trim。缺失/为空都抛错 —— 一个角色的 prompt 是空的，
 * 合成出来的 system 就只剩尾注，模型会用一个"没有设定"的身份说话，
 * 而这件事在界面上看起来完全正常（还是会回复），必须在这里就拦住。
 */
function readRequired(file, label) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    throw new Error(`${label} 读不到：${file}`);
  }
  const text = raw.trim();
  if (text === "") throw new Error(`${label} 是空文件：${file}`);
  return text;
}

function main() {
  const { src, dest } = parseArgs(process.argv.slice(2));

  const candidates = src ? [src] : DEFAULT_SRC_CANDIDATES;
  const root = candidates.find((c) => {
    try {
      readFileSync(join(c, "inhabit", "personas", "叶修", "prompt", "universal_prompt.txt"), "utf8");
      return true;
    } catch {
      return false;
    }
  });
  if (!root) {
    process.stderr.write(
      `[personas] 找不到源仓库。试过：\n${candidates.map((c) => "  " + c).join("\n")}\n` +
        `请用 --src <路径> 或环境变量 SOULPOD_SRC 指定 Trace-Inhabit 的根目录。\n`,
    );
    process.exit(1);
  }

  const personasRoot = join(root, "inhabit", "personas");
  mkdirSync(dest, { recursive: true });

  const summary = [];
  for (const [name, charKey] of Object.entries(CHAR_KEY_BY_NAME)) {
    const dir = join(personasRoot, name);
    const sourceDir = `Trace-Inhabit/inhabit/personas/${name}`;
    const body = {
      charKey,
      name,
      source: sourceDir,
      generatedAt: new Date().toISOString(),
      universalPrompt: readRequired(join(dir, "prompt", "universal_prompt.txt"), `${name} universal_prompt`),
      storyBaseline: readRequired(join(dir, "prompt", "story_baseline.txt"), `${name} story_baseline`),
      // `params` 只作**溯源记录**，运行时不采纳 —— 真正的温度/长度取服务端环境变量
      // （见 spec §7.4：源 config.json 里 provider 写的是 openrouter，不能照搬）。
      params: readSourceParams(join(dir, "config.json")),
      // 示例对话（`sample_message_user` / `sample_message_ai`）。一期留空：
      // 好的示例要靠人工打磨，凑数的示例会把风格带偏，不如不给。
      samples: [],
    };

    const file = join(dest, `${charKey}.json`);
    writeFileSync(file, JSON.stringify(body, null, 2) + "\n", "utf8");
    summary.push({ charKey, name, bytes: Buffer.byteLength(body.universalPrompt) + Buffer.byteLength(body.storyBaseline) });
  }

  process.stdout.write(`[personas] 源：${root}\n[personas] 输出：${dest}\n`);
  for (const s of summary) {
    process.stdout.write(`  ${s.charKey.padEnd(12)} ${s.name}  prompt ${s.bytes} B\n`);
  }
  process.stdout.write(`[personas] 完成，共 ${summary.length} 个角色。\n`);
}

/** 读源 config.json 的 model_preference，只取少量字段做溯源。读不到不算错误。 */
function readSourceParams(file) {
  try {
    const cfg = JSON.parse(readFileSync(file, "utf8"));
    const pref = cfg?.model_preference ?? {};
    return {
      temperature: typeof pref.temperature === "number" ? pref.temperature : null,
      maxTokens: typeof pref.max_tokens === "number" ? pref.max_tokens : null,
      sourceProvider: typeof pref.provider === "string" ? pref.provider : null,
    };
  } catch {
    return { temperature: null, maxTokens: null, sourceProvider: null };
  }
}

main();
