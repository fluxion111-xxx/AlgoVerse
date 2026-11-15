import type { KnowledgeDomain } from "../../lib/knowledge";

export const networks = {
  id: "networks",
  title: "计算机网络",
  courses: [{
    id: "internet",
    title: "互联网基础",
    chapters: [{
      id: "network-layer",
      title: "网络层",
      topics: [{
        id: "packet-routing",
        title: "数据包转发与丢包",
        summary: "先选下一跳，再看看包能否送到。",
        sections: [
          { title: "路由器怎么转发", paragraphs: ["路由器查看目的地址。它选最长匹配的前缀。", "转发表会给出下一跳。中间的设备逐跳转发。"] },
          { title: "实验怎样选路", paragraphs: ["四个节点组成两条路。实验按总延迟挑路线。", "两条路分别用 5 和 9 毫秒。实验会选 5 毫秒那条。", "每跳都可能丢包。把丢包率调到 100%。看看能送到几个包。"] },
        ],
        sources: [{ title: "IETF RFC 1812 · IPv4 Router Requirements", href: "https://www.rfc-editor.org/rfc/rfc1812.html" }],
        relatedTopicIds: ["weighted-paths", "tcp-udp"],
        experiments: [{ engineId: "network-transmission", label: "打开传输实验", prompt: "改延迟和丢包率，再发一组包。" }],
      }],
    }, {
      id: "transport-layer",
      title: "传输层",
      topics: [{
        id: "tcp-udp",
        title: "TCP 与 UDP",
        summary: "一边交付字节流，一边发送数据报。",
        sections: [
          { title: "应用读到什么", paragraphs: ["TCP 交付有序字节流。两次写入，可能一次读到。", "UDP 保留数据报边界。协议本身不保证送达。"] },
          { title: "丢了一段会怎样", paragraphs: ["TCP 会尝试重传。应用可能要等缺失的字节。", "UDP 不负责重传。需要时，应用可以自己补。"] },
        ],
        sources: [
          { title: "IETF RFC 9293 · TCP", href: "https://www.rfc-editor.org/rfc/rfc9293.html" },
          { title: "IETF RFC 768 · UDP", href: "https://www.rfc-editor.org/info/rfc768/" },
        ],
        prerequisiteIds: ["packet-routing"],
        experiments: [],
      }],
    }],
  }, {
    id: "network-security",
    title: "网络安全",
    chapters: [{
      id: "secure-connections",
      title: "安全连接",
      topics: [{
        id: "tls-handshake",
        title: "TLS 1.3 握手",
        summary: "先建立信任，再加密传数据。",
        sections: [
          { title: "开头交换什么", paragraphs: ["客户端先发握手消息。它给出支持的参数。", "服务端选定参数。常见的握手会交换密钥份额。"] },
          { title: "浏览器怎样认网站", paragraphs: ["常规 HTTPS 握手会检查证书。客户端核对站点身份。", "双方派生会话密钥。后续应用数据就能加密。"] },
        ],
        sources: [{ title: "IETF RFC 8446 · TLS 1.3", href: "https://www.rfc-editor.org/rfc/rfc8446.html" }],
        prerequisiteIds: ["tcp-udp"],
        experiments: [],
      }],
    }],
  }],
} satisfies KnowledgeDomain;
