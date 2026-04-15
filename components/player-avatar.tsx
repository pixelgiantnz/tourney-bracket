import Image from "next/image";

export function PlayerAvatar({
  name,
  url,
  size,
}: {
  name: string;
  url: string | null;
  size: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const boxStyle = { width: size, height: size };

  if (url) {
    return (
      <span
        className="inline-block shrink-0 overflow-hidden rounded-full bg-transparent align-middle"
        style={boxStyle}
      >
        <Image
          src={url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-border text-xs font-medium text-foreground"
      style={boxStyle}
      aria-hidden
    >
      {initial}
    </div>
  );
}
