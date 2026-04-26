import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/pages/landing.css';

export default function LandingPage() {
  return (
    <div
      className="bg-[#FEF3C7] font-sans text-[#4B5563] min-h-screen antialiased selection:bg-[#FDA4AF] selection:text-white"
      style={{ fontFamily: "'Quicksand', 'Inter', sans-serif" }}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-md rounded-full px-8 py-4 landing-bubbly-shadow border border-[#D1FAE5]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#FDA4AF] rounded-2xl flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">deployed_code</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#065F46]">Lucid Lab</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-semibold">
            <a className="hover:text-[#FDA4AF] transition-colors" href="#features">Features</a>
            <a className="hover:text-[#FDA4AF] transition-colors" href="#curriculum">Curriculum</a>
            <a className="hover:text-[#FDA4AF] transition-colors" href="#pricing">Pricing</a>
          </div>
          <Link to="/register" className="bg-[#065F46] text-white px-6 py-2.5 rounded-full font-bold landing-bubbly-button">
            Try for Free
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-24 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <span className="inline-block px-4 py-1.5 bg-[#D1FAE5] text-[#065F46] rounded-full font-bold text-sm uppercase tracking-wider">
                The Future of Learning
              </span>
              <h1 className="text-5xl lg:text-7xl font-bold text-[#065F46] leading-tight">
                Education You Can <span className="text-[#FDA4AF]">Step Inside.</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Transform your classroom into an interactive 3D laboratory with Augmented Reality. Engagement like never before.
              </p>
              <div className="flex justify-center lg:justify-start">
                <Link to="/register" className="bg-[#FDA4AF] text-white px-10 py-5 rounded-full text-xl font-bold landing-bubbly-shadow landing-bubbly-button">
                  Start Your Journey
                </Link>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative flex justify-center items-center lg:h-[600px]">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FDA4AF]/20 rounded-full blur-[80px] animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#BFDBFE]/30 rounded-full blur-[100px]"></div>
              <div className="relative z-10 landing-animate-float group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#065F46]/10 to-transparent rounded-[4rem] -rotate-3 scale-105 blur-sm"></div>
                <img
                  alt="Immersive 3D AR Solar System Learning"
                  className="relative rounded-[3.5rem] landing-bubbly-shadow border-[12px] border-white object-cover w-full h-full max-w-2xl"
                  // src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtMT1nbd8gnFRg_2LTyuBMhEVWegF-h11gHVXVAt6SDUo_xSTGLOkOY-82kcwtv1nLFV3R9Zm0vziTtsx_I6U_byMKirqzB7EIx2aokIDTH6Xwwkym8JabTnV2CQQMzOAfyeQdIt5Es1gC6ZUKPcQKoIPkM7JrM4DP1-oe4llbBwg3onEm6gTVnjkteI2b7luwXogazydk_yMBEqcuY6B4F22-OJzOMs6YpdK-IqyvnkDyzZkdQMZ_kzxtb7JHftSHI5GzXOHJkCVW"
                  src="/landing.png"
                />
                <div className="absolute -top-8 -left-8 bg-white/90 backdrop-blur-md p-5 rounded-[2rem] landing-bubbly-shadow border border-[#D1FAE5]/30 animate-bounce flex items-center justify-center text-3xl" style={{ animationDuration: '4.5s' }}>
                  <span className="drop-shadow-sm">🪐</span>
                </div>
                <div className="absolute top-1/4 -right-10 bg-white/90 backdrop-blur-md p-4 rounded-[1.5rem] landing-bubbly-shadow border border-[#FDA4AF]/30 landing-animate-float text-2xl" style={{ animationDuration: '5.5s', animationDelay: '1s' }}>
                  <span className="drop-shadow-sm">✨</span>
                </div>
                <div className="absolute -bottom-6 right-10 bg-white/90 backdrop-blur-md p-5 rounded-[2rem] landing-bubbly-shadow border border-[#BFDBFE]/30 animate-bounce flex items-center justify-center text-3xl" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                  <span className="drop-shadow-sm">🧬</span>
                </div>
                <div className="absolute bottom-8 -left-12 bg-[#065F46] text-white px-6 py-4 rounded-3xl landing-bubbly-shadow border-4 border-white hidden md:block rotate-[-5deg]">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#D1FAE5] rounded-full animate-ping"></div>
                    <span className="font-bold text-sm tracking-wide uppercase">Live AR Lab</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-20 bg-white/40 backdrop-blur-sm overflow-hidden border-y border-[#D1FAE5]/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-lg font-bold text-[#065F46]/60 uppercase tracking-[0.2em]">Empowering the World&apos;s Leading Institutions</h2>
            </div>
            <div className="relative overflow-hidden">
              <div className="flex w-max whitespace-nowrap landing-animate-scroll items-center gap-20">
                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-12 h-12 bg-red-800 rounded-lg flex items-center justify-center text-white font-bold text-2xl group-hover:bg-red-700">S</div>
                  <span className="text-2xl font-serif font-semibold text-slate-800">Stanford University</span>
                </div>
                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-black">MIT</div>
                  <span className="text-2xl font-sans font-bold text-slate-800 uppercase tracking-tighter">Massachusetts Institute of Tech</span>
                </div>
                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-blue-800">O</div>
                  <span className="text-2xl font-serif font-bold text-slate-800 italic">University of Oxford</span>
                </div>
                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-12 h-12 bg-red-900 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-red-800">H</div>
                  <span className="text-2xl font-serif font-black text-slate-800">HARVARD</span>
                </div>

                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-12 h-12 bg-red-800 rounded-lg flex items-center justify-center text-white font-bold text-2xl">S</div>
                  <span className="text-2xl font-serif font-semibold text-slate-800">Stanford University</span>
                </div>
                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold text-xl">MIT</div>
                  <span className="text-2xl font-sans font-bold text-slate-800 uppercase tracking-tighter">Massachusetts Institute of Tech</span>
                </div>
                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">O</div>
                  <span className="text-2xl font-serif font-bold text-slate-800 italic">University of Oxford</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 bg-white" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-[#065F46]">Learning Reimagined</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">Our tools are built specifically for curious minds and modern educators.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-[#D1FAE5] p-8 rounded-[2rem] border-2 border-transparent hover:border-[#065F46]/10 transition-all text-center group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform">🥽</div>
                <h3 className="text-xl font-bold text-[#065F46] mb-3">Immersive Learning</h3>
                <p className="text-gray-600">Step inside history, biology, and space with full 3D immersion.</p>
              </div>
              <div className="bg-[#BFDBFE] p-8 rounded-[2rem] border-2 border-transparent hover:border-[#065F46]/10 transition-all text-center group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform">📚</div>
                <h3 className="text-xl font-bold text-[#065F46] mb-3">Curriculum Ready</h3>
                <p className="text-gray-600">Aligned with global standards for K-12 and Higher Education.</p>
              </div>
              <div className="bg-[#FDA4AF]/20 p-8 rounded-[2rem] border-2 border-transparent hover:border-[#065F46]/10 transition-all text-center group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform">📊</div>
                <h3 className="text-xl font-bold text-[#065F46] mb-3">Teacher Dashboard</h3>
                <p className="text-gray-600">Track student progress and manage lessons with ease.</p>
              </div>
              <div className="bg-[#FEF3C7] p-8 rounded-[2rem] border-2 border-transparent hover:border-[#065F46]/10 transition-all text-center group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform">📦</div>
                <h3 className="text-xl font-bold text-[#065F46] mb-3">3D Library</h3>
                <p className="text-gray-600">Access thousands of pre-built models for every subject.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Showcase */}
        <section className="py-24 px-6 bg-[#D1FAE5]/30" id="curriculum">
          <div className="max-w-6xl mx-auto bg-white rounded-[3rem] p-8 lg:p-12 landing-bubbly-shadow border-4 border-white overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2 space-y-6">
                <h2 className="text-4xl font-bold text-[#065F46] leading-tight">Create your own AR worlds effortlessly.</h2>
                <p className="text-lg text-gray-600">Our &apos;Friendly Editor&apos; allows students and teachers to build interactive experiences without a single line of code.</p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 font-semibold text-[#065F46]"><span className="bg-[#D1FAE5] p-1 rounded-full text-xs">✓</span> Drag and drop 3D objects</li>
                  <li className="flex items-center gap-3 font-semibold text-[#065F46]"><span className="bg-[#D1FAE5] p-1 rounded-full text-xs">✓</span> Real-time collaboration</li>
                  <li className="flex items-center gap-3 font-semibold text-[#065F46]"><span className="bg-[#D1FAE5] p-1 rounded-full text-xs">✓</span> One-click publishing</li>
                </ul>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-[#FEF3C7] rounded-[2rem] p-4 border-8 border-[#BFDBFE]/30">
                  <img
                    alt="EduAR Editor Mockup"
                  className="rounded-3xl landing-bubbly-shadow"
                    // src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTCjh0EC8ImZ11vkUspQ9HonuU13QSB8FRHERH3rDLmnzGSOcRtZ9msd8ZuQC66Bq3Cq88DeH_s3taonIsXhCmaeRQBTcV6KYu8jPlZVYH5DdujHqudQ-XiaLBhSetoDuOrazTQ0CL4CSquYvZrvGx56H4U16Cp4d9Lm5ciQBYBwvm5zs1SA6ApXhk6Sh3YWwqSWVS1aXAzm1fm4WxrY6NV7fGoZD7gc-KgIr8Quvy-lAKHU9cdFlOKWafLr69fpGI9fBlOE2Cko0D"
                    src="/girl.png"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 px-6 bg-gradient-to-b from-transparent to-white/30" id="pricing">
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="text-5xl font-bold text-[#065F46] mb-6 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Plans for Every Classroom</h2>
            <p className="text-xl text-gray-500 font-medium">Elevate your teaching with our high-fidelity tools.</p>
          </div>
          <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8 items-stretch">
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 flex flex-col landing-premium-card-hover relative overflow-hidden landing-inner-glow-mint">
              <div className="mb-10 text-6xl">🌱</div>
              <h3 className="text-3xl font-bold text-[#065F46] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>Starter</h3>
              <p className="text-slate-500 mb-8 font-medium">Free forever tools for passionate educators.</p>
              <div className="mb-10">
                <span className="text-5xl font-extrabold text-[#065F46]" style={{ fontFamily: "'Inter', sans-serif" }}>$0</span>
                <span className="text-lg text-slate-400 font-semibold">/ forever</span>
              </div>
              <ul className="space-y-4 mb-12 flex-grow">
                <li className="flex items-center gap-3 text-slate-600 font-medium"><span className="w-5 h-5 bg-[#D1FAE5]/50 rounded-full flex items-center justify-center text-[10px] text-[#48c78e]">✔</span> 5 Active Projects</li>
                <li className="flex items-center gap-3 text-slate-600 font-medium"><span className="w-5 h-5 bg-[#D1FAE5]/50 rounded-full flex items-center justify-center text-[10px] text-[#48c78e]">✔</span> Basic 3D Library</li>
                <li className="flex items-center gap-3 text-slate-600 font-medium"><span className="w-5 h-5 bg-[#D1FAE5]/50 rounded-full flex items-center justify-center text-[10px] text-[#48c78e]">✔</span> Public Web Player</li>
              </ul>
              <button className="w-full bg-slate-50 text-slate-700 py-5 rounded-full font-bold landing-bubbly-button border-2 border-slate-100 hover:bg-white hover:border-[#48c78e] transition-all">
                Start Free
              </button>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] border-[3px] border-[#ff7f61] flex flex-col landing-premium-card-hover relative overflow-hidden z-10 shadow-[0_40px_80px_-15px_rgba(255,127,97,0.2)] landing-inner-glow-coral">
              <div className="absolute top-8 right-8 bg-[#ff7f61] text-white px-5 py-1.5 rounded-full font-extrabold text-xs tracking-widest uppercase">Recommended</div>
              <div className="mb-10 text-6xl">🏫</div>
              <h3 className="text-3xl font-bold text-[#065F46] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>Pro</h3>
              <p className="text-slate-500 mb-8 font-medium">The complete experience for small-to-medium schools.</p>
              <div className="mb-10">
                <span className="text-5xl font-extrabold text-[#065F46]" style={{ fontFamily: "'Inter', sans-serif" }}>$49</span>
                <span className="text-lg text-slate-400 font-semibold">/ mo</span>
              </div>
              <ul className="space-y-4 mb-12 flex-grow">
                <li className="flex items-center gap-3 text-slate-700 font-semibold"><span className="w-6 h-6 bg-[#ff7f61]/20 rounded-full flex items-center justify-center text-xs text-[#ff7f61]">✔</span> Unlimited Projects</li>
                <li className="flex items-center gap-3 text-slate-700 font-semibold"><span className="w-6 h-6 bg-[#ff7f61]/20 rounded-full flex items-center justify-center text-xs text-[#ff7f61]">✔</span> Premium 3D Library (5k+)</li>
                <li className="flex items-center gap-3 text-slate-700 font-semibold"><span className="w-6 h-6 bg-[#ff7f61]/20 rounded-full flex items-center justify-center text-xs text-[#ff7f61]">✔</span> LMS Integrations</li>
                <li className="flex items-center gap-3 text-slate-700 font-semibold"><span className="w-6 h-6 bg-[#ff7f61]/20 rounded-full flex items-center justify-center text-xs text-[#ff7f61]">✔</span> Classroom Analytics</li>
              </ul>
              <button className="w-full bg-[#ff7f61] text-white py-5 rounded-full font-bold text-lg landing-bubbly-button shadow-[0_15px_30px_-5px_rgba(255,127,97,0.4)]">
                Get Started with Pro
              </button>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 flex flex-col landing-premium-card-hover relative overflow-hidden landing-inner-glow-mint">
              <div className="mb-10 text-6xl">🏛️</div>
              <h3 className="text-3xl font-bold text-[#065F46] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>District</h3>
              <p className="text-slate-500 mb-8 font-medium">Scalable deployment for regional school districts.</p>
              <div className="mb-10">
                <span className="text-5xl font-extrabold text-[#065F46]" style={{ fontFamily: "'Inter', sans-serif" }}>Custom</span>
              </div>
              <ul className="space-y-4 mb-12 flex-grow">
                <li className="flex items-center gap-3 text-slate-600 font-medium"><span className="w-5 h-5 bg-[#BFDBFE]/50 rounded-full flex items-center justify-center text-[10px] text-blue-600">✔</span> White-label Experiences</li>
                <li className="flex items-center gap-3 text-slate-600 font-medium"><span className="w-5 h-5 bg-[#BFDBFE]/50 rounded-full flex items-center justify-center text-[10px] text-blue-600">✔</span> Dedicated Success Manager</li>
                <li className="flex items-center gap-3 text-slate-600 font-medium"><span className="w-5 h-5 bg-[#BFDBFE]/50 rounded-full flex items-center justify-center text-[10px] text-blue-600">✔</span> District-wide Analytics</li>
              </ul>
              <button className="w-full bg-[#BFDBFE] text-[#065F46] py-5 rounded-full font-bold landing-bubbly-button border-2 border-transparent hover:border-[#BFDBFE]/40">
                Contact Sales
              </button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-[#065F46] tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Loved by Forward-Thinking Educators</h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">See how teachers and students around the world are transforming their learning experience.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-[#D1FAE5]/30 p-10 rounded-[2.5rem] border-2 border-white/50 landing-premium-card-hover landing-bubbly-shadow flex flex-col">
                <div className="flex-grow">
                  <p className="text-lg text-[#065F46] italic leading-relaxed mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
                    &quot;The interactive 3D models have made biology lessons so much more engaging. Students aren&apos;t just looking at diagrams; they&apos;re exploring the human heart in their hands.&quot;
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <img alt="Sarah J." className="w-14 h-14 rounded-2xl object-cover border-2 border-white"
                  // src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzybns03fC5TtFT8KViSw78Pl234M4pIKPFTbvpE0qSivVz6obw13oYODtCkGkMMBjvvMyLvKvbwPBHxtK9BqRz2CVA0Y8vN1_k2-tWTSimWcHYq2Grksq5LcruMmZgW-DzdhFZ14yv6KXk4KAM2m01wvkYoHfJs1oqglzEmpLe7eJgDfCR9CScFMFz_NEUA2Ei1v25ixTXdhTeoO-_LLviMdcxssTxz6UXTu1lr3J42lb4ZCyDUipbCZts3fRFDmskVYFfff6PUyZ" 
                  src="/landing3.png"
                  />
                  <div>
                    <h4 className="font-bold text-[#065F46]">Sarah J.</h4>
                    <p className="text-sm text-[#065F46]/60 font-medium">Science Teacher</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#FEF3C7] p-10 rounded-[2.5rem] border-2 border-white/50 landing-premium-card-hover landing-bubbly-shadow flex flex-col">
                <div className="flex-grow">
                  <p className="text-lg text-[#065F46] italic leading-relaxed mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
                    &quot;I used to find history boring, but with EduAR, we visited Ancient Rome right in our classroom. It&apos;s like having a time machine in your pocket!&quot;
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <img alt="Leo M." className="w-14 h-14 rounded-2xl object-cover border-2 border-white"
                  // src="https://lh3.googleusercontent.com/aida-public/AB6AXuCt96fKZa3FknpreSu1Pzl_vSmgukghFVXzi49IwgwxOn6QB2Og4wCN78qhEqijbOwii7PAwMUfuDVj3Dcftof7LMmSRNR-WAr9eBEP0H1rTsPqFx9K2hYmXyIm2Fd5-yED8-9TO9OC7VD34xq7uaYQH4q10cx_hUQdvgcfXL2mOjw1_NeOVhwIBGw8OQXJIO9QTi35TAZTNUtwupK6dgUVhcxE98VwPV5CP5meF_bjobvzS5jR_8xx4VEkONt5s-tkFQ6c50vtU_yh"
                  src="/landing4.png"
                   />
                  <div>
                    <h4 className="font-bold text-[#065F46]">Leo M.</h4>
                    <p className="text-sm text-[#065F46]/60 font-medium">8th Grade Student</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#BFDBFE]/30 p-10 rounded-[2.5rem] border-2 border-white/50 landing-premium-card-hover landing-bubbly-shadow flex flex-col">
                <div className="flex-grow">
                  <p className="text-lg text-[#065F46] italic leading-relaxed mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
                    &quot;As a district, scaling innovation is hard. EduAR made it easy. The dashboard provides incredible insights into how students are interacting with the material.&quot;
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <img alt="David R." className="w-14 h-14 rounded-2xl object-cover border-2 border-white" 
                  // src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnAbpxjG90upmx2Yiyk-v-ElzzFvGizOTM7k7eyjzRog84foVoZR59GxDSGgca6py_Hg7xZKUdkDyos2bHiNYQE1hwcGrHcYAu0EADJDYGcuQwB1Dr-0xyLpEzwWis006DHdBPl51BKEt-K82KQpUimCw__Nqp62xOOqMEVA_pYKiYq4OEmGBjV6bQGMgj4ZlLOt36TJUf0cAo58tXEAibkhXgTeqw7b_geNp7F8R6jHqhZAUo5EN7sBX4r0TQCEudauFdVefEM1no"
                  src="/landing5.png"
                   />
                  <div>
                    <h4 className="font-bold text-[#065F46]">David R.</h4>
                    <p className="text-sm text-[#065F46]/60 font-medium">Tech Coordinator</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto bg-[#065F46] rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#FDA4AF]/20 rounded-full"></div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-[#D1FAE5]/10 rounded-full"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl lg:text-6xl font-bold">Bring Lessons to <br /><span className="text-[#D1FAE5]">Life Today.</span></h2>
              <p className="text-xl opacity-90 max-w-2xl mx-auto">Join thousands of educators who are already changing the way their students see the world.</p>
              <Link to="/register" className="inline-block bg-white text-[#065F46] px-12 py-6 rounded-full text-2xl font-bold landing-bubbly-shadow landing-bubbly-button">
                Get Started for Free
              </Link>
              <p className="text-sm opacity-60">No credit card required • Instant access</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#FEF3C7] py-16 px-6 border-t border-[#D1FAE5]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FDA4AF] rounded-xl flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-base">deployed_code</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-[#065F46]">Lucid Lab</span>
            </div>
            <p className="text-gray-500">Making the classroom a playground for the imagination.</p>
          </div>
          <div>
            <h4 className="font-bold text-[#065F46] mb-4">Product</h4>
            <ul className="space-y-2 text-gray-500">
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#features">Features</a></li>
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#curriculum">Curriculum</a></li>
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#pricing">Library</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#065F46] mb-4">Company</h4>
            <ul className="space-y-2 text-gray-500">
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#">About Us</a></li>
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#">Careers</a></li>
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#065F46] mb-4">Support</h4>
            <ul className="space-y-2 text-gray-500">
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#">Help Center</a></li>
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#">Privacy</a></li>
              <li><a className="hover:text-[#FDA4AF] transition-colors" href="#">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#D1FAE5] text-center text-gray-400 text-sm">
          © 2024 Lucid Lab Studios. All rights reserved. Keep learning, keep exploring!
        </div>
      </footer>
    </div>
  );
}
