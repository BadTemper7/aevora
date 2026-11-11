import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import Input from "./Input";

/** Password field with a show/hide toggle. Accepts the same props as <Input />. */
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      leftIcon={Lock}
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-raised hover:text-ink"
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      }
    />
  );
}
