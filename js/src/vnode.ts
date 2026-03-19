export interface VNode {
  tag: string;
  attrs: Record<string, string>;
  children: VNode[];
  text?: string;
}

export function el(
  tag: string,
  attrs: Record<string, string> = {},
  children: VNode[] = [],
): VNode {
  return { tag, attrs, children };
}

export function textEl(
  tag: string,
  content: string,
  attrs: Record<string, string> = {},
): VNode {
  return { tag, attrs, children: [], text: content };
}

export function findAll(
  node: VNode,
  predicate: (n: VNode) => boolean,
): VNode[] {
  const results: VNode[] = [];
  if (predicate(node)) results.push(node);
  for (const child of node.children) {
    results.push(...findAll(child, predicate));
  }
  return results;
}

export function find(
  node: VNode,
  predicate: (n: VNode) => boolean,
): VNode | undefined {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const found = find(child, predicate);
    if (found) return found;
  }
  return undefined;
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function render(node: VNode, parent?: Element): Element {
  const element = document.createElementNS(SVG_NS, node.tag);
  for (const [key, value] of Object.entries(node.attrs)) {
    element.setAttribute(key, value);
  }
  if (node.text !== undefined) {
    element.textContent = node.text;
  }
  for (const child of node.children) {
    render(child, element);
  }
  if (parent) parent.appendChild(element);
  return element;
}
