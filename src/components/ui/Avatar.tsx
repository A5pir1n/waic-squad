interface AvatarProps {
  name: string;
  color: string;
  size?: number;
}

export function Avatar({ name, color, size = 24 }: AvatarProps) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.48 }}
    >
      {[...name][0] ?? '?'}
    </span>
  );
}
