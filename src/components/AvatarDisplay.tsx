import { API_BASE } from '../services/api';

interface AvatarDisplayProps {
  avatar: string | null | undefined;
  name: string;
  className?: string;
}

export function AvatarDisplay({ avatar, name, className = '' }: AvatarDisplayProps) {
  const isImageUrl = avatar?.startsWith('/');
  const baseUrl = API_BASE.replace('/api', '');
  
  if (isImageUrl && avatar) {
    return (
      <img 
        src={`${baseUrl}${avatar}`} 
        alt={name}
        className={`object-cover w-full h-full ${className}`}
      />
    );
  }
  
  // Show initials or the avatar text (for old-style avatars like "IG")
  return <span>{avatar || name?.substring(0, 2).toUpperCase()}</span>;
}
