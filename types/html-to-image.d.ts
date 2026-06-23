declare module "html-to-image" {
  export interface Options {
    quality?: number;
    pixelRatio?: number;
    backgroundColor?: string;
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
    filter?: (node: HTMLElement) => boolean;
    cacheBust?: boolean;
  }
  export function toPng(node: HTMLElement, options?: Options): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  export function toBlob(node: HTMLElement, options?: Options): Promise<Blob | null>;
  export function toSvg(node: HTMLElement, options?: Options): Promise<string>;
  export function toCanvas(node: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
}
