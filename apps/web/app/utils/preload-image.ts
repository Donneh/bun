export interface ImageSource {
  readonly src: string;
  readonly srcset: string;
  readonly sizes: string;
}

const preloaded = new Set<string>();

export function preloadImage({ src, srcset, sizes }: ImageSource) {
  const key = `${srcset}|${sizes}`;
  if (preloaded.has(key)) return;
  preloaded.add(key);
  const image = new Image();
  image.sizes = sizes;
  image.srcset = srcset;
  image.src = src;
}
