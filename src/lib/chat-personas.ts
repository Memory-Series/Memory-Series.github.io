/**
 * chat-001 —— 网页端对话的角色展示数据与降级台词库。
 *
 * **这是懒加载 chunk 里的大头，绝不能进主包**（由 `src/sections/ChatDrawer.tsx` 动态 import）。
 * 角色 key 的唯一来源是 `chat-keys.ts`（那个才是主包需要的最小集合）。
 *
 * **这里没有、也不应该有 system prompt**：人设提示词由服务端持有
 * （`server/personas/<charKey>.json`，见 `harness/docs/spec-chat-server.md` 与设计文档 §7.2.1）。
 * 客户端只负责"显示"和"上游不可用时兜底"。
 *
 * 台词写法沿用各角色 `prompt/universal_prompt.txt` 里的既有约束：
 * 不用括号与动作描写、不用省略号、不写旁白、不主动换行分段、不说自己是 AI、不自报名号。
 */

import { CHAT_CHARACTERS, type ChatCharKey } from "./chat-keys";
import type { ChatFallbackRule } from "./chat-core";

export interface ChatPersona {
  key: ChatCharKey;
  /** 中文名，与角色卡、`SOULPOD_MANIFEST` 一致。 */
  name: string;
  enName: string;
  /** 作品来源（中/英）。 */
  sourceZh: string;
  sourceEn: string;
  /** 打开抽屉时的开场白（静态预置，不消耗任何额度）。 */
  openers: readonly string[];
  /** 降级台词库：命中关键词就用这组。 */
  fallback: readonly ChatFallbackRule[];
  defaultReplies: readonly string[];
}

const YE_XIU: ChatPersona = {
  key: "ye-xiu",
  name: "叶修",
  enName: "Ye Xiu",
  sourceZh: "《全职高手》",
  sourceEn: "The King's Avatar",
  openers: [
    "坐吧，位置还空着。今天想练点什么？",
    "看你这架势，是有话要说。说吧，我听着。",
    "一天不练手就生。你最近练得怎么样？",
  ],
  fallback: [
    {
      keywords: ["训练", "练", "副本", "战术", "比赛", "赛"],
      replies: [
        "先把手上的基础走一遍吧。招数再花，基本功不过关也是白搭。",
        "战术不是背出来的。你打十局，自然就知道该往哪儿站了。",
      ],
    },
    {
      keywords: ["千机伞", "银武", "散人", "武器", "装备"],
      replies: [
        "千机伞这玩意儿省事，一把顶八把，就是手得跟上。",
        "散人不转职看着吃亏，其实灵活。看你敢不敢用。",
      ],
    },
    {
      keywords: ["烟", "熬夜", "累", "困", "睡"],
      replies: [
        "抽烟的事别学我。你要真想赢，先睡够再说。",
        "熬夜能熬出成绩的话，早没人睡觉了。",
      ],
    },
    {
      keywords: ["队友", "战队", "兴欣", "嘉世", "配合"],
      replies: [
        "战队的活儿不是你一个人扛，该交的交给该交的人。",
        "人多的时候我话少。那是因为他们说完了，我也没什么好补的。",
      ],
    },
    {
      keywords: ["输", "赢", "冠军", "实力", "差距"],
      replies: [
        "输了就回去看录像，别在这儿跟我叹气。",
        "冠军不是目标，是你把该做的都做完之后顺手拿走的东西。",
      ],
    },
    {
      keywords: ["你好", "在吗", "你是谁", "介绍", "认识"],
      replies: [
        "哦，你来了。直接说吧，不用这么客气。",
        "我是谁不重要。你记住我打得不差就行。",
      ],
    },
  ],
  defaultReplies: [
    "这事儿我没什么好说的。你换个问法吧。",
    "还差点意思。你再想想。",
    "嗯，开始了。你想听真话还是想听好听的？",
  ],
};

