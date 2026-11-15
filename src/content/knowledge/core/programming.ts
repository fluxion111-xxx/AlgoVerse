import { concept as topic } from "./types";

const c = { title: "WG14 · C11 Committee Draft", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" };
const cpp = { title: "ISO C++ Foundation · C++ Core Guidelines", href: "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines" };
const java = { title: "Dev.java · Java Tutorials", href: "https://dev.java/learn/" };
const python = { title: "Python · The Python Tutorial", href: "https://docs.python.org/3/tutorial/" };
const js = { title: "MDN · JavaScript Guide", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" };
const web = { title: "MDN · Learn Web Development", href: "https://developer.mozilla.org/en-US/docs/Learn_web_development" };
const git = { title: "Git · Pro Git", href: "https://git-scm.com/book/en/v2" };
const se = { title: "IEEE Computer Society · SWEBOK v4", href: "https://ieeecs-media.computer.org/media/education/swebok/swebok-v4.pdf" };
const compiler = { title: "Cambridge · Compiler Construction", href: "https://www.cl.cam.ac.uk/teaching/2021/CompConstr/" };

export const programming = [
  topic("c-programming", "values", "c-integer-division", "C 整数除法与余数", "基础", "C 整数商向零截断。", "整数除法的商去掉小数部分。若商可表示，a 等于商乘 b 再加余数。", c),
  topic("c-programming", "control-flow", "loop-half-open-range", "半开区间循环", "基础", "让末端边界留在区间外。", "用 i<n 遍历 n 项。最后访问 n−1。n 为零时，循环体一次也不进入。", c),
  topic("c-programming", "arrays-and-strings", "c-string-terminator", "C 字符串的结尾字节", "基础", "结尾需要一个空字符。", "字符串操作查找第一个空字符。长度为 n 的字符串至少要预留 n+1 个字符位置。", c, ["array-indexing"]),
  topic("runtime-memory", "dynamic-allocation", "c-allocation-ownership", "动态内存的所有权", "进阶", "先约定由谁负责释放。", "释放已分配对象后，其生命周期结束。仍保留的地址不能再用于访问该对象。", c, ["c-pointer-lifetime"]),
  topic("runtime-memory", "build-and-link", "c-external-symbols", "声明、定义与链接符号", "进阶", "声明给类型，定义给实体。", "分开编译时可先检查声明。链接器再把外部符号引用关联到对应定义。", c),
  topic("cpp", "classes-and-raii", "cpp-raii", "C++ RAII 资源管理", "进阶", "用对象生命周期管理资源。", "构造成功后，对象负责持有资源。正常退出作用域或异常展开时，析构函数释放它。", cpp, ["c-allocation-ownership"]),
  topic("cpp", "value-semantics", "cpp-copy-move", "C++ 拷贝与移动", "进阶", "移动可把资源转交给新对象。", "拷贝通常保留源值。移动操作的实际效果由类型定义，使用移后对象前先看约定。", cpp, ["cpp-raii"]),
  topic("cpp", "standard-library", "cpp-iterator-invalidation", "容器迭代器失效", "进阶", "容器修改可能让旧位置失效。", "vector 扩容可能搬迁元素。旧迭代器与引用在重分配后失效。", cpp, ["dynamic-array-amortization"]),
  topic("java", "interfaces", "java-interface-contract", "Java 接口契约", "基础", "接口规定调用者可用的行为。", "实现类可共享同一接口类型。调用者依赖契约，运行时根据对象选择实现。", java),
  topic("java", "collections", "java-equals-hashcode", "Java equals 与 hashCode", "进阶", "相等对象要给相同哈希值。", "把对象作为哈希键时，参与相等性判断的字段不宜变化。变化可能使旧条目难以找回。", java, ["hash-equality-contract"]),
  topic("python", "control-and-collections", "python-aliasing", "Python 列表别名与浅拷贝", "基础", "两个变量可引用同一列表。", "赋值绑定同一对象。浅拷贝另建外层容器，仍共享其中的嵌套对象。", python),
  topic("python", "functions-and-iterators", "python-generator", "Python 生成器与惰性计算", "进阶", "每次取值才继续执行。", "生成器在 yield 处暂停并保留局部状态。下一次迭代从暂停处继续。", python, ["python-aliasing"]),
  topic("javascript", "scope", "js-lexical-closure", "JavaScript 闭包与词法作用域", "基础", "函数能继续访问定义处的绑定。", "闭包关联的是词法环境。调用位置变化时，函数仍访问定义处可见的绑定。", js),
  topic("javascript", "async", "js-microtasks", "Promise 微任务与任务顺序", "进阶", "先跑完当前同步代码。", "Promise 回调排入微任务。当前任务结束后，浏览器先清理微任务队列。", js, ["js-lexical-closure"]),
  topic("object-oriented-design", "polymorphism", "substitution-contract", "接口替换与行为契约", "进阶", "可替换实现要兑现同一约定。", "替代类型应接受原先允许的输入。它仍须提供调用者依赖的保证。", se, ["java-interface-contract"]),
  topic("object-oriented-design", "behavioral-patterns", "strategy-pattern", "策略模式", "基础", "把可替换算法交给统一接口。", "调用者依赖策略接口。更换策略对象即可切换行为，适合选择规则会变化的场景。", se, ["substitution-contract"]),
  topic("software-engineering", "requirements", "testable-acceptance", "可验证的验收条件", "基础", "写出可观察的通过条件。", "说明场景、操作与预期。让独立测试者按同一条件得到一致判断。", se),
  topic("software-engineering", "design", "high-cohesion-low-coupling", "内聚、耦合与模块边界", "基础", "把一起变化的职责放近。", "模块内部围绕同一目标。模块之间用稳定契约交换必要信息。", se, ["testable-acceptance"]),
  topic("software-testing", "test-design", "boundary-value-analysis", "边界值分析", "基础", "优先检查允许区间的两端。", "闭区间可检查边界本身及其相邻值。空输入和单位长度也常值得单独验证。", se, ["testable-acceptance"]),
  topic("software-testing", "coverage", "branch-coverage", "分支覆盖率", "进阶", "看判定的出口走过多少。", "分支覆盖检查各控制流分支。即使覆盖全，也可能漏掉数据组合错误。", se, ["boundary-value-analysis"]),
  topic("compiler-basics", "parsing", "recursive-descent-parser", "递归下降语法分析", "进阶", "用函数对应文法的非终结符。", "根据前瞻符号选择产生式。朴素递归下降遇直接左递归会无限调用。", compiler, ["tokens-and-syntax", "context-free-grammar"]),
  topic("compiler-basics", "semantics", "symbol-table-scope", "符号表与作用域", "进阶", "按可见范围查变量声明。", "分析标识符时从内层作用域开始查找。内层同名声明可遮住外层声明。", compiler, ["tokens-and-syntax"]),
  topic("web-development", "document", "semantic-html-forms", "语义化表单与标签", "基础", "给每个输入一个可识别的名称。", "label 与对应控件关联。键盘和辅助技术能按名称操作该控件。", web),
  topic("web-development", "server-interfaces", "server-side-validation", "服务端输入校验", "基础", "服务端要验证自己收到的值。", "浏览器校验改善体验。接口仍要检查类型、范围和字段，并拒绝违规请求。", web, ["http-method-idempotency"]),
  topic("version-control", "snapshots", "git-staging", "Git 暂存区与提交快照", "基础", "暂存区决定下一次提交的内容。", "git add 更新索引。随后编辑工作区不会自动更新索引里的版本。", git),
  topic("version-control", "branches", "git-merge-rebase", "Git 合并与变基", "进阶", "两种方式可整合分支历史。", "合并可创建双亲提交。变基在新基点重放提交，会产生新的提交 ID。", git, ["git-staging"]),
];
