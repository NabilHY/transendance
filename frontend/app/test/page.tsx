'use client';
import { Profile, ProfileCard } from '@/components/ProfileCard';
import { fetchCurrentUser, getUserData } from '@/lib/fetcher';
// import { profile } from 'console';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const profile: Profile = {
  id: '1',
  username: 'john_doe',
  first_name: 'John',
  last_name: 'Doe',
  profile_pic: 'https://via.placeholder.com/150',
  status: 'Online',
  total_games: 120,
  total_wins: 85,
  win_rate: 70.8,
};

export default function TestPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  // const
  useEffect(() => {
    if (!id) return;
    
    // const userProfile = await fetchCurrentUser();
    // setCurrentUser(userProfile);
    const userProfile = async () => {
      // const profileData = await fetchCurrentUser();
      const profileData = await getUserData(id);
      setCurrentUser(profileData);
    }
    userProfile();
  }, [id]);

  return <div style={{ backgroundColor: '#222', padding: '20px', minHeight: '100dvh' }}>
    <ProfileCard profile={profile} />
  </div>
}

