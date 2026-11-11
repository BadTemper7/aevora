import { useMemo, useState } from "react";

/**
 * Tiny form helper.
 * - errors are derived from `validate(values)` so they never go stale
 * - an error only shows once the field was touched or a submit was attempted
 */
export function useForm({ initialValues, validate }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const allErrors = useMemo(() => validate(values), [validate, values]);

  const errors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(allErrors).filter(
          ([name]) => submitted || touched[name],
        ),
      ),
    [allErrors, submitted, touched],
  );

  const setValue = (name, value) =>
    setValues((current) => ({ ...current, [name]: value }));
  const markTouched = (name) =>
    setTouched((current) => ({ ...current, [name]: true }));

  /** Props for <Input /> and <PasswordInput />. */
  const field = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event) => setValue(name, event.target.value),
    onBlur: () => markTouched(name),
  });

  /** Props for <Checkbox />. */
  const checkbox = (name) => ({
    name,
    checked: values[name],
    error: errors[name],
    onChange: (event) => setValue(name, event.target.checked),
    onBlur: () => markTouched(name),
  });

  const handleSubmit = (onValid) => async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    setSubmitted(true);
    setFormError("");

    if (Object.keys(allErrors).length > 0) {
      // wait for aria-invalid to render, then jump to the first problem
      setTimeout(() => form.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    setSubmitting(true);
    try {
      await onValid(values);
    } catch (error) {
      setFormError(error?.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    values,
    errors,
    field,
    checkbox,
    handleSubmit,
    submitting,
    formError,
    setFormError,
  };
}
