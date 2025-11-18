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
        { label: 'Targets', href: '/targets', icon: IconStar },
        { label: 'Gallery', href: '/gallery', icon: IconPhoto },
        { label: 'Gear', href: '/dashboard/gear', icon: IconTelescope },
        { label: 'Sessions', href: '/dashboard/sessions', icon: IconCalendar },
        { label: 'FOV Planner', href: '/dashboard/fov-planner', icon: IconCamera },
      ]
    : [
        { label: 'Gallery', href: '/gallery', icon: IconPhoto },
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
            {navItems.map((item) => (
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
                    href="/dashboard/wishlist"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconStar size={14} />}>
                      My Wishlist
                    </Menu.Item>
                  </Link>
                  <Link
                    href="/dashboard/images"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Menu.Item leftSection={<IconPhoto size={14} />}>
                      My Images
                    </Menu.Item>
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
          {navItems.map((item) => (
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
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
