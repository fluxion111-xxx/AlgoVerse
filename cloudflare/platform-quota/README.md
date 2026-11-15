# 平台免费 AI 配置

## 本地验证

在项目根目录创建 `.env.local`，设置 `SILICONFLOW_API_KEY` 为硅基流动控制台发放的 Key。该文件已被 Git 忽略。运行 `npm run dev -- --webpack`，然后打开 `http://127.0.0.1:3000/ai-settings`。

1. 选择「平台免费 AI」和「Qwen3.5-4B」，点「测试连接」。
2. 换成「GLM-Z1-9B-0414」，再测试一次。连接测试只请求选中的模型。
3. 在助教中询问一段简短代码的复杂度。再从实验创造台生成冒泡排序与快速排序的对比方案，确认后运行并生成诊断。

## 生产环境

项目当前以 Next.js Node 服务运行。新增的 Cloudflare Worker 只管理免费 AI 额度，使用一个 Durable Object 统一计数。生产环境缺少配额服务时，免费模式暂停。

在仓库根目录执行以下命令部署配额 Worker。命令会提示输入自生成的随机口令。将同一个口令配置到 Next.js 的服务端环境中。

```powershell
npx wrangler deploy --config cloudflare/platform-quota/wrangler.jsonc
npx wrangler secret put PLATFORM_AI_QUOTA_SECRET --config cloudflare/platform-quota/wrangler.jsonc
```

为 Next.js 运行环境配置以下变量。用 Cloudflare 承载 Next.js 时，通过 Cloudflare Secrets 设置密钥，并启用 `nodejs_compat`。配额 Worker 只需要配额口令。

| 变量 | 用途 |
| --- | --- |
| `SILICONFLOW_API_KEY` | 硅基流动推理密钥 |
| `PLATFORM_AI_QUOTA_URL` | 配额 Worker 的 HTTPS 地址 |
| `PLATFORM_AI_QUOTA_SECRET` | 与配额 Worker 一致的随机口令 |

公开站点应经由 Cloudflare 访问，让入口提供 `CF-Connecting-IP`，并限制绕过代理直接访问源站。共享上网 IP 会共用一个限流桶。全站每分钟最多 20 次，每个 IP 每分钟最多 6 次，全站每日最多 120 次。每日额度按 UTC 零点刷新。测试、失败请求与备用模型尝试都会占用额度。

每次推理前，服务端检查硅基流动官网的零价数据。涨价、缺项、页面改版或核价超时会暂停对应调用，并在服务日志中留下管理员可排查的提示。平台响应不会回传密钥。

实验历史仍由现有 Next.js 服务写入本地文件。若将整站迁入 Cloudflare Workers，需要另行迁移实验记录存储。配额 Worker 只保存计数。
