// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of  MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  If not, see <http://www.gnu.org/licenses/>.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    // Messages from editor renderer to main process
    getGlobalSetting: (key) => ipcRenderer.invoke('getGlobalSetting', key),
    selectLayout: (templateId) => ipcRenderer.invoke('selectLayout', templateId),
    getAllLayouts: () => ipcRenderer.invoke('getAllLayouts'),
    getLayout: (id) => ipcRenderer.invoke('getLayout', id),
    duplicateLayout: (id) => ipcRenderer.invoke('duplicateLayout', id),
    saveLayout: (template) => ipcRenderer.invoke('saveLayout', template),
    deleteLayout: (id) => ipcRenderer.invoke('deleteLayout', id),
    exportLayout: (id) => ipcRenderer.invoke('exportLayout', id),
    importLayout: () => ipcRenderer.invoke('importLayout'),

    // Messages from main process to editor renderer
    onsetLayouts: (callback) => ipcRenderer.on('setLayouts', (_event, templates, newTemplate) => callback(templates, newTemplate)),
    onSetLayout: (callback) => ipcRenderer.on('setLayout', (_event, value) => callback(value)),
    onSetPlan: (callback) => ipcRenderer.on('setPlan', (_event, value) => callback(value)),
})