import type { KnowledgeDomain } from "../../lib/knowledge";

export const programming = {
  id: "programming",
  title: "程序设计与内存",
  courses: [{
    id: "runtime-memory",
    title: "程序运行与内存",
    chapters: [{
      id: "function-calls",
      title: "函数调用",
      topics: [{
        id: "recursion-stack",
        title: "递归与调用栈",
        summary: "先把调用压栈，再把结果带回来。",
        sections: [
          { title: "拆成更小的问题", paragraphs: ["用阶乘算一遍。算 3!，先等 2! 的结果。", "一直拆到 0!，它等于 1。这个条件让递归停下来。"] },
          { title: "看栈怎么变", paragraphs: ["模拟栈每次调用多一层。返回时移走一层。", "输入 3。最深有 4 层，最后得到 6。"] },
        ],
        sources: [{ title: "CMU 15-121 · Recursion", href: "https://www.cs.cmu.edu/~mrmiller/15-121/Slides/14-recursion.pdf" }],
        relatedTopicIds: ["cpu-time-slices", "c-pointer-lifetime"],
        experiments: [{ engineId: "memory-visualization", label: "打开递归实验", prompt: "改阶乘输入，看看最深几层。" }],
      }],
    }, {
      id: "objects-and-pointers",
      title: "对象与指针",
      topics: [{
        id: "c-pointer-lifetime",
        title: "C 指针与对象生命周期",
        summary: "先看对象活多久，再用它的地址。",
        sections: [
          { title: "地址要有对象可用", paragraphs: ["指针可以指向一个对象。解引用能访问那个对象。", "访问前先确认对象还活着。生命周期结束就别再访问。"] },
          { title: "离开函数时", paragraphs: ["函数里有个 int 变量 x。它随函数退出而失效。", "想返回 &x？可以改成返回 x 的值。"] },
        ],
        sources: [{ title: "WG14 N1570 · 6.2.4 Storage durations", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" }],
        relatedTopicIds: ["virtual-pages", "recursion-stack"],
        experiments: [],
      }],
    }],
  }, {
    id: "compiler-basics",
    title: "编译原理",
    chapters: [{
      id: "source-analysis",
      title: "读懂源代码",
      topics: [{
        id: "tokens-and-syntax",
        title: "词法与语法分析",
        summary: "先认符号，再弄清谁和谁一组。",
        sections: [
          { title: "先切出词法单元", paragraphs: ["看 x = 2 + 3。先分出名字、等号和数字等。", "每个单元有自己的类型。比如 x 是标识符。"] },
          { title: "再搭出结构", paragraphs: ["看 2 + 3 * 4。乘法那组先结合。", "语法分析按规则组织符号。可以用树看出层次。"] },
        ],
        sources: [{ title: "Cambridge · Compiler Construction", href: "https://www.cl.cam.ac.uk/teaching/2021/CompConstr/" }],
        relatedTopicIds: ["recursion-stack"],
        experiments: [],
      }],
    }],
  }],
} satisfies KnowledgeDomain;
