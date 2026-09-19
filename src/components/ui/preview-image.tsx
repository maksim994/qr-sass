/* User/blob preview URLs are not in the Next image optimizer. */
/* eslint-disable @next/next/no-img-element */

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function PreviewImage({ src, alt, className }: Props) {
  return <img src={src} alt={alt} className={className} />;
}
