import Svg, { G, Path } from "react-native-svg";
import { SvgFields } from "@/components/Logo/types";

export const LogoStravaSquare = ({ width, height }: SvgFields) => {
  return (
    <Svg viewBox="0 0 16 16" width={width} height={height}>
      <Path d="M0 0h16v16H0z" fill="#fc4c02" />
      <G fill="#fff" fillRule="evenodd">
        <Path d="M6.9 8.8l2.5 4.5 2.4-4.5h-1.5l-.9 1.7-1-1.7z" opacity=".6" />
        <Path d="M7.2 2.5l3.1 6.3H4zm0 3.8l1.2 2.5H5.9z" />
      </G>
    </Svg>
  );
};
