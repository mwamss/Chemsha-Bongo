import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function GoogleSignInButton({ onCredential, onLoadError, buttonText = 'continue_with' }) {
  const buttonRef = useRef(null);
  const credentialHandlerRef = useRef(onCredential);
  const errorHandlerRef = useRef(onLoadError);

  useEffect(() => { credentialHandlerRef.current = onCredential; }, [onCredential]);
  useEffect(() => { errorHandlerRef.current = onLoadError; }, [onLoadError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return undefined;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (credentialResponse) => {
          if (credentialResponse.credential) {
            credentialHandlerRef.current(credentialResponse.credential);
          } else {
            errorHandlerRef.current?.('Google did not return a sign-in credential.');
          }
        },
        auto_select: false,
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'pill',
        text: buttonText,
        width: 300,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return undefined;
    }

    let script = document.querySelector('script[data-google-identity]');
    const ownsScript = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
    }

    const handleLoadError = () => errorHandlerRef.current?.('Google sign-in could not load.');
    script.addEventListener('load', renderGoogleButton);
    script.addEventListener('error', handleLoadError);
    if (ownsScript) document.head.appendChild(script);
    else renderGoogleButton();

    return () => {
      script.removeEventListener('load', renderGoogleButton);
      script.removeEventListener('error', handleLoadError);
    };
  }, [buttonText]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-[10px] text-center text-outline">
        Add the Google web client ID to enable Google sign-in.
      </p>
    );
  }
  return <div ref={buttonRef} className="flex justify-center min-h-10" aria-label="Sign in with Google" />;
}
