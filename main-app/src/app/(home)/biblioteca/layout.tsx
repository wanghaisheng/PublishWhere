// export const metadata: Metadata = {
//   title: "Create Next App",
//   description: "Generated by create next app",
// };

import { SideNav } from "./side-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {



  return (
    <main className=" min-h-screen flex gap-4">
        <SideNav />
        <div className="w-full">{children}</div>
    </main>
  );
}
