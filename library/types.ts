export type FunctionCall = () => Promise<void>;

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
export type UpdateTag = (tag: RawTag) => Promise<void>;

export type AthleteTagOrder = {
  athlete_id: number;
  tag_id: number;
  order_position: number;
};

export type DbOperationResult = Promise<void | { error: string }>;
