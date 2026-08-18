'use client';
import {useState} from 'react';
export function Notepad({payload}:{payload?:Record<string,string>}){const [text,setText]=useState(payload?.content||'');return <div className="notepad"><textarea value={text} onChange={e=>setText(e.target.value)} spellCheck={false} aria-label="Notepad text"/></div>}
