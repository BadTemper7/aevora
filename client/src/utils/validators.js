const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/** Each validator returns an error message, or "" when the value is fine. */

export function validateEmail(value = "") {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL_RE.test(email))
    return "Enter a valid email address, like name@example.com.";
  return "";
}

export function validateRequiredPassword(value = "") {
  return value ? "" : "Enter your password.";
}

export function validateNewPassword(value = "") {
  if (!value) return "Create a password.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Include at least one letter and one number.";
  }
  return "";
}

export function validateFullName(value = "") {
  const name = value.trim();
  if (!name) return "Enter your name.";
  if (name.length < 2) return "Your name needs at least 2 characters.";
  return "";
}

export function validateUsername(value = "") {
  if (!value) return "Choose a username.";
  if (!USERNAME_RE.test(value)) {
    return "Use 3–20 letters, numbers or underscores.";
  }
  return "";
}

/** Score a password 0–4 and report which checks it passes. */
export function getPasswordStrength(password = "") {
  const checks = {
    length: password.length >= 8,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password) || password.length >= 14,
  };

  const score = password ? Object.values(checks).filter(Boolean).length : 0;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  return { score, label: labels[score], checks };
}
