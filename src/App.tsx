import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Brain, Box, Layers, Sparkles, Heart, Shield, Infinity, ChevronRight, ArrowRight } from 'lucide-react'
import './index.css'

const products = [
  {
    id: 'soulpod',
    name: 'Memory · Soulpod',
    chinese: '灵犀',
    icon: Brain,
    tagline: '对话复刻',
    tech: 'LLM + 角色人格解耦',
    description: '通过聊天记录提取人格特征，实现与思念之人跨越时空的实时对话与情感共鸣。',
    accent: '#4a7cff',
    gradient: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a0e1a 100%)',
  },
  {
    id: 'verse',
    name: 'Memory · Verse',
    chinese: '境象',
    icon: Box,
    tagline: '空间复刻',
    tech: '3D Gaussian Splatting',
    description: '记录并重构那些承载情感的"梦核时刻"，打造身临其境的沉浸式空间回忆。',
    accent: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #120a28 0%, #1a0d3c 50%, #0e0a1a 100%)',
  },
  {
    id: 'trace',
    name: 'Memory · Trace',
    chinese: '溯源',
    icon: Layers,
    tagline: '角色复刻',
    tech: '开源 Agent + RAG',
    description: '通过开源技能库精准还原特定角色的行为逻辑，让灵魂在数字躯壳中重新"栖居"。',
    accent: '#10b981',
    gradient: 'linear-gradient(135deg, #0a1a14 0%, #0d281c 50%, #0a0e12 100%)',
  },
  {
    id: 'sculpt',
    name: 'Memory · Sculpt',
    chinese: '塑影',
    icon: Sparkles,
    tagline: '物理重塑',
    tech: 'AIGC 图转 3D + 3D 打印',
    description: '将平面照片转化为风格化的 Q 版 3D 场景，让虚幻的回忆拥有可以触摸的质量与温度。',
    accent: '#d4a853',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #281c0a 50%, #120e08 100%)',
  },
]

const stats = [
  { value: '4', label: '核心产品', suffix: ' 款' },
  { value: '1D → 3D', label: '跨维度复刻', suffix: '' },
  { value: '100%', label: '隐私优先', suffix: '' },
]

