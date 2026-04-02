import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, Box, Brain, Layers, Heart, Shield, Infinity } from 'lucide-react'
import './index.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucideIcon = any

interface Product {
  id: string
  name: string
  chinese: string
  icon: LucideIcon
  tagline: string
  tech: string
  description: string
  gradient: string
  accent: string
  glowClass: string
}

const products: Product[] = [
  {
    id: 'soulpod',
    name: 'Memory · Soulpod',
    chinese: '灵犀',
    icon: Brain,
    tagline: '对话复刻',
    tech: 'LLM + 角色人格解耦',
    description: '通过聊天记录提取人格特征，实现与思念之人跨越时空的实时对话与情感共鸣。',
    gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    accent: '#4a7cff',
    glowClass: 'glow-blue',
  },
  {
    id: 'verse',
    name: 'Memory · Verse',
    chinese: '境象',
    icon: Box,
    tagline: '空间复刻',
    tech: '3DGS (Gaussian Splatting)',
    description: '记录并重构那些承载情感的"梦核时刻"，打造身临其境的沉浸式空间回忆。',
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
    accent: '#8b5cf6',
    glowClass: '',
  },
  {
    id: 'trace',
    name: 'Memory · Trace',
    chinese: '溯源 / 栖居',
    icon: Layers,
    tagline: '角色复刻',
    tech: '开源 Agent + RAG',
    description: '通过开源技能库精准还原特定角色的行为逻辑，让灵魂在数字躯壳中重新"栖居"。',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    accent: '#10b981',
    glowClass: '',
  },
  {
    id: 'sculpt',
    name: 'Memory · Sculpt',
    chinese: '塑影',
    icon: Sparkles,
    tagline: '物理重塑',
    tech: 'AIGC 图转 3D + 3D 打印',
    description: '将平面照片转化为风格化的 Q 版 3D 场景，让虚幻的回忆拥有可以触摸的质量与温度。',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    accent: '#d4a853',
    glowClass: 'glow-gold',
  },
]

interface Value {
  icon: LucideIcon
  title: string
  text: string
}

const values: Value[] = [
  {
    icon: Heart,
    title: '情感真实性',
    text: '不追求完美的替代品，而追求灵魂特征的精准提取，保留最独特的"神韵"。',
  },
  {
    icon: Infinity,
    title: '跨维度连接',
    text: '从文本对话（1D）到空间漫游（3D），再到物理实体，全方位包裹感知。',
  },
  {
    icon: Shield,
    title: '隐私与伦理',
    text: '记忆是绝对私有的资产。坚持本地化存储与极高规格加密，确保记忆只属于拥有它的人。',
  },
]

