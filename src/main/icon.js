import { app, nativeImage } from 'electron'
import path from 'path'

export default function getIcon() {
  const assetsPath = app.isPackaged ? path.join(process.resourcesPath, "app", "assets") : "assets";
  return nativeImage.createFromPath(path.join(assetsPath, 'icon.png'))
}
