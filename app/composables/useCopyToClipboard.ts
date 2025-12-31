export interface CopyToastOptions {
  title?: string;
  description?: string;
  color?: string;
  icon?: string;
  toast?: boolean;
}

export const useCopyToClipboard = () => {
  const toast = useToast();

  const copyToClipboard = async (text: string, options: CopyToastOptions = {}) => {
    if (!import.meta.client) return false;

    try {
      await navigator.clipboard.writeText(text);
      if (options.toast !== false) {
        toast.add({
          title: options.title ?? 'Copiato',
          description: options.description,
          color: options.color ?? 'success',
          icon: options.icon,
        });
      }
      return true;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      if (options.toast !== false) {
        toast.add({
          title: 'Errore',
          description: 'Copia non riuscita',
          color: 'error',
        });
      }
      return false;
    }
  };

  return { copyToClipboard };
};
