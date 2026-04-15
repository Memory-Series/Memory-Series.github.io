/*
Memory Series Visual System (file reminder)
- Design movement: Cinematic Tech-Noir Minimalism
- Core: deep-space void, silver precision, warm-gold emotional spark
- Spatial: generous negative space, sharp typography, thin lines, subtle glow

This module centralizes product copy + structure so:
- homepage product switching stays harmonious
- product detail pages stay consistent
*/

export type ProductKey = "soulpod" | "verse" | "trace" | "sculpt" | "fluffydiary";

export interface ProductInfo {
  key: ProductKey;
  name: string;
  cnName: string;
  shortLine: string;

  heroTitle: string;
  heroSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;

  definitionTitle: string;
  definitionBody: string;

  valueTitle: string;
  valueBullets: { title: string; body: string }[];

  experienceTitle: string;
  experienceBody: string;

  techTitle: string;
  techBody: string;

  scenariosTitle: string;
  scenarios: { title: string; body: string }[];

  closing: string;
  oneLiner: string;
}

export const PRODUCTS: ProductInfo[] = [
  {
    key: "trace",
    name: "Memory · Trace / Inhabit",
    cnName: "寻迹/入心",
    shortLine: "以行为逻辑与角色能力为核心，延展数字生命的表达边界。",
    heroTitle: "让存在感，不止停留在记忆里。",
    heroSubtitle:
      "Memory · Trace / Inhabit 以行为逻辑、角色能力与知识结构为核心，探索数字生命更长期、更持续的存在方式。",
    ctaPrimary: "了解 Trace / Inhabit",
    ctaSecondary: "查看应用方式",
    definitionTitle: "一个面向数字生命的角色入口。",
    definitionBody:
      "当我们谈论一个人时，真正构成其独特性的，往往不只是外貌或语言，而是他如何判断、如何回应、如何处理问题、如何与世界发生关系。\n\nTrace / Inhabit 关注的，正是这些更深层的行为逻辑与角色特征。它尝试让数字化表达不止停留在“像某个人”，而更接近“以某种方式持续存在”。\n\n在 Trace / Inhabit 中，数字角色不仅具有被描述的身份，还具备被理解、被调用、被持续交互的能力。",
    valueTitle: "让角色能力成为记忆延续的一种方式。",
    valueBullets: [
      {
        title: "保留行为逻辑，而不只是人物印象",
        body: "关注思考路径、回应方式、决策偏好与能力结构，让数字角色具备更稳定的存在感。",
      },
      {
        title: "让数字角色具备持续性",
        body: "当角色不仅能够被展示，还能够行动、响应与完成任务时，数字生命不再只是概念，而成为一种可被长期使用的形式。",
      },
      {
        title: "以结构化方式承载人物特质",
        body: "强调角色边界、能力来源与行为一致性，让数字存在更可信、更可持续。",
      },
    ],
    experienceTitle: "从角色信息出发，构建可持续存在的数字能力体。",
    experienceBody:
      "Trace / Inhabit 通过对人物资料、行为线索、知识内容与能力边界的组织，形成一个既保有人物特征、又具备行动能力的数字角色结构。\n\n在此基础上，数字角色可以在稳定设定之下进行回应、执行任务、调用知识或延续某种特定的互动方式。\n\n重点不在于“扮演”一个角色，而在于让角色的行为逻辑、能力结构与存在方式获得更长期的数字化延展。",
    techTitle: "以 Agent 架构与知识能力结合为基础。",
    techBody:
      "Trace / Inhabit 的技术基础围绕 Agent 架构、知识增强与角色行为建模展开。它关注的不只是单次对话效果，而是角色设定、任务能力、知识调用与长期交互中的一致性。\n\n这使它不只是一个角色模拟系统，而是一个更接近“保留并延展某种存在方式”的数字生命接口。",
    scenariosTitle: "适用于那些希望让角色持续存在并发挥作用的人。",
    scenarios: [
      { title: "人物能力的数字延展", body: "用于让某个人的思考方式、知识结构与处理问题的方法获得更长期的数字化保留。" },
      { title: "角色型数字陪伴与交互", body: "用于构建具有稳定设定与持续回应能力的数字角色，延展人与角色之间的长期关系。" },
      { title: "面向特定任务的数字角色系统", body: "用于让角色不只被观看或对话，而能够承担特定知识、流程与执行任务。" },
    ],
    closing:
      "Trace / Inhabit 不是为了制造一个表面上相似的角色，而是为了让那些真正构成一个人存在感的行为逻辑、能力结构与回应方式，被更长期地保留下来并继续发挥作用。",
    oneLiner: "Memory · Trace / Inhabit 让行为逻辑与角色能力，以更持续的数字生命形式继续存在。",
  },
];

export const PRODUCT_BY_KEY = PRODUCTS.reduce<Record<ProductKey, ProductInfo>>((acc, p) => {
  acc[p.key] = p;
  return acc;
}, {} as Record<ProductKey, ProductInfo>);
