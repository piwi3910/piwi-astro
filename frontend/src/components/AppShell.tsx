'use client';

import { AppShell, Group, Button, Menu, Avatar, Text, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
} from '@tabler/icons-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navItems = session
    ? [
        { label: 'Dashboard', href: '/dashboard', icon: IconHome },
        { label: 'Locations', href: '/dashboard/locations', icon: IconMapPin },
        { label: 'Gear', href: '/dashboard/gear', icon: IconTelescope },
      ]
    : [
        { label: 'Targets', href: '/targets', icon: IconStar },
      ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group gap="xs">
                <IconTelescope size={28} />
                <Text size="xl" fw={700}>
                  piwi-astro
                </Text>
              </Group>
            </Link>
          </Group>

          <Group visibleFrom="sm">
            {/* Dashboard link - only for authenticated users */}
            {session && (
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <Button
                  variant={isActive('/dashboard') ? 'filled' : 'subtle'}
                  leftSection={<IconHome size={16} />}
                  size="sm"
                >
                  Dashboard
                </Button>
              </Link>
            )}

            {/* Gallery dropdown - for all users */}
            <Menu shadow="md" width={180}>
              <Menu.Target>
                <Button
                  variant={
                    isActive('/gallery') || isActive('/dashboard/images')
                      ? 'filled'
                      : 'subtle'
                  }
                  leftSection={<IconPhoto size={16} />}
                  rightSection={<IconChevronDown size={14} />}
                  size="sm"
                >
                  Gallery
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Link
                  href="/gallery"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Menu.Item leftSection={<IconWorld size={14} />}>
                    Public
                  </Menu.Item>
                </Link>
                {session && (
                  <Link
                    href="/dashboard/images"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconPhoto size={14} />}>
                      My Images
                    </Menu.Item>
                  </Link>
                )}
              </Menu.Dropdown>
            </Menu>

            {/* Targets dropdown - only for authenticated users */}
            {session && (
              <Menu shadow="md" width={180}>
                <Menu.Target>
                  <Button
                    variant={
                      isActive('/targets') ||
                      isActive('/dashboard/wishlist') ||
                      isActive('/dashboard/sessions')
                        ? 'filled'
                        : 'subtle'
                    }
                    leftSection={<IconStar size={16} />}
                    rightSection={<IconChevronDown size={14} />}
                    size="sm"
                  >
                    Targets
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Link
                    href="/targets"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconBook size={14} />}>
                      Catalog
                    </Menu.Item>
                  </Link>
                  <Link
                    href="/dashboard/wishlist"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconHeart size={14} />}>
                      My Wishlist
                    </Menu.Item>
                  </Link>
                  <Link
                    href="/dashboard/sessions"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconCalendar size={14} />}>
                      Sessions
                    </Menu.Item>
                  </Link>
                </Menu.Dropdown>
              </Menu>
            )}

            {/* Targets link for unauthenticated users */}
            {!session && (
              <Link href="/targets" style={{ textDecoration: 'none' }}>
                <Button
                  variant={isActive('/targets') ? 'filled' : 'subtle'}
                  leftSection={<IconStar size={16} />}
                  size="sm"
                >
                  Targets
                </Button>
              </Link>
            )}

            {/* Locations and Gear - only for authenticated users */}
            {session && navItems.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none' }}
              >
                <Button
                  variant={isActive(item.href) ? 'filled' : 'subtle'}
                  leftSection={<item.icon size={16} />}
                  size="sm"
                >
                  {item.label}
                </Button>
              </Link>
            ))}

            {session && (
              <Menu shadow="md" width={180}>
                <Menu.Target>
                  <Button
                    variant={
                      isActive('/dashboard/fov-planner') || isActive('/dashboard/pixel-scale')
                        ? 'filled'
                        : 'subtle'
                    }
                    leftSection={<IconTool size={16} />}
                    rightSection={<IconChevronDown size={14} />}
                    size="sm"
                  >
                    Tools
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Link
                    href="/dashboard/fov-planner"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconCamera size={14} />}>
                      FOV Planner
                    </Menu.Item>
                  </Link>
                  <Link
                    href="/dashboard/pixel-scale"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconRuler2 size={14} />}>
                      Pixel Scale
                    </Menu.Item>
                  </Link>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>

          <Group>
            {status === 'loading' ? (
              <Text size="sm">Loading...</Text>
            ) : session ? (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="subtle" size="sm">
                    <Group gap="xs">
                      <Avatar size="sm" radius="xl" />
                      <Text size="sm">{session.user?.name || 'User'}</Text>
                    </Group>
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Account</Menu.Label>
                  <Link
                    href="/dashboard/profile"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconUser size={14} />}>Profile</Menu.Item>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconSettings size={14} />}>
                      Settings
                    </Menu.Item>
                  </Link>

                  <Menu.Divider />

                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Group>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <Button variant="subtle" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <Button size="sm">Sign Up</Button>
                </Link>
              </Group>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" hiddenFrom="sm">
        <AppShell.Section grow>
          {/* Dashboard - only for authenticated users */}
          {session && (
            <Link
              href="/dashboard"
              style={{ textDecoration: 'none' }}
              onClick={toggle}
            >
              <Button
                variant={isActive('/dashboard') ? 'filled' : 'subtle'}
                leftSection={<IconHome size={16} />}
                fullWidth
                mb="xs"
              >
                Dashboard
              </Button>
            </Link>
          )}

          {/* Gallery section - for all users */}
          <Text size="xs" c="dimmed" fw={500} mt="md" mb="xs" pl="xs">
            Gallery
          </Text>
          <Link
            href="/gallery"
            style={{ textDecoration: 'none' }}
            onClick={toggle}
          >
            <Button
              variant={isActive('/gallery') ? 'filled' : 'subtle'}
              leftSection={<IconWorld size={16} />}
              fullWidth
              mb="xs"
            >
              Public
            </Button>
          </Link>
          {session && (
            <Link
              href="/dashboard/images"
              style={{ textDecoration: 'none' }}
              onClick={toggle}
            >
              <Button
                variant={isActive('/dashboard/images') ? 'filled' : 'subtle'}
                leftSection={<IconPhoto size={16} />}
                fullWidth
                mb="xs"
              >
                My Images
              </Button>
            </Link>
          )}

          {/* Targets section - only for authenticated users */}
          {session && (
            <>
              <Text size="xs" c="dimmed" fw={500} mt="md" mb="xs" pl="xs">
                Targets
              </Text>
              <Link
                href="/targets"
                style={{ textDecoration: 'none' }}
                onClick={toggle}
              >
                <Button
                  variant={isActive('/targets') ? 'filled' : 'subtle'}
                  leftSection={<IconBook size={16} />}
                  fullWidth
                  mb="xs"
                >
                  Catalog
                </Button>
              </Link>
              <Link
                href="/dashboard/wishlist"
                style={{ textDecoration: 'none' }}
                onClick={toggle}
              >
                <Button
                  variant={isActive('/dashboard/wishlist') ? 'filled' : 'subtle'}
                  leftSection={<IconHeart size={16} />}
                  fullWidth
                  mb="xs"
                >
                  My Wishlist
                </Button>
              </Link>
              <Link
                href="/dashboard/sessions"
                style={{ textDecoration: 'none' }}
                onClick={toggle}
              >
                <Button
                  variant={isActive('/dashboard/sessions') ? 'filled' : 'subtle'}
                  leftSection={<IconCalendar size={16} />}
                  fullWidth
                  mb="xs"
                >
                  Sessions
                </Button>
              </Link>
            </>
          )}

          {/* Targets link for unauthenticated users */}
          {!session && (
            <Link
              href="/targets"
              style={{ textDecoration: 'none' }}
              onClick={toggle}
            >
              <Button
                variant={isActive('/targets') ? 'filled' : 'subtle'}
                leftSection={<IconStar size={16} />}
                fullWidth
                mb="xs"
              >
                Targets
              </Button>
            </Link>
          )}

          {/* Locations and Gear - only for authenticated users */}
          {session && navItems.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: 'none' }}
              onClick={toggle}
            >
              <Button
                variant={isActive(item.href) ? 'filled' : 'subtle'}
                leftSection={<item.icon size={16} />}
                fullWidth
                mb="xs"
              >
                {item.label}
              </Button>
            </Link>
          ))}

          {session && (
            <>
              <Text size="xs" c="dimmed" fw={500} mt="md" mb="xs" pl="xs">
                Tools
              </Text>
              <Link
                href="/dashboard/fov-planner"
                style={{ textDecoration: 'none' }}
                onClick={toggle}
              >
                <Button
                  variant={isActive('/dashboard/fov-planner') ? 'filled' : 'subtle'}
                  leftSection={<IconCamera size={16} />}
                  fullWidth
                  mb="xs"
                >
                  FOV Planner
                </Button>
              </Link>
              <Link
                href="/dashboard/pixel-scale"
                style={{ textDecoration: 'none' }}
                onClick={toggle}
              >
                <Button
                  variant={isActive('/dashboard/pixel-scale') ? 'filled' : 'subtle'}
                  leftSection={<IconRuler2 size={16} />}
                  fullWidth
                  mb="xs"
                >
                  Pixel Scale
                </Button>
              </Link>
            </>
          )}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
