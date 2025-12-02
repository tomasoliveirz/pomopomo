interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

export default function Logo({ size = 'medium' }: LogoProps) {
  const sizes = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl',
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <img src="/branding/logo.svg" alt="Tomato" className="w-12 h-12" />
      <h1 className={`font-display ${sizes[size]} tracking-tight`}>
        POMOPOMO
      </h1>
    </div>
  );
}


