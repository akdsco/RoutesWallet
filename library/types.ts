import { StravaRouteBase } from "@/integrations/strava";

export type FunctionCallPromise = () => Promise<void>;
export type FunctionCall = () => void;
export type UpdateFn<T> = (value: T) => void;
export type ConvertNumFn = (val: number, toFixed?: number) => number;

export type RawTag = {
  id: number;
  name: string;
  color: string;
};

export type TagWithFunctions = RawTag & {
  removeTag: RemoveTag;
  updateTag: UpdateTag;
};

export type TagWithAssignment = RawTag & {
  isAssigned: boolean;
};

export type RemoveTag = (tagId: number) => Promise<void>;
export type UpdateTag = (tag: RawTag) => DbOperationResult<void>;

export type AthleteTagOrder = {
  athlete_id: number;
  tag_id: number;
  order_position: number;
};

export type RouteInsertStats = {
  totalRoutes: number;
  routes: StravaRouteBase[];
};

export type ExpectedError = { success: false; error: string };

export type SuccessResult<T> = { success: true; data: T };

export type DbOperationResult<T> = Promise<SuccessResult<T> | ExpectedError>;

export type NumberRange = [number, number];
export type RangeUpdateFn = (value: NumberRange) => void;

export type RangeProps = {
  range: NumberRange;
  extremeValues: NumberRange;
  onRangeChange: RangeUpdateFn;
  onRangeSubmit: FunctionCall;
  step?: number;
};

export type IconLabel = "bicycle" | "trending-up-outline" | "time-outline";