function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const navigate = (newIndex: number) => {
    setDirection(newIndex > activeIndex ? 1 : -1)
    setActiveIndex(newIndex)
  }

  const prev = () => navigate(activeIndex === 0 ? products.length - 1 : activeIndex - 1)
  const next = () => navigate(activeIndex === products.length - 1 ? 0 : activeIndex + 1)

  const product = products[activeIndex]
  const Icon = product.icon

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d < 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
  }

  return (
    <div className="grain min-h-screen">
      {/* Hero */}
      <header className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 text-center max-w-4xl"
        >
          {/* Brand mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-8 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[var(--silver-dim)]/30 bg-white/[0.03] backdrop-blur-sm"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse" />
            <span className="text-sm tracking-[0.3em] text-[var(--silver)] uppercase">Memory Series</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
            <span className="block bg-gradient-to-r from-[var(--text-primary)] via-[var(--silver)] to-[var(--text-primary)] bg-clip-text text-transparent">
              定格 · 复刻
            </span>
            <span className="block bg-gradient-to-r from-[var(--gold)] via-[var(--gold-glow)] to-[var(--gold)] bg-clip-text text-transparent">
              回忆 · 重塑
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mb-12"
          >
            让思念不再只是单向的消耗，而是双向的奔赴。
            <br className="hidden md:block" />
            在数字与物理的交界处，构建一座跨越时空的情感避难所。
          </motion.p>

          <motion.a
            href="#products"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[var(--gold)]/20 to-[var(--gold)]/5 border border-[var(--gold)]/30 text-[var(--gold)] hover:border-[var(--gold)]/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,168,83,0.15)]"
          >
            探索产品
            <ChevronRight className="w-4 h-4" />
          </motion.a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border border-[var(--silver-dim)]/30 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-[var(--silver)]"
            />
          </div>
        </motion.div>
      </header>

      {/* Products Section */}
      <section id="products" className="relative py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="text-sm tracking-[0.2em] text-[var(--gold)] uppercase mb-4 block">Product Matrix</span>
            <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">四维记忆</h2>
            <p className="mt-4 text-[var(--text-secondary)]">从对话到实体，全方位重构你的珍贵回忆</p>
          </motion.div>

          {/* Product Tabs */}
          <div className="flex justify-center gap-2 md:gap-4 mb-12 flex-wrap">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(i)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-300 border ${
                  i === activeIndex
                    ? 'bg-white/[0.08] border-[var(--silver)]/30 text-[var(--text-primary)]'
                    : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.chinese}
              </button>
            ))}
          </div>

          {/* Product Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)]">
            <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} pointer-events-none`} />

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={product.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="relative z-10 p-8 md:p-16"
              >
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  {/* Left: Info */}
                  <div>
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border"
                      style={{
                        background: `${product.accent}10`,
                        borderColor: `${product.accent}30`,
                      }}
                    >
                      <Icon className="w-8 h-8" style={{ color: product.accent }} />
                    </div>

                    <div className="flex items-baseline gap-3 mb-2">
                      <h3 className="text-2xl md:text-4xl font-bold text-[var(--text-primary)]">
                        {product.chinese}
                      </h3>
                      <span className="text-sm text-[var(--text-secondary)]">{product.name}</span>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium border"
                        style={{
                          background: `${product.accent}15`,
                          borderColor: `${product.accent}30`,
                          color: product.accent,
                        }}
                      >
                        {product.tagline}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] font-mono">{product.tech}</span>
                    </div>

                    <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Right: Visual */}
                  <div className="flex items-center justify-center">
                    <div className={`relative w-64 h-64 md:w-80 md:h-80 rounded-3xl flex items-center justify-center ${product.glowClass}`}>
                      {/* Concentric rings */}
                      <div className="absolute inset-0 rounded-3xl border border-white/[0.04]" />
                      <div className="absolute inset-4 rounded-2xl border border-white/[0.06]" />
                      <div className="absolute inset-8 rounded-xl border border-white/[0.08]" />
                      <div className="absolute inset-12 rounded-lg border border-white/[0.10]" />

                      {/* Center icon */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                        className="absolute inset-16 rounded-full border border-dashed"
                        style={{ borderColor: `${product.accent}25` }}
                      />
                      <Icon className="w-16 h-16 relative z-10" style={{ color: product.accent }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-[var(--silver)] hover:bg-white/[0.1] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-[var(--silver)] hover:bg-white/[0.1] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex justify-center gap-2 pb-6 relative z-10">
              {products.map((_, i) => (
                <button
                  key={i}
                  onClick={() => navigate(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? 'w-8 bg-[var(--gold)]' : 'w-1.5 bg-[var(--silver-dim)]/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="text-sm tracking-[0.2em] text-[var(--gold)] uppercase mb-4 block">Core Values</span>
            <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">品牌信仰</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => {
              const VIcon = v.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className="p-8 rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] hover:border-white/[0.12] transition-colors duration-300"
                >
                  <VIcon className="w-6 h-6 text-[var(--gold)] mb-4" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{v.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{v.text}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />
            <span className="text-sm text-[var(--silver)] tracking-widest uppercase">Memory Series</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            让遗忘不再是记忆的终点
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
