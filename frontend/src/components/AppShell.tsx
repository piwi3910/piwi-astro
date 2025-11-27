'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useDisclosure } from '@/hooks/use-disclosure';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconTelescope,
  IconStar,
  IconCalendar,
  IconPhoto,
  IconCamera,
  IconHome,
  IconLogout,
  IconUser,
  IconSettings,
  IconMapPin,
  IconBook,
  IconChevronDown,
  IconHeart,
  IconTool,
  IconRuler2,
  IconWorld,
  IconMenu2,
} from '@tabler/icons-react';
import { StarfieldBackground } from './StarfieldBackground';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: IconHome },
    { label: 'Locations', href: '/dashboard/locations', icon: IconMapPin },
    { label: 'Gear', href: '/dashboard/gear', icon: IconTelescope },
  ];

  // Mobile Navigation Content
  const MobileNavContent = () => (
    <div className="flex flex-col gap-4 p-6">
      {/* Dashboard - only for authenticated users */}
      {session && (
        <Link href="/dashboard" onClick={close}>
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            className="w-full justify-start"
          >
            <IconHome size={16} className="mr-2" />
            Dashboard
          </Button>
        </Link>
      )}

      {/* Gallery section - for all users */}
      <Text className="text-xs text-muted-foreground font-medium mt-4 mb-2 px-2">
        Gallery
      </Text>
      <Link href="/gallery" onClick={close}>
        <Button
          variant={isActive('/gallery') ? 'default' : 'ghost'}
          className="w-full justify-start"
        >
          <IconWorld size={16} className="mr-2" />
          Public
        </Button>
      </Link>
      {session && (
        <Link href="/dashboard/images" onClick={close}>
          <Button
            variant={isActive('/dashboard/images') ? 'default' : 'ghost'}
            className="w-full justify-start"
          >
            <IconPhoto size={16} className="mr-2" />
            My Images
          </Button>
        </Link>
      )}

      {/* Targets section - only for authenticated users */}
      {session && (
        <>
          <Text className="text-xs text-muted-foreground font-medium mt-4 mb-2 px-2">
            Targets
          </Text>
          <Link href="/targets" onClick={close}>
            <Button
              variant={isActive('/targets') ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <IconBook size={16} className="mr-2" />
              Catalog
            </Button>
          </Link>
          <Link href="/dashboard/wishlist" onClick={close}>
            <Button
              variant={isActive('/dashboard/wishlist') ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <IconHeart size={16} className="mr-2" />
              My Wishlist
            </Button>
          </Link>
          <Link href="/dashboard/sessions" onClick={close}>
            <Button
              variant={isActive('/dashboard/sessions') ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <IconCalendar size={16} className="mr-2" />
              Sessions
            </Button>
          </Link>
        </>
      )}

      {/* Locations and Gear - only for authenticated users */}
      {session &&
        navItems.slice(1).map((item) => (
          <Link key={item.href} href={item.href} onClick={close}>
            <Button
              variant={isActive(item.href) ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <item.icon size={16} className="mr-2" />
              {item.label}
            </Button>
          </Link>
        ))}

      {session && (
        <>
          <Text className="text-xs text-muted-foreground font-medium mt-4 mb-2 px-2">
            Tools
          </Text>
          <Link href="/dashboard/fov-planner" onClick={close}>
            <Button
              variant={isActive('/dashboard/fov-planner') ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <IconCamera size={16} className="mr-2" />
              FOV Planner
            </Button>
          </Link>
          <Link href="/dashboard/pixel-scale" onClick={close}>
            <Button
              variant={isActive('/dashboard/pixel-scale') ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <IconRuler2 size={16} className="mr-2" />
              Pixel Scale
            </Button>
          </Link>
        </>
      )}
    </div>
  );

  return (
    <>
      <StarfieldBackground starCount={180} opacity={0.8} animated={true} showConstellations={true} />
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header
          className="sticky top-0 z-50 w-full h-[60px] border-b border-white/8"
          style={{
            background: 'rgba(13, 17, 23, 0.92)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Trigger */}
              <Sheet open={opened} onOpenChange={(open) => (open ? toggle() : close())}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="sm:hidden"
                  >
                    <IconMenu2 size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[250px] p-0"
                  style={{
                    background: 'rgba(13, 17, 23, 0.94)',
                    backdropFilter: 'blur(4px)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <MobileNavContent />
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center gap-2 no-underline">
                <IconTelescope size={28} />
                <Text className="text-xl font-bold">piwi-astro</Text>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Dashboard link - only for authenticated users */}
              {session && (
                <Link href="/dashboard">
                  <Button
                    variant={isActive('/dashboard') ? 'default' : 'ghost'}
                    size="sm"
                  >
                    <IconHome size={16} className="mr-2" />
                    Dashboard
                  </Button>
                </Link>
              )}

              {/* Gallery dropdown - for all users */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={
                      isActive('/gallery') || isActive('/dashboard/images')
                        ? 'default'
                        : 'ghost'
                    }
                    size="sm"
                  >
                    <IconPhoto size={16} className="mr-2" />
                    Gallery
                    <IconChevronDown size={14} className="ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <Link href="/gallery">
                    <DropdownMenuItem>
                      <IconWorld size={14} className="mr-2" />
                      Public
                    </DropdownMenuItem>
                  </Link>
                  {session && (
                    <Link href="/dashboard/images">
                      <DropdownMenuItem>
                        <IconPhoto size={14} className="mr-2" />
                        My Images
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Targets dropdown - only for authenticated users */}
              {session && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={
                        isActive('/targets') ||
                        isActive('/dashboard/wishlist') ||
                        isActive('/dashboard/sessions')
                          ? 'default'
                          : 'ghost'
                      }
                      size="sm"
                    >
                      <IconStar size={16} className="mr-2" />
                      Targets
                      <IconChevronDown size={14} className="ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    <Link href="/targets">
                      <DropdownMenuItem>
                        <IconBook size={14} className="mr-2" />
                        Catalog
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard/wishlist">
                      <DropdownMenuItem>
                        <IconHeart size={14} className="mr-2" />
                        My Wishlist
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard/sessions">
                      <DropdownMenuItem>
                        <IconCalendar size={14} className="mr-2" />
                        Sessions
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Locations and Gear - only for authenticated users */}
              {session &&
                navItems.slice(1).map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? 'default' : 'ghost'}
                      size="sm"
                    >
                      <item.icon size={16} className="mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                ))}

              {/* Tools dropdown - only for authenticated users */}
              {session && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={
                        isActive('/dashboard/fov-planner') ||
                        isActive('/dashboard/pixel-scale')
                          ? 'default'
                          : 'ghost'
                      }
                      size="sm"
                    >
                      <IconTool size={16} className="mr-2" />
                      Tools
                      <IconChevronDown size={14} className="ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    <Link href="/dashboard/fov-planner">
                      <DropdownMenuItem>
                        <IconCamera size={14} className="mr-2" />
                        FOV Planner
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard/pixel-scale">
                      <DropdownMenuItem>
                        <IconRuler2 size={14} className="mr-2" />
                        Pixel Scale
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* User Menu / Auth Buttons */}
            <div className="flex items-center gap-2">
              {status === 'loading' ? (
                <Text className="text-sm">Loading...</Text>
              ) : session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={session.user?.image || undefined} />
                          <AvatarFallback>
                            {session.user?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <Text className="text-sm">{session.user?.name || 'User'}</Text>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <Link href="/dashboard/profile">
                      <DropdownMenuItem>
                        <IconUser size={14} className="mr-2" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard/settings">
                      <DropdownMenuItem>
                        <IconSettings size={14} className="mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </Link>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => signOut({ callbackUrl: '/' })}
                    >
                      <IconLogout size={14} className="mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1" style={{ background: 'transparent' }}>
          {children}
        </main>
      </div>
    </>
  );
}
