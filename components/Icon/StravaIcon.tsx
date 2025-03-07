import Svg, { G, Path, Rect } from "react-native-svg";

export const StravaIcon = () => {
  return (
    <Svg
      aria-label="Strava"
      role="img"
      viewBox="-51.2 -51.2 614.40 614.40"
      width="26px"
      height="26px"
      fill="#000000"
      stroke="#000000"
      stroke-width="0.00512"
      transform="rotate(0)"
    >
      <G id="SVGRepo_bgCarrier" stroke-width="0" />
      <G
        id="SVGRepo_tracerCarrier"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke="#CCCCCC"
        stroke-width="1.024"
      />
      <G id="SVGRepo_iconCarrier">
        <Rect width="512" height="512" rx="15%" fill="#fc4c01" />
        <Path fill="#ffffff" d="M120 288L232 56l112 232h-72l-40-96-40 96z" />
        <Path fill="#fda580" d="M280 288l32 72 32-72h48l-80 168-80-168z" />
      </G>
    </Svg>
  );
};
