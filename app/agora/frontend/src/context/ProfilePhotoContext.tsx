import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getPhotoUrl } from "@/services/profileService";

interface ProfilePhotoCtx {
  photoUrl: string | null;
  setPhotoUrl: (url: string | null) => void;
}

const ProfilePhotoContext = createContext<ProfilePhotoCtx>({
  photoUrl: null,
  setPhotoUrl: () => {},
});

export function ProfilePhotoProvider({ children }: { children: ReactNode }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    getPhotoUrl().then(setPhotoUrl).catch(() => {});
  }, []);

  return (
    <ProfilePhotoContext.Provider value={{ photoUrl, setPhotoUrl }}>
      {children}
    </ProfilePhotoContext.Provider>
  );
}

export function useProfilePhoto() {
  return useContext(ProfilePhotoContext);
}
