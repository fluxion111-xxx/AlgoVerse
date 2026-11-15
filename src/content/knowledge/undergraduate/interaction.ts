import { fullTopic as topic } from "@/content/knowledge/coverage/types";
import { hciSource as hci } from "@/content/curriculum/undergraduate";
const wcag = { title: "W3C · WCAG 2.2", href: "https://www.w3.org/TR/WCAG22/" };
const aria = { title: "W3C · ARIA Authoring Practices Guide", href: "https://www.w3.org/WAI/ARIA/apg/" };

export const interactionTopics = [
  topic(["human-computer-interaction", "user-research"], ["user-task-outcome", "用户任务与可观察目标", "基础"], ["testable-acceptance"], hci,
    "先写用户想完成的事。", "任务描述包含场景、起点和目标。让参与者自己找操作路径，能暴露导航与文案的问题。",
    "改写泄露操作步骤的测试任务。", "给参与者一张订单。请找到预计到货日。无需提示菜单和按钮名字。", "直接说出目标按钮会掩盖可发现性问题。",
    ["哪句适合测用户能否自行找到改地址入口？", ["点击右上角的修改地址", "入口在账户设置，请验证", "请把这张订单寄到新地址"], 2, "描述目标保留探索路径。"]),
  topic(["human-computer-interaction", "user-research"], ["contextual-observation-mismatch", "情境观察与访谈互证", "基础"], ["user-task-outcome"], hci,
    "把自述与真实操作放在一起看。", "访谈能了解动机与记忆。情境观察能看到工作地点、顺序和绕行步骤。两类证据可以互证。",
    "识别访谈和观察各漏了什么。", "员工说每天只导出一次。观察发现多人需分时导出后再合并。", "单次观察只代表该次场景。别立即推断所有用户都如此。",
    ["想了解仓库扫码为何常被中断，先看什么？", ["只问界面是否好看", "实际工作中的中断与设备状态", "只看按钮截图"], 1, "现场可看到网络、照明和替代流程。"]),
  topic(["human-computer-interaction", "prototyping"], ["prototype-fidelity-question", "原型保真度与验证目标", "基础"], ["user-task-outcome"], hci,
    "原型的细节跟着问题走。", "低保真草图适合验证导航、流程和文案。测试键盘顺序、动态延迟时，原型要能表现这些行为。",
    "给待验证假设选够用的原型。", "想知道学生能否找到提交入口。可先用纸面草图走一遍层级。", "静态高保真截图无法验证真实输入延迟。",
    ["要测真实的焦点移动顺序，哪种材料适合？", ["可用键盘实际操作的原型", "单张高清海报", "只有颜色板"], 0, "任务依赖键盘状态变化，必须能操作。"]),
  topic(["human-computer-interaction", "prototyping"], ["recoverable-input-error", "表单失败后的恢复", "基础"], ["server-side-validation", "user-task-outcome"], hci,
    "告诉用户哪儿有错，并保留有效输入。", "在出错字段旁标明原因与可接受格式。服务端确认前保留用户已填的非敏感信息，减少重填。",
    "写出能指导下一步的错误反馈。", "邮编少一位时指出预期长度。姓名与收货地址继续留在表单里。", "仅显示顶部的通用失败提示，会迫使用户猜哪个字段需要修改。",
    ["邮箱格式错，其余字段有效。怎样便于恢复？", ["清空整页", "只弹出操作失败", "指出邮箱错误并保留其余有效值"], 2, "用户能立刻定位原因，也不必重复输入。"]),
  topic(["human-computer-interaction", "usability-evaluation"], ["usability-task-success-rate", "可用性测试的任务成功率", "基础"], ["testable-acceptance", "user-task-outcome"], hci,
    "用预先定义的成功条件计数。", "先写出可观察的完成标准。记录完整成功、需帮助及失败。按约定分母计算比例，并附样本量。",
    "为一次测试计算成功率。", "十人尝试，六人独立完成，两人经提示完成，两人失败。独立成功率是 60%。", "去掉失败者后再算，会掩盖真实困难。",
    ["八人中五人独立成功，两人获帮助。独立成功率是多少？", ["87.5%", "100%", "62.5%"], 2, "独立成功的分子为五，分母是八次尝试。"]),
  topic(["human-computer-interaction", "usability-evaluation"], ["think-aloud-neutral-probe", "出声思考与中性追问", "基础"], ["contextual-observation-mismatch"], hci,
    "询问正在想什么，避免暗示路线。", "让参与者在操作时说出预期。主持人可用中性追问，并记录需要提示的时点。",
    "识别会引导参与者的提问。", "用户停在结算页。主持人问“你现在在想什么”，让用户自己解释犹豫。", "边说边做会改变任务用时。速度对照宜另设计无口述测试。",
    ["用户停下来时，哪句较中性？", ["有没有看到右边的结算按钮？", "你刚才在找什么？", "是不是应该点击这里？"], 1, "开放提问没有透露目标控件或操作位置。"]),
  topic(["human-computer-interaction", "accessibility"], ["keyboard-focus-dialog", "弹窗的键盘焦点管理", "进阶"], ["semantic-html-forms"], aria,
    "打开时送入焦点，关闭后送回。", "模态弹窗打开时把焦点移入合适控件。Tab 留在弹窗内。关闭后通常把焦点送回触发控件。",
    "用键盘验证打开到返回的路径。", "点“编辑资料”打开对话框。关闭后焦点回到“编辑资料”按钮。", "若原按钮已被移除，选择符合后续流程的合理位置。仅调视觉样式不会移动焦点。",
    ["弹窗关后，触发控件仍在。焦点通常回哪里？", ["浏览器地址栏", "触发按钮", "任意背景段落"], 1, "返回触发控件能让键盘用户接着原任务操作。"]),
  topic(["human-computer-interaction", "accessibility"], ["accessible-color-and-contrast", "颜色提示与文字对比度", "基础"], ["semantic-html-forms"], wcag,
    "关键信息同时用文字或形状表达。", "仅凭颜色区分状态会让部分用户无法识别。状态可加文字或图形。普通文字在 WCAG AA 下通常需至少 4.5:1 对比度。",
    "为错误状态添加可识别的第二种线索。", "输入异常时，用红边加“金额不能小于零”，并关联文字提示。", "对比度足够仍不能让红绿成为唯一语义区别。",
    ["把错误只标成红色。哪个改法能提供额外线索？", ["在对应字段旁加具体错误文字", "改成两种相近红色", "仅把边框画粗但不解释状态"], 0, "文字直接说明异常原因，减少对辨色的依赖。"]),
];
