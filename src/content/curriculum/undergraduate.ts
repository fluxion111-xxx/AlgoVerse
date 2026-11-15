import { cs2023 } from "./sources";
import { curriculumCourse as course } from "./types";

export const parallelSource = { title: "CMU 15-418 · Parallel Architecture and Programming", href: "https://www.cs.cmu.edu/afs/cs/academic/class/15418-s22/www/" };
export const distributedSource = { title: "MIT 6.5840 · Distributed Systems", href: "https://pdos.csail.mit.edu/6.824/schedule.html" };
export const embeddedSource = { title: "UT Austin · Embedded Systems: Shape The World", href: "https://users.ece.utexas.edu/~valvano/Volume1/E-Book/" };
export const graphicsSource = { title: "Stanford CS148 · Computer Graphics and Imaging", href: "https://web.stanford.edu/class/cs148/index.html" };
export const hciSource = { title: "CS2023 · Human-Computer Interaction Core", href: "https://csed.acm.org/hci-cs-core/" };
export const ethicsSource = { title: "ACM · Code of Ethics and Professional Conduct", href: "https://www.acm.org/binaries/content/assets/about/acm-code-of-ethics-booklet.pdf" };
export const languageSource = { title: "University of Washington CSE 341 · Programming Languages", href: "https://courses.cs.washington.edu/courses/abet/syllabi/static/CSE341.html" };
export const signalSource = { title: "MIT 6.003 · Signals and Systems", href: "https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/" };
export const retrievalSource = { title: "Stanford · Introduction to Information Retrieval", href: "https://nlp.stanford.edu/IR-book/html/htmledition/irbook.html" };
export const wirelessSource = { title: "UW–Madison CS 640 · Wireless Networks", href: "https://pages.cs.wisc.edu/~akella/CS640/F07/slides/F07_Lecture21_wireless.pdf" };

export const undergraduateNetworks = [
  course("wireless-networks", "无线与移动网络", [cs2023, wirelessSource], [
    ["radio-link", "无线信道与传输", "信噪比、多径传播、信号衰减"],
    ["medium-access", "无线信道接入", "载波侦听、随机退避、隐藏终端、RTS/CTS"],
    ["wifi-operation", "Wi-Fi 局域网", "接入点、关联、漫游、信道干扰"],
    ["moving-endpoints", "移动时的连接", "地址变化、传输层路径迁移、应用会话"],
  ]),
];

export const undergraduateSystems = [
  course("parallel-computing", "并行计算与高性能基础", [cs2023, parallelSource], [
    ["parallel-cost", "并行成本模型", "工作量、关键路径、加速比、效率"],
    ["parallel-patterns", "常见并行模式", "归约、前缀扫描、任务调度"],
    ["shared-memory", "共享内存与同步", "屏障、故障定位、任务本地数据"],
    ["accelerators", "向量处理与 GPU", "SIMD、分支分歧、合并访存、GPU 数据传输"],
    ["mpi-messaging", "MPI 进程与消息通信", "rank、通信域、消息配对、死锁、非阻塞与邻域交换"],
    ["mpi-collectives", "MPI 集合操作与实践", "广播、归约、分块、时间对照与并行校验"],
    ["mpi-cross-node", "MPI 跨节点性能", "节点映射、往返计时、消息尺寸、绑核与吞吐"],
  ]),
  course("distributed-systems", "分布式系统基础", [cs2023, distributedSource], [
    ["systems-model", "通信与故障模型", "RPC、部分故障、超时、请求去重"],
    ["time-ordering", "分布式时间与顺序", "先发生关系、逻辑时钟、并发事件"],
    ["replication-consistency", "复制与一致性", "主从复制、陈旧读、线性一致性、最终一致性"],
    ["consensus", "共识与故障恢复", "多数派、Raft 任期、复制日志、提交"],
  ]),
  course("embedded-systems", "嵌入式系统基础", [cs2023, embeddedSource], [
    ["microcontroller-io", "微控制器与外设", "内存映射 I/O、GPIO、上拉电阻"],
    ["events-timing", "中断与定时", "中断处理、按键消抖、定时周期"],
    ["data-acquisition", "数据采集与控制", "ADC 量化、采样频率、PWM"],
    ["peripheral-buses", "外设通信接口", "UART、串口帧、SPI、I²C"],
  ]),
];

