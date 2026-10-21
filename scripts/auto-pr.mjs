#!/usr/bin/env node
/**
 * 全自动 PR：推送当前分支 → 创建 PR → 尝试合并
 *
 * 用法：
 *   pnpm pr:auto
 *   pnpm pr:auto -- --base main --title "feat: xxx" --no-merge
 *
 * Token（仅从环境变量读取，绝不打印）：
 *   GitHub: GITHUB_TOKEN 或 GH_TOKEN
 *   Gitee:  GITEE_TOKEN 或 GITEE_ACCESS_TOKEN
 *
 * 行为：
 *   1. 拒绝在 main/master 上直接执行，避免绕过 PR 流程
 *   2. 当前分支已领先基线时，依次推送到 origin（GitHub）与 gitee
 *   3. 配置了对应 Token 时调用 REST API 创建（或复用）PR，并尝试合并
 *   4. 未配置 Token / API 不可达时，输出手动创建 PR 的对比链接
 */
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const DEFAULT_BASE = 'main'
const DEFAULT_MERGE_METHOD = 'squash'
const REQUEST_TIMEOUT_MS = 20_000

const args = parseArgs(process.argv.slice(2))

function fail(message) {
  throw new Error(message)
}

function printUsage() {
  console.log(`
用法: pnpm pr:auto [-- 选项]

选项:
  --base <branch>          PR 目标分支，默认 ${DEFAULT_BASE}
  --title <title>          PR 标题，默认取最后一次提交标题
  --body <body>            PR 描述，默认自动汇总提交列表
  --merge-method <method>  合并方式：squash | merge | rebase，默认 ${DEFAULT_MERGE_METHOD}
  --no-merge               只创建 PR，不尝试合并
  --help                   显示帮助

环境变量:
  GITHUB_TOKEN / GH_TOKEN           GitHub Personal Access Token（repo 权限）
  GITEE_TOKEN / GITEE_ACCESS_TOKEN  Gitee 私人令牌（projects 权限）
`)
}

function parseArgs(argv) {
  const options = { base: DEFAULT_BASE, mergeMethod: DEFAULT_MERGE_METHOD, merge: true }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg === '--no-merge') {
      options.merge = false
      continue
    }

    const valueOptions = {
      '--base': 'base',
      '--title': 'title',
      '--body': 'body',
      '--merge-method': 'mergeMethod'
    }

    if (valueOptions[arg]) {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) fail(`参数 ${arg} 缺少值`)
      options[valueOptions[arg]] = value
      index++
      continue
    }

    const inlineMatch = arg.match(/^(--base|--title|--body|--merge-method)=(.+)$/)
    if (inlineMatch) {
      options[valueOptions[inlineMatch[1]]] = inlineMatch[2]
      continue
    }

    fail(`未知参数：${arg}`)
  }

  if (!['squash', 'merge', 'rebase'].includes(options.mergeMethod)) {
    fail(`不支持的合并方式：${options.mergeMethod}（可选 squash / merge / rebase）`)
  }

  return options
}

function run(command, commandArgs, { allowFailure = false, env = {} } = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf-8',
    env: { ...process.env, ...env },
    windowsHide: true
  })

  if (result.error) {
    if (allowFailure) return { ok: false, output: result.error.message }
    fail(`${command} 执行失败：${result.error.message}`)
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim()

  if (result.status !== 0 && !allowFailure) {
    fail(`${command} ${commandArgs.join(' ')} 失败：\n${output}`)
  }

  return { ok: result.status === 0, output }
}

function git(gitArgs, options) {
  return run('git', gitArgs, options)
}

function getCurrentBranch() {
  const { output } = git(['branch', '--show-current'])
  const branch = output.trim()
  if (!branch) fail('当前处于 detached HEAD，无法确定 PR 分支')
  return branch
}

function getRemoteUrl(remote) {
  const result = git(['remote', 'get-url', remote], { allowFailure: true })
  return result.ok ? result.output.trim() : ''
}

/** 支持 https://host/owner/repo(.git) 与 git@host:owner/repo(.git) */
function parseRepo(url, host) {
  if (!url) return null

  const httpsMatch = url.match(new RegExp(`^https?://${host.replace(/\./g, '\\.')}/([^/]+)/([^/]+?)(?:\\.git)?/?$`))
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] }
  }

  const sshMatch = url.match(new RegExp(`^git@${host.replace(/\./g, '\\.')}:([^/]+)/([^/]+?)(?:\\.git)?$`))
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] }
  }

  return null
}

