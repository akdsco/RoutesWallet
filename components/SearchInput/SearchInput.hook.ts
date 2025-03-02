import { useTheme } from "@/hooks";
import { useState } from "react";
import { Keyboard } from "react-native";
import { SearchInputProps } from "@/components/SearchInput/SearchInput";

export const useSearchInput = ({
  executeSearch,
  onSearchReset,
  isInSearchMode,
  setIsInSearchMode,
}: SearchInputProps) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    Keyboard.dismiss();

    if (isInSearchMode) {
      onSearchReset();
      setSearchTerm("");
      setIsInSearchMode(false);
      return;
    }

    if (searchTerm.trim() === "") {
      return;
    }

    setSearchTerm((value) => value.trim());
    executeSearch(searchTerm);
    setIsInSearchMode(true);
  };

  const onSearchTermChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  };

  return {
    theme,
    searchTerm,
    onSearchTermChange,
    handleSearch,
  };
};
