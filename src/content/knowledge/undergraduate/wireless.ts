import { fullTopic as topic } from "@/content/knowledge/coverage/types";
import { wirelessSource as wireless } from "@/content/curriculum/undergraduate";
const tcp = { title: "IETF RFC 9293 · TCP", href: "https://www.rfc-editor.org/rfc/rfc9293.html" };
const quic = { title: "IETF RFC 9000 · QUIC Connection Migration", href: "https://www.rfc-editor.org/rfc/rfc9000.html#name-connection-migration" };

export const wirelessTopics = [
  topic(["wireless-networks", "radio-link"], ["wireless-signal-noise-ratio", "无线信噪比与传输选择", "基础"], ["network-encapsulation"], wireless,
    "接收时既看信号，也看噪声。", "信噪比是接收信号功率除以噪声功率。更高的信噪比通常允许更激进的调制，但具体速率还受信道与设备限制。",
    "解释同一信号强度为何表现不同。", "信号功率相同，教室一侧的噪声多四倍，信噪比只有另一侧的四分之一。", "满格信号只说明接收强度较高。附近干扰仍可能压低有效吞吐。",
    ["信号功率不变，噪声变为两倍。线性信噪比如何？", ["减半", "不变", "翻倍"], 0, "噪声在比值分母，分母翻倍会让比值减半。"]),
  topic(["wireless-networks", "radio-link"], ["multipath-delayed-copies", "无线多径与延迟副本", "基础"], ["shifted-sequence-delay"], wireless,
    "同一发送波形可沿多条路径到达。", "直射、反射或散射路径长度不同。接收端看到带不同延时与相位的信号叠加，可能增强或减弱，也可能出现符号间干扰。",
    "区分多径与两台设备同时发包。", "室内直达波先到。墙面反射的副本稍晚到，两路在接收端合成。", "反射不是另一个发送者复制数据包。接收效果取决于相位和时延。",
    ["两条路径相位相反、振幅相同且同时叠加，该点可能怎样？", ["发生抵消", "振幅一定加倍", "频率一定翻倍"], 0, "同振幅的反相分量相加可得零。"]),
  topic(["wireless-networks", "medium-access"], ["wifi-contention-random-backoff", "无线接入的随机退避", "基础"], ["probability-independence-exclusive"], wireless,
    "用随机等待错开抢占。", "多个站点发现信道空闲后，可能同时发送。竞争式接入可选随机退避槽。遇到信道忙时，计数按协议暂停。",
    "用两个计数值预测发送顺序。", "A 和 B 分别选 1 槽与 5 槽。信道一直空闲时，A 先到零。", "随机退避仍可能抽到同一格。它减少冲突概率，不能保证零冲突。",
    ["A 与 B 选到同一退避计数，冲突还可能发生吗？", ["可能", "不可能", "只在两台设备不同信道时发生"], 0, "它们可能同时认为已到发送时刻。"]),
  topic(["wireless-networks", "medium-access"], ["wifi-hidden-terminal", "无线隐藏终端", "基础"], ["wifi-contention-random-backoff"], wireless,
    "听不到另一发送者，仍能撞到同一接收点。", "载波侦听来自发送者所在位置。若两方信号彼此太弱，却都能到达一个接收端，就可能同时发送并在接收端冲突。",
    "从三节点拓扑找出局部盲区。", "角落 A 与 C 听不见彼此。中间接入点 B 能听见两边，两方同时发给 B 会干扰。", "提高侦听能力可能改变可复用范围。RTS/CTS 也有额外开销和适用条件。",
    ["A 与 C 各自觉得空闲，冲突主要在哪里？", ["两份信号重叠的接收点 B", "A 的界面", "只在 Internet 核心路由器"], 0, "接收端同时收到两份难以分离的信号。"]),
  topic(["wireless-networks", "wifi-operation"], ["wifi-association-bssid", "SSID、BSSID 与接入关联", "基础"], ["wifi-hidden-terminal"], wireless,
    "同一网络名下可有多个接入点。", "SSID 用于标识网络名。BSSID 用于标识具体服务集实例。终端关联到某个接入点服务集来交换无线帧。",
    "区分网络名与当前接入点。", "校园有多台 AP 都广播 Campus。手机走到另一层仍看见同一名称，但当前 BSSID 可以改变。", "同名 SSID 自身不能证明属于同一组织。身份和网络属性需另据机制确认。",
    ["两台 AP 广播同一 SSID，终端能用什么区分两处服务集？", ["BSSID", "相同 SSID 的字符串本身", "应用用户名"], 0, "BSSID 区分各个服务集实例。"]),
  topic(["wireless-networks", "wifi-operation"], ["wifi-channel-interference", "无线信道重叠与干扰", "基础"], ["wireless-signal-noise-ratio"], wireless,
    "频道编号不同，频谱仍可能重叠。", "无线信号占一定频率范围。相邻宽频道若频谱重叠，两个设备的传输可互相干扰。",
    "判断改信道是否真的减少重叠。", "两台 AP 只把中心频率错开一点，却都占较宽频段。部分频谱仍重合。", "只比较频道编号不足以判断。也要看信道宽度与现场占用。",
    ["两个信道号不同，能断定二者互不干扰吗？", ["能，编号不同就足够", "不能", "取决于路由器名称"], 1, "频道有带宽，实际频谱仍可能重叠。"]),
  topic(["wireless-networks", "moving-endpoints"], ["tcp-address-change-session", "移动换网与 TCP 连接身份", "基础"], ["tcp-udp", "wifi-association-bssid"], tcp,
    "Wi-Fi 接入变化和 IP 变化是两件事。", "普通 TCP 连接以两端 IP 和端口区分。若切到新网络并得到新 IP，旧连接通常不能直接用新地址继续。",
    "分辨链路漫游与传输层重连。", "同一子网上从一个 AP 漫游到另一个，IP 可不变。从 Wi-Fi 切到蜂窝网络时，IP 则可能改变。", "应用重新登录、会话续用和 TCP 重建各属不同层。",
    ["移动时本机 IP 改变，普通 TCP 通常要做什么？", ["给旧连接换个显示名", "重新建立连接", "只修改 SSID 就自动延续"], 1, "新 IP 改变了 TCP 所用的端点身份。"]),
  topic(["wireless-networks", "moving-endpoints"], ["quic-validated-path-migration", "QUIC 连接迁移与路径验证", "进阶"], ["tcp-address-change-session", "quic-stream-isolation"], quic,
    "网络路径改变后可验证并继续连接。", "在允许迁移的连接中，连接 ID 可帮助定位旧连接。端点验证新路径可达性，再管理迁移后的发送与拥塞状态。",
    "辨认续用连接需要的两个机制。", "手机由 Wi-Fi 切蜂窝。支持迁移的客户端可在新路径上继续原 QUIC 会话。", "连接 ID 不是跳过路径验证的凭证。对端配置也可能禁用主动迁移。",
    ["看到可识别的连接 ID 后，能否省略对新路径可达性的检查？", ["不能", "能", "只有数据少于 8 字节就能"], 0, "连接识别与路径验证各自解决不同问题。"]),
];