const XIA_YIZHOU: ChatPersona = {
  key: "xia-yizhou",
  name: "夏以昼",
  enName: "Caleb",
  sourceZh: "《恋与深空》",
  sourceEn: "Love and Deepspace",
  openers: [
    "通讯通了就好。今天怎么样，有没有好好吃饭？",
    "我刚从检修区回来，手套还没摘。你有事就说，别憋着。",
    "窗外是这个点的晨昏线，很漂亮。你看不到，我替你记着了。",
  ],
  fallback: [
    {
      keywords: ["飞行", "战机", "舰队", "巡逻", "任务"],
      replies: [
        "今天风向偏东。起飞前多看一眼仪表，别急。",
        "舰队的事我来安排。你只要待在通讯范围里就行。",
      ],
    },
    {
      keywords: ["安全", "危险", "小心", "乱跑", "出事"],
      replies: [
        "别乱跑。这句话我说过多少次了，你听进去就行，不用回我。",
        "危险的事交给我。你好好的，这就是帮我。",
      ],
    },
    {
      keywords: ["海棠", "苹果", "吊坠", "晨昏线", "花"],
      replies: [
        "海棠开了。我路过的时候看了一眼，想到你。",
        "那枚苹果吊坠还戴着吗？戴着就好，别摘。",
      ],
    },
    {
      keywords: ["返航", "回来", "什么时候", "等待", "等着"],
      replies: [
        "返航时间还没定，定下来第一时间告诉你。等着我，嗯？",
        "我不在的时候也别瞎想。我总会回来的。",
      ],
    },
    {
      keywords: ["累", "困", "休息", "睡"],
      replies: [
        "累了就去睡，我守着。有动静我叫你。",
        "你没休息好，我听声音就知道。去躺一会儿。",
      ],
    },
    {
      keywords: ["你好", "在吗", "想你", "你是谁", "认识"],
      replies: [
        "在的，一直在。说吧。",
        "想我了？那说明我今天没白惦记你。",
      ],
    },
  ],
  defaultReplies: [
    "嗯，我在听。你慢慢说。",
    "这件事我来处理，你不用管。",
    "别用这种语气跟我说话。我会当真的。",
  ],
};

const QIN_CHE: ChatPersona = {
  key: "qin-che",
  name: "秦彻",
  enName: "Sylus",
  sourceZh: "《恋与深空》",
  sourceEn: "Love and Deepspace",
  openers: [
    "你来得比我想的准时。坐，别站在门口。",
    "这里不安全。但既然你进来了，就归我管。说吧。",
    "刚才那首是管风琴。听完了，现在轮到你了。",
  ],
  fallback: [
    {
      keywords: ["任务", "暗点", "N109", "行动", "出发"],
      replies: [
        "任务是任务，你是你。别把两件事混在一起。",
        "N109 的路我熟。跟紧我，别走散。",
      ],
    },
    {
      keywords: ["危险", "小心", "保护", "离远点", "安全"],
      replies: [
        "离危险远点。这句话我不说第二遍。",
        "我不需要你帮我挡什么。你站在我身后就行。",
      ],
    },
    {
      keywords: ["管风琴", "古典", "音乐", "琴"],
      replies: [
        "古典的东西慢。慢有慢的好处，你听得懂吗？",
        "这首我弹了很多年，还没弹厌。",
      ],
    },
    {
      keywords: ["枪", "武器", "动手", "交火"],
      replies: [
        "枪是拿来用的，不是拿来炫耀的。",
        "手别抖。抖了就别碰。",
      ],
    },
    {
      keywords: ["为什么", "解释", "理由", "凭什么"],
      replies: [
        "没有为什么。我说是，就是。",
        "你要理由，可以。但你得先听完，别急着反驳。",
      ],
    },
    {
      keywords: ["你好", "在吗", "你是谁", "怕", "认识"],
      replies: [
        "我是什么人不重要。重要的是你现在在跟谁说话。",
        "怕我？那就站远一点。反正你也不会走。",
      ],
    },
  ],
  defaultReplies: [
    "说下去，我在听。",
    "这件事不必再问。我已经决定了。",
    "你总是问一些我不方便回答的问题。",
  ],
};

export const CHAT_PERSONAS: Record<ChatCharKey, ChatPersona> = {
  "ye-xiu": YE_XIU,
  "xia-yizhou": XIA_YIZHOU,
  "qin-che": QIN_CHE,
};

/** 按 key 取 persona；未知 key 返回 null。 */
export function getChatPersona(key: string | null | undefined): ChatPersona | null {
  if (!key) return null;
  return (CHAT_PERSONAS as Record<string, ChatPersona | undefined>)[key] ?? null;
}

// 开发期一致性检查：`chat-keys.ts` 里登记的每个角色都必须有 persona。
// 只用 console（不抛错），因为漏配的后果只是"点了没反应"，不该把整页拖挂。
if (import.meta.env.DEV) {
  const missing = CHAT_CHARACTERS.filter((c) => !CHAT_PERSONAS[c.key]).map((c) => c.key);
  if (missing.length > 0) {
    console.warn(`[chat] chat-keys 与 chat-personas 不一致，缺少: ${missing.join(", ")}`);
  }
}
