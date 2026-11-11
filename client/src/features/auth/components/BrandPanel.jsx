import { APP_TAGLINE } from "../../../app/config/constants";
import Logo from "../../../components/common/Logo";
import OrbitScene from "./OrbitScene";

/** Left side of the auth screens. Always dark, in both themes, so the logo glows. */
export default function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#070a12] p-12 text-white lg:flex xl:p-16">
      <Logo size="md" to={null} />

      <OrbitScene className="mx-auto my-8 w-full max-w-[640px]" />

      <div>
        <h2 className="max-w-[460px] font-display text-[26px] leading-[1.4] tracking-wide">
          {APP_TAGLINE}
        </h2>
      </div>
    </aside>
  );
}
