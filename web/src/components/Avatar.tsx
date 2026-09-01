import { initialsOf } from '../lib/initials.ts';

/**
 * The signed-in member's avatar (account redesign): a 34px circle showing their
 * Strava photo when there is one, else two-letter initials on `surface-2` — never
 * a generic person glyph, which tells a rider nothing about whose account is open.
 * A `sel` ring + soft halo marks it as signed in. Purely presentational.
 */
type Props = { name: string; photo?: string; size?: number };

export function Avatar({ name, photo, size = 34 }: Props) {
  const box = { width: size, height: size };
  return (
    <span
      className="inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[12px] font-semibold text-text-2 ring-1 ring-sel ring-offset-2 ring-offset-surface"
      style={box}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}
