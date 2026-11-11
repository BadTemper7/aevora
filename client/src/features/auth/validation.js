import {
  validateEmail,
  validateFullName,
  validateNewPassword,
  validateRequiredPassword,
  validateUsername,
} from "../../utils/validators";

/** Turn { field: "message" | "" } into an object holding only the real errors. */
const onlyErrors = (checks) =>
  Object.fromEntries(Object.entries(checks).filter(([, message]) => message));

export const validateLogin = (values) =>
  onlyErrors({
    email: validateEmail(values.email),
    password: validateRequiredPassword(values.password),
  });

export const validateRegister = (values) =>
  onlyErrors({
    name: validateFullName(values.name),
    username: validateUsername(values.username),
    email: validateEmail(values.email),
    password: validateNewPassword(values.password),
    terms: values.terms ? "" : "Accept the terms to create your account.",
  });