function countAhead(base, head) {
  const result = git(['rev-list', '--count', `${base}..${head}`], { allowFailure: true })
  return result.ok ? Number(result.output.trim()) : 0
}

function resolveCompareBase(base) {
  const remoteBase = `origin/${base}`
  const hasRemoteBase = git(['rev-parse', '--verify', '--quiet', remoteBase], {
    allowFailure: true
  }).ok
  return hasRemoteBase ? remoteBase : base
}

function isWorkingTreeDirty() {
  const { output } = git(['status', '--porcelain'])
  return output.trim().length > 0
}

function pushRemotes(branch) {
  const results = []

  for (const remote of ['origin', 'gitee']) {
    const result = git(['push', '-u', remote, branch], {
      allowFailure: true,
      env: { GIT_TERMINAL_PROMPT: '0' }
    })
    results.push({ remote, ...result })
  }

  return results
}

function readToken(names) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    throw new Error(`请求失败：${error instanceof Error ? error.message : String(error)}`)
  }

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const detail =
      data?.message || data?.error_description || data?.error || text.slice(0, 300) || '无响应内容'
    throw new Error(`HTTP ${response.status}：${detail}`)
  }

  return data
}

function buildPrBody(base, head) {
  if (args.body) return args.body

  const result = git(['log', '--oneline', '--no-merges', `${base}..${head}`], {
    allowFailure: true
  })
  const commits = result.ok ? result.output.trim() : ''
  const lines = [
    '## 变更说明',
    '',
    commits ? commits.replace(/^/gm, '- ') : '- 自动化 PR',
    '',
    '> 由 `pnpm pr:auto` 生成并推送。'
  ]
  return lines.join('\n')
}

function manualLink(host, repoInfo, base, head) {
  return `https://${host}/${repoInfo.owner}/${repoInfo.repo}/compare/${base}...${head}?expand=1`
}

async function ensureGithubPr({ repoInfo, base, head, title, body, token }) {
  const apiBase = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'art-design-pro-micro-auto-pr'
  }

  const existing = await requestJson(
    `${apiBase}/pulls?state=open&base=${encodeURIComponent(base)}&head=${encodeURIComponent(
      `${repoInfo.owner}:${head}`
    )}`,
    { headers }
  )

  if (Array.isArray(existing) && existing.length > 0) {
    return { number: existing[0].number, url: existing[0].html_url, created: false }
  }

  const created = await requestJson(`${apiBase}/pulls`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, head, base, body })
  })

  return { number: created.number, url: created.html_url, created: true }
}

async function mergeGithubPr({ repoInfo, number, token }) {
  const apiBase = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`
  await requestJson(`${apiBase}/pulls/${number}/merge`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'art-design-pro-micro-auto-pr'
    },
    body: JSON.stringify({ merge_method: args.mergeMethod })
  })
}

async function ensureGiteePr({ repoInfo, base, head, title, body, token }) {
  const apiBase = `https://gitee.com/api/v5/repos/${repoInfo.owner}/${repoInfo.repo}`
  const listUrl = `${apiBase}/pulls?access_token=${encodeURIComponent(
    token
  )}&state=open&base=${encodeURIComponent(base)}&per_page=100`
  const pulls = await requestJson(listUrl)
  const existing = Array.isArray(pulls)
    ? pulls.find((item) => item?.head?.ref === head || item?.head?.label === head)
    : null

  if (existing) {
    return { number: existing.number, url: existing.html_url, created: false }
  }

  const form = new URLSearchParams({
    access_token: token,
    title,
    head,
    base,
    body
  })

  const created = await requestJson(`${apiBase}/pulls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  })

  return { number: created.number, url: created.html_url, created: true }
}

async function mergeGiteePr({ repoInfo, number, token }) {
  const apiBase = `https://gitee.com/api/v5/repos/${repoInfo.owner}/${repoInfo.repo}`
  const form = new URLSearchParams({ access_token: token })
  if (args.mergeMethod !== 'squash') form.set('merge_method', args.mergeMethod)

  await requestJson(`${apiBase}/pulls/${number}/merge`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  })
}

