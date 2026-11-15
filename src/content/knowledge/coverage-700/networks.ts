import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const ip = { title: "IETF RFC 8200 · IPv6 Specification", href: "https://www.rfc-editor.org/rfc/rfc8200.html#section-3" };
const random = { title: "IETF RFC 4086 · Randomness Requirements", href: "https://www.rfc-editor.org/rfc/rfc4086.html" };
const http = { title: "IETF RFC 9110 · HTTP Semantics", href: "https://www.rfc-editor.org/rfc/rfc9110.html" };
const dnssec = { title: "IETF RFC 4033 · DNS Security Introduction", href: "https://www.rfc-editor.org/rfc/rfc4033.html" };
const lag = { title: "Linux Kernel · Ethernet Bonding Driver", href: "https://docs.kernel.org/networking/bonding.html" };

export const network700 = [
  topic(["internet", "layered-models"], ["ipv6-next-header-demux", "IPv6 的下一首部与协议分流", "基础"], ["network-encapsulation"], ip,
    "首部类型告诉接收端接下来怎么读。", "IPv6 的 Next Header 可指向扩展首部或上层协议。沿链读取，直到遇到上层首部或结束标志。",
    "从首部链找到传输层起点。", "IPv6 基本首部指向路由首部。路由首部再指向 TCP。", "基本首部结束后不一定直接出现 TCP 或 UDP。扩展首部可占一段空间。",
    ["基本首部后有扩展首部，怎样找 TCP？", ["固定跳过 40 字节后就读 TCP", "沿 Next Header 及各首部长度定位", "读取目标 MAC 地址"], 1, "40 字节只覆盖 IPv6 基本首部。还需越过扩展首部。"]),
  topic(["cryptography", "security-goals"], ["cryptographic-randomness-keys", "密钥生成与密码学随机性", "基础"], ["confidentiality-integrity-goals"], random,
    "密钥需要难以预测的随机数。", "密码学安全随机数生成器以足够熵初始化。即使攻击者看到一些输出，也应难以预测后续输出。",
    "识别看似随机却可猜的密钥来源。", "把登录时间戳拼成 32 字节，长度够长。若时间范围很小，攻击者仍可枚举。", "编码和补零不增加熵。随机数看起来均匀也不等于安全。",
    ["哪种方式适合生成会话密钥？", ["系统提供的密码学随机数源", "秒级时间戳加盐后公开", "递增用户 ID 转十六进制"], 0, "系统安全随机数源为密钥生成提供难预测的字节。"]),
  topic(["routing-and-switching", "switching"], ["link-aggregation-flow-hash", "链路聚合与流哈希", "进阶"], ["ethernet-source-learning"], lag,
    "聚合提升多条流的总带宽。", "常见散列策略按地址或端口为流选成员链路。同一流通常留在一条链路上，以减少乱序。",
    "区分链路组吞吐与单流上限。", "两条 1 Gbit/s 链路聚合。两个散列到不同链路的流可并行，但单流通常仍受单链路限制。", "聚合并不保证流量均分。多个大流可能散列到同一成员。",
    ["两条 1 Gbit/s 链路聚合后，一条固定映射的 TCP 流能直接获得 2 Gbit/s 吗？", ["可以", "通常不能", "仅在丢包时可以"], 1, "这条流仍使用一个成员，无法同时占用两条链路的容量。"]),
  topic(["internet", "application-layer"], ["dnssec-signed-answers", "DNSSEC 签名与信任链", "进阶"], ["dns-recursive-iterative"], dnssec,
    "用签名验证解析数据来源和完整性。", "验证者从信任锚沿父区 DS 与子区 DNSKEY 验证，再用签名检查资源记录集。",
    "区分可信解析与内容保密。", "攻击者改了已签名域名的 A 记录。验证解析器会发现记录与签名不匹配。", "DNSSEC 不负责加密查询。旁路观察者仍可能看到域名。",
    ["签名验证通过能证明什么？", ["查询已加密", "记录在验证的信任链下可认证", "网站应用没有漏洞"], 1, "签名保护记录来源和完整性，与传输保密及应用代码无关。"]),
  topic(["network-programming", "reliability"], ["http-retry-after-wait", "Retry-After 与重试时间", "基础"], ["retry-idempotency", "retry-budget-jitter"], http,
    "服务端可提示等待多久再试。", "Retry-After 可写延迟秒数或 HTTP 日期。客户端结合截止时间、重试预算及操作语义决定是否重试。",
    "把等待提示与重试安全分开判断。", "服务返回 503 并带 Retry-After: 30。适合重试的请求也应先等待，再看整体时间预算。", "等待提示不保证请求可重放。带副作用的操作仍要处理重复执行。",
    ["Retry-After: 120 表示什么？", ["尝试 120 次", "从收到响应后等待 120 秒", "状态码变为 120"], 1, "纯数字形式以秒为单位，表示延迟。"]),
];
