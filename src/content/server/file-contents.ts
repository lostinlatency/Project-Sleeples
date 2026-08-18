import 'server-only';
export const FILE_CONTENTS:Record<string,{kind:'text'|'log'|'image'|'playlist';title:string;content?:string;assetUrl?:string;corrupted?:boolean}>={
 moving_note:{kind:'text',title:'moving.txt - Notepad',content:"oct 15, 2005\n\nemily's getting too attached. mum says we move friday. i still haven't told her."},
 chat_log:{kind:'log',title:'emily - 17 oct.log',content:'[10/17/2005 11:32 PM] daniel: i have to tell u something\n[10/17/2005 11:33 PM] sleepless_17: what is it?\n[10/17/2005 11:35 PM] daniel: nm. tomorrow\n[10/17/2005 11:36 PM] sleepless_17: promise?'},
 warning_note:{kind:'text',title:'dont forget.txt - Notepad',content:"don't accept her webcam\nshe'll see the boxes\ntell her tomorrow"},
 holiday_photo:{kind:'image',title:'beach_2005.jpg - Windows Picture and Fax Viewer',assetUrl:'/assets/images/beach_2005.jpg'},
 webcam_still:{kind:'image',title:'emily_webcam.jpg - Windows Picture and Fax Viewer',assetUrl:'/assets/avatars/sleepless_17.webp'},
 playlist_2005:{kind:'playlist',title:'late night.m3u',content:'#EXTM3U\n01. midnight drive — 3:41\n02. static summer — 4:02\n03. waiting room — 3:18\n04. tomorrow — 4:27'},
};
