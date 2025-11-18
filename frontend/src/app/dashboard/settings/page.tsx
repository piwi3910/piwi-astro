'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Card,
  Text,
  Group,
} from '@mantine/core';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string | null;
  bio: string | null;
  profileVisibility: string;
}

async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch('/api/user/profile');
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}

async function updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }
  return response.json();
}

export default function SettingsPage(): JSX.Element {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    bio: '',
    profileVisibility: 'PUBLIC',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    enabled: !!session,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username,
        name: profile.name || '',
        bio: profile.bio || '',
        profileVisibility: profile.profileVisibility,
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleSubmit = (): void => {
    updateMutation.mutate({
      username: formData.username,
      name: formData.name || undefined,
      bio: formData.bio || undefined,
      profileVisibility: formData.profileVisibility as UserProfile['profileVisibility'],
    });
  };

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Text>Loading profile...</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Profile Settings</Title>
          <Text c="dimmed" size="lg">
            Manage your public profile and account settings
          </Text>
        </div>

        <Card shadow="sm" padding="lg" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">
              Profile Information
            </Text>

            <TextInput
              label="Email"
              value={profile?.email || ''}
              disabled
              description="Email cannot be changed"
            />

            <TextInput
              label="Username"
              placeholder="yourusername"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              description="Your unique username for public profile URL"
              required
            />

            <TextInput
              label="Display Name"
              placeholder="Your Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              description="This name will be displayed on your profile"
            />

            <Textarea
              label="Bio"
              placeholder="Tell us about yourself and your astrophotography journey..."
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              minRows={4}
              description="Share your story with the community"
            />

            <Select
              label="Profile Visibility"
              data={[
                { value: 'PUBLIC', label: 'Public - Anyone can view your profile' },
                { value: 'PRIVATE', label: 'Private - Only you can view your profile' },
              ]}
              value={formData.profileVisibility}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  profileVisibility: val || 'PUBLIC',
                })
              }
              description="Control who can see your public profile page"
            />

            <Group justify="flex-end" mt="md">
              <Button
                onClick={handleSubmit}
                loading={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">
              Public Profile URL
            </Text>
            <Text size="sm" c="dimmed">
              Your public profile is available at:
            </Text>
            <TextInput
              value={`${window.location.origin}/users/${formData.username}`}
              readOnly
            />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
