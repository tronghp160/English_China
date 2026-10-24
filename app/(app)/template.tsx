/** Re-mounted on every navigation inside the app, so each page eases in (160 ms, cut by reduced motion). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
