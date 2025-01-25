import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<Update | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const checkForUpdates = async () => {
    try {
      const update = await check();
      if (update) {
        setUpdateAvailable(update);
        toast.message('Update Available', {
          description: `Version ${update.version || 'unknown'} is available. ${update.body || ''}`,
          action: {
            label: 'Install Now',
            onClick: () => installUpdate(update),
          },
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      toast.error('Failed to check for updates');
    }
  };

  const installUpdate = async (update: Update) => {
    try {
      setIsInstalling(true);
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength || 0;
            setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            break;
          case 'Finished':
            toast.success('Update downloaded successfully. Relaunching...');
            relaunch();
            break;
        }
      });
    } catch (error) {
      console.error('Failed to install update:', error);
      toast.error('Failed to install update');
    } finally {
      setIsInstalling(false);
      setDownloadProgress(0);
    }
  };

  useEffect(() => {
    // Check for updates when component mounts
    checkForUpdates();

    // Check for updates every 24 hours
    const interval = setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 bg-card p-4 rounded-lg shadow-lg min-w-[300px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Version {updateAvailable.version || 'unknown'}</span>
          <span className="text-xs text-muted-foreground">{updateAvailable.body || ''}</span>
        </div>
        <Button
          size="sm"
          onClick={() => installUpdate(updateAvailable)}
          disabled={isInstalling}
        >
          {isInstalling ? 'Installing...' : 'Install Update'}
        </Button>
      </div>
      {isInstalling && (
        <Progress value={downloadProgress} className="w-full" />
      )}
    </div>
  );
} 