export const undergraduateProgramming = [
  course("computer-graphics", "计算机图形学", [cs2023, graphicsSource], [
    ["geometry-transforms", "几何与坐标变换", "齐次坐标、点与方向、变换复合、坐标空间"],
    ["camera-projection", "相机与投影", "正交投影、透视投影、齐次除法、裁剪"],
    ["rasterization", "光栅化与可见性", "重心坐标、属性插值、深度缓冲"],
    ["perspective-rasterization", "透视校正光栅化", "像素覆盖、共享边、齐次裁剪、UV 与深度插值"],
    ["lighting-rendering", "光照与渲染", "漫反射、阴影射线、纹理过滤"],
    ["gpu-raster-materials", "GPU 光栅化与材质", "着色器、像素读回、线性色彩、金属粗糙度与深度"],
    ["pbr-scene-device-comparison", "PBR 场景与设备对照", "微表面反射、线性色彩、整帧验证与设备口径"],
    ["gltf-cross-host-comparison", "完整 glTF 场景的跨主机对照", "资产导入、材质与环境光、像素回归和设备记录"],
    ["gltf-pixel-attribution", "glTF 局部像素差异归因", "同点差分、轮廓与内部、材质消融和复测证据"],
    ["gltf-host-reproduction", "glTF 主机复测与热点定位", "独立设备、固定配方、原始通道表与局部差分"],
    ["gltf-independent-host-validation", "glTF 独立主机验收", "复测清单、像素摘要、前景邻域与驱动归因"],
    ["gltf-replication-evidence", "glTF 热点独立复测证据", "离线复测包、适配器、局部覆盖、异常定位"],
    ["gltf-host-evidence-audit", "glTF 物理主机复验", "证据交接、原始像素、独立复测与负例"],
    ["gltf-physical-host-matching", "glTF 双主机热点复测", "硬件配对、坐标与遮罩、着色条件和证据验收"],
    ["gltf-retest-evidence", "glTF 实机复测证据", "跨机配对、固定热点、干预和快照验收"],
  ]),
  course("human-computer-interaction", "人机交互", [hciSource], [
    ["user-research", "用户研究与任务", "任务分解、访谈、情境观察"],
    ["prototyping", "原型与反馈", "低保真原型、界面状态、错误恢复"],
    ["usability-evaluation", "可用性评估", "任务成功率、完成时间、出声思考"],
    ["accessibility", "无障碍与包容设计", "键盘操作、焦点顺序、色彩与对比度"],
  ]),
  course("computing-ethics", "计算伦理与专业实践", [cs2023, ethicsSource], [
    ["public-impact", "公共利益与风险", "利益相关者、影响分析、低频严重风险"],
    ["privacy", "隐私与数据责任", "采集最小化、用途限制、保留期限"],
    ["professional-review", "专业判断与评审", "透明报告、利益冲突、独立复核"],
    ["responsible-research", "负责任的研究", "知情同意、署名、结果可复现性"],
  ]),
  course("programming-languages", "程序设计语言原理", [cs2023, languageSource], [
    ["evaluation", "语义与求值", "操作语义、按值求值、惰性求值、短路"],
    ["types", "类型检查与多态", "类型推断、参数多态、静态与动态检查"],
    ["data-and-patterns", "数据类型与模式匹配", "和类型、积类型、穷尽性、解构"],
    ["functional-programming", "函数式编程", "高阶函数、映射和折叠、引用透明"],
  ]),
];

export const undergraduateFoundations = [
  course("signals-and-systems", "信号与系统", [signalSource], [
    ["signal-representations", "信号与序列", "连续时间、离散时间、周期、时间变换"],
    ["linear-systems", "线性时不变系统", "线性、时不变、冲激响应、离散卷积"],
    ["frequency-domain", "频域与滤波", "傅里叶表示、频率分辨率、系统频率响应"],
    ["fourier-computation", "傅里叶变换与频谱计算", "复指数、DFT、逆变换、FFT、频谱泄漏与窗函数"],
    ["digital-filtering", "数字滤波与实现", "FIR、IIR、稳定性、线性相位、循环卷积与分块"],
    ["fixed-point-filtering", "定点滤波", "Q15、宽累加、舍入、饱和、极点与极限环"],
    ["embedded-iir-validation", "目标板定点 IIR", "二阶节、Q15 DF1、移位与饱和、逐码对照和计时"],
    ["target-iir-cycle-measurement", "IIR 板端逐码与周期测量", "固件标识、整数向量、DWT、缓冲与中断预算"],
    ["sampling", "采样与重建", "采样定理、混叠、抗混叠滤波"],
  ]),
];

export const undergraduateDatabases = [
  course("information-retrieval", "信息检索", [cs2023, retrievalSource], [
    ["text-index", "文档与倒排索引", "分词、倒排表、位置索引"],
    ["boolean-retrieval", "布尔检索", "布尔查询、倒排交集、短语查询"],
    ["relevance-ranking", "相关性排序", "文档频率、TF-IDF、BM25、长度归一"],
    ["retrieval-evaluation", "检索效果评估", "首条相关结果、MRR、平均精度、MAP"],
  ]),
];
