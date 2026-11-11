import { Link } from "react-router-dom";

import { ROUTES } from "../../../app/config/routes";
import RegisterForm from "../components/RegisterForm";

export default function RegisterPage() {
  return (
    <>
      <title>Create account · Aevora</title>

      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Create your account</h1>
      <p className="mb-8 mt-2 text-[15px] leading-6 text-ink-soft">
        Join Aevora to connect, create and collaborate.
      </p>

      <RegisterForm />

      <p className="mt-8 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link to={ROUTES.login} className="font-semibold text-brand-ink hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