const values = [
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

function ProductCard({ product, index }: { product: typeof products[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const Icon = product.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/[0.15] transition-all duration-500"
      style={{ background: product.gradient }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${product.accent}12 0%, transparent 70%)` }}
      />
      <div className="relative z-10 p-6 lg:p-8 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
            style={{ background: `${product.accent}10`, borderColor: `${product.accent}25` }}
          >
            <Icon className="w-5 h-5" style={{ color: product.accent }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{product.chinese}</h3>
            <span className="text-xs text-[var(--text-secondary)]">{product.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
            style={{ background: `${product.accent}12`, borderColor: `${product.accent}25`, color: product.accent }}
          >
            {product.tagline}
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-mono truncate">{product.tech}</span>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="mt-5 flex items-center gap-1 text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          了解更多 <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  )
}

function App() {
  const [activeProduct, setActiveProduct] = useState(0)
  const statsRef = useRef(null)
  const statsInView = useInView(statsRef, { once: true })

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveProduct(prev => (prev + 1) % products.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const featured = products[activeProduct]
  const FeaturedIcon = featured.icon

  return (
    <div className="grain min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[var(--bg-deep)]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--gold)] to-[var(--gold-glow)] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[var(--bg-deep)]">M</span>
            </div>
            <span className="text-sm font-semibold tracking-wider text-[var(--text-primary)]">MEMORY SERIES</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#products" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">产品</a>
            <a href="#matrix" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">矩阵</a>
            <a href="#values" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">理念</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative min-h-[85vh] flex items-center justify-center px-6 pt-14">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
            className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[140px]"
            style={{ background: `${featured.accent}06` }}
          />
          <motion.div
            animate={{ x: [0, -15, 0], y: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
            className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] rounded-full blur-[120px]"
            style={{ background: 'rgba(212, 168, 83, 0.03)' }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/[0.04]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            <span className="text-[11px] tracking-[0.2em] text-[var(--gold)] uppercase">Memory Series</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-5"
          >
            <span className="block bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-primary)]/60 bg-clip-text text-transparent">
              定格 · 复刻
            </span>
            <span className="block bg-gradient-to-r from-[var(--gold)] via-[var(--gold-glow)] to-[var(--gold)] bg-clip-text text-transparent">
              回忆 · 重塑
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-sm md:text-base text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed mb-8"
          >
            让思念不再只是单向的消耗，而是双向的奔赴。
            <br />在数字与物理的交界处，构建跨越时空的情感避难所。
          </motion.p>

          <motion.a
            href="#products"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all text-sm"
          >
            探索产品 <ChevronRight className="w-3.5 h-3.5" />
          </motion.a>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border border-[var(--silver-dim)]/25 flex justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 rounded-full bg-[var(--silver)]/50" />
          </motion.div>
        </motion.div>
      </header>

      {/* Featured Product */}
      <section id="products" className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3"
          >
            <span className="text-[11px] tracking-[0.2em] text-[var(--gold)] uppercase">Featured Product</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] mb-10"
          >
            全栈记忆矩阵
          </motion.h2>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: featured.gradient }}>
            <motion.div
              key={featured.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="p-6 md:p-10 lg:p-12"
            >
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border"
                    style={{ background: `${featured.accent}10`, borderColor: `${featured.accent}25` }}
                  >
                    <FeaturedIcon className="w-6 h-6" style={{ color: featured.accent }} />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{featured.chinese}</h3>
                    <span className="text-sm text-[var(--text-secondary)]">{featured.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                      style={{ background: `${featured.accent}12`, borderColor: `${featured.accent}25`, color: featured.accent }}
                    >
                      {featured.tagline}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">{featured.tech}</span>
                  </div>
                  <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed max-w-sm">
                    {featured.description}
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48 md:w-56 md:h-56">
                    {[0, 1, 2, 3].map(i => (
                      <motion.div
                        key={i}
                        animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                        transition={{ repeat: Infinity, duration: 20 + i * 5, ease: 'linear' }}
                        className="absolute rounded-full border border-dashed"
                        style={{ inset: `${i * 18}%`, borderColor: `${featured.accent}18` }}
                      />
                    ))}
                    <div className="absolute inset-[28%] rounded-full flex items-center justify-center" style={{ background: `${featured.accent}08` }}>
                      <FeaturedIcon className="w-10 h-10 md:w-12 md:h-12" style={{ color: featured.accent }} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex border-t border-white/[0.06]">
              {products.map((p, i) => {
                const PIcon = p.icon
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveProduct(i)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs transition-all border-r border-white/[0.04] last:border-r-0 ${
                      i === activeProduct
                        ? 'bg-white/[0.06] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.02]'
                    }`}
                  >
                    <PIcon className="w-3.5 h-3.5" style={{ color: i === activeProduct ? p.accent : undefined }} />
                    <span className="hidden sm:inline">{p.chinese}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section id="matrix" className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3"
          >
            <span className="text-[11px] tracking-[0.2em] text-[var(--gold)] uppercase">Product Matrix</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] mb-10"
          >
            AI 产品矩阵
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="py-16 md:py-20 px-6 border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] mb-1">
                  {s.value}
                  <span className="text-base md:text-lg text-[var(--text-secondary)]">{s.suffix}</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="values" className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3"
          >
            <span className="text-[11px] tracking-[0.2em] text-[var(--gold)] uppercase">Core Values</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] mb-10"
          >
            品牌信仰
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-4 lg:gap-5">
            {values.map((v, i) => {
              const VIcon = v.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="p-6 rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] hover:border-white/[0.12] transition-colors"
                >
                  <VIcon className="w-5 h-5 text-[var(--gold)] mb-4" />
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{v.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{v.text}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] mb-4"
          >
            让遗忘不再是{' '}
            <span className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-glow)] bg-clip-text text-transparent">
              记忆的终点
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-sm text-[var(--text-secondary)] mb-6"
          >
            通过重塑每一个无法释怀的瞬间，让生命以另一种更有温度的形态延续。
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-[var(--gold)] to-[var(--gold-glow)] flex items-center justify-center">
              <span className="text-[8px] font-bold text-[var(--bg-deep)]">M</span>
            </div>
            <span className="text-xs tracking-wider text-[var(--silver)] uppercase">Memory Series</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            © 2026 Memory Series. 定格 · 复刻 · 回忆 · 重塑
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
