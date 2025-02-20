import { StravaRouteBase } from "@/integrations/strava";

export type FunctionCall = () => Promise<void>;
export type UpdateFn<T> = (value: T) => void;

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
