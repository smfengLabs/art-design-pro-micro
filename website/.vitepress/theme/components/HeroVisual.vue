<template>
  <div class="ap-hero-visual" aria-label="Art Design Pro Micro 运行时拓扑">
    <div class="ap-hero-visual__halo" aria-hidden="true"></div>

    <div class="ap-float-chip ap-float-chip--shared" aria-hidden="true">
      <span class="ap-float-chip__status"></span>
      <span class="ap-float-chip__copy">
        <strong>single runtime</strong>
        <span>1 Vue · 1 Pinia · 1 Router</span>
      </span>
    </div>

    <div class="ap-terminal">
      <div class="ap-terminal__bar">
        <span class="ap-terminal__dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="ap-terminal__title">mfe-runtime — zsh</span>
        <span class="ap-terminal__live">LIVE</span>
      </div>

      <div class="ap-terminal__body">
        <div class="ap-term-line">
          <span class="ap-term-prompt">$</span>
          <span class="ap-term-command">pnpm dev</span>
          <span class="ap-term-caret" aria-hidden="true"></span>
        </div>
        <div class="ap-term-line ap-term-muted">
          <span>turbo</span>
          <span>scope: apps/* + packages/*</span>
        </div>

        <div class="ap-topology">
          <div class="ap-topology__host">
            <span class="ap-topology__host-mark">H</span>
            <strong>app-main</strong>
            <em>host :3006</em>
          </div>
          <div class="ap-topology__branch" aria-hidden="true"></div>
          <div class="ap-topology__remotes">
            <div class="ap-topology__node">
              <span>remote</span>
              <strong>app-system</strong>
            </div>
            <div class="ap-topology__node ap-topology__node--muted">
              <span>remote</span>
              <strong>app-*</strong>
            </div>
            <div class="ap-topology__node ap-topology__node--muted">
              <span>shared</span>
              <strong>packages/*</strong>
            </div>
          </div>
        </div>

        <div class="ap-term-line ap-term-muted">
          <span class="ap-term-status">✔</span>
          <span>federation runtime ready</span>
        </div>
        <div class="ap-term-line ap-term-muted">
          <span class="ap-term-status">✔</span>
          <span>shared singletons resolved</span>
        </div>

        <div class="ap-term-footer">
          <span>shared:</span>
          <strong>vue@3.5 · pinia@3 · router@4</strong>
        </div>
      </div>
    </div>

    <div class="ap-float-chip ap-float-chip--mf" aria-hidden="true">
      <span class="ap-float-chip__mf">MF</span>
      <span class="ap-float-chip__copy">
        <strong>Module Federation 2.0</strong>
        <span>federated by design</span>
      </span>
    </div>
  </div>
</template>
