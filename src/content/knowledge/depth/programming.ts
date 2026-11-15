import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const c = { title: "WG14 · C11 Committee Draft", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" };
const cpp = { title: "ISO C++ Foundation · Core Guidelines", href: "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines" };
const python = { title: "Python · Data Model", href: "https://docs.python.org/3/reference/datamodel.html" };
const js = { title: "MDN · Promise.all", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all" };
const git = { title: "Git · git-bisect", href: "https://git-scm.com/docs/git-bisect" };
const llvm = { title: "LLVM · Language Reference", href: "https://llvm.org/docs/LangRef.html" };

export const programmingDepth = [
  topic(["runtime-memory", "dynamic-allocation"], ["c-realloc-temporary-pointer", "realloc 失败时保留旧指针", "进阶"], ["c-allocation-ownership"], c,
    "先接住新指针，再决定是否替换。", "对非零新大小，realloc 失败可返回 NULL。旧分配仍有效。成功后要使用返回的新指针。",
    "写出失败后仍可释放内存的流程。", "令 tmp=realloc(p,256)。若 tmp 非空，再更新 p。若失败，p 仍可用于清理。", "直接覆盖唯一指针会让失败路径丢失旧地址。成功后也别继续用旧别名。",
    ["对非零大小扩容失败，怎样保留清理能力？", ["先保存返回到临时变量", "直接用 NULL 覆盖唯一指针", "失败后继续使用新大小写入"], 0, "临时变量保存失败结果，原指针仍指向有效旧对象。"]),
  topic(["cpp", "classes-and-raii"], ["cpp-unique-shared-ownership", "unique_ptr 与 shared_ptr 的所有权", "进阶"], ["cpp-raii", "cpp-copy-move"], cpp,
    "独占和共享决定由谁销毁对象。", "unique_ptr 只有一个所有者，可转移。shared_ptr 让多个所有者共同延长生命周期，最后一个强引用释放时销毁对象。",
    "从生命周期需求选择指针。", "任务把缓冲区交给唯一工人。用移动后的 unique_ptr 表达所有权转移。", "共享引用成环可能不释放。观察者可改用 weak_ptr。",
    ["对象只有一个明确所有者，需交给新组件。优先选什么？", ["复制裸指针作为两个所有者", "移动 unique_ptr", "用两个独立 shared_ptr 接管同一裸指针"], 1, "移动可明确转移独占所有权，避免两处都认为自己负责销毁。"]),
  topic(["java", "collections"], ["java-generic-invariance-extends", "Java 泛型不变性与通配符", "进阶"], ["java-interface-contract"], { title: "Dev.java · Generics", href: "https://dev.java/learn/generics/" },
    "元素子类型关系不会直接传给列表。", "List<Integer> 不能当 List<Number> 写。List<? extends Number> 可读出 Number，但具体元素类型未知。",
    "给只读生产者选择泛型参数。", "方法只求和。参数可用 List<? extends Number>，同时接收整数列表和浮点列表。", "上界通配符允许读取上界类型。它不允许随意写入 Number。",
    ["方法只读取 Number，想接受 List<Integer>。选哪个？", ["List<Object>", "List<Number>", "List<? extends Number>"], 2, "上界通配符允许列表元素是 Number 的具体子类型。"]),
  topic(["python", "functions-and-iterators"], ["python-iterator-exhaustion", "Python 迭代器耗尽", "基础"], ["python-generator"], python,
    "一次迭代会推进自身的位置。", "next 返回下一项。序列结束后抛 StopIteration。对已耗尽的生成器再次循环，通常不会从头开始。",
    "判断一段数据能否再遍历。", "生成器输出 1、2。第一次转列表得 [1,2]。第二次对同一生成器转列表得 []。", "容器与迭代器不同。列表通常能生成新的迭代器。",
    ["同一生成器已完全消费。再对它执行 list，通常得到什么？", ["空列表", "再次得到原内容", "自动重建生成器"], 0, "原生成器已经没有剩余项，不会因 list 调用重置位置。"]),
  topic(["javascript", "async"], ["promise-all-rejection-cancellation", "Promise.all 失败与取消", "进阶"], ["js-microtasks"], js,
    "聚合失败后，其他任务仍可能运行。", "Promise.all 遇到输入拒绝会拒绝聚合结果。它不会自动停止已经启动的异步操作。取消需由任务支持。",
    "为并发请求设计失败处理。", "两个请求并发。一个先失败。另一个仍可能在服务端完成。", "捕获拒绝只处理结果。要停网络请求，应传入有效的取消信号。",
    ["其中一个请求失败后，Promise.all 会自动取消其余 fetch 吗？", ["总是取消", "不会自动取消", "只有响应体为空才取消"], 1, "聚合承诺负责汇总状态。取消仍需单独用 AbortController 等机制。"]),
  topic(["compiler-basics", "intermediate-representation"], ["dead-code-side-effects", "死代码删除与可观察副作用", "进阶"], ["ssa-phi-merge"], llvm,
    "结果没人用，操作仍可能有影响。", "纯计算的结果若完全不使用，可删除。写文件、输出或访问 volatile 等操作可能有可观察行为，需按语义保留。",
    "识别可安全删除的无用计算。", "未使用的常量加法可省。即使返回值没人用，打印调用仍会输出。", "不能只看返回值是否使用。还要检查异常与其他副作用。",
    ["某调用结果未使用，但会写日志。能直接删吗？", ["能，返回值没用", "只要日志够短就能", "不能仅凭返回值未用删除"], 2, "写日志是可观察行为。删除调用会改变程序效果。"]),
  topic(["version-control", "recovery"], ["git-bisect-regression", "Git bisect 定位回归提交", "基础"], ["git-revert-public-commit", "binary-search"], git,
    "在已知好坏之间折半验证。", "指定一个好提交和一个坏提交。Git 选中间候选。测试后标好坏，逐步缩小首个坏提交的范围。",
    "为回归定位写出可靠判定命令。", "旧版可登录，新版失败。对候选运行同一个登录测试，再标记结果。", "不稳定测试可能给错误方向。遇到无法构建的提交可跳过。",
    ["候选提交的回归测试稳定失败，应怎样标记？", ["bad", "good", "reset"], 0, "该候选已出现故障。标为 bad 后，搜索会在更早的候选中继续。"]),
];
