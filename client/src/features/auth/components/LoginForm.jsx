import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "../../../app/config/routes";
import FormAlert from "../../../components/feedback/FormAlert";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import PasswordInput from "../../../components/ui/PasswordInput";
import { useForm } from "../../../hooks/useForm";
import { login, loginWithGoogle } from "../api/authApi";
import { validateLogin } from "../validation";
import SocialAuthButtons from "./SocialAuthButtons";

export default function LoginForm() {
  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: validateLogin,
  });

  // On success the session updates and <GuestRoute /> sends the person onward.
  const submit = form.handleSubmit(async (values) => {
    try {
      await login(values);
    } catch {
      throw new Error("We couldn't log you in. Check your email and password, then try again.");
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {form.formError && <FormAlert>{form.formError}</FormAlert>}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        leftIcon={Mail}
        {...form.field("email")}
      />

      <PasswordInput
        label="Password"
        autoComplete="current-password"
        placeholder="Your password"
        labelAction={
          <Link
            to={ROUTES.forgotPassword}
            className="text-[13px] font-semibold text-brand-ink hover:underline"
          >
            Forgot password?
          </Link>
        }
        {...form.field("password")}
      />

      <Button type="submit" size="lg" fullWidth loading={form.submitting}>
        {form.submitting ? "Logging in" : "Log in"}
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
