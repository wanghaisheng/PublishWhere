// export const metadata: Metadata = {
//   title: "Create Next App",
//   description: "Generated by create next app",
// };

"use client";

import { SideNav } from "./side-nav";

export default function BibliotecaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


 


  return (
    <main className=" min-h-screen flex gap-4 pt-2">
        <SideNav />
        <div className="w-full px-2 overflow-auto">{children}</div>
    </main>
  );
}
