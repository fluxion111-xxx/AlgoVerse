import { hainan, cs2023, sdjzu } from "./sources";
import { curriculumCourse as course } from "./types";

const mdn = { title: "MDN · Web 开发教程", href: "https://developer.mozilla.org/en-US/docs/Learn_web_development" };

export const programmingCurriculum = [
  course("c-programming", "C 语言程序设计", [hainan, {
    title: "WG14 · C11 Committee Draft N1570",
    href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf",
  }], [
    ["values", "类型、表达式与输入输出", "整数转换、浮点数、格式化输入输出"],
    ["control-flow", "条件与循环", "分支、循环边界、错误输入"],
    ["functions", "函数与模块", "参数、作用域、声明与头文件"],
    ["arrays-and-strings", "数组与字符串", "数组长度、字符数组、空字符结尾"],
    ["structures", "结构体与文件", "记录表示、文本与二进制文件、错误处理"],
  ]),
  course("runtime-memory", "程序运行与内存", [hainan, cs2023], [
    ["function-calls", "函数调用", "栈帧、调用约定、递归深度"],
    ["objects-and-pointers", "对象与指针", "地址、间接访问、作用域与对象生命周期"],
    ["dynamic-allocation", "动态内存分配", "分配与释放、所有权、内存泄漏"],
    ["build-and-link", "构建与链接", "目标文件、符号解析、静态与动态链接"],
    ["debugging", "内存错误排查", "越界、悬空引用、调试器与检测工具"],
  ]),
  course("cpp", "C++ 程序设计", [{ title: "Standard C++ Foundation · Get Started", href: "https://isocpp.org/get-started" }, sdjzu], [
    ["value-semantics", "值语义与引用", "const、引用、拷贝与移动"],
    ["classes-and-raii", "类与资源管理", "构造、析构、RAII、智能指针"],
    ["templates", "模板与泛型", "函数模板、类模板、类型约束"],
    ["standard-library", "标准库容器与算法", "容器选型、迭代器失效、算法与范围"],
    ["errors-and-build", "异常与构建", "异常安全、翻译单元、构建依赖"],
  ]),
  course("java", "Java 程序设计", [{ title: "Dev.java · Java Tutorials", href: "https://dev.java/learn/" }], [
    ["language-basics", "语言与运行环境", "基础类型、引用、字节码与 JVM"],
    ["interfaces", "类、接口与泛型", "继承、接口契约、泛型边界"],
    ["collections", "集合与 Stream", "List、Set、Map、流式处理"],
    ["exceptions-and-io", "异常与输入输出", "异常传播、资源关闭、文件接口"],
    ["jvm-concurrency", "JVM 与并发", "垃圾回收、线程、共享状态"],
  ]),
  course("python", "Python 程序设计", [{ title: "Python · The Python Tutorial", href: "https://docs.python.org/3/tutorial/" }], [
    ["control-and-collections", "控制流与内置容器", "列表、字典、集合、推导式"],
    ["functions-and-iterators", "函数、迭代器与生成器", "参数绑定、迭代协议、延迟计算"],
    ["modules", "模块与环境", "导入、包、虚拟环境"],
    ["errors-and-files", "异常与文件处理", "上下文管理器、文本编码、异常链"],
    ["object-model", "对象模型与类型提示", "可变性、类、数据类、静态检查"],
  ]),
  course("javascript", "JavaScript 程序设计", [{ title: "MDN · JavaScript Guide", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }], [
    ["types", "类型与表达式", "原始值、对象、相等性与类型转换"],
    ["scope", "作用域与闭包", "词法环境、块级声明、闭包"],
    ["prototypes", "对象与原型", "属性查找、原型链、类语法"],
    ["async", "异步与事件循环", "Promise、await、任务与微任务"],
    ["modules", "模块与错误处理", "ES Modules、动态导入、错误传播"],
  ]),
  course("object-oriented-design", "面向对象与设计模式", [sdjzu, cs2023], [
    ["encapsulation", "封装与对象契约", "对象状态、职责、表示不变量"],
    ["polymorphism", "组合与多态", "接口替换、组合优先、依赖方向"],
    ["creation-patterns", "对象创建模式", "工厂方法、抽象工厂、建造者"],
    ["structural-patterns", "结构型模式", "适配器、装饰器、组合模式"],
    ["behavioral-patterns", "行为型模式", "策略、观察者、命令与状态"],
  ]),
  course("software-engineering", "软件工程", [hainan, sdjzu, cs2023], [
    ["requirements", "需求与验收标准", "用户目标、功能边界、可验证约束"],
    ["design", "架构与接口设计", "模块分解、内聚耦合、接口演进"],
    ["development", "开发过程与评审", "迭代、代码评审、技术债"],
    ["delivery", "持续集成与交付", "构建流水线、发布策略、回滚"],
    ["maintenance", "维护与演进", "兼容性、可观测性、故障复盘"],
  ]),
  course("software-testing", "软件测试", [cs2023], [
    ["test-design", "测试设计", "等价类、边界值、状态迁移"],
    ["test-levels", "单元、集成与端到端", "测试边界、依赖替身、契约"],
    ["coverage", "覆盖率与断言", "语句覆盖、分支覆盖、测试预言"],
    ["automated-verification", "自动化回归", "属性测试、模糊测试、失败复现"],
  ]),
  course("compiler-basics", "编译原理", [hainan, sdjzu, cs2023], [
    ["source-analysis", "读懂源代码", "词法单元、文法、语法树"],
    ["parsing", "语法分析方法", "递归下降、LL/LR、错误恢复"],
    ["semantics", "语义分析", "符号表、作用域、类型检查"],
    ["intermediate-representation", "中间表示与优化", "控制流图、SSA、数据流分析"],
    ["code-generation", "代码生成", "指令选择、寄存器分配、运行时接口"],
    ["type-checking", "类型检查与类型安全", "类型上下文、函数调用、统一、子类型、进展与保持"],
    ["runtime-representation", "运行时表示与函数调用", "ABI、栈帧布局、闭包转换、动态派发、边界检查"],
    ["runtime-memory-management", "运行时内存管理", "GC 根、标记清扫、复制回收、分代与写屏障"],
    ["compiler-end-to-end", "从语法树到可执行程序", "表达式 AST、中间表示、控制流、ABI、重定位、链接与运行验证"],
    ["source-parsing-lab", "从源文本构建语法树", "词法、优先级、递归下降、诊断位置与完整输入"],
    ["ssa-construction", "SSA 构造与验证", "支配、支配边界、φ 放置、重命名、循环与验证"],
    ["loop-ssa", "循环 SSA 与控制流", "循环前置块、回边、循环携带值与 LCSSA"],
    ["register-allocation", "通用寄存器分配", "活跃性、干涉图、图着色、线性扫描、溢出与调用约定"],
    ["native-codegen-lab", "从 SSA 生成目标代码", "目标指令、条件跳转、边上的复制、汇编、链接与边界测试"],
  ]),
  course("web-development", "Web 开发", [mdn, cs2023], [
    ["document", "HTML 与可访问性", "语义标签、表单、键盘操作"],
    ["layout", "CSS 与响应式布局", "盒模型、布局、视口与媒体查询"],
    ["browser-runtime", "浏览器与 DOM", "事件传播、页面更新、请求状态"],
    ["server-interfaces", "服务端与接口", "HTTP API、输入验证、错误语义"],
    ["web-delivery", "部署与 Web 性能", "缓存、资源加载、性能测量"],
  ]),
  course("version-control", "Git 与版本控制", [{ title: "Git · Pro Git", href: "https://git-scm.com/book/en/v2" }], [
    ["snapshots", "快照与提交", "工作区、暂存区、提交对象"],
    ["branches", "分支与历史", "引用、合并、变基、冲突"],
    ["collaboration", "远程协作", "远程分支、拉取请求、审核"],
    ["recovery", "追查与恢复", "revert、reflog、bisect"],
  ]),
];
