import { Mail, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "../../../app/config/routes";
import FormAlert from "../../../components/feedback/FormAlert";
import Button from "../../../components/ui/Button";
import Checkbox from "../../../components/ui/Checkbox";
import Input from "../../../components/ui/Input";
import PasswordInput from "../../../components/ui/PasswordInput";
import { useForm } from "../../../hooks/useForm";
import { useUsernameAvailability } from "../hooks/useUsernameAvailability";
import { loginWithGoogle, register } from "../api/authApi";
import { validateRegister } from "../validation";
import PasswordStrength from "./PasswordStrength";
import SocialAuthButtons from "./SocialAuthButtons";
import UsernameInput from "./UsernameInput";

const linkClass = "font-semibold text-brand-ink hover:underline";

export default function RegisterForm() {
  const form = useForm({
    initialValues: { name: "", username: "", email: "", password: "", terms: false },
    validate: validateRegister,
  });

  const usernameAvailability = useUsernameAvailability(form.values.username);
  const usernameReady = usernameAvailability.status === "available";

  // Check availability before account creation. The backend also rechecks
  // uniqueness on submit in case another person claims the same name.
  const submit = form.handleSubmit(async (values) => {
    if (!usernameReady || usernameAvailability.normalized !== values.username.toLowerCase()) {
      throw new Error("Choose an available username before creating your account.");
    }

    try {
      await register({ ...values, username: usernameAvailability.normalized });
    } catch (error) {
      if (error.code === "USERNAME_IS_ALREADY_TAKEN" ||
          /username.*(already.*(taken|exists)|unavailable)/i.test(error.message || "")) {
        usernameAvailability.markTaken();
        return; // Show the error beside the username instead of after a retry.
      }
      throw new Error(error.message || "We couldn't create your account. Check your details and try again.");
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {form.formError && <FormAlert>{form.formError}</FormAlert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Rey Santos"
          leftIcon={UserRound}
          {...form.field("name")}
        />
        <UsernameInput
          availability={usernameAvailability}
          {...form.field("username")}
        />
      </div>

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        leftIcon={Mail}
        {...form.field("email")}
      />

      <div>
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="Create a password"
          {...form.field("password")}
        />
        <PasswordStrength password={form.values.password} />
      </div>

      <Checkbox
        label={
          <>
            I agree to the{" "}
            <Link to={ROUTES.terms} className={linkClass}>
              Terms of service
            </Link>{" "}
            and{" "}
            <Link to={ROUTES.privacy} className={linkClass}>
              Privacy policy
            </Link>
            .
          </>
        }
        {...form.checkbox("terms")}
      />

      <Button type="submit" size="lg" fullWidth loading={form.submitting} disabled={!usernameReady || form.submitting}>
        {form.submitting ? "Creating account" : "Create account"}
      </Button>

      <div className="flex items-center gap-3 text-[13px] text-ink-faint" role="separator">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <SocialAuthButtons
        disabled={form.submitting}
        onSelect={(options) => {
          form.setFormError("");
          return loginWithGoogle(options);
        }}
        onError={(error) => form.setFormError(error.message || "Could not connect with Google. Please try again.")}
      />
    </form>
  );
}
