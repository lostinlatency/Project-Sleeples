'use client';
import {useDesktopStore} from '@/stores/desktop-store';
import {WindowFrame} from './WindowFrame';
import {FileExplorer} from '@/components/apps/file-explorer/FileExplorer';
import {Notepad} from '@/components/apps/notepad/Notepad';
import {ImageViewer} from '@/components/apps/image-viewer/ImageViewer';
import {Winamp} from '@/components/apps/winamp/Winamp';
import {ContactList} from '@/components/apps/msn/ContactList';
import {ConversationWindow} from '@/components/apps/msn/ConversationWindow';
import {VideoConversation} from '@/components/apps/msn/VideoConversation';
import {MinesweeperFlags} from '@/components/apps/game/MinesweeperFlags';
import {PinballTable} from '@/components/apps/game/PinballTable';
import {NightLog} from '@/components/apps/night-log/NightLog';
import {RecoveredVideo} from '@/components/apps/media-player/RecoveredVideo';
export function WindowManager(){const windowMap=useDesktopStore(s=>s.windows);const windows=Object.values(windowMap);return <div className="window-layer">{windows.map(w=><WindowFrame key={w.id} window={w}>{(w.app==='computer'||w.app==='documents'||w.app==='folder'||w.app==='recycle')&&<FileExplorer kind={w.app} payload={w.payload}/>} {w.app==='notepad'&&<Notepad payload={w.payload}/>} {w.app==='image'&&<ImageViewer payload={w.payload}/>} {w.app==='playlist'&&<Winamp payload={w.payload}/>} {w.app==='media-player'&&<RecoveredVideo/>} {w.app==='msn-contacts'&&<ContactList/>} {w.app==='msn-chat'&&<ConversationWindow/>} {w.app==='msn-video'&&<VideoConversation/>} {w.app==='game'&&<MinesweeperFlags/>} {w.app==='pinball'&&<PinballTable/>} {w.app==='nightlog'&&<NightLog/>}</WindowFrame>)}</div>}
