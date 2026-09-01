/**
 * 编译期 ambient 声明：宿主运行时提供真实的 @deepseek-ai/dsh-tools
 * （build.sh 在 tsc 之后才建 runtime junction，编译期仅用本声明，保证
 * 构建不依赖 DSH 源码 checkout）。defineTool 是纯 helper，运行时从
 * junction 解析到与 host 同版本的真实实现。
 */
declare module '@deepseek-ai/dsh-tools' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function defineTool(options: any): any
}
