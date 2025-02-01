export type FunctionCall = () => Promise<void>;

export type RawTag = {
  id: number;
  name: string;
  color: string;
};

export type Tag = RawTag & {
  removeTag: RemoveTag;
  updateTag: UpdateTag;
};

export type RemoveTag = (tagId: number) => Promise<void>;
export type UpdateTag = (
  tagId: number,
  name: string,
  color: string,
) => Promise<void>;
