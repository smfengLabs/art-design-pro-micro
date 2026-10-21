<!-- 欢迎页：纯模板的业务开发起点 -->
<template>
  <div class="home-page">
    <section class="home-card">
      <p class="home-kicker">ART DESIGN PRO · STARTER</p>
      <h1 class="home-title">欢迎使用 <span>App Template</span>！</h1>
      <p class="home-desc">
        当前是纯净的子应用模板：布局、路由、登录均已接入，请在此处开发您的业务逻辑。
      </p>

      <div class="home-tags">
        <span class="home-tag">布局已接入</span>
        <span class="home-tag">路由已就绪</span>
        <span class="home-tag">登录已统一</span>
      </div>

      <p class="home-hint">从 src/views/home/index.vue 开始你的开发</p>
    </section>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'AppTemplateHome' })
</script>

<style scoped>
  .home-page {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 100px);
    padding: 32px;
    overflow: hidden;
    background:
      radial-gradient(circle at 12% 18%, rgba(99, 102, 241, 0.16), transparent 32%),
      radial-gradient(circle at 88% 82%, rgba(6, 182, 212, 0.14), transparent 30%),
      var(--art-bg-color, #f6f8fc);
  }

  .home-card {
    position: relative;
    z-index: 1;
    width: min(100%, 680px);
    padding: clamp(32px, 6vw, 64px) clamp(24px, 5vw, 56px);
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 24px 80px rgba(30, 41, 59, 0.12);
    backdrop-filter: blur(18px);
  }

  .home-kicker {
    margin: 0 0 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.24em;
    color: #6366f1;
  }

  .home-title {
    margin: 0;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1.25;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #111827;
  }

  .home-title span {
    background: linear-gradient(120deg, #4f46e5, #0891b2);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .home-desc {
    max-width: 480px;
    margin: 18px auto 0;
    font-size: 15px;
    line-height: 1.9;
    color: #64748b;
  }

  .home-tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-top: 28px;
  }

  .home-tag {
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    border: 1px solid rgba(99, 102, 241, 0.16);
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.07);
  }

  .home-hint {
    margin: 30px 0 0;
    font-size: 12px;
    color: #94a3b8;
  }

  :global(.dark) .home-page {
    background:
      radial-gradient(circle at 12% 18%, rgba(99, 102, 241, 0.2), transparent 32%),
      radial-gradient(circle at 88% 82%, rgba(6, 182, 212, 0.16), transparent 30%),
      #0b1020;
  }

  :global(.dark) .home-card {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(17, 24, 39, 0.78);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
  }

  :global(.dark) .home-title {
    color: #f8fafc;
  }

  :global(.dark) .home-desc {
    color: #94a3b8;
  }

  :global(.dark) .home-tag {
    color: #cbd5e1;
    border-color: rgba(129, 140, 248, 0.2);
    background: rgba(129, 140, 248, 0.12);
  }

  :global(.dark) .home-hint {
    color: #64748b;
  }

  @media (max-width: 640px) {
    .home-page {
      padding: 20px;
    }

    .home-card {
      padding: 36px 22px;
    }
  }
</style>
