import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const rfc = (number: number, title: string) => ({ title: `IETF RFC ${number} · ${title}`, href: `https://www.rfc-editor.org/rfc/rfc${number}.html` });

export const advancedNetworks = [
  topic(["internet", "application-layer"], ["dns-negative-cache", "DNS 否定应答的缓存", "进阶"], ["dns-recursive-iterative"], rfc(2308, "Negative Caching of DNS Queries"),
    "找不到记录也可以暂时缓存。", "否定应答可按规则缓存。NXDOMAIN 表示名字不存在。NODATA 表示名字存在，但请求的记录类型缺失。",
    "识别新增记录后短暂查不到的原因。", "刚查过不存在的名字，随后立即创建。递归解析器可能仍使用未过期的否定结果。", "查询超时不同于权威否定应答。不能把连接失败当作名字不存在。",
    ["域名存在，但没有 AAAA。应理解为什么？", ["该类型没有数据", "整个域名不存在", "必然是网络超时"], 0, "缺少某种记录不代表名字不存在，属于 NODATA 场景。"]),
  topic(["internet", "transport-layer"], ["tcp-half-close-fin", "TCP 半关闭与 FIN", "进阶"], ["tcp-three-way-sequence"], rfc(9293, "TCP"),
    "结束一边发送，仍可接收另一边。", "FIN 表示该方向不再发送数据。对方可继续发送，直到它自己的方向也关闭。",
    "安排写完请求后继续等响应。", "客户端发送完成后关闭写方向。服务端读到结束，仍能回完整结果。", "半关闭和重置不同。重置通常表示异常中断连接。",
    ["客户端只结束发送方向，还能做什么？", ["再发送新请求字节", "继续读服务端数据", "强制服务端同时结束"], 1, "TCP 的两个方向可分别关闭，接收方向仍能继续。"]),
  topic(["routing-and-switching", "intra-domain"], ["ospf-area-topology-scope", "OSPF 区域内的拓扑范围", "进阶"], ["link-state-routing"], rfc(2328, "OSPF Version 2"),
    "区域可约束链路状态的传播范围。", "同一区域路由器维护该区域拓扑。区域边界路由器连接多个区域，并交换跨区路由信息。",
    "分辨本区域拓扑和跨区摘要。", "区域 1 的内部变化可先在本区传播。其他区域不必获取全部内部链路细节。", "区域划分不会让跨区路由自动消失。边界路由仍负责传递可达性。",
    ["希望限制内部链路变化的传播范围，OSPF 用什么划分？", ["应用进程号", "TCP 端口", "区域"], 2, "区域限定部分链路状态传播，让其他区无需知道全部细节。"]),
  topic(["network-programming", "framing"], ["frame-length-resource-limit", "消息长度前缀的资源上限", "基础"], ["tcp-message-framing", "server-side-validation"], { title: "MITRE CWE-400 · Uncontrolled Resource Consumption", href: "https://cwe.mitre.org/data/definitions/400.html" },
    "收到长度后先查上限，再分配。", "对端可谎报长度。解析器须验证范围，并限制累计缓冲。否则小输入也可迫使服务分配大量内存。",
    "在读取正文前拒绝不合理长度。", "协议只准 64KB。对端声明 1GB。服务端直接报错，避免分配。", "长度在整数范围内仍可能太大。业务上限要单独检查。",
    ["协议上限 64KB，消息头声明 1GB。第一步做什么？", ["拒绝超限消息", "先分配 1GB 再读", "把长度字段忽略"], 0, "不可信长度必须先通过协议上限检查。"]),
  topic(["web-security", "sessions"], ["session-id-rotation-login", "登录后的会话 ID 轮换", "基础"], ["cookie-httponly-samesite", "authentication-authorization"], { title: "OWASP · Session Management Cheat Sheet", href: "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html" },
    "权限升级时，换一个会话标识。", "登录前的会话可能已被对手获知。认证成功后生成新标识，并使旧标识不再代表认证会话。",
    "识别会话固定的攻击机会。", "攻击者引导受害者使用已知匿名会话。若登录后沿用标识，就可能被复用。", "只给 Cookie 加 HttpOnly 不能修复会话固定。权限变化时要轮换。",
    ["匿名访客成功登录。会话标识怎样处理更合适？", ["永远沿用旧标识", "签发新标识并使旧标识失效", "把用户名直接设成标识"], 1, "轮换可阻止已知的登录前标识获得新权限。"]),
  topic(["cryptography", "key-management"], ["tls-trust-anchor-selection", "证书路径的本地信任锚", "进阶"], ["certificate-chain-rotation"], rfc(5280, "Internet X.509 PKI"),
    "信任来自本地策略。", "对端提供中间证书可帮助建链。验证还须接到客户端已信任的锚，核对路径签名和约束。",
    "解释自签名根为何不会自动受信。", "陌生站点随握手发送自签名根。客户端未安装该根，链仍无法建立信任。", "链上证书齐全，只说明材料足够。信任锚由验证方决定。",
    ["服务端把陌生根也发过来。客户端应自动信任吗？", ["只要根是自签名就信", "只要名称正确就信", "不会自动信任"], 2, "若服务端能自行选择信任锚，任何对端都可伪造一条可接受路径。"]),
];
