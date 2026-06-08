import Image from "next/image";

interface FigureImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  credit?: string;
}

export function FigureImage({
  src,
  alt,
  width,
  height,
  caption,
  credit,
}: FigureImageProps) {
  return (
    <figure className="my-8">
      <div className="relative overflow-hidden rounded-lg">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      {(caption || credit) && (
        <figcaption className="mt-2 text-center text-sm text-gray-500">
          {caption}
          {caption && credit && " — "}
          {credit && <span className="italic">Photo: {credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
