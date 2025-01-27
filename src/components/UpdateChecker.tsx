import { useEffect, useRef } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { Progress } from './ui/progress';

const toastStyles = {
  classNames: {
    toast: 'bg-secondary border border-border',
    description: 'text-secondary-foreground',
    actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
    closeButton: 'text-foreground hover:text-foreground/80',
  },
};

// Export the check function for use in settings
export async function checkForUpdatesManually() {
  try {
    console.log('Checking for updates...');
    const update = await check();
    console.log('Update check result:', update);
    if (update) {
      toast.message('Update Available', {
        description: `Version ${update.version || 'unknown'} is available. ${update.body || ''}`,
        action: {
          label: 'Install Now',
          onClick: () => installUpdateManually(update),
        },
        duration: 10000,
        ...toastStyles,
      });
      return update;
    } else {
      toast.success('You are using the latest version.', toastStyles);
      return null;
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    toast.error('Failed to check for updates', toastStyles);
    throw error;
  }
}

async function installUpdateManually(update: Update) {
  let toastId: string | number = '';
  try {
    let downloaded = 0;
    let contentLength = 0;

    toastId = toast.loading('Installing update...', {
      description: <Progress value={0} className="w-full mt-2" />,
      ...toastStyles,
    });

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength || 0;
          const progress = Math.round((downloaded / contentLength) * 100);
          toast.loading('Installing update...', {
            id: toastId,
            description: <Progress value={progress} className="w-full mt-2" />,
            ...toastStyles,
          });
          break;
        case 'Finished':
          toast.success('Update downloaded successfully. Relaunching...', { 
            id: toastId,
            ...toastStyles,
          });
          relaunch();
          break;
      }
    });
  } catch (error) {
    console.error('Failed to install update:', error);
    toast.error('Failed to install update', { 
      id: toastId,
      ...toastStyles,
    });
  }
}

export function UpdateChecker() {
  const lastCheckRef = useRef<number>(0);

  const checkForUpdates = async () => {
    // Prevent duplicate checks within 5 seconds
    const now = Date.now();
    if (now - lastCheckRef.current < 5000) {
      return;
    }
    lastCheckRef.current = now;

    await checkForUpdatesManually();
  };

  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
} 