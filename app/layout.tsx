import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

// Rounded display face for headings and big numbers (font-heading).
const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["800", "900"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Sổ Từ", template: "%s · Sổ Từ" },
  description: "Sổ ghi và ôn từ vựng tiếng Anh, tiếng Trung — dùng chung với bạn bè.",
  applicationName: "Sổ Từ",
  appleWebApp: { capable: true, title: "Sổ Từ", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4FF" },
    { media: "(prefers-color-scheme: dark)", color: "#13111F" },
  ],
};

// Runs before paint so the saved theme never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${beVietnam.variable} ${nunito.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
