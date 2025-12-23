"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserStatus } from "@/hooks/useUserStatus";
import { Button } from "@/components/ui/button";
import ThemeSwitch from "../ThemeSwitch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, User, UserCircle, Settings, LayoutDashboard, LogOut } from "lucide-react";
import { motion } from "framer-motion";

interface Settings {
  displayName: string | null | undefined;
  defaultTemplate: string;
}

const navLinks = [
  { title: "Home", href: "/" },
  { title: "Analyzer", href: "/ats-checker" },
  { title: "Pricing", href: "/pricing" },
  { title: "Create Resume", href: "/resume/create" },
];

export default function Navbar() {
  const { data: session } = useSession();
  const { user: phoneUser, logout: phoneLogout, loading: phoneLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isSubscriber } = useUserStatus();
  const [settings, setSettings] = useState<Settings>({
    displayName: "",
    defaultTemplate: "modern",
  });

  // Determine which user is authenticated
  const currentUser = session?.user || phoneUser;
  const isAuthenticated = !!session || !!phoneUser;

  useEffect(() => {
    setMounted(true);
    setSettings({
      displayName:
        window.localStorage.getItem("resumeitnow_name") ||
        session?.user?.name ||
        phoneUser?.name ||
        "",
      defaultTemplate:
        window.localStorage.getItem("resumeitnow_template") || "modern",
    });
  }, [session, phoneUser]);

  if (!mounted) return null;

  const handleSignOut = async () => {
    localStorage.clear();

    if (session) {
      await signOut({ redirect: false });
    } else if (phoneUser) {
      await phoneLogout();
    }

    setSheetOpen(false);
    router.push("/");
  };

  const navigateTo = (href: string) => {
    setSheetOpen(false);
    router.push(href);
  };

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 hover:bg-white/10 rounded-full px-3 h-8 text-gray-200"
        >
          <User className="h-4 w-4" />
          <span className="text-sm">
            {settings.displayName ||
              session?.user?.name ||
              phoneUser?.name ||
              "User"}
          </span>
          {isSubscriber && (
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-[10px] font-bold text-white px-1.5 py-0.5 rounded ml-1 tracking-wide shadow-sm">
              PRO
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700 text-white">
        <DropdownMenuLabel className="font-semibold text-gray-200">Account</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigateTo("/profile")}
            className="text-gray-200 hover:bg-gray-700 focus:bg-gray-700"
          >
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo("/dashboard")}
            className="text-gray-200 hover:bg-gray-700 focus:bg-gray-700"
          >
            Dashboard
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          className="text-red-400 hover:bg-red-950 focus:bg-red-950"
          onClick={handleSignOut}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const MobileMenu = () => (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-full hover:bg-white/10 h-8 w-8 text-gray-200"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] p-6 bg-gray-900 border-gray-700 text-white">
        <nav className="flex flex-col gap-4 mt-6">
          {navLinks.map((link, i) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Button
                variant="ghost"
                className="w-full justify-start text-lg font-medium text-gray-200 hover:text-white hover:bg-gray-800"
                onClick={() => navigateTo(link.href)}
              >
                {link.title}
              </Button>
            </motion.div>
          ))}

          {isAuthenticated && (
            <>
              <div className="my-2 border-t border-gray-700" />

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg font-medium text-gray-200 hover:text-white hover:bg-gray-800"
                  onClick={() => navigateTo("/profile")}
                >
                  <UserCircle className="mr-3 h-5 w-5" />
                  Profile
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg font-medium text-gray-200 hover:text-white hover:bg-gray-800"
                  onClick={() => navigateTo("/dashboard")}
                >
                  <LayoutDashboard className="mr-3 h-5 w-5" />
                  Dashboard
                </Button>
              </motion.div>

              <div className="my-2 border-t border-gray-700" />

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-950"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </Button>
              </motion.div>
            </>
          )}

          {!isAuthenticated && (
            <div className="mt-6 border-t border-gray-700 pt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full border-gray-600 text-gray-200 hover:bg-gray-800 hover:border-gray-500"
                onClick={() => navigateTo("/signin")}
                disabled={phoneLoading}
              >
                Sign In
              </Button>
              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => navigateTo("/signin?mode=signup")}
                disabled={phoneLoading}
              >
                Sign Up
              </Button>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-gray-700/50 backdrop-blur-xl bg-gray-900/90 shadow-lg"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left side: Logo + Navigation */}
          <div className="flex items-center gap-6 -ml-3">

            {/* Responsive Logo */}
            <Link href="/" className="flex items-center shrink-0 h-[72px]">
              <Image
                src="/assets/logo.png"
                alt="ShortlistAI Logo"
                width={210}
                height={72}
                priority
                className="object-contain w-[220px] h-[72px] pl-1"
              />

            </Link>

            {/* Desktop Nav - Left aligned next to logo */}
            <div className="hidden md:flex gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative text-sm font-medium text-gray-300 hover:text-white transition-colors group"
                >
                  {link.title}
                  <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full" />
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Adjusted ThemeSwitch container to match button height */}
            <div className="flex items-center h-8 w-8 justify-center">
              <ThemeSwitch />
            </div>
            <div className="hidden md:flex">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateTo("/signin")}
                    disabled={phoneLoading}
                    className="h-8 text-sm transition-colors border-gray-600 text-gray-200 bg-gray-900 hover:bg-gray-800 hover:border-gray-500"
                  >
                    Sign In
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigateTo("/signin?mode=signup")}
                    disabled={phoneLoading}
                    className="h-8 text-sm border-gray-900 bg-gray-900 text-white hover:bg-gray-700 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-500 transition-colors"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>

            <MobileMenu />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
