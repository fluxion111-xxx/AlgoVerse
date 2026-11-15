import { lesson } from "@/content/knowledge/teaching/types";

export const networksReview700 = {
  "ipv6-neighbor-discovery": lesson("基础", "跟踪邻居请求如何填充链路层地址。", "主机知道同链路邻居的 IPv6 地址。它发送邻居请求，依据对方通告更新邻居缓存。", "要发往远端时，解析的通常是下一跳路由器。不是隔网寻找目标的 MAC。",
    { id: "practice", prompt: "目标在远端且走默认路由，通常要查询谁的链路层地址？", options: ["远端主机", "下一跳路由器", "公共 DNS 服务器"], answer: 1, explanation: "当前链路的帧要先交给下一跳。远端地址仍留在 IP 包中。" }),
  "http-method-idempotency": lesson("基础", "用服务端预期状态判断重复请求。", "DELETE 第一次返回 204，第二次返回 404。两次都以资源不存在为目标。", "幂等方法可以返回不同响应。也可产生多条访问日志。",
    { id: "practice", prompt: "DELETE 第二次返回 404，能据此判它不幂等吗？", options: ["能", "不能", "只看第二次响应时间"], answer: 1, explanation: "状态码不是判据。重复请求的预期服务端效果相同。" }),
  "bgp-policy": lesson("进阶", "区分路径长度与运营策略。", "路由器收到客户和对等方的两条路由。若给客户路由更高本地偏好，可选它，即使其 AS 路径较长。", "BGP 决策不等于跨域全局最短路径。邻居关系与本地策略也会影响选择。",
    { id: "practice", prompt: "高本地偏好的路径较长，是否仍可能选中它？", options: ["可以", "不可以", "只允许路径等长"], answer: 0, explanation: "本地偏好在常见决策中可先于 AS 路径长度比较。" }),
  "authenticated-encryption": lesson("进阶", "为同一密钥下的消息安排互不重复的 nonce。", "同一 AES-GCM 密钥加密三条消息。为每条消息分配不同计数器值，并确保重启后不重复。", "nonce 一般可随密文公开。它与必须保密的密钥职责不同。",
    { id: "practice", prompt: "同一 AES-GCM 密钥能因两条明文不同就重用 nonce 吗？", options: ["能", "不能", "只要 nonce 没公开就能"], answer: 1, explanation: "复用会破坏方案的安全条件。明文不同也不能避免该风险。" }),
  "authentication-authorization": lesson("基础", "把确认身份和检查权限分开。", "小陈登录成功，但只能查看自己的订单。读取别人的订单时还需做对象级授权。", "界面隐藏按钮不能替代服务端授权。请求仍可直接发给服务端。",
    { id: "practice", prompt: "登录用户请求别人的账单，服务端还应检查什么？", options: ["该用户对这张账单的权限", "登录页的背景色", "浏览器是否有返回键"], answer: 0, explanation: "认证已经确认是谁。还需判断这个身份能否读取该对象。" }),
};
