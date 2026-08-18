'use client';

import {useRef,useState} from 'react';
import {DesktopIcon} from './DesktopIcon';
import {WindowManager} from './WindowManager';
import {Taskbar} from './Taskbar';
import {StartMenu} from './StartMenu';
import {openApp,useDesktopStore} from '@/stores/desktop-store';
import {useNarrative} from '@/components/system/NarrativeProvider';
import {playXpSound} from '@/lib/audio/synth';

export function Desktop(){
  const audioUnlocked=useRef(false);
  const [power,setPower]=useState<'on'|'shutdown'|'restarting'>('on');
  const select=useDesktopStore(s=>s.selectIcon);
  const closeStart=useDesktopStore(s=>s.closeStart);
  const {ready,sessionError,reset}=useNarrative();

  const powerAction=(mode:'shutdown'|'restart')=>{
    playXpSound('shutdown');
    setPower(mode==='shutdown'?'shutdown':'restarting');
    if(mode==='restart')setTimeout(()=>{useDesktopStore.getState().resetWindows();setPower('on');},1800);
  };

  return <main className="desktop-host" data-session-ready={ready ? "true" : "false"}>
    <div className="desktop-scale">
      <div className="xp-desktop" onPointerDown={e=>{if(!audioUnlocked.current){audioUnlocked.current=true;playXpSound('startup')}if(e.target===e.currentTarget){select(null);closeStart();}}}>
        {!ready&&<div className="boot-screen"><span className="xp-flag">▰</span><strong>Microsoft Windows xp</strong><div className="boot-meter"><i/><i/><i/></div></div>}
        {power!=='on'&&<div className="power-screen">
          {power==='shutdown'?<><div className="xp-logo-text">Microsoft Windows <b>xp</b></div><p>It is now safe to turn off your computer.</p><button onClick={()=>setPower('on')}>Turn on</button></>:<><div className="xp-logo-text">Microsoft Windows <b>xp</b></div><p>Windows is restarting…</p></>}
        </div>}
        <div className="desktop-icons">
          <DesktopIcon id="computer" label="My Computer" icon="computer" onOpen={()=>openApp('computer')}/>
          <DesktopIcon id="documents" label="My Documents" icon="documents" onOpen={()=>openApp('documents')}/>
          <DesktopIcon id="personal" label="Daniel's Stuff" icon="folder" onOpen={()=>openApp('folder',"Daniel's Stuff",{folderId:'personal'})}/>
          <DesktopIcon id="msn" label="MSN Messenger 7.0" icon="msn" onOpen={()=>openApp('msn-contacts')}/>
          <DesktopIcon id="notepad" label="Notepad" icon="notepad" onOpen={()=>openApp('notepad','Untitled - Notepad',{content:''})}/>
          <DesktopIcon id="recycle" label="Recycle Bin" icon="recycle" onOpen={()=>openApp('recycle')}/>
        </div>
        <WindowManager/><StartMenu onPower={powerAction}/><Taskbar/>
        {sessionError&&<div className="session-recovery" role="dialog" aria-modal="true"><h2>Recovered Session</h2><p>Windows could not read the recovered MSN session. The file may be damaged or belong to another installation.</p><button onClick={()=>void reset()}>Reset recovered computer</button></div>}
      </div>
    </div>
  </main>;
}
