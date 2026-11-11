import logoMark from "../../assets/brand/logo-mark.webp";

export default function LoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid min-h-dvh place-items-center bg-canvas"
    >
      <img src={logoMark} alt="" width="76" height="60" className="animate-pulse" />
    </div>
  );
}
