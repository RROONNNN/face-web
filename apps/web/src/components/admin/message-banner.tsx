type MessageBannerProps = {
  error?: string;
  message?: string;
};

export function MessageBanner({ error, message }: MessageBannerProps) {
  if (!error && !message) {
    return null;
  }

  return (
    <div className={error ? 'message-banner error' : 'message-banner success'}>
      {error ?? message}
    </div>
  );
}
