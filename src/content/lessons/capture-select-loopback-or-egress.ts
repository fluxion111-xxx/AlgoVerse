import type { DeepLesson } from "./types";

export const captureInterfaceLesson: DeepLesson = {
  title: "按通信路径选择采集接口",
  intro: "本机服务已经连上。主机网卡却一个包都没抓到。先画清包走过的接口。",
  goals: ["区分回环和外发接口。", "用路由信息选择观察点。", "解释跨命名空间与 NAT 的差异。"],
  blocks: [
    { id: "path", kind: "explain", title: "先确定命令在哪个网络里", paragraphs: [
      "Linux 的网络命名空间各有接口和路由。容器里的 eth0 与主机的 eth0 可以同名，属于不同边界。",
      "先从发起连接的命名空间查询目标路由。ip route get 会显示这次查找选中的接口。还要核对实际目标和策略条件。",
      "抓包工具只显示选择接口及采集规则能看到的包。顺着路径切换观察点，比盯住默认网卡更有用。",
    ] },
    { id: "trace", kind: "steps", title: "用一枚 SYN 对照三条路", steps: [
      { label: "从主机访问自己", text: "连接 127.0.0.1:8080。路径走主机 lo。先试主机 eth0，看到零条。换成 lo 后，能看到这一枚 SYN。" },
      { label: "从主机访问远端", text: "案例路由选主机 eth0，源地址是 192.0.2.10。此时主机 lo 看不到该 SYN。" },
      { label: "把客户端放入容器", text: "案例经过容器 eth0，再到主机 veth0。到这里仍用容器源地址 172.18.0.2。两处都能看同一方向的 SYN。" },
      { label: "跨 NAT 再看一次", text: "主机做源地址转换后从 eth0 发出。此处展示源地址 192.0.2.10。对应关系要结合方向、目标和 NAT 映射。" },
    ] },
    { id: "limits", kind: "explain", title: "实际排查先排除漏采", paragraphs: [
      "先在正确的命名空间列接口。容器使用自己的回环时，应在容器的 lo 查。此处案例只展示从容器向外发。",
      "Linux 上抓 any 也受当前命名空间限制。一个经过多个接口的包可能留下多条记录。",
      "模型固定了三条路线，只列发出的 SYN。真实路线还取决于桥接、路由和防火墙设置。演示不会读取机器网卡。",
      "接口选好后，再核对采集过滤和记录时间。若缺失前置包，单凭零条记录不能判定应用没发。",
    ] },
  ],
  demo: "capture-interface-path",
  exercises: [
    { id: "deep-interface-loopback", level: "基础", kind: "single", prompt: "主机访问本机 127.0.0.1，优先抓哪里？", options: ["主机 lo", "容器 eth0", "主机外发口"],
      answer: 0, explanation: "本例走主机回环路径。外发网卡不会看到该连接的 SYN。", wrong: "先判断流量是否离开主机。", review: "trace" },
    { id: "deep-interface-nat", level: "应用", kind: "integer", prompt: "容器经 NAT 外发。在主机 eth0 抓，源 IPv4 的最后一段是多少？",
      answer: 10, explanation: "从主机 eth0 观察，地址已换成主机的外发地址。", wrong: "切换到容器 NAT 场景和主机 eth0。", review: "trace" },
    { id: "deep-interface-scope", level: "挑战", kind: "multiple", prompt: "哪些排查做法成立？",
      options: ["在发起连接的空间查路由", "主机 any 必然涵盖容器 lo", "用 NAT 映射辅助配对", "核对过滤器再解释零条记录"],
      answer: [0, 2, 3], explanation: "命名空间隔离接口。NAT 会改写部分字段。观察记录还受采集规则影响。", wrong: "核对观察点及其边界。", review: "limits" },
  ],
  recap: ["回环与外发走不同接口。", "先核对所在网络空间。", "跨 NAT 需对应地址。"],
  extension: "换成容器场景，对比 veth0 与 eth0 的源地址。接着学习采集过滤和显示过滤。",
  next: "capture-filter-versus-display-filter",
  sources: [
    { title: "Linux ip-route(8) · ip route get", href: "https://man7.org/linux/man-pages/man8/ip-route.8.html" },
    { title: "TShark · Capture Interfaces", href: "https://www.wireshark.org/docs/man-pages/tshark.html" },
  ],
};
