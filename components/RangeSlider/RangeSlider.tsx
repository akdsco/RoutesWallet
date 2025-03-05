import { RangeSlider as Slider } from "@react-native-assets/slider";
import { RangeProps } from "@/library/types";
import { useRangeSlider } from "@/components/RangeSlider/RangeSlider.hook";

export const RangeSlider = ({
  step = 10,
  range,
  extremeValues,
  onRangeChange,
}: RangeProps) => {
  const { theme, isRangeApplied, onValueChange } = useRangeSlider(
    range,
    onRangeChange,
    extremeValues,
  );

  return (
    <Slider
      range={range} // set the current slider's value
      step={step} // The step for the slider (0 means that the slider will handle any decimal value within the range [min, max])
      minimumRange={5} // Minimum range between the two thumbs (defaults as "step")
      minimumValue={0} // Minimum value (defaults as 0)
      maximumValue={Math.ceil((extremeValues[1] * 1.1) / 10) * 10} // Maximum value (defaults as minimumValue + minimumRange)
      crossingAllowed={true} // If true, the user can make one thumb cross over the second thumb
      outboundColor={theme.contrastBgSecondary} // The track color outside the current range value
      inboundColor={isRangeApplied ? theme.pop : theme.iconSelected} // The track color inside the current range value
      thumbTintColor={isRangeApplied ? theme.popContrast : theme.tint} // The color of the slider's thumb
      thumbStyle={undefined} // Override the thumb's style
      trackStyle={undefined} // Override the tracks' style
      minTrackStyle={undefined} // Override the tracks' style for the minimum range
      midTrackStyle={undefined} // Override the tracks' style for the middle range
      maxTrackStyle={undefined} // Override the tracks' style for the maximum range
      vertical={false} // If true, the slider will be drawn vertically
      inverted={false} // If true, min value will be on the right, and max on the left
      enabled={true} // If false, the slider won't respond to touches anymore
      trackHeight={6} // The track's height in pixel
      thumbSize={18} // The thumb's size in pixel
      thumbImage={undefined} // An image that would represent the thumb
      slideOnTap={true} // If true, touching the slider will update it's value. No need to slide the thumb.
      onValueChange={onValueChange} // Called each time the value changed. Return false to prevent the value from being updated. The type is (range: [number, number]) => boolean | void
      onSlidingStart={undefined} // Called when the slider is pressed. The type is (range: [number, number]) => void
      onSlidingComplete={undefined} // Called when the press is released. The type is (range: [number, number]) => void
      CustomThumb={undefined} // Provide your own component to render the thumb. The type is a component: ({ value: number, thumb: 'min' | 'max' }) => JSX.Element
      CustomMark={undefined}
      style={{ height: 40 }}
      // Add any View Props that will be applied to the container (style, ref, etc)
    />
  );
};
