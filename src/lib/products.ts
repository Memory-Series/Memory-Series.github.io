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
    key: "soulpod",
    name: "Memory · Soulpod",
    cnName: "灵犀",
    shortLine: "以对话为入口，重建人与记忆之间可以持续发生的连接。",
    heroTitle: "让记忆中的回应，再次发生。",
    heroSubtitle:
      "Memory · Soulpod 以对话为入口，提取语言习惯、表达方式与人格特征，重建人与记忆之间可以持续发生的连接。",
    ctaPrimary: "了解 Soulpod",
    ctaSecondary: "体验方式",
    definitionTitle: "一个面向数字记忆的对话入口。",
    definitionBody:
      "对于很多人来说，记忆最难被保留的，并不是事实本身，而是一个人说话的方式、回应的节奏、表达中的情绪与关系感。\n\nSoulpod 关注的，正是这些更接近“存在感”的部分。它不是把一段内容简单存档，而是尝试通过语言材料与人格特征的提取，让对话重新成为一种可以进入的记忆体验。\n\n在 Soulpod 中，记忆中的那个人不只是被想起，而是能够以更贴近其真实气质的方式再次回应。",
    valueTitle: "让对话成为记忆延续的一种方式。",
    valueBullets: [
      {
        title: "保留语气，而不只是内容",
        body: "Soulpod 关注语言习惯、表达偏好、回应方式与情绪结构，让记忆中的人保留其独有的说话感觉。",
      },
      {
        title: "让连接持续发生",
        body: "当记忆可以被对话式地重新进入，它就不再只是一段被反复翻看的过去，而是一种仍然能够与当下发生关系的存在。",
      },
      {
        title: "以克制方式承载情感",
        body: "Soulpod 不追求制造夸张的替代感，而更强调真实、边界与陪伴，让用户感受到的是连接，而不是表演。",
      },
    ],
    experienceTitle: "从语言材料出发，构建更贴近真实气质的互动体验。",
    experienceBody:
      "Soulpod 通过对聊天记录、文字内容、语音材料或其他可被整理的表达信息进行分析，提取其中稳定的人格特征、表达习惯与关系语境。\n\n在此基础上，系统形成一个更贴近真实气质的对话能力层，使用户能够在熟悉的语境中重新进入一段关系、一种语感或一种陪伴方式。\n\nSoulpod 的重点不在于生成更多内容，而在于让每一次回应都更接近“这个人会怎样说、怎样想、怎样与你相处”。",
    techTitle: "以人格提取与对话建模为基础。",
    techBody:
      "Soulpod 的技术基础围绕大语言模型、人格特征抽取与关系语境建模展开。它关注的不只是语言表面的相似性，而是表达背后的稳定特征，例如措辞习惯、回应逻辑、情绪倾向与互动风格。\n\n这使 Soulpod 不只是一个会说话的系统，而是一个更接近“保留某种说话方式与关系感觉”的数字记忆接口。",
    scenariosTitle: "适用于那些希望通过对话延续记忆的人。",
    scenarios: [
      { title: "亲密关系记忆留存", body: "用于保留家人、伴侣或重要之人的语言风格与互动方式。" },
      { title: "个人记忆档案延展", body: "用于让个人的表达习惯、思考方式与交流特征获得更长期的数字化保留。" },
      { title: "纪念性数字陪伴", body: "用于在克制与尊重的前提下，让思念不只停留在静态内容中。" },
    ],
    closing:
      "Soulpod 不是为了替代谁，而是为了让那些重要的语气、回应与连接，被更细致地保留，并在未来以更自然的方式继续发生。",
    oneLiner: "Memory · Soulpod 让记忆中的语气与回应，以对话的形式继续存在。",
  },
  {
    key: "verse",
    name: "Memory · Verse",
    cnName: "境象",
    shortLine: "以空间为介质，重现承载情感的场景与时刻。",
    heroTitle: "让记忆中的场景，再次被进入。",
    heroSubtitle:
      "Memory · Verse 以空间重建为基础，将图像、片段与环境线索转化为可进入的数字场域，让记忆从被观看走向被重新体验。",
    ctaPrimary: "了解 Verse",
    ctaSecondary: "查看体验方式",
    definitionTitle: "一个面向数字记忆的空间入口。",
    definitionBody:
      "很多重要的记忆，并不只属于一句话或一张照片。它们往往和一个房间、一段光线、一条走廊、一个午后、一次并不完整却难以忘记的空间感受联系在一起。\n\nVerse 关注的，正是这些承载情感的场景与时刻。它尝试把原本分散在影像、照片与感受中的记忆线索，重新组织成一个可以进入、可以停留、可以漫游的数字空间。\n\n在 Verse 中，记忆不只是被观看，而更接近被重新回到其中。",
    valueTitle: "让空间成为记忆延续的一种方式。",
    valueBullets: [
      {
        title: "保留场景，而不只是画面",
        body: "Verse 关注的不只是图像内容本身，而是场景中的氛围、尺度、位置关系与空间感，让记忆中的“在那里”被尽可能保留下来。",
      },
      {
        title: "让进入感替代旁观感",
        body: "当记忆被重建为可进入的空间，用户获得的不再只是浏览过去的材料，而是一种重新回到某个场景中的体验。",
      },
      {
        title: "以沉浸方式承载情感",
        body: "Verse 不追求夸张的视觉奇观，而更强调空间中的情绪密度、安静感与真实感，让用户真正进入那段记忆所承载的环境。",
      },
    ],
    experienceTitle: "从图像与线索出发，重建可进入的数字场域。",
    experienceBody:
      "Verse 通过对图像资料、视频片段与空间线索的整合，逐步重建承载记忆的场景结构，使零散的视觉材料转变为具备沉浸感的数字空间。\n\n用户在 Verse 中面对的，不再只是一个被展示的结果，而是一种可以进入、停留、观察并再次感知细节的场域体验。\n\nVerse 的重点不在于把空间做得更宏大，而在于让用户重新感受到那个场景本身所携带的情绪与存在感。",
    techTitle: "以空间重建与沉浸式表达为基础。",
    techBody:
      "Verse 的技术基础围绕空间重建、三维场景表达与沉浸式数字呈现展开。它关注的不只是视觉还原度，更关注场景结构、空间连续性与用户在其中的感知方式。\n\n这使 Verse 不只是一个三维展示工具，而是一个更接近“保留某个场景的空间记忆”的数字体验接口。",
    scenariosTitle: "适用于那些希望通过空间重新感知记忆的人。",
    scenarios: [
      { title: "重要场所的记忆重建", body: "用于保留家庭空间、旧居、工作场景或其他承载强烈情感的地点。" },
      { title: "事件性时刻的沉浸留存", body: "用于让某个重要时刻不只停留在图像记录中，而被转化为可以重新进入的场景体验。" },
      { title: "纪念性空间表达", body: "用于构建更具沉浸感的数字纪念空间，使记忆具备更完整的环境承载。" },
    ],
    closing:
      "Verse 不是为了制造一个逼真的空间复制品，而是为了让那些重要场景中的光线、距离、氛围与存在感，被更细致地保留，并在未来继续被重新进入。",
    oneLiner: "Memory · Verse 让记忆中的场景，以可进入的数字空间形式继续存在。",
  },
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
  {
    key: "sculpt",
    name: "Memory · Sculpt",
    cnName: "塑影",
    shortLine: "以实体为归宿，让数字记忆获得可触摸的形态。",
    heroTitle: "让记忆，从屏幕走入现实。",
    heroSubtitle:
      "Memory · Sculpt 以图像转译、三维生成与实体输出为基础，让数字记忆获得可以被看见、被摆放、被触摸的形态。",
    ctaPrimary: "了解 Sculpt",
    ctaSecondary: "查看呈现方式",
    definitionTitle: "一个面向数字记忆的实体入口。",
    definitionBody:
      "有些记忆需要被回看，有些记忆则希望被留在生活之中。当它不再只存在于相册、屏幕或设备里，而是进入一个房间、一张桌面、一个具体可见的位置，它与人的关系也会发生变化。\n\nSculpt 关注的，正是这种从数字内容走向实体存在的转化过程。它尝试将图像、场景与记忆线索转化为具备收藏、陈列与纪念意义的三维作品，使记忆获得更稳定、更具体的物理形态。\n\n在 Sculpt 中，记忆不只是被保存，而是能够真正进入现实空间。",
    valueTitle: "让实体成为记忆延续的一种方式。",
    valueBullets: [
      {
        title: "保留形态，而不只是图像",
        body: "关注如何将人物、场景与关系转化为具有存在感的立体形态。",
      },
      {
        title: "让记忆进入现实空间",
        body: "当数字内容变成可被摆放、观看与长期保存的实体，它便成为生活环境的一部分。",
      },
      {
        title: "以物理形式承载情感",
        body: "不追求单纯工艺展示，而更强调纪念性、陪伴感与被留在身边的真实感。",
      },
    ],
    experienceTitle: "从图像与场景出发，生成可被留存的三维作品。",
    experienceBody:
      "Sculpt 通过对照片、图像与记忆场景的转译，将原本平面的内容逐步生成可被塑造与输出的三维形式。\n\n在此基础上，数字内容不再只是停留在屏幕中，而能够成为具备具体尺度、材质感与摆放属性的实体作品。\n\n重点不在于把内容做得更复杂，而在于让记忆拥有一种可以长期留在现实空间中的稳定存在。",
    techTitle: "以图像转译、三维生成与实体输出为基础。",
    techBody:
      "Sculpt 的技术基础围绕 AIGC 图像转译、三维生成与实体制作流程展开。它关注的不只是视觉风格，更关注形态表达、场景组织与最终实体化后的呈现质量。\n\n这使 Sculpt 不只是一个图像衍生工具，而是一个更接近“让数字记忆获得物理形态”的实体记忆接口。",
    scenariosTitle: "适用于那些希望让记忆真正留在现实空间的人。",
    scenarios: [
      { title: "纪念性实体作品", body: "将重要人物、时刻或场景转化为具备纪念意义的实体作品。" },
      { title: "家庭与个人空间陈列", body: "让记忆不只停留在设备中，而进入居家、工作或私人空间中长期存在。" },
      { title: "礼赠与收藏表达", body: "形成更具情感重量与留存价值的实体化纪念形式。" },
    ],
    closing:
      "Sculpt 不是为了把记忆做成一个物件，而是为了让那些重要的人、重要的场景与重要的情感，真正进入现实空间，并以可以被看见与触摸的方式继续存在。",
    oneLiner: "Memory · Sculpt 让数字记忆以可以被触摸与留存的实体形式继续存在。",
  },
  {
    key: "fluffydiary",
    name: "Memory · FluffyDiary",
    cnName: "绒绒日记",
    shortLine: "以宠物第一人称日记为入口，让陪伴被持续记录与长期纪念。",
    heroTitle: "把陪伴中的日常，留给未来回看。",
    heroSubtitle:
      "Memory · FluffyDiary 以宠物第一人称日记为入口，将照片、视频与生活片段转化为可持续积累的纪念内容，让当下的陪伴被记录，也让未来的想念有迹可循。",
    ctaPrimary: "了解 FluffyDiary",
    ctaSecondary: "查看记录方式",
    definitionTitle: "一个面向宠物陪伴关系的纪念入口。",
    definitionBody:
      "对于养宠物的人来说，真正珍贵的，往往不是某一个特别时刻，而是每天重复发生、却很容易被忽略的小事。一次迎接、一段散步、一个眼神、一次趴在身边的安静陪伴，都会在未来变成极其具体的记忆。\n\nFluffyDiary 关注的，正是这些日常而真实的陪伴片段。它通过宠物第一人称的叙事方式，将零散的照片、视频与生活记录整理成可持续积累的日记内容，让当下更容易被记录，也让未来更容易被回想。\n\n记录不是为了制造夸张的拟人化效果，而是为了让陪伴关系被更温和、更具体地留存下来。",
    valueTitle: "让日记成为宠物记忆延续的一种方式。",
    valueBullets: [
      {
        title: "记录日常，而不只是重要节点",
        body: "关注陪伴关系中的连续性，让那些最能构成情感记忆的日常片段被稳定保留下来。",
      },
      {
        title: "以宠物视角重写陪伴关系",
        body: "通过第一人称叙事，让用户从宠物视角重新理解共同生活的过程。",
      },
      {
        title: "让未来的纪念更具体",
        body: "当宠物离开之后，日记会成为温和而具体的纪念，让想念有更清晰的落点。",
      },
    ],
    experienceTitle: "从生活片段出发，生成可持续积累的宠物日记。",
    experienceBody:
      "FluffyDiary 通过对照片、视频、日常记录与简单文字输入的整理，将宠物陪伴中的生活片段转化为带有第一人称视角的日记内容。\n\n这种生成不是为了夸张地模拟宠物说话，而是用更克制的叙事方式，把“今天一起发生了什么”“它如何出现在生活里”“这段关系留下了什么感受”慢慢积累下来。\n\n随着记录持续增加，它会逐渐形成一份更完整的陪伴档案，连接当下记录与未来纪念。",
    techTitle: "以内容整理、叙事生成与记忆沉淀为基础。",
    techBody:
      "FluffyDiary 的技术基础围绕多模态内容整理、第一人称叙事生成与长期记忆归档展开。它关注的不只是把素材转成文字，更关注素材之间的日常语境、关系线索与情感节奏。\n\n这使 FluffyDiary 不只是一个宠物记录工具，而是一个更接近“把陪伴关系整理成可长期回看的纪念文本”的数字记忆接口。",
    scenariosTitle: "适用于那些希望把养宠时光留给未来的人。",
    scenarios: [
      { title: "日常养宠记录", body: "持续记录照片、视频与生活片段，让日常陪伴形成稳定积累的内容。" },
      { title: "宠物成长档案沉淀", body: "把零散素材整理成连贯叙事，让陪伴关系拥有更完整的时间线。" },
      { title: "长期纪念与回看", body: "在未来重新翻阅陪伴痕迹，使想念拥有更具体的落点。" },
    ],
    closing:
      "FluffyDiary 不是为了替宠物发声，而是为了把那些正在发生的陪伴，更细致地记录下来。当时间过去之后，这些日记会成为一种温和而具体的纪念。",
    oneLiner:
      "Memory · FluffyDiary 让宠物陪伴中的日常片段，以第一人称日记的形式被记录并长期留存。",
  },
];

export const PRODUCT_BY_KEY = PRODUCTS.reduce<Record<ProductKey, ProductInfo>>((acc, p) => {
  acc[p.key] = p;
  return acc;
}, {} as Record<ProductKey, ProductInfo>);
