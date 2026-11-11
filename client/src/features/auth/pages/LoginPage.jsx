import { Link } from "react-router-dom";

import { ROUTES } from "../../../app/config/routes";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <>
      <title>Log in · Aevora</title>

      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Welcome back</h1>
      <p className="mb-8 mt-2 text-[15px] leading-6 text-ink-soft">
        Log in to pick up where you left off.
      </p>

      <LoginForm />

      <p className="mt-8 text-sm text-ink-soft">
        New to Aevora?{" "}
        <Link to={ROUTES.register} className="font-semibold text-brand-ink hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
