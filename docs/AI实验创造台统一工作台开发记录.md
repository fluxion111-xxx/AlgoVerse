# AI 实验创造台统一工作台开发记录

## 本轮需求原文摘录

> 将原来的三阶段创造台改为「统一 AI Agent 对话工作台 + 专业实验分析工作台」。
>
> 这些操作应当在同一会话中连续完成。
>
> 返回后必须保留原有对话和实验上下文。
>
> 请先输出最小改造方案，再按上述范围实施，不要扩展到无关模块。

原始指令及实施过程保存在本次 Codex 对话中。前一轮只读审计确认了两个入口的边界。本轮实施创造台与专业分析的连接，助教沿用现有入口。

## 最小改造方案与实际变更

| 范围 | 复用与改动 |
| --- | --- |
| 创造台 | `create/page.tsx` 默认挂载 `AgentWorkbench`。复用 `TutorReply` 的 Markdown、代码块与表格。方案、工具执行状态和实测记录进入对应对话轮次。`agent-workbench.css` 提供窄阅读列、悬浮输入框和移动端布局。 |
| 专业分析 | `runs/[runId]/page.tsx` 复用 `ExperimentBench` 和 `QuickStartDiagnosis`。分析页读取已保存的运行快照，展示同引擎多轮指标。返回链接由已保存 Run 的任务来源生成。 |
| 首页 | `page.tsx` 和 `navigation.ts` 更新四卡链接。保留首页构图。03 在有待确认方案时打开同一对话，04 按已完成 Run 打开诊断。 |
| 状态和安全 | Agent API、`experimentAgent.ts` 和 `experimentRecords.ts` 保存方案对应的轮次、恢复当前任务，并按操作 ID 停止模型请求。诊断按 Run 保存，下一轮会读取已保存诊断。工具执行沿用注册表、配置校验、确认和当前版本校验。 |
| 兼容 | 默认流程停用三阶段导航。保留旧书签和一分钟引导。已保存的旧方案可导入当前会话，再由用户确认。 |

设计参考 One Page Love 的窄内容布局，将对话约束在一条阅读列。对话使用左右消息布局和悬浮输入。配色沿用 AlgoVerse 的纸张质感，加入焦糖色与局部网格。 [One Page Love 窄版式参考](https://onepagelove.com/)

## 实际测试与修复

- 自动化测试覆盖旧方案导入、重复确认、停止回复后保留方案、拒绝无关停止请求、选定 Run 和诊断进入下一轮上下文。全套 Node 测试共 148 项通过。
- 类型检查通过。生产构建成功生成全部 40 个静态页面。
- 浏览器使用独立访客。首页无记录时验证 01 聚焦输入，02 提示输入需求，03 提示先生成方案，04 提示先跑一轮。
- 在隔离本地站调用配置中的真实模型。询问先序和后序区别，再输入「帮我设计一个实验」。Agent 继承主题，提出注册的树遍历方案。
- 在隔离浏览器输入「比较冒泡排序和快速排序」。首页 03 找回同一份待确认方案。双击确认只保存一轮。比较次数为 `21 / 14`，交换次数为 `13 / 5`，排序结果为 `1、2、3、4、7、8、9`。
- 专业页从该 Run 生成并保存诊断。返回 Agent 后，原消息、方案、Run 和诊断可读。刷新后仍显示该轮。首页 04 打开同一 Run 的分析锚点。
- 将排序输入换成 `5、2、9、1` 并确认，生成第二个 Run。比较次数为 `6 / 5`，交换次数为 `4 / 2`。专业页同时显示两轮实测，第一轮快照保留。
- 在 390 × 844 的移动视口检查阅读区和输入框。文档无横向溢出，输入框停在视口底部。
- 原有预览曾返回「今日免费额度已用完」。保留原预览状态，在本地隔离副本启动独立验证。
- 最初的自动浏览器脚本在页面尚未完成交互初始化时输入，导致发送按钮仍不可用。调整脚本等待页面可交互后继续验收。
- 实测发现，模型把命令式排序对比答成了知识题。补充通用意图区分。命令式对比进入实验规划，询问原理或区别仍走知识问答。
- 诊断时主模型请求达到 25 秒超时。现有备用模型返回了有效诊断，整个请求约 45 秒，分析页保持真实等待状态。

浏览器留证 [对话与真实排序结果](AI实验创造台-对话与实测.jpg)。

## 文件清单

- 入口与路由：`src/app/page.tsx`、`src/app/experiments/create/page.tsx`、`src/app/experiments/runs/[runId]/page.tsx`、`src/lib/navigation.ts`
- 工作台组件：`src/components/experiments/AgentWorkbench.tsx`、`src/components/experiments/QuickStartDiagnosis.tsx`、`src/app/experiments/create/agent-workbench.css`
- API 和任务记录：`src/app/api/experiments/agent/route.ts`、`src/lib/experimentAgent.ts`、`src/lib/server/experimentAgent.ts`、`src/lib/server/experimentRecords.ts`
- 回归测试：`tests/experiment-agent.test.mjs`
