import type { DeepLesson } from "./types";

export const treeTraversalLesson: DeepLesson = {
  title: "二叉树遍历",
  intro: "同一棵树，可以按四种顺序读。先问一个问题。什么时候读根？",
  goals: ["区分先序、中序、后序和层序。", "从槽位还原左右子树。", "用调用栈和队列解释顺序。"],
  blocks: [
    { id: "shape", kind: "explain", title: "先把树画出来", paragraphs: [
      "实验按层编号存节点。根在槽 0。左右位置固定。空位置用短横线占位。",
      "默认的根是 4。左孩子是 2，右孩子是 7。节点 2 带两个孩子 1、3。节点 7 只有右孩子 9。",
      "空槽不会进入遍历。空槽下也不能放孩子。节点值只是标签，形状由槽位决定。",
    ], formula: "槽 i 的左孩子 = 2i + 1\n槽 i 的右孩子 = 2i + 2" },
    { id: "orders", kind: "steps", title: "换个时机访问根", steps: [
      { label: "先序：根、左、右", text: "先输出 4。再用同样的规则读左子树 2、1、3。最后读右子树 7、9。" },
      { label: "中序：左、根、右", text: "先把左子树读完，得到 1、2、3。接着输出 4，再读 7、9。" },
      { label: "后序：左、右、根", text: "先在左子树输出 1、3、2。再从右子树读出 9、7。最后才输出 4。" },
      { label: "层序：按层从左到右", text: "先排根 4。弹出它后，把 2、7 排到队尾。再按队首次序取节点。得到 4、2、7、1、3、9。" },
    ] },
    { id: "memory", kind: "explain", title: "回放里的栈和队列", paragraphs: [
      "递归栈记录还没返回的调用。后序第一次输出 1 时，栈里还有 4 和 2。它们的访问时机更晚。",
      "层序队列记录还没访问的节点。访问 4 后，下一步从队首取 2。它的孩子要排到 7 后面。",
      "把节点改为 4、9、2。按中序得到 9、4、2。只有满足搜索树规则时，中序才有序。",
    ] },
  ],
  demo: "tree-traversal",
  exercises: [
    { id: "deep-tree-root", level: "基础", kind: "single", prompt: "先访问两棵子树。最后访问根。是哪种顺序？",
      options: ["先序", "中序", "后序"], answer: 2,
      explanation: "后序先处理左右子树。当前节点最后输出。", wrong: "看访问根发生在哪一刻。", review: "orders" },
    { id: "deep-tree-postorder", level: "应用", kind: "integer", prompt: "对默认树做后序遍历。第二个值是多少？",
      answer: 3, explanation: "先读节点 2 的左孩子 1，再读右孩子 3。之后才输出 2。",
      wrong: "先完成根的左子树。", review: "orders" },
    { id: "deep-tree-queue", level: "挑战", kind: "multiple", prompt: "把节点改成 4、9、2。哪些说法成立？",
      options: ["层序是 4、9、2", "中序是 9、4、2", "中序必定从小到大", "层序访问根后，队首是 9"], answer: [0, 1, 3],
      explanation: "槽位给出左右关系。中序先左后根。层序先让左孩子入队。",
      wrong: "左右位置由槽位决定。", review: "memory" },
  ],
  recap: ["前三种遍历只换访问根的时机。", "层序用队列逐层读。", "中序有序需要搜索树条件。"],
  extension: "改一处槽位或节点值。看中序是否还保持升序。再读搜索树的次序规则。",
  next: "bst-ordering",
  sources: [{ title: "NIST · Tree traversal", href: "https://xlinux.nist.gov/dads/HTML/treeTraversal.html" }],
};
