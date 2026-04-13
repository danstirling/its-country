import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, LogOut, User, Shield, Key, UserCheck, ChevronDown, LayoutDashboard, Music, Activity } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/artists", label: "Songwriters" },
    { href: "/songs", label: "Songs" },
  ];

  const isActive = (href: string) => location === href;
  const isAdminActive = isActive("/admin") || isActive("/account");

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20 gap-2">

          <div className="flex items-center flex-shrink-0">
            <Link href="/" data-testid="link-home-logo">
              <img src="/images/logo.png" alt="It's Country" className="h-[3.8rem] w-auto cursor-pointer" />
            </Link>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-1 flex-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive(link.href) ? "secondary" : "ghost"}
                  size="sm"
                  className="text-[15px]"
                  data-testid={`link-nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="hidden sm:flex items-center justify-end gap-1 flex-shrink-0">
            {user ? (
              <>
                <span
                  title={user.username}
                  className="flex items-center gap-1 text-sm text-muted-foreground px-1"
                  data-testid="text-username"
                >
                  {(user.role === "admin" || user.role === "superadmin" || user.role === "subadmin") ? (
                    <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <User className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="max-w-[80px] truncate hidden lg:inline">{user.username}</span>
                </span>

                {user.role === "superadmin" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={isAdminActive ? "secondary" : "ghost"}
                        size="sm"
                        data-testid="dropdown-admin"
                        className="font-semibold text-[14px] px-3"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Admin
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <Link href="/admin">
                        <DropdownMenuItem data-testid="link-nav-admin" className="cursor-pointer">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Dashboard
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/admin/songs">
                        <DropdownMenuItem data-testid="link-nav-songs-db" className="cursor-pointer">
                          <Music className="h-4 w-4 mr-2" />
                          Song Database
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/admin/activity">
                        <DropdownMenuItem data-testid="link-nav-activity" className="cursor-pointer">
                          <Activity className="h-4 w-4 mr-2" />
                          Member Activity
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/account">
                        <DropdownMenuItem data-testid="link-nav-account" className="cursor-pointer">
                          <Key className="h-4 w-4 mr-2" />
                          Account
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        data-testid="button-logout"
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => logout()}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {(user.role === "admin" || user.role === "subadmin") && (
                  <>
                    <Link href="/admin">
                      <Button variant={isActive("/admin") ? "secondary" : "ghost"} size="sm" data-testid="link-nav-requests" className="font-semibold text-[14px] px-3">
                        <UserCheck className="h-4 w-4 mr-1" />
                        Admin
                      </Button>
                    </Link>
                    <Link href="/account">
                      <Button variant="ghost" size="sm" data-testid="link-nav-account" className="text-[14px] px-3">
                        <Key className="h-4 w-4 mr-1" />
                        Account
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => logout()}
                      data-testid="button-logout"
                      className="text-[14px] px-3"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign Out
                    </Button>
                  </>
                )}

                {user.role !== "admin" && user.role !== "subadmin" && user.role !== "superadmin" && (
                  <>
                    <Link href="/account">
                      <Button variant="ghost" size="sm" data-testid="link-nav-account" className="text-[14px] px-3">
                        <Key className="h-4 w-4 mr-1" />
                        Account
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => logout()}
                      data-testid="button-logout"
                      className="text-[14px] px-3"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign Out
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="link-login" className="text-[15px]">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          <div className="sm:hidden flex justify-end ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive(link.href) ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setMobileOpen(false)}
                data-testid={`link-mobile-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2">
                  {(user.role === "admin" || user.role === "superadmin" || user.role === "subadmin") ? (
                    <Shield className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>{user.username}</span>
                </div>
                {user.role === "superadmin" && (
                  <>
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</div>
                    <Link href="/admin">
                      <Button variant="ghost" className="w-full justify-start pl-6" onClick={() => setMobileOpen(false)} data-testid="link-mobile-admin">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/admin/songs">
                      <Button variant="ghost" className="w-full justify-start pl-6" onClick={() => setMobileOpen(false)} data-testid="link-mobile-songs-db">
                        <Music className="h-4 w-4 mr-2" />
                        Song Database
                      </Button>
                    </Link>
                    <Link href="/admin/activity">
                      <Button variant="ghost" className="w-full justify-start pl-6" onClick={() => setMobileOpen(false)} data-testid="link-mobile-activity">
                        <Activity className="h-4 w-4 mr-2" />
                        Member Activity
                      </Button>
                    </Link>
                    <Link href="/account">
                      <Button variant="ghost" className="w-full justify-start pl-6" onClick={() => setMobileOpen(false)} data-testid="link-mobile-account">
                        <Key className="h-4 w-4 mr-2" />
                        Account
                      </Button>
                    </Link>
                  </>
                )}
                {(user.role === "admin" || user.role === "subadmin") && (
                  <>
                    <Link href="/admin">
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileOpen(false)} data-testid="link-mobile-requests">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                    <Link href="/account">
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileOpen(false)} data-testid="link-mobile-account">
                        <Key className="h-4 w-4 mr-2" />
                        My Account
                      </Button>
                    </Link>
                  </>
                )}
                {user.role !== "admin" && user.role !== "subadmin" && user.role !== "superadmin" && (
                  <Link href="/account">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileOpen(false)} data-testid="link-mobile-account">
                      <Key className="h-4 w-4 mr-2" />
                      My Account
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => { logout(); setMobileOpen(false); }}
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setMobileOpen(false)}
                  data-testid="link-mobile-login"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
