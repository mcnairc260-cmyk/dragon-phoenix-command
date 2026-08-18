import { MobileNav, Sidebar, ThemeToggle } from "@/components/layout/nav";
import { ThemeScript } from "@/components/layout/theme-script";
import { UserMenu } from "@/components/layout/user-menu";
import { requireUser } from "@/lib/server/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const account = <UserMenu name={user.name} email={user.email} />;

  return (
    <>
      <ThemeScript />
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <Sidebar
          footer={
            <div className="space-y-1">
              {account}
              <div className="flex justify-end">
                <ThemeToggle />
              </div>
            </div>
          }
        />
        <MobileNav footer={account} />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </>
  );
}
