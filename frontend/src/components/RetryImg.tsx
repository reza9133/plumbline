import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';

const MAX_RETRIES = 3;

const bust = (url: string, n: number) => (n === 0 ? url : `${url}${url.includes('?') ? '&' : '?'}r=${n}`);

/**
 * An <img> that quietly asks again when a download fails (with a new URL, so a failed or cached answer is not
 * reused) instead of leaving a broken-image box until the visitor reloads the page.
 */
export function RetryImg({ src, srcSet, style, onError, onLoad, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const retrySet = srcSet
    ?.split(',')
    .map((part) => {
      const [url = '', ...descriptor] = part.trim().split(/\s+/);
      return [bust(url, attempt), ...descriptor].join(' ');
    })
    .join(', ');

  return (
    <img
      {...rest}
      src={src ? bust(src, attempt) : src}
      srcSet={retrySet}
      style={retrying ? { ...style, opacity: 0 } : style}
      onLoad={(e) => {
        setRetrying(false);
        onLoad?.(e);
      }}
      onError={(e) => {
        onError?.(e);
        if (attempt >= MAX_RETRIES) {
          setRetrying(false); // out of tries: show the normal alt text
          return;
        }
        setRetrying(true); // hide the broken-image box while we try again
        timer.current = window.setTimeout(() => setAttempt((a) => a + 1), 800 * (attempt + 1));
      }}
    />
  );
}
