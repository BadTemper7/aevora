import { TriangleAlert } from "lucide-react";

/** Form-level error. Say what went wrong and what to do next. */
export default function FormAlert({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm leading-5 text-danger"
    >
      <TriangleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
