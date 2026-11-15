import { hainan, cs2023, sdjzu } from "./sources";
import { curriculumCourse as course } from "./types";

const ietf = { title: "RFC Editor · RFC Series", href: "https://www.rfc-editor.org/standards" };
const owasp = { title: "OWASP · ASVS", href: "https://asvs.owasp.org/" };

export const networkCurriculum = [
  course("internet", "互联网基础", [hainan, sdjzu, cs2023], [
    ["layered-models", "网络分层与封装", "OSI、TCP/IP、帧、包与端到端交付"],
    ["data-link", "链路层与以太网", "帧、差错检测、MAC、ARP"],
    ["network-layer", "网络层", "IPv4、IPv6、前缀、转发、ICMP"],
    ["transport-layer", "传输层", "TCP 字节流、UDP 数据报、可靠传输"],
    ["application-layer", "应用层协议", "DNS、HTTP、SMTP、协议交互"],
  ]),
  course("routing-and-switching", "路由与交换", [hainan, cs2023, ietf], [
    ["subnets", "地址规划与子网", "CIDR、聚合、最长前缀匹配"],
    ["switching", "二层交换与 VLAN", "MAC 学习、广播域、生成树"],
    ["intra-domain", "域内路由", "距离向量、链路状态、OSPF"],
    ["inter-domain", "域间路由", "自治系统、BGP、路径策略"],
    ["troubleshooting", "抓包与故障定位", "TTL、逐跳探测、时延与丢包"],
    ["capture-evidence", "抓包采集与证据", "采集点、采集过滤、显示过滤、丢帧与时间戳"],
    ["packet-trace-diagnostics", "用报文时序排障", "握手、重传、乱序、零窗口、DNS 与路径 MTU"],
    ["ipv6-transition", "IPv6 过渡与互通", "双栈、Happy Eyeballs、NAT64、DNS64、464XLAT 与路径 MTU"],
    ["dual-end-capture", "双端抓包与对照实验", "连接配对、协议序号、时钟校正、双端实采与证据边界"],
  ]),
  course("network-programming", "网络编程", [cs2023, ietf], [
    ["sockets", "套接字接口", "连接、监听、端口、地址解析"],
    ["framing", "消息边界与序列化", "长度前缀、部分读写、数据报上限"],
    ["nonblocking", "并发与非阻塞 I/O", "事件循环、连接管理、背压"],
    ["reliability", "重试与超时", "超时预算、退避、幂等"],
    ["modern-transports", "拥塞与现代传输", "流量控制、拥塞控制、QUIC"],
  ]),
  course("network-security", "网络安全", [cs2023, ietf, owasp], [
    ["threat-models", "网络威胁建模", "攻击面、窃听、篡改、拒绝服务"],
    ["threat-model-workshop", "威胁建模与验证", "资产与数据流、信任边界、STRIDE、缓解与复核"],
    ["secure-connections", "安全连接", "TLS、证书链、握手与会话密钥"],
    ["network-controls", "防火墙与网络隔离", "访问控制、分段、VPN 与信任边界"],
    ["monitoring", "网络监测与响应", "流量基线、日志、检测与处置"],
  ]),
  course("cryptography", "密码学基础", [cs2023, ietf], [
    ["security-goals", "密码学目标", "机密性、完整性、随机数、威胁假设"],
    ["symmetric", "对称加密", "分组密码、nonce、认证加密"],
    ["hash-and-mac", "哈希与消息认证", "抗碰撞、HMAC、密钥派生"],
    ["public-key", "公钥、签名与密钥交换", "数字签名、Diffie–Hellman、公钥认证"],
    ["key-management", "密钥与证书管理", "信任链、轮换、撤销"],
  ]),
  course("web-security", "身份认证与 Web 安全", [owasp, cs2023], [
    ["authentication", "认证与账户防护", "口令存储、多因素认证、速率限制"],
    ["sessions", "会话与联合登录", "Cookie、令牌、OAuth 与 OIDC 的职责"],
    ["authorization", "授权与权限边界", "资源归属、角色、最小权限"],
    ["authorization-audit", "权限审计与回归", "权限清单、有效授权、职责分离、审计事件与回归用例"],
    ["service-authorization-regression", "真实服务权限回归", "访客夹具、资源归属、直接取数、诊断负例、缓存与撤权"],
    ["role-revocation-cache-isolation", "角色撤权与缓存隔离", "角色快照、策略版本、缓存指令、条件请求与传播窗口"],
    ["online-revocation-cdn-verification", "线上撤权与 CDN 隔离验证", "缓存正对照、请求变体、旧凭据、边缘节点与传播"],
    ["injection", "注入与输入处理", "SQL 注入、XSS、参数化、上下文编码"],
    ["browser-security", "浏览器安全边界", "同源策略、CORS、CSRF、CSP"],
  ]),
];
