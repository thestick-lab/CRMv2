// Minimal React declarations: the workspace has no @types/react, so UI code is checked loosely
// while the domain code (src/domain) is checked strictly.
declare module 'react' {
  export const useState: any;
  export const useMemo: any;
  export const useEffect: any;
  export const useCallback: any;
  export const Fragment: any;
  export type ReactNode = any;
  const React: any;
  export default React;
}
declare module 'react-dom/client' {
  export const createRoot: any;
}
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare namespace JSX {
  type Element = any;
  interface IntrinsicElements {
    [name: string]: any;
  }
  interface IntrinsicAttributes {
    key?: string | number;
  }
}
declare module 'pako' {
  export function deflateRaw(data: Uint8Array): Uint8Array;
}
