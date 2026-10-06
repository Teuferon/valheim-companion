import { useRef, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { createSignUrl, type SignEditorState } from '@/lib/sign-url';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ShareSign({ state }: { state: SignEditorState }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const link = useRef<HTMLInputElement>(null);
  const share = () => {
    setUrl(createSignUrl(window.location.href, state));
    setCopied(false);
    setCopyError(false);
    setOpen(true);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
    } catch {
      link.current?.focus();
      link.current?.select();
      setCopyError(true);
    }
  };
  return (
    <>
      <button
        type="button"
        className="quiet-button share-button full-width"
        onClick={share}
      >
        <Share2 size={16} /> {t('Share sign')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="guide-dialog share-dialog"
          closeLabel={t('Zavřít')}
        >
          <DialogHeader>
            <DialogTitle>{t('Share sign')}</DialogTitle>
            <DialogDescription>
              {t('Open this link to restore this sign in Runopis.')}
            </DialogDescription>
          </DialogHeader>
          <label className="field-label" htmlFor="sign-share-link">
            {t('Sign link')}
          </label>
          <input
            id="sign-share-link"
            className="share-link"
            dir="ltr"
            type="text"
            value={url}
            ref={link}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <button type="button" className="copy-button" onClick={copy}>
            {copied ? <Check size={19} /> : <Copy size={19} />}
            {copied ? t('Link copied') : t('Copy link')}
          </button>
          <p
            aria-live="polite"
            className={copyError ? 'warning' : 'share-status'}
          >
            {copyError
              ? t('Select the link and copy it manually.')
              : copied
                ? t('Link copied')
                : ''}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
