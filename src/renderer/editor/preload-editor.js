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
    getFromStore: (key) => ipcRenderer.invoke('getFromStore', key),
    selectTemplate: (templateId) => ipcRenderer.invoke('selectTemplate', templateId),
    getAllTemplates: () => ipcRenderer.invoke('getAllTemplates'),
    getTemplate: (id) => ipcRenderer.invoke('getTemplate', id),
    duplicateTemplate: (id) => ipcRenderer.invoke('duplicateTemplate', id),
    saveTemplate: (template) => ipcRenderer.invoke('saveTemplate', template),
    deleteTemplate: (id) => ipcRenderer.invoke('deleteTemplate', id),

    // Messages from main process to editor renderer
    onSetTemplates: (callback) => ipcRenderer.on('setTemplates', (_event, templates, newTemplate) => callback(templates, newTemplate)),
    onSetTemplate: (callback) => ipcRenderer.on('setTemplate', (_event, value) => callback(value)),
    onSetPlan: (callback) => ipcRenderer.on('setPlan', (_event, value) => callback(value)),
})