interface SearchBarProps {
  action?: string;
  defaultValue?: string;
  congress?: number;
}

export function SearchBar({
  action = "/search",
  defaultValue = "",
  congress
}: SearchBarProps) {
  return (
    <form action={action} className="search-bar">
      {typeof congress === "number" ? (
        <input type="hidden" name="congress" value={String(congress)} />
      ) : null}
      <input
        aria-label="Search"
        className="search-input"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search a lawmaker, donor PAC, bill, industry, or vote"
      />
      <button className="search-button" type="submit">
        Explore
      </button>
    </form>
  );
}
