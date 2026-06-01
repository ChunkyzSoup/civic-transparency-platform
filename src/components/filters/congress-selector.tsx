import { formatCongress } from "@/lib/formatting";
import type { CongressScope } from "@/types/domain";

type CongressSelectorProps = {
  action: string;
  selectedCongress: number;
  scopes: CongressScope[];
  hiddenFields?: Record<string, string | undefined>;
  title?: string;
  description?: string;
  submitLabel?: string;
};

export function CongressSelector({
  action,
  selectedCongress,
  scopes,
  hiddenFields,
  title = "Congress scope",
  description = "Switch to a previous Congress only when that demo slice exists. Signals remain contextual within the selected Congress.",
  submitLabel = "Apply"
}: CongressSelectorProps) {
  const inputId = `${action.replace(/[^a-z0-9]+/gi, "-")}-congress`;

  return (
    <form action={action} className="card scope-form">
      <div className="section-grid">
        <strong>{title}</strong>
        <p className="muted-text">{description}</p>
      </div>

      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, fieldValue]) =>
            fieldValue ? <input key={name} type="hidden" name={name} value={fieldValue} /> : null
          )
        : null}

      <div className="scope-form-controls">
        <label className="scope-form-label" htmlFor={inputId}>
          Select Congress
        </label>
        <select
          id={inputId}
          name="congress"
          defaultValue={String(selectedCongress)}
          className="filter-input select-input"
        >
          {scopes.map((scope) => (
            <option key={scope.congress} value={scope.congress}>
              {scope.label || formatCongress(scope.congress)} · {scope.electionCycle} cycle
            </option>
          ))}
        </select>
        <button className="search-button" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