async function handlePlatform({ platform, host, remote, tokenNames, ensurePr, mergePr }) {
  const repoUrl = getRemoteUrl(remote)
  const repoInfo = parseRepo(repoUrl, host)

  if (!repoInfo) {
    console.log(`\n[${platform}] 未识别到 ${host} 仓库地址，跳过（remote: ${remote}）`)
    return { platform, status: 'skipped' }
  }

  console.log(`\n[${platform}] ${repoInfo.owner}/${repoInfo.repo}`)

  const token = readToken(tokenNames)
  if (!token) {
    console.log(`  未配置 ${tokenNames.join(' / ')}，跳过 API 创建与合并。`)
    console.log(`  手动创建 PR: ${manualLink(host, repoInfo, args.base, branch)}`)
    return { platform, status: 'no-token' }
  }

  try {
    const pr = await ensurePr({
      repoInfo,
      base: args.base,
      head: branch,
      title,
      body,
      token
    })
    console.log(`  ${pr.created ? '已创建' : '已存在'} PR #${pr.number}: ${pr.url}`)

    if (!args.merge) {
      console.log('  已按 --no-merge 跳过合并。')
      return { platform, status: 'created', url: pr.url }
    }

    try {
      await mergePr({ repoInfo, number: pr.number, token })
      console.log(`  已尝试合并（${args.mergeMethod}），请留意目标分支状态。`)
      return { platform, status: 'merged', url: pr.url }
    } catch (error) {
      console.log(`  自动合并未完成：${error instanceof Error ? error.message : String(error)}`)
      console.log('  通常是分支保护或必需检查未通过，请到 PR 页面完成合并。')
      return { platform, status: 'merge-failed', url: pr.url }
    }
  } catch (error) {
    console.log(`  API 操作失败：${error instanceof Error ? error.message : String(error)}`)
    console.log(`  手动创建 PR: ${manualLink(host, repoInfo, args.base, branch)}`)
    return { platform, status: 'api-failed' }
  }
}

async function main() {
  const branch = getCurrentBranch()

  if (branch === 'main' || branch === 'master') {
    fail('拒绝在 main/master 上直接创建 PR，请切换到功能分支后重试')
  }

  if (branch === args.base) {
    fail(`当前分支与目标分支相同（${branch}），无法创建 PR`)
  }

  const compareBase = resolveCompareBase(args.base)
  const ahead = countAhead(compareBase, branch)
  if (ahead === 0) {
    fail(`当前分支相对 ${args.base} 没有新提交，无需创建 PR`)
  }

  const latestSubject = git(['log', '-1', '--format=%s', branch], { allowFailure: true }).output
  const title = args.title || latestSubject.trim() || `Merge ${branch} into ${args.base}`
  const body = buildPrBody(compareBase, branch)

  if (isWorkingTreeDirty()) {
    console.log('! 检测到未提交改动：本次 PR 只包含已提交内容，请确认是否需要先提交。')
  }

  console.log(`分支: ${branch} → ${args.base}（领先 ${ahead} 个提交）`)
  console.log('正在推送到 origin / gitee ...')

  const pushResults = pushRemotes(branch)
  for (const result of pushResults) {
    console.log(`  ${result.remote}: ${result.ok ? '推送成功' : '推送失败'}`)
    if (!result.ok) console.log(`    ${result.output.split('\n').slice(-3).join('\n    ')}`)
  }

  if (pushResults.every((result) => !result.ok)) {
    fail('所有远端推送均失败，请先检查 Git 凭据与网络')
  }

  const results = []

  results.push(
    await handlePlatform({
      platform: 'GitHub',
      host: 'github.com',
      remote: 'origin',
      tokenNames: ['GITHUB_TOKEN', 'GH_TOKEN'],
      ensurePr: ensureGithubPr,
      mergePr: mergeGithubPr
    })
  )

  results.push(
    await handlePlatform({
      platform: 'Gitee',
      host: 'gitee.com',
      remote: 'gitee',
      tokenNames: ['GITEE_TOKEN', 'GITEE_ACCESS_TOKEN'],
      ensurePr: ensureGiteePr,
      mergePr: mergeGiteePr
    })
  )

  console.log('\n结果汇总:')
  for (const result of results) {
    console.log(`  ${result.platform}: ${result.status}${result.url ? ` - ${result.url}` : ''}`)
  }

  const prUrls = results.map((result) => result.url).filter(Boolean)
  if (prUrls.length > 0) {
    console.log('\nPR 链接:')
    for (const url of prUrls) console.log(`  ${url}`)
  }

  if (results.every((result) => result.status === 'skipped')) {
    fail('两个平台均未识别到仓库地址，请检查 git remote 配置')
  }
}

try {
  await main()
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
