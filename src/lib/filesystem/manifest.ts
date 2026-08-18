import type {PublicFileNode} from './types';
export const FILES:PublicFileNode[]=[
 {id:'root_documents',parentId:null,name:'My Documents',kind:'folder',icon:'folder',modifiedAt:'10/18/2005 1:48 AM',initiallyVisible:true},
 {id:'personal',parentId:'root_documents',name:'Daniel',kind:'folder',icon:'folder',modifiedAt:'10/17/2005 11:51 PM',initiallyVisible:true},
 {id:'photos',parentId:'root_documents',name:'My Pictures',kind:'folder',icon:'folder',modifiedAt:'10/15/2005 6:14 PM',initiallyVisible:true},
 {id:'music',parentId:'root_documents',name:'My Music',kind:'folder',icon:'folder',modifiedAt:'10/12/2005 9:02 PM',initiallyVisible:true},
 {id:'moving_note',parentId:'personal',name:'moving.txt',kind:'text',icon:'text',modifiedAt:'10/15/2005 11:07 PM',initiallyVisible:true},
 {id:'chat_log',parentId:'personal',name:'emily - 17 oct.log',kind:'log',icon:'log',modifiedAt:'10/17/2005 11:36 PM',initiallyVisible:false},
 {id:'warning_note',parentId:'personal',name:'dont forget.txt',kind:'text',icon:'text',modifiedAt:'10/18/2005 12:04 AM',initiallyVisible:false},
 {id:'holiday_photo',parentId:'photos',name:'beach_2005.jpg',kind:'image',icon:'image',modifiedAt:'08/24/2005 4:31 PM',initiallyVisible:true},
 {id:'webcam_still',parentId:'photos',name:'emily_webcam.jpg',kind:'image',icon:'image',modifiedAt:'10/18/2005 2:22 AM',initiallyVisible:false},
 {id:'playlist_2005',parentId:'music',name:'late night.m3u',kind:'playlist',icon:'playlist',modifiedAt:'10/12/2005 9:02 PM',initiallyVisible:true},
];
export function visibleFiles(unlocked:string[]){return FILES.filter(f=>f.initiallyVisible||unlocked.includes(f.id));}
