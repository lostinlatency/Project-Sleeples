'use client';
import {useRef} from 'react';
import {useDesktopStore} from '@/stores/desktop-store';
import {XpIcon,type XpIconName} from './XpIcon';
export function DesktopIcon({id,label,icon,onOpen}:{id:string;label:string;icon:XpIconName;onOpen:()=>void}){const selected=useDesktopStore(s=>s.selectedIconId===id);const select=useDesktopStore(s=>s.selectIcon);const last=useRef(0);return <button className={`desktop-icon ${selected?'selected':''}`} onClick={(event)=>{const now=Date.now();select(id);useDesktopStore.getState().closeStart();if(event.detail===0){onOpen();return;}if(now-last.current<430)onOpen();last.current=now}} aria-label={`Open ${label}`} data-testid={`desktop-${id}`}><XpIcon name={icon} priority={id === "computer"}/><span>{label}</span></button>}
