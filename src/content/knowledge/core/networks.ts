import { concept as topic } from "./types";

const ip = { title: "IETF RFC 8200 · IPv6", href: "https://www.rfc-editor.org/rfc/rfc8200.html" };
const cidr = { title: "IETF RFC 4632 · CIDR", href: "https://www.rfc-editor.org/rfc/rfc4632.html" };
const tcp = { title: "IETF RFC 9293 · TCP", href: "https://www.rfc-editor.org/rfc/rfc9293.html" };
const http = { title: "IETF RFC 9110 · HTTP Semantics", href: "https://www.rfc-editor.org/rfc/rfc9110.html" };
const tls = { title: "IETF RFC 8446 · TLS 1.3", href: "https://www.rfc-editor.org/rfc/rfc8446.html" };
const security = { title: "OWASP · ASVS", href: "https://asvs.owasp.org/" };

export const networks = [
  topic("internet", "layered-models", "network-encapsulation", "网络分层与封装", "基础", "每层为上一层提供服务。", "应用数据交给传输层。IP 承载传输报文。下一跳链路再用本地帧承载 IP 包。", ip),
  topic("internet", "data-link", "ipv6-neighbor-discovery", "IPv6 邻居发现", "基础", "在本链路查找邻居地址。", "节点可用邻居请求和邻居通告解析链路层地址。邻居发现也能发现路由器和前缀。", { title: "IETF RFC 4861 · Neighbor Discovery", href: "https://www.rfc-editor.org/rfc/rfc4861.html" }, ["network-encapsulation"]),
  topic("internet", "network-layer", "ipv6-hop-limit", "IPv6 跳数限制", "基础", "每过一台转发路由器减一。", "路由器转发前递减 Hop Limit。转发时降到零须丢包，以限制路由环路的持续时间。", ip, ["network-encapsulation"]),
  topic("internet", "transport-layer", "tcp-sequence-ack", "TCP 序号与累计确认", "进阶", "确认号指出接下来期待的字节。", "TCP 以序号标识字节。累计确认隐含更早的连续字节均已到达，后续缺口仍需处理。", tcp, ["tcp-udp"]),
  topic("internet", "application-layer", "http-method-idempotency", "HTTP 方法的幂等语义", "基础", "重复同一请求时，预期效果相同。", "幂等性看服务端预期效果。多次 DELETE 的状态码可能不同，目标仍是移除该资源。", http, ["network-encapsulation"]),
  topic("routing-and-switching", "subnets", "cidr-prefix-match", "CIDR 前缀与最长匹配", "基础", "匹配多个路由时用更具体的。", "前缀长度越长，地址范围越小。转发时从覆盖目的地址的项里挑最长匹配。", cidr, ["packet-routing"]),
  topic("routing-and-switching", "intra-domain", "link-state-routing", "链路状态路由", "进阶", "路由器用拓扑视图计算路径。", "在同一区域泛洪链路状态。各路由器根据收到的拓扑信息运行最短路径算法。", { title: "IETF RFC 2328 · OSPF Version 2", href: "https://www.rfc-editor.org/rfc/rfc2328.html" }, ["weighted-paths", "cidr-prefix-match"],
    [{ engineId: "dynamic-routing", label: "试试断链重算", prompt: "断开链路。比较下一跳和成本。" }]),
  topic("routing-and-switching", "inter-domain", "bgp-policy", "BGP 路径与路由策略", "进阶", "跨自治系统选路受策略约束。", "BGP 通告可达前缀和路径属性。自治系统可按本地策略选择和传播路径。", { title: "IETF RFC 4271 · BGP-4", href: "https://www.rfc-editor.org/rfc/rfc4271.html" }, ["cidr-prefix-match"]),
  topic("network-programming", "framing", "tcp-message-framing", "TCP 字节流与消息边界", "基础", "一次读取可能只得到半条消息。", "应用协议可用长度前缀划分消息。先收齐长度，再积累对应数量的字节。", tcp, ["tcp-udp"]),
  topic("network-programming", "reliability", "retry-idempotency", "请求重试与重复副作用", "进阶", "超时后，原请求可能已执行。", "重试有副作用的操作时，可用幂等键关联同一次意图。服务端需一致地保存并复用结果。", http, ["http-method-idempotency"]),
  topic("network-programming", "modern-transports", "tcp-receive-window", "TCP 接收窗口与流控", "进阶", "接收方通告还能接多少字节。", "发送方遵守接收窗口，避免压满接收缓冲。拥塞控制另根据网络状况限制在途数据。", tcp, ["tcp-sequence-ack"]),
  topic("cryptography", "symmetric", "authenticated-encryption", "认证加密与 nonce", "进阶", "一次加密同时保护内容和完整性。", "认证解密要验证标签。nonce 重用的影响取决于算法，使用时须遵守同密钥的唯一性要求。", tls, ["tls-handshake"]),
  topic("cryptography", "hash-and-mac", "hmac-keyed-integrity", "哈希与 HMAC", "进阶", "HMAC 用共享密钥验证消息。", "普通哈希可由任何人重算。HMAC 的生成与验证都需要共享密钥。", { title: "IETF RFC 2104 · HMAC", href: "https://www.rfc-editor.org/rfc/rfc2104.html" }),
  topic("web-security", "authentication", "authentication-authorization", "身份认证与授权", "基础", "先确认身份，再检查权限。", "登录只能确认是谁。每次访问资源仍要检查该身份是否有对应操作权限。", security),
  topic("web-security", "injection", "parameterized-sql", "参数化查询", "基础", "把查询结构和用户数据分开。", "参数绑定把值交给驱动处理。动态表名等结构部分通常要使用允许列表。", security, ["sql-inner-left-join"]),
  topic("web-security", "browser-security", "cors-origin-boundary", "同源策略与 CORS", "进阶", "源由协议、主机和端口组成。", "CORS 允许符合规则的浏览器脚本读取跨源响应。服务端仍须自行认证和授权。", { title: "MDN · CORS", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" }, ["authentication-authorization"]),
];
