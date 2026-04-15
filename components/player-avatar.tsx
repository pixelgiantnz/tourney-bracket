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
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        unoptimized
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-border text-xs font-medium text-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
