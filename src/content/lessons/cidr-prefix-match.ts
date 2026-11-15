import type { DeepLesson } from "./types";

export const cidrPrefixLesson: DeepLesson = {
  title: "CIDR 前缀与最长匹配",
  intro: "一个包的目标地址同时落进三条路由。路由器需要找出其中最具体的一条。",
  goals: ["用位前缀划定 IPv4 地址范围。", "手工找出所有匹配项。", "区分转发选择和路径计算。"],
  blocks: [
    { id: "prefix", kind: "explain", title: "斜杠后面数位数", paragraphs: [
      "IPv4 地址由 32 位组成。CIDR 的 /n 表示固定前 n 位。剩余位可以变化。前缀位越多，覆盖范围越小。",
      "目的地址要与一条路由匹配，必须与它共享前 n 位。从十进制看相似不够。应按二进制或掩码判断。",
      "测试网段 203.0.113.0/24 固定前三段。末段还有 8 位。/25 再固定一位。/26 再固定两位。",
    ], formula: "匹配：目的地址 & 掩码 = 网络地址\n地址块大小 = 2^(32−n)\n匹配多条时，选择最大的 n" },
    { id: "trace", kind: "steps", title: "同一地址匹配三次", steps: [
      { label: "找 /24", text: "目标为 203.0.113.200。末段二进制为 11001000。/24 可覆盖末段 0–255，匹配 A。" },
      { label: "找 /25", text: "128 的最高位为 1。目标最高位也为 1。128/25 覆盖 128–255，匹配 B。" },
      { label: "找 /26", text: "192 的前两位为 11。200 同样以 11 开头。192/26 覆盖 192–255，匹配 C。" },
      { label: "撤去一条再查", text: "三条都在时，/26 最长，选 C。撤去 /26 后，/25 仍匹配，改选 B。若目标末段为 127，则只匹配 /24。" },
    ] },
    { id: "code", kind: "code", title: "用 Python 核对匹配", language: "Python",
      source: "from ipaddress import ip_address, ip_network\n\ntarget = ip_address('203.0.113.200')\nroutes = [ip_network('203.0.113.' + s)\n          for s in ('0/24', '128/25', '192/26')]\nmatches = [net for net in routes if target in net]\nprint(max(matches, key=lambda net: net.prefixlen))",
      notes: [{ lines: "1–3", text: "把目标解析成 IPv4 地址。" }, { lines: "4–6", text: "先构建前缀，再按包含关系筛选。" },
        { lines: "7", text: "取前缀位数最大的项，输出 /26。" }] },
    { id: "forwarding", kind: "explain", title: "选中前缀后做什么", paragraphs: [
      "转发表给出下一跳或出接口。这个查找以目标地址为输入。它不需要为每个包重算全网路径。",
      "动态路由协议会改变表中的候选项。表内容变化后，同一个目的地可能改走另一跳。",
      "/0 不固定任何位。它只在已有默认路由时参与匹配。若同一前缀还有多条同长候选，需按实际设备规则处理。本演示每个前缀只有一条。",
    ] },
  ],
  demo: "ipv4-prefix",
  exercises: [
    { id: "deep-cidr-width", level: "基础", kind: "single", prompt: "哪个前缀覆盖的 IPv4 地址最少？", options: ["/24", "/25", "/26"], answer: 2,
      explanation: "/26 固定 26 位，仅余 6 位变化，共 64 个地址。", wrong: "固定的位越多，可变的位越少。", review: "prefix" },
    { id: "deep-cidr-bound", level: "应用", kind: "integer", prompt: "192/26 从末段 192 起。块内共有多少个地址？", answer: 64,
      explanation: "末段覆盖 192–255，包含两端，共 64 个。", wrong: "范围包含起点和终点。", review: "trace" },
    { id: "deep-cidr-forward", level: "挑战", kind: "multiple", prompt: "用本节三条路由判断。哪些说法正确？", options: ["200 匹配 /26", "127 匹配 /25", "撤去 /26 后 200 改走 B", "查找使用目的地址"], answer: [0, 2, 3],
      explanation: "200 在两条更具体的覆盖范围内。127 小于 128。最长匹配用目的地址查询转发表。",
      wrong: "不要比较十进制字符串。检查地址范围。", review: "forwarding" },
  ],
  recap: ["前缀长度是位数。", "先查包含关系。", "匹配后选最长前缀。"],
  extension: "把末段从 191 调到 192。再读链路变化如何更新表。",
  next: "link-state-routing",
  sources: [{ title: "IETF RFC 4632 · CIDR and Routing", href: "https://www.rfc-editor.org/rfc/rfc4632.html" }],
};
